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
  '256.00,78.00 308.13,130.13 381.87,130.13 381.87,203.87 434.00,256.00 381.87,308.13 381.87,381.87 308.13,381.87 256.00,434.00 203.87,381.87 130.13,381.87 130.13,308.13 78.00,256.00 130.13,203.87 130.13,130.13 203.87,130.13';
const STAR_LINE =
  '256.00,106.00 299.93,149.93 362.07,149.93 362.07,212.07 406.00,256.00 362.07,299.93 362.07,362.07 299.93,362.07 256.00,406.00 212.07,362.07 149.93,362.07 149.93,299.93 106.00,256.00 149.93,212.07 149.93,149.93 212.07,149.93';
const ONE = 'M156 284.8V227.2H169.6V250L190.4 227.2H207.1L184.3 251.9L208.2 284.8H192.4L175.5 261.3L169.6 267.8V284.8ZM239.6 285.9Q230.2 285.9 223.8 282Q217.3 278.2 214.7 271.3L227.1 266.8Q228.3 270.9 231.6 272.9Q234.9 274.9 239.7 274.9Q242.2 274.9 244.5 274.3Q246.9 273.8 248.4 272.4Q250 271.1 250 268.9Q250 265.8 247 264.2Q244.1 262.5 239.4 261.6L232.4 260.2Q227.8 259.3 223.8 257.3Q219.8 255.4 217.3 252.2Q214.9 248.9 214.9 244Q214.9 239.3 217.1 236Q219.2 232.6 222.8 230.5Q226.4 228.3 230.7 227.2Q235 226.1 239.3 226.1Q244 226.1 248.4 227.4Q252.7 228.7 256.2 231.5Q259.6 234.2 261.4 238.7L249.1 243.1Q248 240.2 245.1 238.7Q242.2 237.1 238.1 237.1Q234.2 237.1 231.5 238.5Q228.9 240 228.9 242.6Q228.9 244.8 230.7 246.3Q232.5 247.9 235.5 248.5L243.2 250Q246.8 250.7 250.4 251.8Q254 252.9 257.1 254.7Q260.1 256.4 262 259.4Q263.9 262.3 263.9 266.8Q263.9 271.4 261.8 274.9Q259.7 278.5 256.2 280.9Q252.7 283.4 248.4 284.6Q244.1 285.9 239.6 285.9ZM286.5 284.8V246.2H273.4V235.6Q278 235.6 281 235.1Q284 234.6 286.1 232.8Q288.1 231.1 289.6 227.2H299.6V284.8ZM333.5 285.9Q324.4 285.9 319.1 281.5Q313.7 277.1 311.9 269.7L324.4 265.1Q324.9 267.6 326 269.8Q327.1 272.1 329 273.6Q330.8 275.1 333.5 275.1Q337.8 275.1 340.1 272.4Q342.4 269.6 342.4 262.7V227.2H356V262.7Q356 273.5 350.3 279.7Q344.5 285.9 333.5 285.9Z';

/** The KS1J star: a gold khatam with KS1J across its middle. See docs/brand/. */
export function Star({ size = 48, color = ART.gold, ink = ART.deep }: { size?: number; color?: string; ink?: string }) {
  return (
    <Svg width={size} height={size} viewBox="78 78 356 356" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polygon points={STAR} fill={color} />
      <Polygon points={STAR_LINE} fill="none" stroke={ink} strokeWidth={6} />
      <Path d={ONE} fill={ink} />
    </Svg>
  );
}

/** The KS1J logo: the star (with KS1J) on a green tile, then the letters with a gold "1". */
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
