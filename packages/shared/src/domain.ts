// Domain constants shared by the app, the website and the database.
// These mirror the Postgres enums in supabase/migrations — change both together.

export const ADMIN_ROLES = ['volunteer', 'verifier', 'trustee', 'finance', 'super_admin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const CASE_TYPES = ['medical', 'education', 'ration', 'scholarship', 'education_loan', 'other'] as const;
export type CaseType = (typeof CASE_TYPES)[number];

export const CASE_CATEGORIES = ['sadaat', 'non_sadaat'] as const;
export type CaseCategory = (typeof CASE_CATEGORIES)[number];

// Submitted -> Verified -> Approved -> Published -> Funded -> Disbursed -> Closed
export const CASE_STATUSES = [
  'submitted',
  'verified',
  'approved',
  'published',
  'funded',
  'disbursed',
  'closed',
  'rejected',
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const FUND_TYPES = ['sehme_sadaat', 'sehme_imam', 'general', 'lawajam', 'loan_repayment'] as const;
export type FundType = (typeof FUND_TYPES)[number];

export type DonationTarget =
  | { kind: 'case'; category: CaseCategory }
  | { kind: 'institution'; hasVerifiedIjazah: boolean };

/**
 * Where each fund type may go. The database enforces the same rules
 * (see check_donation_rules in the migrations); this copy lets the UI hide
 * options that would be rejected anyway.
 *
 * - Sehme Sadaat: verified Sadaat (Syed) cases only.
 * - Sehme Imam: only institutions holding a verified ijazah from a Marja'.
 * - General donation: any published case.
 */
export function isDonationAllowed(fund: FundType, target: DonationTarget): boolean {
  switch (fund) {
    case 'sehme_sadaat':
      return target.kind === 'case' && target.category === 'sadaat';
    case 'sehme_imam':
      return target.kind === 'institution' && target.hasVerifiedIjazah;
    case 'general':
      return target.kind === 'case';
    default:
      return false;
  }
}

/** Legal next statuses for a case. Verify and approve must be done by different admins. */
export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  submitted: ['verified', 'rejected'],
  verified: ['approved', 'rejected'],
  approved: ['published'],
  published: ['funded'],
  funded: ['disbursed'],
  disbursed: ['closed'],
  closed: [],
  rejected: [],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return CASE_TRANSITIONS[from].includes(to);
}
