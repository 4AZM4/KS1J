import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Polygon, Rect } from 'react-native-svg';

import { Text, View } from '@/components/Themed';
import { useT } from '@/lib/i18n';

/** Jamaat palette used by the artwork. Text on it stays high-contrast for elders. */
export const ART = {
  deep: '#0B4D3A',
  darkest: '#062E23',
  gold: '#C9A24A',
  goldLight: '#E8CC7A',
  lapis: '#27508F',
  sky: '#7FA6E6',
  mint: '#CFE0D6',
  paper: '#F6F8F6',
};

/**
 * Khatam lattice: eight-pointed stars joined edge to edge, as on Jamaat tiles and woodwork.
 * Fills its parent. Decorative, so screen readers skip it.
 */
export function Lattice({ id, opacity = 0.18, color = ART.gold, size = 72 }: { id: string; opacity?: number; color?: string; size?: number }) {
  const s = size / 96;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Defs>
        <Pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <G fill="none" stroke={color} strokeWidth={1.4} strokeLinejoin="round" scale={s}>
            <Rect x={26} y={26} width={44} height={44} />
            <Polygon points="48,17 79,48 48,79 17,48" />
            <Path d="M48 0V17M48 79V96M0 48H17M79 48H96M0 0L26 26M96 0L70 26M0 96L26 70M96 96L70 70" />
            <Circle cx={48} cy={48} r={6} />
          </G>
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </Svg>
  );
}

/** The KS1J eight-pointed star. */
export function Star({ size = 48, color = ART.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 480 480" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x={120} y={120} width={240} height={240} fill="none" stroke={color} strokeWidth={18} />
      <Polygon points="240,70 410,240 240,410 70,240" fill="none" stroke={color} strokeWidth={18} />
      <Circle cx={240} cy={240} r={34} fill={color} />
    </Svg>
  );
}

/** A pointed mihrab arch outline, sized by width. */
export function Arch({ width, height, color = ART.gold, strokeWidth = 3 }: { width: number; height: number; color?: string; strokeWidth?: number }) {
  const a = Math.round(width * 0.62);
  const path = (i: number) =>
    `M${i} ${height} V${a} C${i} ${a * 0.42} ${width * 0.3} ${i + a * 0.12} ${width / 2} ${i} ` +
    `C${width * 0.7} ${i + a * 0.12} ${width - i} ${a * 0.42} ${width - i} ${a} V${height}`;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Path d={path(strokeWidth)} fill="none" stroke={color} strokeWidth={strokeWidth} />
      <Path d={path(strokeWidth + 10)} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
    </Svg>
  );
}

/**
 * The deep green banner at the top of each tab: star lattice, a gold arch with the KS1J star,
 * and the screen's title in large, high-contrast text.
 */
export function Hero({ title, intro, id, children }: { title: string; intro?: string; id: string; children?: ReactNode }) {
  const { rtl } = useT();
  const align = rtl ? ({ textAlign: 'right', writingDirection: 'rtl' } as const) : null;
  return (
    <View style={styles.hero} lightColor={ART.deep} darkColor={ART.deep}>
      <Lattice id={`lat-${id}`} />
      <View style={styles.archWrap} lightColor="transparent" darkColor="transparent" pointerEvents="none">
        <Arch width={104} height={150} />
        <View style={styles.archStar} lightColor="transparent" darkColor="transparent">
          <Star size={38} />
        </View>
      </View>
      <View style={styles.heroText} lightColor="transparent" darkColor="transparent">
        <Text accessibilityRole="header" style={[styles.heroTitle, align]}>
          {title}
        </Text>
        {intro ? <Text style={[styles.heroIntro, align]}>{intro}</Text> : null}
        {children}
      </View>
    </View>
  );
}

/** A coloured strip for the left edge of a card: gold for Sehme Sadaat, blue for Sehme Imam. */
export function accentStyle(accent?: 'gold' | 'lapis' | 'green'): StyleProp<ViewStyle> {
  if (!accent) return null;
  const color = accent === 'gold' ? ART.gold : accent === 'lapis' ? ART.lapis : ART.deep;
  return { borderLeftWidth: 6, borderLeftColor: color };
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, overflow: 'hidden', paddingVertical: 24, paddingLeft: 22, paddingRight: 120, minHeight: 150, marginBottom: 8 },
  archWrap: { position: 'absolute', right: 14, bottom: -2, width: 104, height: 150 },
  archStar: { position: 'absolute', left: 33, top: 58 },
  heroText: { gap: 6 },
  heroTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '700', lineHeight: 36 },
  heroIntro: { color: ART.mint, fontSize: 17, lineHeight: 24 },
});
