import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type Ks1jClient = SupabaseClient<Database>;

// Both apps pass their own env values in; nothing secret lives in this package.
// Only the public (anon / publishable) key is ever used on a client.
// The service-role key must never be imported into apps/mobile or client components.
export function createKs1jClient(
  url: string | undefined,
  anonKey: string | undefined,
  options?: Parameters<typeof createClient<Database>>[2],
): Ks1jClient {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and anon key are required. Copy .env.example to .env.local.');
  }
  return createClient<Database>(url, anonKey, options);
}
