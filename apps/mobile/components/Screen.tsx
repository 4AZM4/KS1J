import { useId, type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Hero, Logo } from '@/components/Art';
import { Text, View, useThemeColor } from '@/components/Themed';
import { DISPLAY, cardShadow } from '@/constants/Type';
import { useT } from '@/lib/i18n';

/**
 * A scrolling page. `hero` shows the title on the deep green Jamaat banner (the four tabs and sign-in).
 * Every other page opens with a white header card: an optional small label saying which part of the
 * app you are in, the title in Playfair Display, a short gold rule and one line of help.
 */
export function Screen({
  title,
  intro,
  hero,
  logo,
  eyebrow,
  children,
}: {
  title: string;
  intro?: string;
  hero?: boolean;
  logo?: boolean;
  eyebrow?: string;
  children: ReactNode;
}) {
  const bg = useThemeColor({}, 'background');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  const tint = useThemeColor({}, 'tint');
  const gold = useThemeColor({}, 'gold');
  const { rtl } = useT();
  const align = rtl ? ({ textAlign: 'right', writingDirection: 'rtl' } as const) : null;
  // A unique pattern id per screen: titles in Gujarati, Hindi or Urdu have no a-z letters to make one from.
  const heroId = `screen${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <ScrollView style={{ backgroundColor: bg }} contentContainerStyle={styles.content}>
      <View style={styles.column} lightColor="transparent" darkColor="transparent">
        {logo ? (
          <View style={styles.logo} lightColor="transparent" darkColor="transparent">
            <Logo height={44} />
          </View>
        ) : null}
        {hero ? (
          <Hero title={title} intro={intro} id={heroId} />
        ) : (
          <View style={[styles.header, { backgroundColor: card, borderColor: border }, cardShadow]} lightColor="transparent" darkColor="transparent">
            {eyebrow ? <Text style={[styles.eyebrow, { color: tint }, align]}>{eyebrow.toUpperCase()}</Text> : null}
            <Text accessibilityRole="header" style={[styles.title, align]}>
              {title}
            </Text>
            <View style={[styles.rule, { backgroundColor: gold }, rtl ? { alignSelf: 'flex-end' } : null]} lightColor={gold} darkColor={gold} />
            {intro ? <Text style={[styles.intro, { color: muted }, align]}>{intro}</Text> : null}
          </View>
        )}
        <View style={styles.body} lightColor="transparent" darkColor="transparent">
          {children}
        </View>
      </View>
    </ScrollView>
  );
}

/** A small green heading that groups the cards under it. */
export function SectionLabel({ children }: { children: string }) {
  const tint = useThemeColor({}, 'tint');
  const { rtl } = useT();
  return <Text style={[styles.section, { color: tint }, rtl ? { textAlign: 'right' } : null]}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 56 },
  // On tablets and the web the page stays a comfortable reading width.
  column: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 20 },
  eyebrow: { fontSize: 13, fontWeight: '700', letterSpacing: 1.6, marginBottom: 8 },
  title: { fontFamily: DISPLAY, fontSize: 32, lineHeight: 40 },
  rule: { width: 36, height: 2, borderRadius: 1, marginTop: 12 },
  intro: { fontSize: 17, lineHeight: 25, marginTop: 12 },
  body: { marginTop: 20 },
  logo: { marginBottom: 16 },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 1.4, marginTop: 14, marginBottom: 10 },
});
