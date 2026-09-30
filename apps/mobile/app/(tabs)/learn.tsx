import * as WebBrowser from 'expo-web-browser';

import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';

// TODO(decision): replace with LEAP's real link once the Jamaat confirms it.
const LEAP_URL = 'https://ksijamat.org/';

export default function LearnScreen() {
  return (
    <Screen title="Learn" intro="Answers come only from Jamaat-approved texts, with the source shown.">
      <SectionLabel>Ask</SectionLabel>
      <FeatureCard title="Jamaat helpdesk" description="Ask about services, forms, timings and procedures." />
      <SectionLabel>Study</SectionLabel>
      <FeatureCard title="Knowledge library" description="Books and lectures from the Jamaat." badge="Coming soon" />
      <FeatureCard title="Ziyarat companion" description="Ziyarat and duas with translation, offline." badge="Coming soon" />
      <FeatureCard title="eMadressa" description="Online madressa lessons and progress for your children." badge="Coming soon" />
      <SectionLabel>Careers</SectionLabel>
      <FeatureCard
        title="Jobs & Careers (LEAP)"
        description="Opens LEAP, the Jamaat's careers initiative."
        onPress={() => WebBrowser.openBrowserAsync(LEAP_URL)}
      />
    </Screen>
  );
}
