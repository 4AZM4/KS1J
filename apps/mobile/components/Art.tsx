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

const STAR =
  '256.0,78.0 308.0,130.4 381.9,130.1 381.6,204.0 434.0,256.0 381.6,308.0 381.9,381.9 308.0,381.6 256.0,434.0 204.0,381.6 130.1,381.9 130.4,308.0 78.0,256.0 130.4,204.0 130.1,130.1 204.0,130.4';
const STAR_LINE =
  '256.0,106.0 300.0,149.8 362.1,149.9 362.2,212.0 406.0,256.0 362.2,300.0 362.1,362.1 300.0,362.2 256.0,406.0 212.0,362.2 149.9,362.1 149.8,300.0 106.0,256.0 149.8,212.0 149.9,149.9 212.0,149.8';
const ONE = 'M256.1 346V225.3H215.2V192.1Q229.5 192.1 238.9 190.7Q248.3 189.2 254.7 183.6Q261 178.1 265.8 166H296.8V346Z';

/** The KS1J star: a gold khatam with a "1" in the middle (one place for the whole Jamaat). See docs/brand/. */
export function Star({ size = 48, color = ART.gold, ink = ART.deep }: { size?: number; color?: string; ink?: string }) {
  return (
    <Svg width={size} height={size} viewBox="78 78 356 356" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polygon points={STAR} fill={color} />
      <Polygon points={STAR_LINE} fill="none" stroke={ink} strokeWidth={6} />
      <Path d={ONE} fill={ink} />
    </Svg>
  );
}

/** The KS1J logo: the star on a green tile, then the letters with a gold "1". */
export function Logo({ height = 40, tone = 'ink' }: { height?: number; tone?: 'ink' | 'light' }) {
  const main = tone === 'light' ? '#FFFFFF' : ART.deep;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: height * 0.25 }} lightColor="transparent" darkColor="transparent" accessible accessibilityLabel="KS1J">
      <Svg width={height} height={height} viewBox="0 0 512 512">
        <Rect width={512} height={512} rx={116} fill={ART.deep} />
        <Polygon points={STAR} fill={ART.gold} />
        <Polygon points={STAR_LINE} fill="none" stroke={ART.deep} strokeWidth={6} />
        <Path d={ONE} fill={ART.deep} />
      </Svg>
      <Svg width={height * 0.6 * (2258 / 696)} height={height * 0.6} viewBox="0 -682 2258 696">
        <Path transform="translate(-44 0)" d="M44 0V-668H202V-403L443 -668H636L372 -382L649 0H466L270 -272L202 -197V0Z" fill={main} />
        <Path transform="translate(-44 0)" d="M993 12Q884 12 809.5 -32.5Q735 -77 704 -157L848 -209Q862 -161 900.5 -138.0Q939 -115 994 -115Q1023 -115 1050.0 -121.5Q1077 -128 1095.0 -143.5Q1113 -159 1113 -185Q1113 -220 1079.0 -239.5Q1045 -259 991 -269L910 -285Q856 -296 809.5 -318.5Q763 -341 735.0 -378.5Q707 -416 707 -473Q707 -527 732.0 -566.0Q757 -605 798.5 -630.0Q840 -655 890.0 -667.5Q940 -680 990 -680Q1044 -680 1094.5 -665.0Q1145 -650 1185.0 -618.5Q1225 -587 1246 -535L1103 -483Q1090 -517 1056.5 -535.0Q1023 -553 976 -553Q930 -553 899.5 -536.5Q869 -520 869 -489Q869 -464 890.0 -446.0Q911 -428 945 -421L1035 -403Q1076 -395 1118.0 -382.5Q1160 -370 1195.5 -349.5Q1231 -329 1253.0 -295.0Q1275 -261 1275 -209Q1275 -156 1250.5 -114.5Q1226 -73 1185.5 -45.0Q1145 -17 1095.0 -2.5Q1045 12 993 12Z" fill={main} />
        <Path transform="translate(-44 0)" d="M1517 0V-448H1365V-571Q1418 -571 1453.0 -576.5Q1488 -582 1511.5 -602.5Q1535 -623 1553 -668H1668V0Z" fill={ART.gold} />
        <Path transform="translate(-44 0)" d="M2041 12Q1936 12 1874.0 -39.0Q1812 -90 1791 -175L1936 -228Q1942 -200 1954.5 -173.5Q1967 -147 1988.5 -130.0Q2010 -113 2041 -113Q2091 -113 2117.5 -144.5Q2144 -176 2144 -256V-668H2302V-256Q2302 -131 2235.5 -59.5Q2169 12 2041 12Z" fill={main} />
      </Svg>
    </View>
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
          <Star size={30} />
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
  archStar: { position: 'absolute', left: 37, top: 62 },
  heroText: { gap: 6 },
  heroTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '700', lineHeight: 36 },
  heroIntro: { color: ART.mint, fontSize: 17, lineHeight: 24 },
});
