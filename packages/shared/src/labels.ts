import type { AdminRole, CaseCategory, CaseStatus, CaseType, FundType } from './domain';

export const rupees = (n: number | null | undefined) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

export const CASE_TYPE_LABEL: Record<CaseType, string> = {
  medical: 'Medical',
  education: 'Education',
  ration: 'Ration',
  scholarship: 'Scholarship',
  education_loan: 'Education loan',
  other: 'Other',
};

export const CATEGORY_LABEL: Record<CaseCategory, string> = {
  sadaat: 'Sadaat',
  non_sadaat: 'Non-Sadaat',
};

export const STATUS_LABEL: Record<CaseStatus, string> = {
  submitted: 'Submitted',
  verified: 'Verified',
  approved: 'Approved',
  published: 'Published',
  funded: 'Fully funded',
  disbursed: 'Paid out',
  closed: 'Closed',
  rejected: 'Not approved',
};

export const FUND_LABEL: Record<FundType, string> = {
  sehme_sadaat: 'Sehme Sadaat',
  sehme_imam: 'Sehme Imam',
  general: 'General donation',
  lawajam: 'Lawajam',
  loan_repayment: 'Loan repayment',
};

export const ROLE_LABEL: Record<AdminRole, string> = {
  volunteer: 'Volunteer',
  verifier: 'Verifier',
  trustee: 'Trustee',
  finance: 'Finance',
  super_admin: 'Super admin',
};

/** The order a case moves through, for timelines. */
export const CASE_STEPS: CaseStatus[] = ['submitted', 'verified', 'approved', 'published', 'funded', 'disbursed', 'closed'];

/**
 * Fictional seed accounts, shown only when demo mode is on (EXPO_PUBLIC_DEMO_MODE / NEXT_PUBLIC_DEMO_MODE).
 * They share one password, set by supabase/demo_accounts.sql.
 */
export const DEMO_PASSWORD = 'ks1j-demo-2026';
export const DEMO_ACCOUNTS = [
  { email: 'fatema@ks1j.test', name: 'Fatema', role: 'Member (applicant, loan payer)' },
  { email: 'abbas@ks1j.test', name: 'Abbas', role: 'Member (loan to agree)' },
  { email: 'donor@ks1j.test', name: 'Donor', role: 'Member (donor)' },
  { email: 'volunteer@ks1j.test', name: 'Volunteer', role: 'Volunteer' },
  { email: 'verifier@ks1j.test', name: 'Verifier', role: 'Welfare committee verifier' },
  { email: 'trustee@ks1j.test', name: 'Trustee', role: 'Trustee' },
  { email: 'finance@ks1j.test', name: 'Finance', role: 'Finance admin' },
  { email: 'superadmin@ks1j.test', name: 'Super admin', role: 'Super admin' },
] as const;
