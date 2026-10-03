import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import { signUpMember, signupProblem, type SignupInput } from '@ks1j/shared';

import { Screen } from '@/components/Screen';
import { Text, useThemeColor } from '@/components/Themed';
import { Banner, Button, Field } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';

const EMPTY: SignupInput = { fullName: '', email: '', password: '', phone: '', area: '', address: '', jamaatNumber: '' };

/** New members create an account; a Jamaat verifier then confirms them and links their household. */
export default function SignupScreen() {
  const [form, setForm] = useState<SignupInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const muted = useThemeColor({}, 'mutedText');

  const set = (k: keyof SignupInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const problem = signupProblem(form);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      // On the web build, the confirmation link brings people back to this app's sign-in screen.
      const redirect = Platform.OS === 'web' ? window.location.href.replace(/signup\/?(\?.*)?$/, 'login') : undefined;
      const { needsEmailConfirmation } = await signUpMember(supabase, form, redirect);
      if (needsEmailConfirmation) setConfirmEmail(true);
      else router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (confirmEmail) {
    return (
      <Screen title="Check your email" intro={`We sent a link to ${form.email.trim()}.`}>
        <Text style={{ fontSize: 17, lineHeight: 24 }}>
          Open the link to confirm your email, then come back and sign in. A Jamaat verifier will then confirm your
          membership and link you to your household.
        </Text>
        <Button title="Go to sign in" onPress={() => router.replace('/login')} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Create your account"
      intro="For members of KSI Jamaat Mumbai. A verifier checks every new account before family details are shared.">
      {error ? <Banner>{error}</Banner> : null}
      <Field label="Full name" value={form.fullName} onChangeText={set('fullName')} autoComplete="name" />
      <Field label="Mobile number" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+91 12345 67890" />
      <Field
        label="Email"
        value={form.email}
        onChangeText={set('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Field
        label="Password"
        hint="At least 8 characters."
        value={form.password}
        onChangeText={set('password')}
        secureTextEntry
        autoComplete="new-password"
      />
      <Field label="Area" hint="For example Dongri, Mazgaon or Andheri." value={form.area} onChangeText={set('area')} />
      <Field label="Address (optional)" value={form.address} onChangeText={set('address')} multiline maxLength={300} />
      <Field
        label="Jamaat membership number (optional)"
        hint="If you have one. It helps the verifier find your family."
        value={form.jamaatNumber ?? ''}
        onChangeText={set('jamaatNumber')}
      />
      <Button title="Create account" onPress={submit} busy={busy} />
      <Text style={{ color: muted, fontSize: 15, marginTop: 12, textAlign: 'center' }}>
        Already have an account? Go back to sign in.
      </Text>
    </Screen>
  );
}
