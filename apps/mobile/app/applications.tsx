import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { CASE_STEPS, CASE_TYPE_LABEL, STATUS_LABEL, rupees, type Tables } from '@ks1j/shared';

import { Screen } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type CaseWithEvents = Tables<'cases'> & { case_events: Tables<'case_events'>[]; case_documents: { id: string }[] };

export default function ApplicationsScreen() {
  const { submitted } = useLocalSearchParams<{ submitted?: string }>();
  const { session } = useAuth();
  const [cases, setCases] = useState<CaseWithEvents[] | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'mutedText');

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      supabase
        .from('cases')
        .select('*, case_events(*), case_documents(id)')
        .eq('applicant_id', session.user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setCases((data ?? []) as unknown as CaseWithEvents[]));
    }, [session]),
  );

  return (
    <Screen title="My applications" intro="You will see each step as the committee works on your case.">
      {submitted ? <Banner tone="good">{`Application #${submitted} submitted. A verifier will review it.`}</Banner> : null}
      {cases === null ? <Text style={{ color: muted }}>Loading…</Text> : null}
      {cases?.length === 0 ? <Text style={[styles.empty, { color: muted }]}>You have not applied for anything yet.</Text> : null}
      {cases?.map((c) => {
        const step = CASE_STEPS.indexOf(c.status);
        return (
          <View key={c.id} style={[styles.card, { backgroundColor: card, borderColor: border }]}>
            <Text style={styles.title}>#{c.case_no} {c.title}</Text>
            <Text style={[styles.meta, { color: muted }]}>
              {CASE_TYPE_LABEL[c.type]} · {rupees(c.requested_amount)}
            </Text>
            {c.status === 'rejected' ? (
              <Text style={[styles.status, { color: '#B42318' }]}>Not approved. Please contact the Jamaat office.</Text>
            ) : (
              <View style={styles.steps} lightColor="transparent" darkColor="transparent">
                {CASE_STEPS.map((s, i) => (
                  <View key={s} style={styles.stepRow} lightColor="transparent" darkColor="transparent">
                    <View style={[styles.dot, { backgroundColor: i <= step ? tint : border }]} />
                    <Text style={[styles.stepText, i === step ? { fontWeight: '700' } : { color: i < step ? undefined : muted }]}>
                      {STATUS_LABEL[s]}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {c.status !== 'closed' && c.status !== 'rejected' ? (
              <Link href={{ pathname: '/case-docs', params: { id: c.id } }} asChild>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.docs, { borderColor: border, opacity: pressed ? 0.7 : 1 }]}>
                  <Text style={[styles.docsText, { color: tint }]}>
                    {c.case_documents.length === 0
                      ? 'Add documents'
                      : `Documents (${c.case_documents.length}): view or add`}
                  </Text>
                </Pressable>
              </Link>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  docs: { marginTop: 14, borderTopWidth: 1, paddingTop: 12 },
  docsText: { fontSize: 16, fontWeight: '600' },
  empty: { fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  meta: { fontSize: 15, marginTop: 4 },
  status: { fontSize: 16, marginTop: 10 },
  steps: { marginTop: 12, gap: 6 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  stepText: { fontSize: 16 },
});
