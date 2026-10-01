import { Link, router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { CASE_PRIVACY_NOTE, CASE_TYPE_LABEL, CATEGORY_LABEL, rupees, type CaseCategory, type Database } from '@ks1j/shared';

import { Screen } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Progress } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type PublicCase = Database['public']['Functions']['list_public_cases']['Returns'][number];

export default function CaseListScreen() {
  const { category } = useLocalSearchParams<{ category: CaseCategory }>();
  const navigation = useNavigation();
  const [cases, setCases] = useState<PublicCase[] | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  const tint = useThemeColor({}, 'tint');

  const valid = category === 'sadaat' || category === 'non_sadaat';
  const other: CaseCategory = category === 'sadaat' ? 'non_sadaat' : 'sadaat';

  useEffect(() => {
    if (valid) navigation.setOptions({ title: `${CATEGORY_LABEL[category]} cases` });
  }, [category, navigation, valid]);

  useFocusEffect(
    useCallback(() => {
      if (!valid) return;
      supabase.rpc('list_public_cases', { p_category: category }).then(({ data }) => setCases(data ?? []));
    }, [category, valid]),
  );

  const intro =
    category === 'sadaat'
      ? 'Verified Sadaat (Syed) families. You can give Sehme Sadaat or a general donation.'
      : 'Verified families. Sehme Sadaat cannot be given here; general donations only.';

  return (
    <Screen title={valid ? `${CATEGORY_LABEL[category]} cases` : 'Cases'} intro={intro}>
      {cases === null ? <Text style={{ color: muted }}>Loading…</Text> : null}
      {cases?.length === 0 ? <Text style={{ color: muted, fontSize: 16 }}>No open cases right now.</Text> : null}
      {cases?.map((c) => (
        <Link key={c.id} href={{ pathname: '/case/[id]', params: { id: c.id } }} asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.card, { backgroundColor: card, borderColor: border, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={styles.title}>{c.title}</Text>
            <Text style={[styles.meta, { color: muted }]}>
              Case #{c.case_no} · {CASE_TYPE_LABEL[c.type]} · Verified by two Jamaat admins
            </Text>
            <Progress value={c.raised_amount} max={c.target_amount} />
            <View style={styles.row} lightColor="transparent" darkColor="transparent">
              <Text style={styles.raised}>{rupees(c.raised_amount)} raised</Text>
              <Text style={[styles.meta, { color: muted }]}>
                {c.status === 'funded' ? 'Fully funded' : `of ${rupees(c.target_amount)}`}
              </Text>
            </View>
          </Pressable>
        </Link>
      ))}
      {valid ? (
        <Text
          accessibilityRole="link"
          onPress={() => router.replace({ pathname: '/cases/[category]', params: { category: other } })}
          style={[styles.switch, { color: tint }]}>
          {`See ${CATEGORY_LABEL[other]} cases`}
        </Text>
      ) : null}
      <Text style={[styles.meta, { color: muted, marginTop: 12 }]}>{CASE_PRIVACY_NOTE}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  meta: { fontSize: 15, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 },
  raised: { fontSize: 17, fontWeight: '700' },
  switch: { fontSize: 17, fontWeight: '600', textDecorationLine: 'underline', paddingVertical: 12 },
});
