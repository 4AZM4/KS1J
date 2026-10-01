import * as WebBrowser from 'expo-web-browser';

import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';

const LEAP_URL = 'https://ksijleap.com/';

export default function LearnScreen() {
  return (
    <Screen hero title="Learn" intro="Answers come only from Jamaat-approved texts, with the source shown.">
      <SectionLabel>Ask</SectionLabel>
      <FeatureCard title="Jamaat helpdesk" description="Ask about loans, applications, giving and dues. Answers show their source." href="/helpdesk" />
      <SectionLabel>Study</SectionLabel>
      <FeatureCard title="History of the Jamaat" description="Our story, heritage and milestones." badge="Coming soon" />
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
