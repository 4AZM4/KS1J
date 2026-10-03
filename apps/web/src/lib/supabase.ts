"use client";

import { createFileStore, createKs1jClient, fileStoreSettings, friendlyAuthError, type FileStore, type Ks1jClient } from "@ks1j/shared";

// One browser client for the whole site. The session lives in the browser; every query runs
// as the signed-in member, so Supabase RLS decides what they can see and do.
let client: Ks1jClient | undefined;

export function supabase(): Ks1jClient {
  // Its own storage key: the member app runs on the same address (/app), and without this a staff
  // sign-in on the website would also sign the app in as that staff member, and the other way round.
  client ??= createKs1jClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { storageKey: "ks1j-web-auth", persistSession: true, autoRefreshToken: true },
  });
  return client;
}

let fileStore: FileStore | undefined;

/** Members' documents: Supabase Storage by default, Firebase when NEXT_PUBLIC_FILE_STORAGE=firebase. */
export function files(): FileStore {
  fileStore ??= createFileStore(
    supabase(),
    fileStoreSettings(process.env.NEXT_PUBLIC_FILE_STORAGE, process.env.NEXT_PUBLIC_FIREBASE_CONFIG),
  );
  return fileStore;
}

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** Turns a Supabase / Postgres error into the plain message our database raises. */
export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return friendlyAuthError(String((e as { message: unknown }).message), DEMO_MODE);
  return "Something went wrong. Please try again.";
}
