import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';

type Props = {
  title: string;
  description: string;
  href?: Href;
  onPress?: () => void;
  badge?: 'Coming soon' | 'Roadmap';
};

/** A large tappable card. Every feature entry point in the app uses this, so sizes stay elder-friendly. */
export function FeatureCard({ title, description, href, onPress, badge }: Props) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  const tint = useThemeColor({}, 'tint');

  const body = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${title}, ${badge}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: card, borderColor: border, opacity: pressed ? 0.7 : 1 }]}>
      <View style={styles.row} lightColor="transparent" darkColor="transparent">
        <Text style={styles.title}>{title}</Text>
        {badge ? <Text style={[styles.badge, { color: tint, borderColor: tint }]}>{badge}</Text> : null}
      </View>
      <Text style={[styles.description, { color: muted }]}>{description}</Text>
    </Pressable>
  );

  return href ? (
    <Link href={href} asChild>
      {body}
    </Link>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 19, fontWeight: '600', flexShrink: 1 },
  description: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  badge: { fontSize: 12, fontWeight: '600', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
