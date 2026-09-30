import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';

export function Screen({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  const bg = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'mutedText');
  return (
    <ScrollView style={{ backgroundColor: bg }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      {intro ? <Text style={[styles.intro, { color: muted }]}>{intro}</Text> : null}
      <View style={styles.body} lightColor="transparent" darkColor="transparent">
        {children}
      </View>
    </ScrollView>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const muted = useThemeColor({}, 'mutedText');
  return <Text style={[styles.section, { color: muted }]}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700' },
  intro: { fontSize: 16, lineHeight: 22, marginTop: 6 },
  body: { marginTop: 20 },
  section: { fontSize: 13, fontWeight: '600', letterSpacing: 0.6, marginTop: 12, marginBottom: 10 },
});
