# Storing documents in Firebase

By default, members' documents (fee receipts, income proof, ijazah) are stored in the private
Supabase `documents` bucket. They can be stored in Cloud Storage for Firebase instead. Sign-in, data and
every rule stay in Supabase; only the files move.

## How it works

- **Sign-in stays on Supabase.** The `firebase-token` edge function checks the member's Supabase session
  and returns a one-hour Firebase token with `uid` = their KS1J member id and `staff` = true for Jamaat staff.
- **Files** go to `documents/<member id>/<file>` in the Firebase bucket, the same paths as in Supabase.
- **Rules** (`firebase/storage.rules`) match the Supabase bucket: you upload only into your own folder,
  only PDFs and photos up to 10 MB; only you and staff can read; nobody overwrites or deletes.
- **Viewing** uses `getBlob`, which checks the rules on every read. Download URLs are never created
  (anyone holding one could open the file for ever).
- **The receipt check** (`check-document`) reads the file from Firebase with the service account, and falls
  back to Supabase, so files uploaded before the switch keep working.
- **One switch**: `NEXT_PUBLIC_FILE_STORAGE` / `EXPO_PUBLIC_FILE_STORAGE` = `firebase` or `supabase`.
  If the Firebase config is missing or broken, the apps stay on Supabase.

Code: `packages/shared/src/files.ts` (used by the website and the app),
`supabase/functions/firebase-token`, `supabase/functions/check-document`.

## Setting it up

1. Firebase console: create or open a project, switch it to the **Blaze** plan (needed for Storage on new
   projects since September 2024), open **Storage** and create the default bucket.
2. Publish the rules: `cd firebase && npx firebase-tools deploy --only storage --project <project id>`
   (or paste `firebase/storage.rules` into Storage → Rules and publish).
3. Project settings → Service accounts → **Generate new private key**. In Supabase → Edge Functions →
   Secrets, add `FIREBASE_SERVICE_ACCOUNT` with the whole JSON file. Do not commit it or paste it in chat.
   If the bucket is not `<project id>.firebasestorage.app`, also add `FIREBASE_STORAGE_BUCKET`.
4. Project settings → Your apps → add a **Web app** and copy its config. Put it on one line in
   `NEXT_PUBLIC_FIREBASE_CONFIG` and `EXPO_PUBLIC_FIREBASE_CONFIG`, e.g.
   `{"apiKey":"…","authDomain":"…","projectId":"…","storageBucket":"…","appId":"…"}`.
5. Set `NEXT_PUBLIC_FILE_STORAGE=firebase` and `EXPO_PUBLIC_FILE_STORAGE=firebase`, rebuild, and test:
   upload a receipt as Fatema, open it as the Verifier, and check Donor cannot open it.
