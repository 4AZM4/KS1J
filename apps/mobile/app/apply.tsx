import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { CASE_TYPE_LABEL, normalisePhone, rupees, type CaseCategory, type CaseType } from '@ks1j/shared';

import { Screen } from '@/components/Screen';
import { Banner, Button, Choice, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage, supabase } from '@/lib/supabase';

const TYPES: CaseType[] = ['medical', 'education', 'ration', 'scholarship', 'education_loan'];

export default function ApplyScreen() {
  const params = useLocalSearchParams<{ type?: CaseType; refer?: string }>();
  const { session, roles } = useAuth();
  // A volunteer (or super admin) can apply on behalf of a family; the database allows only those roles.
  const refer = params.refer === '1' && (roles.includes('volunteer') || roles.includes('super_admin'));
  const [phone, setPhone] = useState('');
  const [family, setFamily] = useState<{ id: string; full_name: string } | null>(null);
  const [lookup, setLookup] = useState<string | null>(null);
  const [type, setType] = useState<CaseType | null>(params.type && TYPES.includes(params.type) ? params.type : null);
  const [category, setCategory] = useState<CaseCategory | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNumber = Number(amount.replace(/\D/g, ''));
  const ready = type && category && title.trim().length >= 3 && amountNumber > 0 && (!refer || family);

  async function findFamily() {
    setLookup(null);
    setFamily(null);
    const { data, error } = await supabase
      .from('members')
      .select('id, full_name')
      .eq('phone', normalisePhone(phone))
      .maybeSingle();
    if (error) return setLookup(errorMessage(error));
    if (!data) return setLookup('No member has this mobile number. Help them create an account first, then refer them.');
    if (data.id === session?.user.id) return setLookup('This is your own number. To apply for yourself, use Apply for help.');
    setFamily(data);
  }

  async function submit() {
    if (!session || !ready) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('cases')
      .insert({
        applicant_id: refer && family ? family.id : session.user.id,
        submitted_by: session.user.id,
        type: type!,
        category: category!,
        title: title.trim(),
        requested_amount: amountNumber,
        details: details.trim() || null,
      })
      .select('id, case_no')
      .single();
    setBusy(false);
    if (error) return setError(errorMessage(error));
    // Next step: attach documents (fee receipt, medical bill, income proof...).
    router.replace({ pathname: '/case-docs', params: { id: data.id, submitted: String(data.case_no) } });
  }

  return (
    <Screen eyebrow="Services"
      title={refer ? 'Refer a family' : 'Apply for help'}
      intro={
        refer
          ? 'You are applying on behalf of a family. They will see the request and every update in their own app.'
          : 'Only the Jamaat committee assigned to your case sees these details.'
      }>
      {error ? <Banner>{error}</Banner> : null}
      {refer ? (
        <>
          <Field
            label="Family member's mobile number"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setFamily(null);
            }}
            keyboardType="phone-pad"
            hint="The person the help is for. They need a KS1J account."
          />
          <Button title="Find the family" variant="secondary" onPress={findFamily} disabled={phone.replace(/\D/g, '').length < 10} />
          {lookup ? <Banner>{lookup}</Banner> : null}
          {family ? <Banner tone="info">{`Applying for ${family.full_name}.`}</Banner> : null}
        </>
      ) : null}
      <Choice
        label="What do you need help with?"
        value={type}
        onChange={setType}
        options={TYPES.map((t) => ({ value: t, label: CASE_TYPE_LABEL[t] }))}
      />
      <Choice
        label="Category"
        value={category}
        onChange={setCategory}
        options={[
          { value: 'sadaat', label: 'Sadaat (Syed)', note: 'The committee checks your Aadhaar card' },
          { value: 'non_sadaat', label: 'Non-Sadaat' },
        ]}
      />
      <Field label="Short title" value={title} onChangeText={setTitle} placeholder="e.g. Hospital bill for surgery" maxLength={80} />
      <Field
        label="Amount needed (₹)"
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        hint={amountNumber > 0 ? rupees(amountNumber) : undefined}
      />
      <Field
        label="Tell us about the need"
        hint={
          type === 'education_loan'
            ? 'Course, college, when it ends, and who will repay (you or a family member). Private to the committee.'
            : 'Private to the committee. Donors never see your name or this text.'
        }
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={2000}
      />
      <Button title={refer ? "Submit referral" : "Submit application"} onPress={submit} disabled={!ready} busy={busy} />
    </Screen>
  );
}
