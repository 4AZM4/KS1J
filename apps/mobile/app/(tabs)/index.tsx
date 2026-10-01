import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { buildReminders, type Reminder, type Tables } from '@ks1j/shared';

import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const { member, session, signOut } = useAuth();
  const [news, setNews] = useState<Tables<'announcements'>[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const muted = useThemeColor({}, 'mutedText');

  useFocusEffect(
    useCallback(() => {
      if (session) void loadReminders(session.user.id).then(setReminders);
      supabase
        .from('announcements')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(5)
        .then(({ data }) => setNews(data ?? []));
    }, [session]),
  );

  const first = member?.full_name?.split(' ')[0];

  return (
    <Screen hero title={first ? `Salaam, ${first.replace(/\s*\(demo\)/, '')}` : 'Salaam'} intro="Everything from the Jamaat in one place.">
      {member && !member.membership_verified ? (
        <Banner tone="info">
          Your account is created. A Jamaat verifier will confirm your membership and link you to your household. You can
          already apply for help and give; family dues and loans appear once you are verified.
        </Banner>
      ) : null}
      {reminders.length > 0 ? (
        <>
          <SectionLabel>For you</SectionLabel>
          {reminders.map((r) => (
            <ReminderCard key={r.key} r={r} />
          ))}
        </>
      ) : null}
      <SectionLabel>Announcements</SectionLabel>
      {news.length === 0 ? <FeatureCard title="No announcements yet" description="Jamaat news will appear here." /> : null}
      {news.map((n) => (
        <FeatureCard key={n.id} icon="speakerphone" title={n.title} description={n.body} />
      ))}
      <SectionLabel>Quick actions</SectionLabel>
      <FeatureCard icon="file-plus" title="Apply for help" description="Medical, education, ration or a scholarship." href="/apply" />
      <FeatureCard accent="gold" icon="heart-handshake" title="Support a Sadaat case" description="Verified needs. Sehme Sadaat goes only here." href="/cases/sadaat" />
      <FeatureCard icon="calculator" title="Pay Khums or Lawajam" description="Calculate, pay and download receipts." href="/give" />
      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signout}>
        <Text style={[styles.signoutText, { color: muted }]}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

/** Everything a reminder needs, read with the member's own permissions (RLS). */
async function loadReminders(me: string): Promise<Reminder[]> {
  const [loans, hardship, khums, dues] = await Promise.all([
    supabase.from('education_loans').select('*').or(`borrower_id.eq.${me},payer_member_id.eq.${me}`),
    supabase.from('loan_hardship_requests').select('loan_id').eq('status', 'pending'),
    supabase.from('khums_profiles').select('year_end_month, year_end_day').eq('member_id', me).maybeSingle(),
    supabase.from('lawajam_dues').select('period, amount').eq('status', 'pending'),
  ]);
  const pending = new Set((hardship.data ?? []).map((h) => h.loan_id));
  return buildReminders({
    today: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in the phone's time zone
    loans: (loans.data ?? []).map((l) => ({
      planAgreed: !!l.plan_agreed_at,
      status: l.status,
      nextDueDate: l.next_due_date,
      agreedEmi: l.agreed_emi,
      autopayActive: l.autopay_status === 'active',
      hardshipPending: pending.has(l.id),
      iAmPayer: l.payer_member_id === me,
    })),
    khumsYearEnd: khums.data ? { month: khums.data.year_end_month, day: khums.data.year_end_day } : null,
    lawajamDue: dues.data ?? [],
  });
}

const TONE = { urgent: '#B42318', soon: '#B7791F', info: '#0F6B4F' } as const;

function ReminderCard({ r }: { r: Reminder }) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens the page for this reminder"
      onPress={() => router.push(r.href)}
      style={({ pressed }) => [
        styles.reminder,
        { backgroundColor: card, borderColor: border, borderLeftColor: TONE[r.tone], opacity: pressed ? 0.75 : 1 },
      ]}>
      <View lightColor="transparent" darkColor="transparent">
        <Text style={styles.reminderTitle}>{r.title}</Text>
        <Text style={[styles.reminderBody, { color: muted }]}>{r.body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  reminder: { borderWidth: 1, borderLeftWidth: 6, borderRadius: 14, padding: 16, marginBottom: 12 },
  reminderTitle: { fontSize: 18, fontWeight: '700' },
  reminderBody: { fontSize: 16, lineHeight: 22, marginTop: 4 },
  signout: { paddingVertical: 16, alignItems: 'center' },
  signoutText: { fontSize: 16, textDecorationLine: 'underline' },
});
