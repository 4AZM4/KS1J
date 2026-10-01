import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { rupees } from '@ks1j/shared';

import { Screen } from '@/components/Screen';
import { Banner, Button, Choice, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { errorMessage, supabase } from '@/lib/supabase';

type Kind = 'pause' | 'lower_emi';

/** Hardship: pause (1–12 months) or a lower EMI, with income proof. A trustee decides. */
export default function LoanHardshipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [kind, setKind] = useState<Kind | null>(null);
  const [months, setMonths] = useState<string | null>(null);
  const [newEmi, setNewEmi] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emiNumber = Number(newEmi || 0);
  const ready =
    !!kind && reason.trim().length >= 5 && !!file && (kind === 'pause' ? !!months : emiNumber > 0);

  async function pickProof() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled) setFile(result.assets[0]);
  }

  async function submit() {
    if (!session || !ready || !file) return;
    setBusy(true);
    setError(null);
    try {
      // Upload into the member's own private folder; only they and Jamaat staff can read it.
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
      const path = `${session.user.id}/hardship-${Date.now()}.${ext}`;
      const body = await (await fetch(file.uri)).arrayBuffer();
      const { error: upError } = await supabase.storage
        .from('documents')
        .upload(path, body, { contentType: file.mimeType ?? 'application/pdf' });
      if (upError) throw upError;

      const { error } = await supabase.from('loan_hardship_requests').insert({
        loan_id: id,
        requested_by: session.user.id,
        kind: kind!,
        pause_months: kind === 'pause' ? Number(months) : null,
        new_emi: kind === 'lower_emi' ? emiNumber : null,
        reason: reason.trim(),
        proof_path: path,
      });
      if (error) throw error;
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      title="Ask for help with your EMI"
      intro="Reminders stop while a trustee reviews your request. Your proof is private to the committee.">
      {error ? <Banner>{error}</Banner> : null}
      <Choice
        label="What would help?"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'pause', label: 'Pause payments', note: '1 to 12 months' },
          { value: 'lower_emi', label: 'Lower my EMI', note: 'Repay over longer' },
        ]}
      />
      {kind === 'pause' ? (
        <Choice
          label="For how long?"
          value={months}
          onChange={setMonths}
          options={['1', '2', '3', '6', '12'].map((m) => ({ value: m, label: `${m} month${m === '1' ? '' : 's'}` }))}
        />
      ) : null}
      {kind === 'lower_emi' ? (
        <Field
          label="New monthly EMI (₹)"
          value={newEmi}
          onChangeText={(v) => setNewEmi(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          hint={emiNumber > 0 ? rupees(emiNumber) : undefined}
        />
      ) : null}
      <Field label="What happened?" value={reason} onChangeText={setReason} multiline maxLength={1000} />
      <Button
        title={file ? `Proof: ${file.name}` : 'Add income proof (photo or PDF)'}
        variant="secondary"
        onPress={pickProof}
      />
      <Button title="Send to the committee" onPress={submit} disabled={!ready} busy={busy} />
    </Screen>
  );
}
