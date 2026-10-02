import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@ks1j/shared';

import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Field } from '@/components/ui';
import { LanguagePicker } from '@/components/LanguagePicker';
import { useT } from '@/lib/i18n';
import { DEMO_MODE, errorMessage, supabase } from '@/lib/supabase';

// Text-message codes need an SMS provider in Supabase; off until the Jamaat sets one up.
const PHONE_LOGIN = process.env.EXPO_PUBLIC_PHONE_LOGIN === 'true';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  const { t } = useT();

  const e164 = () => (phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      // Back to where they were (a case they wanted to give to), or Home on first sign-in.
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen hero title={t('home.salaam')} intro={t('login.intro')}>
      <LanguagePicker />
      {error ? <Banner>{error}</Banner> : null}
      <Field
        label={t('login.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Field label={t('login.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
      <Button
        title={t('login.signIn')}
        disabled={!email || !password}
        busy={busy === 'email'}
        onPress={() =>
          run('email', async () => {
            const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (error) throw error;
          })
        }
      />
      <Button title={t('login.create')} variant="secondary" onPress={() => router.push('/signup')} />
      <Button title={t('login.browse')} variant="secondary" onPress={() => router.push('/cases/non_sadaat')} />

      {PHONE_LOGIN ? (
        <>
      <SectionLabel>Or with your mobile number</SectionLabel>
      <Field label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="98765 43210" editable={!sent} />
      {sent ? <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" /> : null}
      <Button
        title={sent ? 'Verify and sign in' : 'Send code'}
        disabled={!phone || (sent && code.length < 6)}
        busy={busy === 'phone'}
        onPress={() => {
          if (!sent) {
            setBusy('phone');
            setError(null);
            supabase.auth
              .signInWithOtp({ phone: e164() })
              .then(({ error }) => (error ? setError(errorMessage(error)) : setSent(true)))
              .finally(() => setBusy(null));
          } else {
            void run('phone', async () => {
              const { error } = await supabase.auth.verifyOtp({ phone: e164(), token: code, type: 'sms' });
              if (error) throw error;
            });
          }
        }}
      />
        </>
      ) : null}

      {DEMO_MODE ? (
        <>
          <SectionLabel>Demo accounts</SectionLabel>
          <Text style={[styles.note, { color: muted }]}>Fictional people, for the hackathon demo only.</Text>
          {DEMO_ACCOUNTS.map((a) => (
            <Pressable
              key={a.email}
              accessibilityRole="button"
              accessibilityLabel={`Sign in as ${a.name}, ${a.role}`}
              disabled={busy !== null}
              onPress={() =>
                run(a.email, async () => {
                  const { error } = await supabase.auth.signInWithPassword({ email: a.email, password: DEMO_PASSWORD });
                  if (error) throw error;
                })
              }
              style={({ pressed }) => [styles.demo, { backgroundColor: card, borderColor: border, opacity: pressed ? 0.7 : 1 }]}>
              <View style={styles.demoRow} lightColor="transparent" darkColor="transparent">
                <Text style={styles.demoName}>{a.name}</Text>
                <Text style={[styles.demoRole, { color: muted }]}>{busy === a.email ? 'Signing in…' : a.role}</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 15, marginBottom: 10 },
  demo: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 10 },
  demoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  demoName: { fontSize: 18, fontWeight: '600' },
  demoRole: { fontSize: 14, flexShrink: 1, textAlign: 'right' },
});
