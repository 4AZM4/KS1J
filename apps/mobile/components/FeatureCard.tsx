import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import type { IconName } from '@ks1j/shared';

import { ART, accentStyle } from '@/components/Art';
import { Icon } from '@/components/Icon';
import { Text, View, useThemeColor } from '@/components/Themed';

type Props = {
  title: string;
  description: string;
  href?: Href;
  onPress?: () => void;
  badge?: 'Coming soon' | 'Roadmap';
  /** Fund colour on the left edge: gold for Sehme Sadaat, lapis for Sehme Imam. */
  accent?: 'gold' | 'lapis' | 'green';
  /** A Tabler icon shown in a green badge to the left of the title. */
  icon?: IconName;
};

/** A large tappable card. Every feature entry point in the app uses this, so sizes stay elder-friendly. */
export function FeatureCard({ title, description, href, onPress, badge, accent, icon }: Props) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  const tint = useThemeColor({}, 'tint');

  const body = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${title}, ${badge}` : title}
      // router.push rather than <Link asChild>: Link drops the card's style function on the web build.
      onPress={href ? () => router.push(href) : onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: card, borderColor: border, opacity: pressed ? 0.7 : 1 }, accentStyle(accent)]}>
      <View style={styles.outer} lightColor="transparent" darkColor="transparent">
        {icon ? (
          <View style={styles.iconBadge} lightColor={ART.deep} darkColor={ART.deep}>
            <Icon name={icon} size={28} color={ART.goldLight} />
          </View>
        ) : null}
        <View style={styles.textCol} lightColor="transparent" darkColor="transparent">
          <View style={styles.row} lightColor="transparent" darkColor="transparent">
            <Text style={styles.title}>{title}</Text>
            {badge ? <Text style={[styles.badge, { color: tint, borderColor: tint }]}>{badge}</Text> : null}
          </View>
          <Text style={[styles.description, { color: muted }]}>{description}</Text>
        </View>
      </View>
    </Pressable>
  );

  return body;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 12 },
  outer: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBadge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 19, fontWeight: '600', flexShrink: 1 },
  description: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  badge: { fontSize: 12, fontWeight: '600', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
