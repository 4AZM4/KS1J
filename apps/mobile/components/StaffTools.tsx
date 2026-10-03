import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import type { AdminRole, IconName } from '@ks1j/shared';

import { FeatureCard } from '@/components/FeatureCard';
import { SectionLabel } from '@/components/Screen';
import { supabase } from '@/lib/supabase';

/**
 * Committee members (volunteers, verifiers, trustees, finance, super admins) see their work here
 * instead of the member services. The full tools are in the committee dashboard on the website;
 * referring a family is done right in the app. RLS still decides what each role can see and do.
 */
const WEBSITE = (process.env.EXPO_PUBLIC_WEBSITE_URL ?? 'https://4azm4.github.io/KS1J').replace(/\/$/, '');

export const isStaff = (roles: AdminRole[]) => roles.length > 0;
const can = (roles: AdminRole[], allowed: AdminRole[]) => roles.includes('super_admin') || allowed.some((r) => roles.includes(r));
const openDashboard = (path: string) => void Linking.openURL(`${WEBSITE}${path}`);

type Tool = { icon: IconName; title: string; description: string; path?: string; href?: '/apply?refer=1'; roles: AdminRole[] };

const TOOLS: Tool[] = [
  {
    icon: 'file-plus',
    title: 'Refer a family',
    description: 'Apply for help on behalf of a family who cannot use the app. They are told at each step.',
    href: '/apply?refer=1',
    roles: ['volunteer'],
  },
  {
    icon: 'file-search',
    title: 'Verify cases and documents',
    description: 'Check new requests, read the receipt check and verify Sadaat lineage.',
    path: '/admin/cases/',
    roles: ['verifier'],
  },
  {
    icon: 'rosette-discount-check',
    title: 'Approve and publish cases',
    description: 'Approve verified cases and publish them for donors. You cannot approve a case you verified.',
    path: '/admin/cases/',
    roles: ['trustee'],
  },
  { icon: 'flag', title: 'Fraud flags', description: 'Mismatched receipts and duplicate requests waiting for a decision.', path: '/admin/flags/', roles: ['verifier', 'trustee'] },
  { icon: 'users', title: 'Members to verify', description: 'New sign-ups to check and link to their household.', path: '/admin/members/', roles: ['volunteer', 'verifier'] },
  { icon: 'cash', title: 'Education loans', description: 'Repayment plans to agree, hardship requests and the follow-up list.', path: '/admin/loans/', roles: ['trustee', 'finance'] },
  { icon: 'coin-rupee', title: 'Payouts and ledgers', description: 'Pay funded cases from the right fund and hand Sehme Imam to institutions.', path: '/admin/khums/', roles: ['finance'] },
  { icon: 'speakerphone', title: 'Announcements', description: 'Post news to the app Home and the website.', path: '/admin/announcements/', roles: ['trustee'] },
];

/** The Services tab for committee members. */
export function StaffServices({ roles }: { roles: AdminRole[] }) {
  return (
    <>
      <SectionLabel>Committee work</SectionLabel>
      {TOOLS.filter((t) => can(roles, t.roles)).map((t) => (
        <FeatureCard
          key={t.title}
          icon={t.icon}
          title={t.title}
          description={t.path ? `${t.description} Opens the committee dashboard.` : t.description}
          href={t.href}
          onPress={t.path ? () => openDashboard(t.path!) : undefined}
        />
      ))}
      <FeatureCard
        icon="layout-dashboard"
        title="Open the committee dashboard"
        description="Everything for your role, on the website. Sign in there with the same account."
        onPress={() => openDashboard('/admin/')}
      />
    </>
  );
}

type Counts = { verify: number; approve: number; publish: number; flags: number; members: number };

/** Home for committee members: what is waiting for their role today. */
export function CommitteeToday({ roles }: { roles: AdminRole[] }) {
  const [c, setC] = useState<Counts | null>(null);

  useFocusEffect(
    useCallback(() => {
      const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);
      void Promise.all([
        count(supabase.from('cases').select('id', { count: 'exact', head: true }).eq('status', 'submitted')),
        count(supabase.from('cases').select('id', { count: 'exact', head: true }).eq('status', 'verified')),
        count(supabase.from('cases').select('id', { count: 'exact', head: true }).eq('status', 'approved')),
        count(supabase.from('fraud_flags').select('id', { count: 'exact', head: true }).eq('status', 'open')),
        count(supabase.from('members').select('id', { count: 'exact', head: true }).eq('membership_verified', false)),
      ]).then(([verify, approve, publish, flags, members]) => setC({ verify, approve, publish, flags, members }));
    }, []),
  );

  if (!c) return null;
  const items = [
    { n: c.verify, one: 'case to verify', many: 'cases to verify', path: '/admin/cases/', roles: ['verifier'] as AdminRole[] },
    { n: c.approve, one: 'case to approve', many: 'cases to approve', path: '/admin/cases/', roles: ['trustee'] as AdminRole[] },
    { n: c.publish, one: 'case to publish', many: 'cases to publish', path: '/admin/cases/', roles: ['trustee'] as AdminRole[] },
    { n: c.flags, one: 'open fraud flag', many: 'open fraud flags', path: '/admin/flags/', roles: ['verifier', 'trustee'] as AdminRole[] },
    { n: c.members, one: 'new member to verify', many: 'new members to verify', path: '/admin/members/', roles: ['volunteer', 'verifier'] as AdminRole[] },
  ].filter((x) => x.n > 0 && can(roles, x.roles));

  return (
    <>
      <SectionLabel>Waiting for you</SectionLabel>
      {items.length === 0 ? (
        <FeatureCard icon="shield-check" title="Nothing waiting" description="No cases, flags or members need your role right now." />
      ) : (
        items.map((x) => (
          <FeatureCard
            key={x.many}
            icon="list-check"
            accent="gold"
            title={`${x.n} ${x.n === 1 ? x.one : x.many}`}
            description="Opens the committee dashboard."
            onPress={() => openDashboard(x.path)}
          />
        ))
      )}
    </>
  );
}
