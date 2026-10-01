import { FeatureCard } from '@/components/FeatureCard';
import { Screen, SectionLabel } from '@/components/Screen';

// Each card becomes a flow. Specs: docs/modules/cases.md and docs/modules/loans.md.
export default function ServicesScreen() {
  return (
    <Screen hero title="Services" intro="Apply once and track every step. Your details are only seen by the assigned committee.">
      <SectionLabel>Apply</SectionLabel>
      <FeatureCard title="Welfare assistance" description="Medical, education or ration support. Tell us the need and track your case." href="/apply" />
      <FeatureCard title="Scholarship" description="Fees paid directly to your school or college once approved." href="/apply?type=scholarship" />
      <FeatureCard title="Education loan" description="Interest-free. Agree a monthly EMI with your family; repayment starts after a grace period." href="/loan" />
      <SectionLabel>Your account</SectionLabel>
      <FeatureCard title="My applications" description="See status: Submitted, Verified, Approved, Disbursed." href="/applications" />
      <FeatureCard title="Profile and household" description="Your membership details and family members." badge="Coming soon" />
      <SectionLabel>Emergency</SectionLabel>
      <FeatureCard title="Blood donors (SOS)" description="Find matching donors nearby." badge="Coming soon" />
    </Screen>
  );
}
