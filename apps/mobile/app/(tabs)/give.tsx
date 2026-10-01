import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { calculateKhums } from '@ks1j/shared';

import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';

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
  const result = calculateKhums({ savings: toAmount(savings), unusedGoods: 0, businessSurplus: 0, exempt: 0 });

  return (
    <View style={[styles.calc, { backgroundColor: card, borderColor: border }]}>
      <Text style={styles.calcTitle}>Khums estimate</Text>
      <Text style={[styles.label, { color: muted }]}>Savings left at your Khums year-end</Text>
      <TextInput
        value={savings}
        onChangeText={setSavings}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={muted}
        accessibilityLabel="Savings left at your Khums year-end, in rupees"
        style={[styles.input, { color: text, borderColor: border }]}
      />
      <View style={styles.resultRow} lightColor="transparent" darkColor="transparent">
        <Text style={styles.resultLabel}>Khums due (20%)</Text>
        <Text style={styles.resultValue}>{rupees(result.khumsDue)}</Text>
      </View>
      <View style={styles.resultRow} lightColor="transparent" darkColor="transparent">
        <Text style={[styles.resultLabel, { color: muted }]}>Sehme Imam</Text>
        <Text style={[styles.resultLabel, { color: muted }]}>{rupees(result.sehmeImam)}</Text>
      </View>
      <View style={styles.resultRow} lightColor="transparent" darkColor="transparent">
        <Text style={[styles.resultLabel, { color: muted }]}>Sehme Sadaat</Text>
        <Text style={[styles.resultLabel, { color: muted }]}>{rupees(result.sehmeSadaat)}</Text>
      </View>
      <Text style={[styles.note, { color: muted }]}>
        This is a guide only. Confirm with your Marja' or the Jamaat's alim.
      </Text>
    </View>
  );
}

export default function GiveScreen() {
  return (
    <Screen title="Give" intro="Every rupee goes through the Jamaat's account and is recorded.">
      <SectionLabel>Khums</SectionLabel>
      <KhumsQuickCalc />
      <FeatureCard title="Pay Sehme Sadaat" description="Goes only to verified Sadaat (Syed) cases. Pick a case to give." href="/cases/sadaat" />
      <FeatureCard title="Pay Sehme Imam" description="Goes only to institutions holding ijazah from a Marja'." />
      <SectionLabel>Support a case</SectionLabel>
      <FeatureCard title="Sadaat cases" description="Verified needs, approved by two Jamaat admins." href="/cases/sadaat" />
      <FeatureCard title="Non-Sadaat cases" description="Verified needs, approved by two Jamaat admins." href="/cases/non_sadaat" />
      <SectionLabel>Dues</SectionLabel>
      <FeatureCard title="Lawajam" description="See what is due, pay and download receipts." />
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
});
