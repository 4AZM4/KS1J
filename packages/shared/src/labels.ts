import type { Enums } from './database.types';
import type { AdminRole, CaseCategory, CaseStatus, CaseType, FundType } from './domain';
import type { FollowUpStage } from './loans';

type LoanStatus = Enums<'loan_status'>;

/** ₹1,20,000 in the Indian grouping; a negative amount reads −₹500, never ₹-500. */
export const rupees = (n: number | null | undefined) => {
  const v = n ?? 0;
  return `${v < 0 ? '−' : ''}₹${Math.abs(v).toLocaleString('en-IN')}`;
};

export const CASE_TYPE_LABEL: Record<CaseType, string> = {
  medical: 'Medical',
  education: 'Education',
  ration: 'Ration',
  scholarship: 'Scholarship',
  education_loan: 'Education loan',
  other: 'Other',
};

export const DOCUMENT_KINDS = ['fee_receipt', 'marksheet', 'income_proof', 'medical_report', 'lineage_proof', 'id_proof', 'other'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  fee_receipt: 'Fee receipt',
  marksheet: 'Mark sheet',
  income_proof: 'Income proof',
  medical_report: 'Medical report or bill',
  // Kept as lineage_proof in the database; for Sadaat cases the committee checks the Aadhaar card.
  lineage_proof: 'Aadhaar card (Sadaat), masked',
  id_proof: 'ID proof',
  other: 'Other',
};

/** Documents that help the verifier most, by case type. Shown first. */
export const SUGGESTED_DOCUMENTS: Record<CaseType, DocumentKind[]> = {
  medical: ['medical_report', 'income_proof', 'id_proof'],
  education: ['fee_receipt', 'marksheet', 'income_proof'],
  ration: ['income_proof', 'id_proof'],
  scholarship: ['fee_receipt', 'marksheet', 'income_proof'],
  education_loan: ['fee_receipt', 'marksheet', 'income_proof'],
  other: ['income_proof', 'id_proof'],
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

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  studying: 'Studying',
  grace: 'Grace period',
  repaying: 'Repaying',
  paused: 'Paused (hardship)',
  closed: 'Fully repaid',
  converted_to_grant: 'Converted to a grant',
};

export const FOLLOW_UP_LABEL: Record<FollowUpStage, string> = {
  none: 'On track',
  upcoming_reminder: 'Due in 3 days',
  missed_reminder: 'Missed, reminder sent',
  notify_guarantor: 'Guarantor told',
  officer_follow_up: 'Officer to call',
  committee_review: 'Committee review',
  paused_for_review: 'Hardship under review',
};

export const AUTOPAY_LABEL: Record<string, string> = {
  not_set: 'Not set up',
  pending: 'Waiting for bank',
  active: 'On',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const IST_OFFSET_MS = 330 * 60 * 1000;

/**
 * "15 Oct 2026" for a YYYY-MM-DD date, or for a timestamp shown as the date in India.
 * Timestamps arrive in UTC, so a payment at 11 pm IST must not show the day before.
 */
export function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (d.length > 10) {
    const t = Date.parse(d);
    if (!Number.isNaN(t)) {
      const ist = new Date(t + IST_OFFSET_MS);
      return `${ist.getUTCDate()} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
    }
  }
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return `${day} ${months[m - 1]} ${y}`;
}

/** Today's date in India as YYYY-MM-DD, whatever the phone's locale or time zone. */
export function todayInIndia(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Shown on every Khums screen (CLAUDE.md rule 8). Wording to be approved by the Jamaat's alim. */
export const KHUMS_GUIDANCE = "This is a guide only. Confirm with your Marja' or the Jamaat's alim.";

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The next Khums year-end on or after today, as YYYY-MM-DD. */
export function nextKhumsYearEnd(month: number, day: number, today = new Date()): string {
  const y = today.getFullYear();
  const lastDay = (yr: number) => new Date(yr, month, 0).getDate();
  const make = (yr: number) => new Date(yr, month - 1, Math.min(day, lastDay(yr)));
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = make(y) >= t ? make(y) : make(y + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Shown on every public case card. The database hides names, phones, emails and addresses. */
export const CASE_PRIVACY_NOTE =
  "To protect the family's dignity, their name and contact details are hidden. The Jamaat knows who they are and has checked the need.";
/** Used when staff did not write a public summary. */
export const CASE_SUMMARY_FALLBACK = 'Checked by a Jamaat verifier and approved by a different trustee.';

/** Sign-in errors from Supabase Auth, in plain words. Other messages pass through unchanged. */
export function friendlyAuthError(message: string, demo = false): string {
  if (/invalid login credentials/i.test(message)) {
    return demo ? 'Wrong email or password. Try again, or tap a demo account below.' : 'Wrong email or password. Please try again.';
  }
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first: open the link we sent you, then sign in.';
  if (/rate limit|too many requests/i.test(message)) return 'Too many tries. Please wait a minute and try again.';
  return message;
}
