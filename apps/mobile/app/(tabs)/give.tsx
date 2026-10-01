import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { calculateKhums } from '@ks1j/shared';

import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';
import { ART } from '@/components/Art';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useT } from '@/lib/i18n';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function toAmount(value: string) {
  const n = Number(value.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Quick Khums estimate so the shared calculator is wired end to end.
// The full flow (year-end date, Marja', payment, receipts) is in docs/modules/khums.md.
function KhumsQuickCalc() {
  const [savings, setSavings] = useState('');
  const text = useThemeColor({}, 'text');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'mutedText');
  const { t } = useT();
  const result = calculateKhums({ savings: toAmount(savings), unusedGoods: 0, businessSurplus: 0, exempt: 0 });

  return (
    <View style={[styles.calc, { backgroundColor: card, borderColor: border }]}>
      <Text style={styles.calcTitle}>{t('khums.estimate')}</Text>
      <Text style={[styles.label, { color: muted }]}>{t('khums.savings')}</Text>
      <TextInput
        value={savings}
        onChangeText={setSavings}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={muted}
        accessibilityLabel={`${t('khums.savings')} (₹)`}
        style={[styles.input, { color: text, borderColor: border }]}
      />
      <View style={styles.resultRow} lightColor="transparent" darkColor="transparent">
        <Text style={styles.resultLabel}>{t('khums.due')}</Text>
        <Text style={styles.resultValue}>{rupees(result.khumsDue)}</Text>
      </View>
      {result.khumsDue > 0 ? (
        <View
          style={styles.split}
          lightColor="transparent"
          darkColor="transparent"
          accessible
          accessibilityLabel={`${t('khums.imam')} ${rupees(result.sehmeImam)}, ${t('khums.sadaat')} ${rupees(result.sehmeSadaat)}`}>
          <View style={[styles.splitPart, { flex: result.sehmeImam || 1, backgroundColor: ART.lapis }]}>
            <Text style={styles.splitText}>{t('khums.imam')}</Text>
          </View>
          <View style={[styles.splitPart, { flex: result.sehmeSadaat || 1, backgroundColor: ART.gold }]}>
            <Text style={[styles.splitText, { color: ART.darkest }]}>{t('khums.sadaat')}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.resultRow} lightColor="transparent" darkColor="transparent">
        <Text style={[styles.resultLabel, { color: muted }]}>{t('khums.imam')}</Text>
        <Text style={[styles.resultLabel, { color: muted }]}>{rupees(result.sehmeImam)}</Text>
      </View>
      <View style={styles.resultRow} lightColor="transparent" darkColor="transparent">
        <Text style={[styles.resultLabel, { color: muted }]}>{t('khums.sadaat')}</Text>
        <Text style={[styles.resultLabel, { color: muted }]}>{rupees(result.sehmeSadaat)}</Text>
      </View>
      <Text style={[styles.note, { color: muted }]}>
        {t('khums.guidance')}
      </Text>
    </View>
  );
}

export default function GiveScreen() {
  const { t } = useT();
  return (
    <Screen hero title={t('tab.give')} intro={t('give.intro')}>
      <SectionLabel>{t('sec.khums')}</SectionLabel>
      <KhumsQuickCalc />
      <FeatureCard icon="calculator" title={t('card.khumsFull.t')} description={t('card.khumsFull.d')} href="/khums" />
      <FeatureCard icon="building-bank" accent="lapis" title={t('card.payImam.t')} description={t('card.payImam.d')} href="/khums-imam" />
      <FeatureCard icon="heart-handshake" accent="gold" title={t('card.paySadaat.t')} description={t('card.paySadaat.d')} href="/cases/sadaat" />
      <SectionLabel>{t('sec.support')}</SectionLabel>
      <FeatureCard icon="users" accent="gold" title={t('card.sadaatCases.t')} description={t('card.cases.d')} href="/cases/sadaat" />
      <FeatureCard icon="users-group" accent="green" title={t('card.nonSadaatCases.t')} description={t('card.cases.d')} href="/cases/non_sadaat" />
      <SectionLabel>{t('sec.dues')}</SectionLabel>
      <FeatureCard icon="receipt" title={t('card.lawajam.t')} description={t('card.lawajam.d')} href="/lawajam" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  calc: { borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 12 },
  calcTitle: { fontSize: 19, fontWeight: '600' },
  label: { fontSize: 15, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, fontSize: 20, padding: 12, marginTop: 6 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  resultLabel: { fontSize: 16 },
  resultValue: { fontSize: 20, fontWeight: '700' },
  note: { fontSize: 14, marginTop: 12, lineHeight: 20 },
  split: { flexDirection: 'row', height: 40, borderRadius: 12, overflow: 'hidden', marginTop: 12, gap: 3 },
  splitPart: { justifyContent: 'center', alignItems: 'center' },
  splitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
