import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { formatDate, rupees, type Tables } from '@ks1j/shared';

import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { DEMO_MODE, errorMessage, supabase } from '@/lib/supabase';

type Due = Tables<'lawajam_dues'> & { lawajam_payments: Pick<Tables<'lawajam_payments'>, 'id' | 'status' | 'paid_at' | 'gateway_ref'>[] };

/** Household membership dues. RLS shows only your own household's dues. */
export default function LawajamScreen() {
  const { session, member } = useAuth();
  const [dues, setDues] = useState<Due[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(() => {
    supabase
      .from('lawajam_dues')
      .select('*, lawajam_payments(id, status, paid_at, gateway_ref)')
      .order('period', { ascending: false })
      .then(({ data }) => setDues((data ?? []) as unknown as Due[]));
  }, []);
  useFocusEffect(load);

  async function pay(due: Due) {
    if (!session) return;
    setBusy(due.id);
    setError(null);
    setNotice(null);
    try {
      const { data, error } = await supabase
        .from('lawajam_payments')
        .insert({ due_id: due.id, paid_by: session.user.id, amount: due.amount })
        .select('id')
        .single();
      if (error) throw error;
      if (DEMO_MODE) {
        const { error: payError } = await supabase.rpc('demo_confirm_payment', { p_kind: 'lawajam', p_id: data.id });
        if (payError) throw payError;
        setNotice(`Lawajam ${due.period} paid. JazakAllah.`);
      } else {
        setNotice('Your payment is waiting for confirmation from the bank.');
      }
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const pending = (dues ?? []).filter((d) => d.status === 'pending');
  const paid = (dues ?? []).filter((d) => d.status === 'paid');

  return (
    <Screen title="Lawajam" intro="Your household's yearly membership dues to the Jamaat.">
      {notice ? <Banner tone="good">{notice}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}
      {dues === null ? <Text style={{ color: muted }}>Loading…</Text> : null}
      {dues !== null && !member?.household_id ? (
        <Text style={[styles.body, { color: muted }]}>Your account is not linked to a household yet. Please contact the Jamaat office.</Text>
      ) : null}
      {dues?.length === 0 && member?.household_id ? <Text style={[styles.body, { color: muted }]}>No dues have been raised yet.</Text> : null}

      {pending.map((d) => (
        <View key={d.id} style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.small, { color: muted }]}>Due for {d.period}</Text>
          <Text style={styles.big}>{rupees(d.amount)}</Text>
          <Button title={`Pay ${rupees(d.amount)}`} onPress={() => pay(d)} busy={busy === d.id} />
        </View>
      ))}
      {DEMO_MODE && pending.length > 0 ? (
        <Text style={[styles.small, { color: muted, textAlign: 'center' }]}>Demo mode: payment is confirmed instantly.</Text>
      ) : null}

      {paid.length > 0 ? <SectionLabel>Receipts</SectionLabel> : null}
      {paid.map((d) => {
        const p = d.lawajam_payments.find((x) => x.status === 'paid');
        return (
          <View key={d.id} style={styles.receipt} lightColor="transparent" darkColor="transparent">
            <Text style={styles.body}>
              {d.period} · {rupees(d.amount)} · Paid
            </Text>
            <Text style={[styles.small, { color: muted }]}>
              {p ? `${formatDate(p.paid_at)} · Receipt ${p.gateway_ref ?? p.id.slice(0, 8)}` : 'Paid at the Jamaat office'}
            </Text>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  big: { fontSize: 26, fontWeight: '700', marginVertical: 6 },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 20 },
  receipt: { paddingVertical: 8 },
});
