import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createKs1jClient, friendlyAuthError } from '@ks1j/shared';

// One client for the app. Every query runs as the signed-in member, so Supabase RLS
// decides what they can see. Only the public anon key is ever used here.
export const supabase = createKs1jClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    // On web the browser's localStorage is used; on phones, AsyncStorage.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    // Separate from the website's sign-in (same address on the web), so a staff login there
    // never changes who is signed in to the app.
    storageKey: 'ks1j-app-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the session fresh only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return friendlyAuthError(String((e as { message: unknown }).message), DEMO_MODE);
  return 'Something went wrong. Please try again.';
}
