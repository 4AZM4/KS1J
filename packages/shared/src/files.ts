import type { Ks1jClient } from './supabase';

/**
 * Where members' documents (fee receipts, income proof, ijazah) are stored.
 *
 * - "supabase" (default): the private `documents` bucket in Supabase Storage.
 * - "firebase": Cloud Storage for Firebase, under documents/<member id>/... The Firebase
 *   security rules (firebase/storage.rules) mirror the Supabase ones: you upload only into your own
 *   folder, only PDFs and photos up to 10 MB; only you and Jamaat staff can read; nobody deletes.
 *
 * Sign-in stays on Supabase. The `firebase-token` edge function swaps the member's Supabase session
 * for a short-lived Firebase token carrying a `staff` flag, so the Firebase rules know who they are.
 * Paths are the same in both stores ("<member id>/<file>"), and reading falls back to Supabase, so
 * files uploaded before a switch keep working.
 */
export type FileProvider = 'supabase' | 'firebase';

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket: string;
  appId?: string;
  messagingSenderId?: string;
};

export type FileStore = {
  provider: FileProvider;
  /** Uploads into the signed-in member's own folder. `path` must start with their user id. */
  upload(path: string, body: Blob | ArrayBuffer | Uint8Array, contentType: string): Promise<void>;
  /** A short-lived link to view a file the signed-in member is allowed to see. */
  viewUrl(path: string): Promise<string>;
};

const FIREBASE_PREFIX = 'documents/';

/** Reads the provider and Firebase config from public env values. Anything unusable means Supabase. */
export function fileStoreSettings(provider: string | undefined, firebaseConfigJson: string | undefined) {
  let firebase: FirebaseWebConfig | null = null;
  if (firebaseConfigJson) {
    try {
      const c = JSON.parse(firebaseConfigJson) as Partial<FirebaseWebConfig>;
      if (c.apiKey && c.projectId && c.storageBucket) firebase = c as FirebaseWebConfig;
    } catch {
      firebase = null;
    }
  }
  const chosen: FileProvider = provider === 'firebase' && firebase ? 'firebase' : 'supabase';
  return { provider: chosen, firebase };
}

export function createFileStore(
  supabase: Ks1jClient,
  settings: { provider: FileProvider; firebase: FirebaseWebConfig | null },
): FileStore {
  const fromSupabase = {
    async upload(path: string, body: Blob | ArrayBuffer | Uint8Array, contentType: string) {
      const { error } = await supabase.storage.from('documents').upload(path, body, { contentType });
      if (error) throw error;
    },
    async viewUrl(path: string) {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 300);
      if (error || !data) throw error ?? new Error('Could not open the file.');
      return data.signedUrl;
    },
  };
  if (settings.provider !== 'firebase' || !settings.firebase) return { provider: 'supabase', ...fromSupabase };

  const config = settings.firebase;
  // Loaded only when Firebase is switched on, so the Supabase-only build stays small.
  let ready: Promise<{ storage: import('firebase/storage').FirebaseStorage; uid: string }> | null = null;
  let readyFor = '';

  async function connect() {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session) throw new Error('Please sign in first.');
    if (ready && readyFor === session.user.id) return ready;
    readyFor = session.user.id;
    ready = (async () => {
      const [{ initializeApp, getApps }, { getAuth, signInWithCustomToken }, { getStorage }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/storage'),
      ]);
      const app = getApps().find((a) => a.name === 'ks1j-files') ?? initializeApp(config, 'ks1j-files');
      const auth = getAuth(app);
      if (auth.currentUser?.uid !== session.user.id) {
        const { data: res, error } = await supabase.functions.invoke('firebase-token', { body: {} });
        if (error || !res?.token) throw new Error('Could not connect to file storage. Please try again.');
        await signInWithCustomToken(auth, res.token as string);
      }
      return { storage: getStorage(app, `gs://${config.storageBucket}`), uid: session.user.id };
    })();
    ready.catch(() => {
      ready = null;
    });
    return ready;
  }

  return {
    provider: 'firebase',
    async upload(path, body, contentType) {
      const { storage, uid } = await connect();
      if (!path.startsWith(`${uid}/`)) throw new Error('Files can only be uploaded to your own folder.');
      const { ref, uploadBytes } = await import('firebase/storage');
      const data = body instanceof ArrayBuffer ? new Uint8Array(body) : body;
      await uploadBytes(ref(storage, FIREBASE_PREFIX + path), data, { contentType });
    },
    async viewUrl(path) {
      const { storage } = await connect();
      const { ref, getBlob } = await import('firebase/storage');
      try {
        // getBlob goes through the security rules on every read. (A download URL would not:
        // anyone holding it could open the file for ever, so we never create one.)
        const blob = await getBlob(ref(storage, FIREBASE_PREFIX + path));
        return URL.createObjectURL(blob);
      } catch (e) {
        // Files uploaded before the switch to Firebase are still in Supabase.
        if ((e as { code?: string }).code === 'storage/object-not-found') return fromSupabase.viewUrl(path);
        throw e;
      }
    },
  };
}
