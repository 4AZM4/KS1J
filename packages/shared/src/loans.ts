// Qard-e-Hasana education loans: interest-free, repaid monthly only once
// the graduate earns above the committee's threshold. No interest, no late fees.

export interface LoanTerms {
  /** Outstanding principal in rupees. */
  outstanding: number;
  /** Monthly income threshold set by the committee; below it, nothing is due. */
  incomeThreshold: number;
  /** Share of income above the threshold taken as the instalment (e.g. 0.2). */
  shareOfExcessIncome: number;
  /** Smallest instalment worth collecting once repayment starts. */
  minimumInstalment: number;
}

/** Monthly instalment for a declared monthly income. Never more than what is owed. */
export function monthlyInstalment(monthlyIncome: number, terms: LoanTerms): number {
  if (terms.outstanding <= 0) return 0;
  if (monthlyIncome <= terms.incomeThreshold) return 0;
  const excess = monthlyIncome - terms.incomeThreshold;
  const instalment = Math.max(terms.minimumInstalment, Math.round(excess * terms.shareOfExcessIncome));
  return Math.min(instalment, terms.outstanding);
}
