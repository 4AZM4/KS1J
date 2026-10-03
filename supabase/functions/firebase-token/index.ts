// KS1J firebase-token (Supabase Edge Function, Deno).
//
// Members sign in with Supabase. When documents are stored in Firebase (FILE_STORAGE=firebase in the
// apps), the app calls this function to get a short-lived Firebase custom token for the same member:
//   uid   = the member's KS1J id (so Firebase rules can check "your own folder")
//   staff = true for Jamaat staff (so Firebase rules let staff read documents)
// The Firebase rules live in firebase/storage.rules.
//
// Secret (set in Supabase, never in the apps or the repo): FIREBASE_SERVICE_ACCOUNT, the whole JSON key
// file from Firebase → Project settings → Service accounts. SUPABASE_URL and SUPABASE_ANON_KEY are
// provided by Supabase.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const JWT = /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/;
const AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = (v: unknown) => b64url(new TextEncoder().encode(JSON.stringify(v)));

async function signRs256(payload: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const pem = privateKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const unsigned = `${b64urlJson({ alg: 'RS256', typ: 'JWT' })}.${b64urlJson(payload)}`;
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${b64url(sig)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) return json({ error: 'Firebase file storage is not set up yet.' }, 503);
  let account: { client_email: string; private_key: string };
  try {
    account = JSON.parse(raw);
    if (!account.client_email || !account.private_key) throw new Error('incomplete');
  } catch {
    return json({ error: 'Firebase file storage is not set up correctly.' }, 503);
  }

  const auth = req.headers.get('Authorization') ?? '';
  if (!JWT.test(auth)) return json({ error: 'Please sign in first.' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Who is this? Asked of Supabase Auth with the caller's own token, so it cannot be faked.
  const userRes = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: auth } });
  if (!userRes.ok) return json({ error: 'Please sign in again.' }, 401);
  const user = (await userRes.json()) as { id?: string };
  if (!user.id) return json({ error: 'Please sign in again.' }, 401);

  // Staff or not, read as the caller: is_staff() checks their own roles.
  const staffRes = await fetch(`${url}/rest/v1/rpc/is_staff`, {
    method: 'POST',
    headers: { apikey: anon, Authorization: auth, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const staff = staffRes.ok ? (await staffRes.json()) === true : false;

  const now = Math.floor(Date.now() / 1000);
  const token = await signRs256(
    {
      iss: account.client_email,
      sub: account.client_email,
      aud: AUDIENCE,
      iat: now,
      exp: now + 3600,
      uid: user.id,
      claims: { staff },
    },
    account.private_key,
  );
  return json({ token });
});
