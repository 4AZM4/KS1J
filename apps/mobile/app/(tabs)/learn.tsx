import * as WebBrowser from 'expo-web-browser';

import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';
import { useT } from '@/lib/i18n';

const LEAP_URL = 'https://ksijleap.com/';

export default function LearnScreen() {
  const { t } = useT();
  return (
    <Screen hero title={t('tab.learn')} intro={t('learn.intro')}>
      <SectionLabel>{t('sec.ask')}</SectionLabel>
      <FeatureCard icon="message-question" title={t('card.helpdesk.t')} description={t('card.helpdesk.d')} href="/helpdesk" />
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
