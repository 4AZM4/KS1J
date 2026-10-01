// Qard-e-Hasana education loans: interest-free, no late fees.
// The family proposes a monthly EMI and the committee agrees it before any money is paid out.
// The EMI can be budget-friendly but never so low that repayment drags past the maximum tenure.
// These rules mirror the database (supabase/migrations/*_loan_repayment_plan.sql). Change both together.

/** Smallest EMI allowed: the loan must be repaid within the maximum tenure. */
export function minimumEmi(principal: number, maxTenureMonths: number): number {
  if (!Number.isInteger(principal) || principal <= 0) throw new Error('principal must be a positive whole number');
  if (!Number.isInteger(maxTenureMonths) || maxTenureMonths <= 0) throw new Error('maxTenureMonths must be a positive whole number');
  return Math.ceil(principal / maxTenureMonths);
}

/** How many monthly payments it takes to clear `outstanding` at `emi`. */
export function monthsToRepay(outstanding: number, emi: number): number {
  if (emi <= 0) throw new Error('emi must be positive');
  return Math.ceil(Math.max(0, outstanding) / emi);
}

export type EmiCheck =
  | { ok: true; emi: number; months: number }
  | { ok: false; reason: string; minimumEmi: number };

/** Checks a proposed EMI, so the app can show "this takes N months" or why it is too low. */
export function checkEmiProposal(principal: number, proposedEmi: number, maxTenureMonths: number): EmiCheck {
  const floor = minimumEmi(principal, maxTenureMonths);
  if (!Number.isInteger(proposedEmi) || proposedEmi <= 0) {
    return { ok: false, reason: 'Enter a monthly amount in whole rupees.', minimumEmi: floor };
  }
  if (proposedEmi < floor) {
    return {
      ok: false,
      reason: `The EMI must be at least ₹${floor.toLocaleString('en-IN')} so the loan is repaid within ${maxTenureMonths} months.`,
      minimumEmi: floor,
    };
  }
  const emi = Math.min(proposedEmi, principal);
  return { ok: true, emi, months: monthsToRepay(principal, emi) };
}

/**
 * Automatic follow-up ladder. No person needs to chase a payment until 15 days late.
 * daysPastDue < 0 means the payment is not due yet.
 */
export const FOLLOW_UP_STAGES = [
  'none',
  'upcoming_reminder', // 3 days before due: remind the payer
  'missed_reminder', // missed: remind the payer, retry AutoPay
  'notify_guarantor', // 7 days late: guarantor is told too
  'officer_follow_up', // 15 days late: case officer's list
  'committee_review', // 30 days late: committee review; new non-emergency requests paused
  'paused_for_review', // a hardship request is pending: the ladder stops
] as const;
export type FollowUpStage = (typeof FOLLOW_UP_STAGES)[number];

export function followUpStage(daysPastDue: number, hasPendingHardshipRequest: boolean): FollowUpStage {
  if (hasPendingHardshipRequest) return 'paused_for_review';
  if (daysPastDue < -3) return 'none';
  if (daysPastDue <= 0) return 'upcoming_reminder';
  if (daysPastDue < 7) return 'missed_reminder';
  if (daysPastDue < 15) return 'notify_guarantor';
  if (daysPastDue < 30) return 'officer_follow_up';
  return 'committee_review';
}
