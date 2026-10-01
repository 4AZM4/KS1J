import type { Ks1jClient } from './supabase';

export interface SignupInput {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  area: string;
  address: string;
  jamaatNumber?: string;
}

/** Checks the form before anything is sent. Returns a plain message, or null when it is fine. */
export function signupProblem(i: SignupInput): string | null {
  if (i.fullName.trim().length < 3) return 'Enter your full name.';
  if (!/^\S+@\S+\.\S+$/.test(i.email.trim())) return 'Enter a valid email address.';
  if (i.password.length < 8) return 'Choose a password of at least 8 characters.';
  const digits = i.phone.replace(/\D/g, '');
  if (digits.length < 10) return 'Enter your 10-digit mobile number.';
  if (i.area.trim().length < 2) return 'Enter your area, for example Dongri or Mazgaon.';
  return null;
}

/** "98765 43210" or "+91 98765 43210" → "919876543210". */
export function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
}

/**
 * Creates the account. The database turns the details into an unverified member profile
 * (handle_new_user); a Jamaat verifier then links it to a household.
 * Returns whether the person must confirm their email before signing in.
 */
export async function signUpMember(
  client: Ks1jClient,
  i: SignupInput,
  emailRedirectTo?: string,
): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await client.auth.signUp({
    email: i.email.trim().toLowerCase(),
    password: i.password,
    options: {
      emailRedirectTo,
      data: {
        full_name: i.fullName.trim(),
        phone: normalisePhone(i.phone),
        area: i.area.trim(),
        address: i.address.trim(),
        jamaat_number: i.jamaatNumber?.trim() || null,
      },
    },
  });
  if (error) throw error;
  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Sign in instead.');
  }
  return { needsEmailConfirmation: !data.session };
}
