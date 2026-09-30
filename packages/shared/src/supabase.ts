import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Both apps pass their own env values in; nothing secret lives in this package.
// Only the public (anon / publishable) key is ever used on a client.
// The service-role key must never be imported into apps/mobile or client components.
export function createKs1jClient(url: string, anonKey: string, options?: Parameters<typeof createClient>[2]): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase URL and anon key are required. Copy .env.example to .env.local.');
  }
  return createClient(url, anonKey, options);
}
