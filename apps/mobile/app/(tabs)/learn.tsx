import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';

import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

const LEAP_URL = 'https://ksijleap.com/';

export default function LearnScreen() {
  const { t } = useT();
  const { member } = useAuth();
  const [waiting, setWaiting] = useState(0);

  // New message and call requests waiting for this member's answer.
  useFocusEffect(
    useCallback(() => {
      if (!member?.membership_verified) return;
      void supabase
        .from('community_connections')
        .select('id', { count: 'exact', head: true })
        .eq('to_id', member.id)
        .eq('status', 'pending')
        .then(({ count }) => setWaiting(count ?? 0));
    }, [member]),
  );

  return (
    <Screen hero title={t('tab.learn')} intro={t('learn.intro')}>
      <SectionLabel>{t('sec.ask')}</SectionLabel>
      <FeatureCard icon="message-question" title={t('card.helpdesk.t')} description={t('card.helpdesk.d')} href="/helpdesk" />

      <SectionLabel>{t('sec.community')}</SectionLabel>
      <FeatureCard icon="news" title={t('card.feed.t')} description={t('card.feed.d')} href="/community/feed" />
      <FeatureCard icon="address-book" title={t('card.directory.t')} description={t('card.directory.d')} href="/community/directory" />
      <FeatureCard icon="heart-handshake" title={t('card.mentors.t')} description={t('card.mentors.d')} href="/community/directory?mentors=1" />
      <FeatureCard icon="briefcase" title={t('card.opps.t')} description={t('card.opps.d')} href="/community/opportunities" />
      <FeatureCard
        icon="messages"
        accent={waiting > 0 ? 'gold' : undefined}
        title={waiting > 0 ? `${t('card.messages.t')} · ${waiting}` : t('card.messages.t')}
        description={t('card.messages.d')}
        href="/community/messages"
      />
      <FeatureCard icon="users-group" title={t('card.groups.t')} description={t('card.groups.d')} href="/community/groups" />
      <FeatureCard icon="user" title={t('card.cprofile.t')} description={t('card.cprofile.d')} href="/community/profile" />

      <SectionLabel>{t('sec.study')}</SectionLabel>
      <FeatureCard icon="history" title={t('card.history.t')} description={t('card.history.d')} badge="Coming soon" badgeLabel={t('common.comingSoon')} />
      <FeatureCard icon="school" title={t('card.madressa.t')} description={t('card.madressa.d')} badge="Coming soon" badgeLabel={t('common.comingSoon')} />
      <SectionLabel>{t('sec.careers')}</SectionLabel>
      <FeatureCard
        icon="briefcase"
        title={t('card.leap.t')}
        description={t('card.leap.d')}
        onPress={() => WebBrowser.openBrowserAsync(LEAP_URL)}
      />
    </Screen>
  );
}
