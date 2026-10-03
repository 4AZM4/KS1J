import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  AUTOPAY_LABEL,
  LOAN_STATUS_LABEL,
  checkEmiProposal,
  formatDate,
  minimumEmi,
  monthsToRepay,
  rupees,
  type Tables,
} from '@ks1j/shared';

import { FeatureCard } from '@/components/FeatureCard';
import { ReceiptLink } from '@/components/ReceiptLink';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Field, Progress } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { DEMO_MODE, errorMessage, supabase } from '@/lib/supabase';

type Loan = Tables<'education_loans'>;
type Repayment = Tables<'loan_repayments'>;
type Hardship = Tables<'loan_hardship_requests'>;

export default function LoanScreen() {
  const { session } = useAuth();
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const muted = useThemeColor({}, 'mutedText');

  const load = useCallback(() => {
    if (!session) return;
    const me = session.user.id;
    supabase
      .from('education_loans')
      .select('*')
      .or(`borrower_id.eq.${me},payer_member_id.eq.${me}`)
      .order('created_at', { ascending: false })
      .then(({ data }) => setLoans(data ?? []));
  }, [session]);
  useFocusEffect(load);

  return (
    <Screen eyebrow="Services" title="Education loan" intro="Qard-e-Hasana: interest-free, no late fees. Repay after your course and grace period.">
      {loans === null ? <Text style={{ color: muted }}>Loading…</Text> : null}
      {loans?.length === 0 ? (
        <>
          <Text style={[styles.body, { color: muted }]}>You have no education loan yet.</Text>
          <FeatureCard
            title="Apply for an education loan"
            description="Tell us the course, fees and who will repay. The committee reviews it like any case."
            href="/apply?type=education_loan"
          />
        </>
      ) : null}
      {loans?.map((l) =>
        l.plan_agreed_at ? <ActiveLoan key={l.id} loan={l} onChange={load} /> : <PlanAgreement key={l.id} loan={l} onChange={load} />,
      )}
    </Screen>
  );
}

/** Step 1: the family proposes an EMI; a trustee accepts or counter-proposes. Agreed only when both match. */
function PlanAgreement({ loan, onChange }: { loan: Loan; onChange: () => void }) {
  const [emi, setEmi] = useState(loan.family_accepted_emi ? String(loan.family_accepted_emi) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');

  const floor = minimumEmi(loan.principal, loan.max_tenure_months);
  const check = checkEmiProposal(loan.principal, Number(emi || 0), loan.max_tenure_months);
  const counter = loan.committee_accepted_emi;
  const waitingForCommittee = loan.family_accepted_emi != null && loan.family_accepted_emi !== counter;

  async function accept(amount: number) {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('accept_loan_emi', { p_loan: loan.id, p_emi: amount });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    onChange();
  }

  return (
    <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
      <Text style={styles.title}>Agree your repayment plan</Text>
      <Text style={[styles.body, { color: muted }]}>
        Loan of {rupees(loan.principal)}. Nothing is paid out until you and a trustee agree the same monthly amount.
      </Text>
      <Row label="Course ends" value={formatDate(loan.course_end_date)} />
      <Row label="First EMI due" value={loan.grace_ends_on ? formatDate(loan.grace_ends_on) : 'After the grace period'} />
      <Row label="Grace period" value={`${loan.grace_months} months after the course`} />

      {counter ? (
        <Banner tone="info">
          {`The committee suggests ${rupees(counter)} a month (repaid in ${monthsToRepay(loan.principal, counter)} months).`}
        </Banner>
      ) : null}
      {counter ? <Button title={`Accept ${rupees(counter)} a month`} onPress={() => accept(counter)} busy={busy} /> : null}

      <SectionLabel>{counter ? 'Or propose a different amount' : 'What can your family pay each month?'}</SectionLabel>
      <Field
        label="Monthly EMI (₹)"
        hint={`At least ${rupees(floor)}, so it is repaid within ${loan.max_tenure_months} months. Pick an amount your family can keep paying.`}
        value={emi}
        onChangeText={(v) => setEmi(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
      />
      {emi ? (
        check.ok ? (
          <Text style={styles.ok}>Repaid in {check.months} months.</Text>
        ) : (
          <Text style={styles.bad}>{check.reason}</Text>
        )
      ) : null}
      {error ? <Banner>{error}</Banner> : null}
      {waitingForCommittee ? (
        <Banner tone="good">{`You proposed ${rupees(loan.family_accepted_emi)} a month. A trustee will accept it or suggest another amount.`}</Banner>
      ) : null}
      <Button
        title={check.ok ? `Propose ${rupees(check.emi)} a month` : 'Propose'}
        variant={counter ? 'secondary' : 'primary'}
        onPress={() => check.ok && accept(check.emi)}
        disabled={!check.ok}
        busy={busy}
      />
    </View>
  );
}

/** Step 2: the agreed plan. Balance, next due date, AutoPay, pay now, receipts, hardship. */
function ActiveLoan({ loan, onChange }: { loan: Loan; onChange: () => void }) {
  const { session } = useAuth();
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [hardship, setHardship] = useState<Hardship[]>([]);
  const [amount, setAmount] = useState(String(Math.min(loan.agreed_emi ?? 0, loan.outstanding)));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('loan_repayments')
        .select('*')
        .eq('loan_id', loan.id)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(12)
        .then(({ data }) => setRepayments(data ?? []));
      supabase
        .from('loan_hardship_requests')
        .select('*')
        .eq('loan_id', loan.id)
        .order('created_at', { ascending: false })
        .limit(3)
        .then(({ data }) => setHardship(data ?? []));
    }, [loan.id, loan.outstanding]),
  );

  const repaid = loan.principal - loan.outstanding;
  const amountNumber = Number(amount || 0);
  const pending = hardship.find((h) => h.status === 'pending');
  const daysToDue = loan.next_due_date
    ? Math.round((new Date(loan.next_due_date).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)
    : null;

  async function startAutopay() {
    setBusy('autopay');
    setError(null);
    const { data, error } = await supabase.rpc('start_autopay', { p_loan: loan.id });
    setBusy(null);
    if (error) return setError(errorMessage(error));
    setNotice(data === 'active' ? 'AutoPay is on. Your EMI will be collected on each due date.' : 'Approve the AutoPay request in your UPI app.');
    onChange();
  }

  async function pay() {
    if (!session || amountNumber <= 0) return;
    setBusy('pay');
    setError(null);
    setNotice(null);
    try {
      const { data, error } = await supabase
        .from('loan_repayments')
        .insert({ loan_id: loan.id, amount: Math.min(amountNumber, loan.outstanding) })
        .select('id')
        .single();
      if (error) throw error;
      if (DEMO_MODE) {
        const { error: payError } = await supabase.rpc('demo_confirm_payment', { p_kind: 'loan_repayment', p_id: data.id });
        if (payError) throw payError;
        setNotice(`Thank you. ${rupees(amountNumber)} received. It goes back into the fund for the next student.`);
      } else {
        setNotice('Your payment is waiting for confirmation from the bank.');
      }
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (loan.status === 'closed') {
    return (
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.title}>Fully repaid</Text>
        <Text style={[styles.body, { color: muted }]}>
          {`You repaid ${rupees(loan.principal)}. JazakAllah. Your repayments now help the next student.`}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={styles.title}>{LOAN_STATUS_LABEL[loan.status]}</Text>
        <Progress value={repaid} max={loan.principal} label={`${rupees(repaid)} repaid of ${rupees(loan.principal)}`} />
        <Text style={styles.big}>{rupees(loan.outstanding)} left</Text>
        <Text style={[styles.body, { color: muted }]}>
          {rupees(repaid)} repaid of {rupees(loan.principal)}
        </Text>
        <Row label="Monthly EMI" value={rupees(loan.agreed_emi)} />
        <Row label="Next due" value={formatDate(loan.next_due_date)} />
        <Row label="Payments left" value={loan.agreed_emi ? String(monthsToRepay(loan.outstanding, loan.agreed_emi)) : '—'} />
        <Row label="AutoPay" value={AUTOPAY_LABEL[loan.autopay_status] ?? loan.autopay_status} />
      </View>

      {daysToDue !== null && daysToDue < 0 && !pending ? (
        <Banner>{`Your EMI was due ${-daysToDue} day${daysToDue === -1 ? '' : 's'} ago. If you are facing difficulty, ask for a pause or a lower EMI below.`}</Banner>
      ) : null}
      {pending ? <Banner tone="info">Your hardship request is with a trustee. Reminders are paused until they decide.</Banner> : null}
      {notice ? <Banner tone="good">{notice}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}

      {loan.autopay_status !== 'active' ? (
        <>
          <SectionLabel>AutoPay</SectionLabel>
          <Text style={[styles.body, { color: muted }]}>
            Set up UPI AutoPay once and the EMI is paid on each due date. You can still pay extra any time.
          </Text>
          <Button title="Set up AutoPay" onPress={startAutopay} busy={busy === 'autopay'} />
        </>
      ) : null}

      <SectionLabel>Pay now</SectionLabel>
      <Field
        label="Amount (₹)"
        hint="Pay your EMI or more. Paying early is always welcome and has no charge."
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
      />
      <Button title={amountNumber > 0 ? `Pay ${rupees(Math.min(amountNumber, loan.outstanding))}` : 'Pay'} onPress={pay} disabled={amountNumber <= 0} busy={busy === 'pay'} />
      {DEMO_MODE ? <Text style={[styles.demo, { color: muted }]}>Demo mode: payment is confirmed instantly.</Text> : null}

      <SectionLabel>Having difficulty?</SectionLabel>
      <FeatureCard
        title="Ask for a pause or a lower EMI"
        description="Lost a job or a family emergency? Send income proof and a trustee will review it."
        href={{ pathname: '/loan-hardship', params: { id: loan.id } }}
      />

      <SectionLabel>Receipts</SectionLabel>
      {repayments.length === 0 ? <Text style={[styles.body, { color: muted }]}>No payments yet.</Text> : null}
      {repayments.map((r) => (
        <View key={r.id} lightColor="transparent" darkColor="transparent">
          <Row label={formatDate(r.paid_at)} value={rupees(r.amount)} />
          <ReceiptLink kind="loan" id={r.id} />
        </View>
      ))}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const muted = useThemeColor({}, 'mutedText');
  return (
    <View style={styles.row} lightColor="transparent" darkColor="transparent">
      <Text style={[styles.rowLabel, { color: muted }]}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  title: { fontSize: 19, fontWeight: '700', marginBottom: 6 },
  body: { fontSize: 16, lineHeight: 22, marginBottom: 8 },
  big: { fontSize: 24, fontWeight: '700', marginTop: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 16, fontWeight: '600' },
  ok: { fontSize: 16, color: '#0F6B4F', marginBottom: 8 },
  bad: { fontSize: 16, color: '#B42318', marginBottom: 8 },
  demo: { fontSize: 14, marginTop: 10, textAlign: 'center' },
});
