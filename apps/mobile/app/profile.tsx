import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import type { Database } from '@ks1j/shared';

import { ART } from '@/components/Art';
import { Icon } from '@/components/Icon';
import { LanguagePicker } from '@/components/LanguagePicker';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

type Person = Database['public']['Functions']['my_household_members']['Returns'][number];

/** The member's own details, who is in their household, and the app language. */
export default function ProfileScreen() {
  const { member } = useAuth();
  const { t, rtl } = useT();
  const [people, setPeople] = useState<Person[] | null>(null);
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  const align = rtl ? ({ textAlign: 'right' } as const) : null;

  useFocusEffect(
    useCallback(() => {
      supabase.rpc('my_household_members').then(({ data }) => setPeople(data ?? []));
    }, []),
  );

  const rows: [string, string | null | undefined][] = [
    [t('profile.name'), member?.full_name],
    [t('profile.phone'), member?.phone],
    [t('profile.area'), member?.area],
    [t('profile.jamaatNo'), member?.jamaat_number],
  ];

  return (
    <Screen title={t('profile.title')}>
      <SectionLabel>{t('profile.you')}</SectionLabel>
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        {rows
          .filter(([, v]) => !!v)
          .map(([k, v]) => (
            <View key={k} style={[styles.row, rtl ? { flexDirection: 'row-reverse' } : null]} lightColor="transparent" darkColor="transparent">
              <Text style={[styles.key, { color: muted }]}>{k}</Text>
              <Text style={[styles.value, align]}>{v}</Text>
            </View>
          ))}
        <View style={[styles.row, rtl ? { flexDirection: 'row-reverse' } : null]} lightColor="transparent" darkColor="transparent">
          <Text style={[styles.key, { color: muted }]}>{t('profile.membership')}</Text>
          <View style={[styles.status, rtl ? { flexDirection: 'row-reverse' } : null]} lightColor="transparent" darkColor="transparent">
            <Icon name={member?.membership_verified ? 'rosette-discount-check' : 'clock'} size={22} color={member?.membership_verified ? '#0F6B4F' : '#B7791F'} />
            <Text style={[styles.value, align]}>{member?.membership_verified ? t('profile.verified') : t('profile.waiting')}</Text>
          </View>
        </View>
      </View>

      <SectionLabel>{t('profile.household')}</SectionLabel>
      {people === null ? <Text style={{ color: muted }}>…</Text> : null}
      {people?.length === 0 ? <Text style={[styles.note, { color: muted }, align]}>{t('profile.noHousehold')}</Text> : null}
      {people?.map((p) => (
        <View
          key={p.full_name + String(p.is_me)}
          style={[styles.person, { backgroundColor: card, borderColor: border }, rtl ? { flexDirection: 'row-reverse' } : null]}>
          <View style={styles.avatar} lightColor={ART.deep} darkColor={ART.deep}>
            <Icon name="user" size={24} color={ART.goldLight} />
          </View>
          <Text style={[styles.personName, align]}>
            {p.full_name}
            {p.is_me ? ` (${t('profile.me')})` : ''}
          </Text>
          {p.membership_verified ? <Icon name="rosette-discount-check" size={22} color="#0F6B4F" /> : null}
        </View>
      ))}

      <LanguagePicker />
      <Text style={[styles.note, { color: muted }, align]}>{t('profile.languageHint')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 8, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  key: { fontSize: 16 },
  value: { fontSize: 17, fontWeight: '600', flexShrink: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  person: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  personName: { fontSize: 18, fontWeight: '600', flex: 1 },
  note: { fontSize: 15, lineHeight: 21, marginTop: 4 },
});
