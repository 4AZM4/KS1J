import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  CASE_PRIVACY_NOTE,
  CASE_SUMMARY_FALLBACK,
  CASE_TYPE_LABEL,
  CATEGORY_LABEL,
  FUND_LABEL,
  KHUMS_GUIDANCE,
  isDonationAllowed,
  rupees,
  type Database,
  type FundType,
} from '@ks1j/shared';

import { ReceiptLink } from '@/components/ReceiptLink';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Choice, Field, Progress } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { DEMO_MODE, errorMessage, supabase } from '@/lib/supabase';

type PublicCase = Database['public']['Functions']['list_public_cases']['Returns'][number];

const QUICK = [500, 1000, 5000];

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [c, setC] = useState<PublicCase | null>(null);
  const [fund, setFund] = useState<FundType | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(() => {
    supabase.rpc('list_public_cases').then(({ data }) => setC((data ?? []).find((x) => x.id === id) ?? null));
  }, [id]);
  useFocusEffect(load);

  if (!c) {
    return (
      <Screen title="Case">
        <Text style={{ color: muted, fontSize: 16 }}>This case is not open for donations.</Text>
      </Screen>
    );
  }

  // Only offer the funds the database will accept for this case (hard rule 2).
  const funds = (['sehme_sadaat', 'general'] as FundType[]).filter((f) =>
    isDonationAllowed(f, { kind: 'case', category: c.category }),
  );
  const amountNumber = Number(amount.replace(/\D/g, ''));
  const remaining = Math.max(0, c.target_amount - c.raised_amount);

  async function donate() {
    if (!session || !fund || amountNumber <= 0) return;
    setBusy(true);
    setError(null);
    setThanks(null);
    try {
      const { data, error } = await supabase
        .from('donations')
        .insert({ donor_id: session.user.id, fund, case_id: c!.id, amount: amountNumber })
        .select('id')
        .single();
      if (error) throw error;
      if (DEMO_MODE) {
        // Stand-in for the payment gateway: confirms this donation through the same database triggers.
        const { error: payError } = await supabase.rpc('demo_confirm_payment', { p_kind: 'donation', p_id: data.id });
        if (payError) throw payError;
        setThanks(`Thank you. ${rupees(amountNumber)} as ${FUND_LABEL[fund]} is recorded in the Jamaat ledger.`);
        setReceiptId(data.id);
      } else {
        setThanks('Your donation is waiting for payment confirmation.');
      }
      setAmount('');
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const closed = c.status === 'funded';

  return (
    <Screen title={c.title} intro={`Case #${c.case_no} · ${CATEGORY_LABEL[c.category]} · ${CASE_TYPE_LABEL[c.type]}`}>
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.summary}>{c.public_summary || CASE_SUMMARY_FALLBACK}</Text>
        <Progress value={c.raised_amount} max={c.target_amount} label={`${rupees(c.raised_amount)} raised of ${rupees(c.target_amount)}`} />
        <Text style={styles.raised}>
          {rupees(c.raised_amount)} raised of {rupees(c.target_amount)}
        </Text>
        <Text style={[styles.meta, { color: muted }]}>
          Verified and approved by two different Jamaat admins. Money goes to the Jamaat, which pays the hospital, school or
          family directly and records proof.
        </Text>
        <Text style={[styles.meta, { color: muted }]}>{CASE_PRIVACY_NOTE}</Text>
      </View>

      {thanks ? <Banner tone="good">{thanks}</Banner> : null}
      {receiptId ? <ReceiptLink kind="donation" id={receiptId} /> : null}
      {error ? <Banner>{error}</Banner> : null}

      {!session && !closed ? (
        <>
          <Banner tone="info">Sign in to give to this case. Anyone can read about it.</Banner>
          <Button title="Sign in to give" onPress={() => router.push('/login')} />
        </>
      ) : null}
      {!session ? null : closed ? (
        <Banner tone="info">This case is fully funded. Thank you to everyone who gave.</Banner>
      ) : (
        <>
          <SectionLabel>Give</SectionLabel>
          <Choice
            label="Give as"
            value={fund}
            onChange={setFund}
            options={funds.map((f) => ({
              value: f,
              label: FUND_LABEL[f],
              note: f === 'sehme_sadaat' ? 'Part of your Khums' : 'Sadaqah or other giving',
            }))}
          />
          {fund === 'sehme_sadaat' ? <Banner tone="info">{KHUMS_GUIDANCE}</Banner> : null}
          <Choice
            label="Amount"
            value={QUICK.includes(amountNumber) ? String(amountNumber) : null}
            onChange={(v) => setAmount(v)}
            options={[...QUICK.filter((q) => q <= remaining), remaining]
              .filter((v, i, a) => v > 0 && a.indexOf(v) === i)
              .map((q) => ({ value: String(q), label: q === remaining ? `${rupees(q)} (all that's left)` : rupees(q) }))}
          />
          <Field label="Or enter an amount (₹)" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <Button
            title={amountNumber > 0 && fund ? `Give ${rupees(amountNumber)}` : 'Give'}
            onPress={donate}
            disabled={!fund || amountNumber <= 0}
            busy={busy}
          />
          {DEMO_MODE ? (
            <Text style={[styles.demo, { color: muted }]}>Demo mode: payment is confirmed instantly without a payment gateway.</Text>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  summary: { fontSize: 17, lineHeight: 24 },
  raised: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  meta: { fontSize: 14, marginTop: 10, lineHeight: 20 },
  demo: { fontSize: 14, marginTop: 10, textAlign: 'center' },
});
