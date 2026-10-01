import * as DocumentPicker from 'expo-document-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABEL,
  SUGGESTED_DOCUMENTS,
  formatDate,
  type DocumentKind,
  type Tables,
} from '@ks1j/shared';

import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner, Button, Choice } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { uploadToMyFolder } from '@/lib/documents';
import { errorMessage, supabase } from '@/lib/supabase';

type CaseRow = Pick<Tables<'cases'>, 'id' | 'case_no' | 'title' | 'type'>;

/** Add documents to an application. Private to the applicant and the committee. */
export default function CaseDocsScreen() {
  const { id, submitted } = useLocalSearchParams<{ id: string; submitted?: string }>();
  const { session } = useAuth();
  const [c, setC] = useState<CaseRow | null>(null);
  const [docs, setDocs] = useState<Tables<'case_documents'>[]>([]);
  const [kind, setKind] = useState<DocumentKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const muted = useThemeColor({}, 'mutedText');
  const border = useThemeColor({}, 'border');

  const load = useCallback(() => {
    supabase
      .from('cases')
      .select('id, case_no, title, type')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => setC(data));
    supabase
      .from('case_documents')
      .select('*')
      .eq('case_id', id)
      .order('created_at')
      .then(({ data }) => setDocs(data ?? []));
  }, [id]);
  useFocusEffect(load);

  const suggested = c ? SUGGESTED_DOCUMENTS[c.type] : [];
  const order = [...suggested, ...DOCUMENT_KINDS.filter((k) => !suggested.includes(k))];

  async function pickAndUpload() {
    if (!session || !kind || !c) return;
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (result.canceled) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const path = await uploadToMyFolder(session.user.id, result.assets[0], `case-${c.case_no}-${kind}`);
      const { error } = await supabase
        .from('case_documents')
        .insert({ case_id: c.id, kind, storage_path: path, uploaded_by: session.user.id });
      if (error) throw error;
      setNotice(`${DOCUMENT_KIND_LABEL[kind]} added.`);
      setKind(null);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const done = () =>
    submitted ? router.replace({ pathname: '/applications', params: { submitted } }) : router.back();

  return (
    <Screen
      title={submitted ? 'Add your documents' : 'Documents'}
      intro={c ? `#${c.case_no} ${c.title}. Only you and the committee can see these.` : undefined}>
      {submitted ? <Banner tone="good">{`Application #${submitted} submitted. Documents help the verifier decide faster.`}</Banner> : null}
      {notice ? <Banner tone="good">{notice}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}

      {suggested.length > 0 ? (
        <Text style={[styles.body, { color: muted }]}>
          Most helpful for this request: {suggested.map((k) => DOCUMENT_KIND_LABEL[k].toLowerCase()).join(', ')}.
        </Text>
      ) : null}

      <Choice
        label="What are you adding?"
        value={kind}
        onChange={setKind}
        options={order.map((k) => ({ value: k, label: DOCUMENT_KIND_LABEL[k] }))}
      />
      <Button title={kind ? `Choose ${DOCUMENT_KIND_LABEL[kind].toLowerCase()} (photo or PDF)` : 'Choose a type first'} onPress={pickAndUpload} disabled={!kind} busy={busy} />

      <SectionLabel>Added</SectionLabel>
      {docs.length === 0 ? <Text style={[styles.body, { color: muted }]}>No documents yet.</Text> : null}
      {docs.map((d) => (
        <View key={d.id} style={[styles.row, { borderColor: border }]} lightColor="transparent" darkColor="transparent">
          <Text style={styles.body}>{DOCUMENT_KIND_LABEL[d.kind as DocumentKind] ?? d.kind}</Text>
          <Text style={[styles.small, { color: muted }]}>{formatDate(d.created_at)}</Text>
        </View>
      ))}

      <Button title={submitted ? 'Done' : 'Back'} variant="secondary" onPress={done} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 22, marginBottom: 8 },
  small: { fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
});
