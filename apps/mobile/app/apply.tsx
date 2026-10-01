import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { CASE_TYPE_LABEL, rupees, type CaseCategory, type CaseType } from '@ks1j/shared';

import { Screen } from '@/components/Screen';
import { Banner, Button, Choice, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage, supabase } from '@/lib/supabase';

const TYPES: CaseType[] = ['medical', 'education', 'ration', 'scholarship', 'education_loan'];

export default function ApplyScreen() {
  const params = useLocalSearchParams<{ type?: CaseType }>();
  const { session } = useAuth();
  const [type, setType] = useState<CaseType | null>(params.type && TYPES.includes(params.type) ? params.type : null);
  const [category, setCategory] = useState<CaseCategory | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNumber = Number(amount.replace(/\D/g, ''));
  const ready = type && category && title.trim().length >= 3 && amountNumber > 0;

  async function submit() {
    if (!session || !ready) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from('cases')
      .insert({
        applicant_id: session.user.id,
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
    <Screen title="Apply for help" intro="Only the Jamaat committee assigned to your case sees these details.">
      {error ? <Banner>{error}</Banner> : null}
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
          { value: 'sadaat', label: 'Sadaat (Syed)', note: 'Lineage is verified by the committee' },
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
      <Button title="Submit application" onPress={submit} disabled={!ready} busy={busy} />
    </Screen>
  );
}
