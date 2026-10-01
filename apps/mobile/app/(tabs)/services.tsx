import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';
import { useT } from '@/lib/i18n';

// Each card becomes a flow. Specs: docs/modules/cases.md and docs/modules/loans.md.
export default function ServicesScreen() {
  const { t } = useT();
  return (
    <Screen hero title={t('tab.services')} intro={t('services.intro')}>
      <SectionLabel>{t('sec.apply')}</SectionLabel>
      <FeatureCard icon="first-aid-kit" title={t('card.welfare.t')} description={t('card.welfare.d')} href="/apply" />
      <FeatureCard icon="school" title={t('card.scholarship.t')} description={t('card.scholarship.d')} href="/apply?type=scholarship" />
      <FeatureCard icon="cash" title={t('card.loan.t')} description={t('card.loan.d')} href="/loan" />
      <SectionLabel>{t('sec.account')}</SectionLabel>
      <FeatureCard icon="list-check" title={t('card.applications.t')} description={t('card.applications.d')} href="/applications" />
      <FeatureCard icon="user" title={t('card.profile.t')} description={t('card.profile.d')} href="/profile" />
      <SectionLabel>{t('sec.emergency')}</SectionLabel>
      <FeatureCard icon="droplet" title={t('card.blood.t')} description={t('card.blood.d')} badge="Coming soon" badgeLabel={t('common.comingSoon')} />
    </Screen>
  );
}
