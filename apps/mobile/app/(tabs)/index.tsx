import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { Tables } from '@ks1j/shared';

import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, useThemeColor } from '@/components/Themed';
import { Banner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const { member, signOut } = useAuth();
  const [news, setNews] = useState<Tables<'announcements'>[]>([]);
  const muted = useThemeColor({}, 'mutedText');

  useFocusEffect(
    useCallback(() => {
      supabase
        .from('announcements')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(5)
        .then(({ data }) => setNews(data ?? []));
    }, []),
  );

  const first = member?.full_name?.split(' ')[0];

  return (
    <Screen title={first ? `Salaam, ${first.replace(/\s*\(demo\)/, '')}` : 'Salaam'} intro="Everything from the Jamaat in one place.">
      {member && !member.membership_verified ? (
        <Banner tone="info">
          Your account is created. A Jamaat verifier will confirm your membership and link you to your household. You can
          already apply for help and give; family dues and loans appear once you are verified.
        </Banner>
      ) : null}
      <SectionLabel>Announcements</SectionLabel>
      {news.length === 0 ? <FeatureCard title="No announcements yet" description="Jamaat news will appear here." /> : null}
      {news.map((n) => (
        <FeatureCard key={n.id} title={n.title} description={n.body} />
      ))}
      <SectionLabel>Quick actions</SectionLabel>
      <FeatureCard title="Apply for help" description="Medical, education, ration or a scholarship." href="/apply" />
      <FeatureCard title="Support a Sadaat case" description="Verified needs. Sehme Sadaat goes only here." href="/cases/sadaat" />
      <FeatureCard title="Pay Khums or Lawajam" description="Calculate, pay and download receipts." href="/give" />
      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signout}>
        <Text style={[styles.signoutText, { color: muted }]}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  signout: { paddingVertical: 16, alignItems: 'center' },
  signoutText: { fontSize: 16, textDecorationLine: 'underline' },
});
