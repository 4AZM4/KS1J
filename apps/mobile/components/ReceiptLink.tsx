import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/Icon';
import { Text, useThemeColor } from '@/components/Themed';
import { useT } from '@/lib/i18n';

/** "View receipt": opens the printable receipt for a paid donation, Lawajam payment or loan repayment. */
export function ReceiptLink({ kind, id }: { kind: 'donation' | 'lawajam' | 'loan'; id: string }) {
  const tint = useThemeColor({}, 'tint');
  const { t } = useT();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/receipt', params: { kind, id } })}
      style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}>
      <Icon name="printer" size={20} color={tint} />
      <Text style={[styles.text, { color: tint }]}>{t('receipt.view')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, minHeight: 44 },
  text: { fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' },
});
