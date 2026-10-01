import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { CASE_STEPS, CASE_TYPE_LABEL, STATUS_LABEL, rupees, type Tables } from '@ks1j/shared';

import { Screen } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type CaseWithEvents = Tables<'cases'> & { case_events: Tables<'case_events'>[] };

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
        .select('*, case_events(*)')
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
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
