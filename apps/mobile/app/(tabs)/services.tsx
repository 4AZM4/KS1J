import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';

// Each card becomes a flow. Specs: docs/modules/cases.md and docs/modules/loans.md.
export default function ServicesScreen() {
  return (
    <Screen title="Services" intro="Apply once and track every step. Your details are only seen by the assigned committee.">
      <SectionLabel>Apply</SectionLabel>
      <FeatureCard title="Welfare assistance" description="Medical, education or ration support. Upload documents and track your case." />
      <FeatureCard title="Scholarship" description="Fees paid directly to your school or college once approved." />
      <FeatureCard title="Education loan" description="Interest-free. Repay monthly only after you start earning well." />
      <SectionLabel>Your account</SectionLabel>
      <FeatureCard title="My applications" description="See status: Submitted, Verified, Approved, Disbursed." />
      <FeatureCard title="Profile and household" description="Your membership details and family members." />
      <SectionLabel>Emergency</SectionLabel>
      <FeatureCard title="Blood donors (SOS)" description="Find matching donors nearby." badge="Coming soon" />
    </Screen>
  );
}
