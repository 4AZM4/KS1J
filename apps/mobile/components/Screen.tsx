import { useId, type ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Hero, Logo } from '@/components/Art';
import { Text, View, useThemeColor } from '@/components/Themed';
import { useT } from '@/lib/i18n';

/** A scrolling page. `hero` shows the title on the deep green Jamaat banner (used on the four tabs and sign-in). */
export function Screen({ title, intro, hero, logo, children }: { title: string; intro?: string; hero?: boolean; logo?: boolean; children: ReactNode }) {
  const bg = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'mutedText');
  // A unique pattern id per screen: titles in Gujarati, Hindi or Urdu have no a-z letters to make one from.
  const heroId = `screen${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <ScrollView style={{ backgroundColor: bg }} contentContainerStyle={styles.content}>
      {logo ? (
        <View style={styles.logo} lightColor="transparent" darkColor="transparent">
          <Logo height={44} />
        </View>
      ) : null}
      {hero ? (
        <Hero title={title} intro={intro} id={heroId} />
      ) : (
        <>
          <Text style={styles.title}>{title}</Text>
          {intro ? <Text style={[styles.intro, { color: muted }]}>{intro}</Text> : null}
        </>
      )}
      <View style={styles.body} lightColor="transparent" darkColor="transparent">
        {children}
      </View>
    </ScrollView>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const muted = useThemeColor({}, 'mutedText');
  const { rtl } = useT();
  return <Text style={[styles.section, { color: muted }, rtl ? { textAlign: 'right' } : null]}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700' },
  intro: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  body: { marginTop: 20 },
  logo: { marginBottom: 16 },
  section: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginTop: 12, marginBottom: 10 },
});
