import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { KHUMS_GUIDANCE, rupees, type Tables } from '@ks1j/shared';

import { Screen, SectionLabel } from '@/components/Screen';
import { Text, useThemeColor } from '@/components/Themed';
import { Banner, Button, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { DEMO_MODE, errorMessage, supabase } from '@/lib/supabase';

type Institution = Pick<Tables<'institutions'>, 'id' | 'name' | 'city' | 'marja'>;

/** Sehme Imam goes only to institutions with a verified ijazah. RLS hides the rest. */
export default function KhumsImamScreen() {
  const params = useLocalSearchParams<{ amount?: string }>();
  const { session } = useAuth();
  const [list, setList] = useState<Institution[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [amount, setAmount] = useState(params.amount && params.amount !== '0' ? params.amount : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'mutedText');

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('institutions')
        .select('id, name, city, marja')
        .not('ijazah_verified_by', 'is', null)
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => setList(data ?? []));
    }, []),
  );

  const amountNumber = Number(amount || 0);
  const name = list?.find((i) => i.id === chosen)?.name;

  async function pay() {
    if (!session || !chosen || amountNumber <= 0) return;
    setBusy(true);
    setError(null);
    setThanks(null);
    try {
      const { data, error } = await supabase
        .from('donations')
        .insert({ donor_id: session.user.id, fund: 'sehme_imam', institution_id: chosen, amount: amountNumber })
        .select('id')
        .single();
      if (error) throw error;
      if (DEMO_MODE) {
        const { error: payError } = await supabase.rpc('demo_confirm_payment', { p_kind: 'donation', p_id: data.id });
        if (payError) throw payError;
        setThanks(`${rupees(amountNumber)} Sehme Imam paid to ${name}. Your receipt is on the Khums screen.`);
      } else {
        setThanks('Your payment is waiting for confirmation from the bank.');
      }
      setAmount('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Pay Sehme Imam" intro="Only institutions holding a verified ijazah from a Marja' are listed.">
      <Banner tone="info">{KHUMS_GUIDANCE}</Banner>
      {thanks ? <Banner tone="good">{thanks}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}
      <SectionLabel>Choose an institution</SectionLabel>
      {list === null ? <Text style={{ color: muted }}>Loading…</Text> : null}
      {list?.length === 0 ? <Text style={[styles.body, { color: muted }]}>No verified institutions yet.</Text> : null}
      {list?.map((i) => {
        const selected = i.id === chosen;
        return (
          <Pressable
            key={i.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, selected }}
              aria-checked={selected}
            onPress={() => setChosen(i.id)}
            style={[styles.card, { backgroundColor: card, borderColor: selected ? tint : border, borderWidth: selected ? 2 : 1 }]}>
            <Text style={[styles.title, selected ? { color: tint } : null]}>{i.name}</Text>
            <Text style={[styles.body, { color: muted }]}>
              {[i.city, `Ijazah from ${i.marja}`].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
        );
      })}
      <Field label="Amount (₹)" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Button
        title={chosen && amountNumber > 0 ? `Pay ${rupees(amountNumber)}` : 'Pay'}
        onPress={pay}
        disabled={!chosen || amountNumber <= 0}
        busy={busy}
      />
      {DEMO_MODE ? <Text style={[styles.demo, { color: muted }]}>Demo mode: payment is confirmed instantly.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, marginTop: 2 },
  demo: { fontSize: 14, marginTop: 10, textAlign: 'center' },
});
