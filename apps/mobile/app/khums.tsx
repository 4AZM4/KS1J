import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import {
  KHUMS_GUIDANCE,
  MONTHS,
  calculateKhums,
  formatDate,
  nextKhumsYearEnd,
  rupees,
  type Tables,
} from '@ks1j/shared';

import { FeatureCard } from '@/components/FeatureCard';
import { ReceiptLink } from '@/components/ReceiptLink';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Choice, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage, supabase } from '@/lib/supabase';

type Calc = Tables<'khums_calculations'>;
type Payment = Pick<Tables<'donations'>, 'id' | 'fund' | 'amount' | 'paid_at' | 'gateway_ref'>;

const toAmount = (v: string) => Number(v.replace(/\D/g, '') || 0);

export default function KhumsScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Tables<'khums_profiles'> | null | undefined>(undefined);
  const [calcs, setCalcs] = useState<Calc[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editing, setEditing] = useState(false);
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(() => {
    if (!session) return;
    const me = session.user.id;
    supabase.from('khums_profiles').select('*').eq('member_id', me).maybeSingle().then(({ data }) => setProfile(data));
    supabase
      .from('khums_calculations')
      .select('*')
      .eq('member_id', me)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setCalcs(data ?? []));
    supabase
      .from('donations')
      .select('id, fund, amount, paid_at, gateway_ref')
      .eq('donor_id', me)
      .eq('status', 'paid')
      .in('fund', ['sehme_imam', 'sehme_sadaat'])
      .order('paid_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setPayments(data ?? []));
  }, [session]);
  useFocusEffect(load);

  const latest = calcs[0];
  const paidSince = (fund: 'sehme_imam' | 'sehme_sadaat') =>
    latest ? payments.filter((p) => p.fund === fund && p.paid_at && p.paid_at >= latest.created_at).reduce((s, p) => s + p.amount, 0) : 0;

  return (
    <Screen title="Khums" intro="Work out your Khums and pay each share to where it is allowed to go.">
      <Banner tone="info">{KHUMS_GUIDANCE}</Banner>

      {profile === undefined ? <Text style={{ color: muted }}>Loading…</Text> : null}
      {profile === null || editing ? (
        <ProfileSetup
          current={profile ?? null}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      ) : null}
      {profile && !editing ? (
        <View style={styles.row} lightColor="transparent" darkColor="transparent">
          <Text style={[styles.body, { color: muted, flex: 1 }]}>
            {`Year-end ${profile.year_end_day} ${MONTHS[profile.year_end_month - 1]} (next: ${formatDate(nextKhumsYearEnd(profile.year_end_month, profile.year_end_day))})${profile.marja ? ` · Marja': ${profile.marja}` : ''}`}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Change your Khums year" onPress={() => setEditing(true)} style={styles.change}>
            <Text style={styles.link}>Change</Text>
          </Pressable>
        </View>
      ) : null}

      {profile ? <Calculator onSaved={load} /> : null}

      {latest ? (
        <>
          <SectionLabel>Your latest calculation</SectionLabel>
          <Share label="Sehme Imam" due={latest.sehme_imam} paid={paidSince('sehme_imam')} />
          <FeatureCard
            title="Pay Sehme Imam"
            description="Only to institutions holding a verified ijazah from a Marja'."
            href={{ pathname: '/khums-imam', params: { amount: String(Math.max(0, latest.sehme_imam - paidSince('sehme_imam'))) } }}
          />
          <Share label="Sehme Sadaat" due={latest.sehme_sadaat} paid={paidSince('sehme_sadaat')} />
          <FeatureCard
            title="Pay Sehme Sadaat"
            description="Choose a verified Sadaat (Syed) family case."
            href="/cases/sadaat"
          />
        </>
      ) : null}

      {payments.length > 0 ? (
        <>
          <SectionLabel>Khums paid</SectionLabel>
          {payments.map((p) => (
            <View key={p.id} style={styles.receipt} lightColor="transparent" darkColor="transparent">
              <Text style={styles.body}>
                {p.fund === 'sehme_imam' ? 'Sehme Imam' : 'Sehme Sadaat'} · {rupees(p.amount)}
              </Text>
              <Text style={[styles.small, { color: muted }]}>
                {formatDate(p.paid_at)} · Receipt {p.gateway_ref ?? p.id.slice(0, 8)}
              </Text>
              <ReceiptLink kind="donation" id={p.id} />
            </View>
          ))}
        </>
      ) : null}

      {calcs.length > 1 ? (
        <>
          <SectionLabel>Past calculations</SectionLabel>
          {calcs.slice(1).map((c) => (
            <Text key={c.id} style={[styles.body, { color: muted }]}>
              {formatDate(c.created_at)} · {rupees(c.khums_due)} due on {rupees(c.surplus)}
            </Text>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function ProfileSetup({ current, onSaved }: { current: Tables<'khums_profiles'> | null; onSaved: () => void }) {
  const { session } = useAuth();
  const [month, setMonth] = useState<string | null>(current ? String(current.year_end_month) : null);
  const [day, setDay] = useState(current ? String(current.year_end_day) : '');
  const [marja, setMarja] = useState(current?.marja ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dayNumber = Number(day || 0);
  const ready = !!month && dayNumber >= 1 && dayNumber <= 31;

  async function save() {
    if (!session || !ready) return;
    setBusy(true);
    const { error } = await supabase.from('khums_profiles').upsert({
      member_id: session.user.id,
      year_end_month: Number(month),
      year_end_day: dayNumber,
      marja: marja.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    onSaved();
  }

  return (
    <>
      <SectionLabel>Your Khums year</SectionLabel>
      {error ? <Banner>{error}</Banner> : null}
      <Choice
        label="Month your Khums year ends"
        value={month}
        onChange={setMonth}
        options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m.slice(0, 3) }))}
      />
      <Field label="Day" value={day} onChangeText={(v) => setDay(v.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" />
      <Field label="Your Marja' (optional)" value={marja} onChangeText={setMarja} maxLength={80} />
      <Button title="Save" onPress={save} disabled={!ready} busy={busy} />
    </>
  );
}

function Calculator({ onSaved }: { onSaved: () => void }) {
  const { session } = useAuth();
  const [savings, setSavings] = useState('');
  const [goods, setGoods] = useState('');
  const [business, setBusiness] = useState('');
  const [exempt, setExempt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');

  const r = calculateKhums({
    savings: toAmount(savings),
    unusedGoods: toAmount(goods),
    businessSurplus: toAmount(business),
    exempt: toAmount(exempt),
  });

  async function save() {
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from('khums_calculations').insert({
      member_id: session.user.id,
      khums_year: new Date().getFullYear(),
      surplus: r.surplus,
      khums_due: r.khumsDue,
      sehme_imam: r.sehmeImam,
      sehme_sadaat: r.sehmeSadaat,
    });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setError(null);
    onSaved();
  }

  const num = (set: (v: string) => void) => (v: string) => set(v.replace(/\D/g, ''));

  return (
    <>
      <SectionLabel>Calculator</SectionLabel>
      <Field label="Savings left at year-end (₹)" hint="Cash and bank balance from your income." value={savings} onChangeText={num(setSavings)} keyboardType="number-pad" />
      <Field label="Unused goods (₹)" hint="Things bought from income and not used this year." value={goods} onChangeText={num(setGoods)} keyboardType="number-pad" />
      <Field label="Business stock or profit (₹)" value={business} onChangeText={num(setBusiness)} keyboardType="number-pad" />
      <Field label="Exempt or already paid (₹)" hint="As advised by your Marja'." value={exempt} onChangeText={num(setExempt)} keyboardType="number-pad" />
      <View style={[styles.result, { backgroundColor: card, borderColor: border }]}>
        <Line label="Surplus" value={rupees(r.surplus)} muted={muted} />
        <Line label="Khums due (20%)" value={rupees(r.khumsDue)} strong />
        <Line label="Sehme Imam" value={rupees(r.sehmeImam)} muted={muted} />
        <Line label="Sehme Sadaat" value={rupees(r.sehmeSadaat)} muted={muted} />
        <Text style={[styles.small, { color: muted, marginTop: 8 }]}>{KHUMS_GUIDANCE}</Text>
      </View>
      {error ? <Banner>{error}</Banner> : null}
      <Button title="Save this calculation" onPress={save} disabled={r.khumsDue <= 0} busy={busy} />
    </>
  );
}

function Share({ label, due, paid }: { label: string; due: number; paid: number }) {
  const muted = useThemeColor({}, 'mutedText');
  const left = Math.max(0, due - paid);
  return (
    <View style={styles.share} lightColor="transparent" darkColor="transparent">
      <Text style={styles.shareTitle}>{label}</Text>
      <Text style={[styles.body, { color: muted }]}>
        {left === 0 ? `${rupees(due)} · fully paid` : `${rupees(paid)} paid of ${rupees(due)} · ${rupees(left)} left`}
      </Text>
    </View>
  );
}

function Line({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: string }) {
  return (
    <View style={styles.line} lightColor="transparent" darkColor="transparent">
      <Text style={[strong ? styles.strong : styles.body, muted ? { color: muted } : null]}>{label}</Text>
      <Text style={strong ? styles.strongValue : styles.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  link: { fontSize: 16, textDecorationLine: 'underline', fontWeight: '600' },
  change: { minHeight: 48, minWidth: 64, justifyContent: 'center', alignItems: 'center' },
  result: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  strong: { fontSize: 18, fontWeight: '700' },
  strongValue: { fontSize: 22, fontWeight: '700' },
  share: { marginTop: 8, marginBottom: 4 },
  shareTitle: { fontSize: 18, fontWeight: '700' },
  receipt: { paddingVertical: 8 },
});
