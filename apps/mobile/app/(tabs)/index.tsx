import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { buildReminders, todayInIndia, type Reminder, type Tables } from '@ks1j/shared';

import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Banner } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ART } from '@/components/Art';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const { member, session, signOut } = useAuth();
  const [news, setNews] = useState<Tables<'announcements'>[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [updates, setUpdates] = useState<Tables<'notifications'>[]>([]);
  const { t } = useT();
  const muted = useThemeColor({}, 'mutedText');

  useFocusEffect(
    useCallback(() => {
      if (session) void loadReminders(session.user.id, member?.household_id ?? null).then(setReminders);
      if (session)
        supabase
          .from('notifications')
          .select('*')
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .limit(5)
          .then(({ data }) => setUpdates(data ?? []));
      supabase
        .from('announcements')
        .select('*')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(5)
        .then(({ data }) => setNews(data ?? []));
    }, [session, member?.household_id]),
  );

  const first = member?.full_name?.split(' ')[0];

  return (
    <Screen
      hero
      title={first ? t('home.salaamName', { name: first.replace(/\s*\(demo\)/, '') }) : t('home.salaam')}
      intro={t('home.intro')}>
      {member && !member.membership_verified ? (
        <Banner tone="info">
          Your account is created. A Jamaat verifier will confirm your membership and link you to your household. You can
          already apply for help and give; family dues and loans appear once you are verified.
        </Banner>
      ) : null}
      {updates.length > 0 ? (
        <>
          <SectionLabel>{t('sec.updates')}</SectionLabel>
          {updates.map((n) => (
            <UpdateCard key={n.id} n={n} onRead={() => setUpdates((u) => u.filter((x) => x.id !== n.id))} />
          ))}
        </>
      ) : null}
      {reminders.length > 0 ? (
        <>
          <SectionLabel>{t('sec.forYou')}</SectionLabel>
          {reminders.map((r) => (
            <ReminderCard key={r.key} r={r} />
          ))}
        </>
      ) : null}
      <SectionLabel>{t('sec.announcements')}</SectionLabel>
      {news.length === 0 ? <FeatureCard icon="speakerphone" title={t('card.noNews.t')} description={t('card.noNews.d')} /> : null}
      {news.map((n) => (
        <FeatureCard key={n.id} icon="speakerphone" title={n.title} description={n.body} />
      ))}
      <SectionLabel>{t('sec.quick')}</SectionLabel>
      <FeatureCard icon="file-plus" title={t('card.apply.t')} description={t('card.apply.d')} href="/apply" />
      <FeatureCard icon="heart-handshake" accent="gold" title={t('card.supportSadaat.t')} description={t('card.supportSadaat.d')} href="/cases/sadaat" />
      <FeatureCard icon="calculator" title={t('card.payKhums.t')} description={t('card.payKhums.d')} href="/give" />
      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signout}>
        <Text style={[styles.signoutText, { color: muted }]}>{t('common.signOut')}</Text>
      </Pressable>
    </Screen>
  );
}

/** Everything a reminder needs, read with the member's own permissions (RLS). */
async function loadReminders(me: string, householdId: string | null): Promise<Reminder[]> {
  // Staff can read every household's dues and requests, so filter to this member's own.
  const [loans, khums, dues] = await Promise.all([
    supabase.from('education_loans').select('*').or(`borrower_id.eq.${me},payer_member_id.eq.${me}`),
    supabase.from('khums_profiles').select('year_end_month, year_end_day').eq('member_id', me).maybeSingle(),
    householdId
      ? supabase.from('lawajam_dues').select('period, amount').eq('status', 'pending').eq('household_id', householdId)
      : Promise.resolve({ data: [] as { period: string; amount: number }[] }),
  ]);
  const loanIds = (loans.data ?? []).map((l) => l.id);
  const hardship = loanIds.length
    ? await supabase.from('loan_hardship_requests').select('loan_id').eq('status', 'pending').in('loan_id', loanIds)
    : { data: [] as { loan_id: string }[] };
  const pending = new Set((hardship.data ?? []).map((h) => h.loan_id));
  return buildReminders({
    today: todayInIndia(),
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

/** A notice from the Jamaat (case step, need met). Tapping it marks it read and opens the case. */
function UpdateCard({ n, onRead }: { n: Tables<'notifications'>; onRead: () => void }) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'mutedText');
  async function open() {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
    onRead();
    if (n.kind === 'need_met' && n.case_id) router.push({ pathname: '/case/[id]', params: { id: n.case_id } });
    else router.push('/applications');
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Marks this update read and opens it"
      onPress={() => void open()}
      style={({ pressed }) => [styles.update, { backgroundColor: card, borderColor: border, opacity: pressed ? 0.75 : 1 }]}>
      <View style={styles.updateIcon} lightColor={ART.gold} darkColor={ART.gold}>
        <Icon name={n.kind === 'need_met' ? 'heart' : 'bell-ringing'} size={24} color={ART.darkest} />
      </View>
      <View style={{ flex: 1 }} lightColor="transparent" darkColor="transparent">
        <Text style={styles.reminderTitle}>{n.title}</Text>
        <Text style={[styles.reminderBody, { color: muted }]}>{n.body}</Text>
      </View>
    </Pressable>
  );
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
  update: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 14, alignItems: 'center' },
  updateIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  signoutText: { fontSize: 16, textDecorationLine: 'underline' },
});
