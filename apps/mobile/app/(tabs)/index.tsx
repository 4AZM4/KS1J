import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';

// TODO(module: admin/announcements): replace the placeholder with the latest rows
// from the `announcements` table (readable by everyone, see supabase/migrations).
export default function HomeScreen() {
  return (
    <Screen title="Salaam" intro="Everything from the Jamaat in one place.">
      <SectionLabel>Announcements</SectionLabel>
      <FeatureCard
        title="Welcome to KS1J"
        description="Jamaat announcements, events and majlis timings will appear here."
      />
      <SectionLabel>Quick actions</SectionLabel>
      <FeatureCard title="Apply for help" description="Medical, education or ration assistance." href="/services" />
      <FeatureCard title="Pay Khums or Lawajam" description="Calculate, pay and download receipts." href="/give" />
      <FeatureCard title="Ask a question" description="Answers from verified Jamaat documents." href="/learn" />
    </Screen>
  );
}
