// Khums calculator. This is a guide only: every screen that shows these
// numbers must also say "Confirm with your Marja' or the Jamaat's alim".
// Amounts are in whole rupees (integers) to avoid floating-point drift.

export interface KhumsInput {
  /** Cash and bank balances left at the Khums year-end that came from income. */
  savings: number;
  /** Value of goods bought from income and not used during the year. */
  unusedGoods: number;
  /** Business stock or profit held at year-end. */
  businessSurplus: number;
  /** Amounts already exempt or already paid Khums on, as advised by the Marja'. */
  exempt: number;
}

export interface KhumsResult {
  surplus: number;
  khumsDue: number;
  sehmeImam: number;
  sehmeSadaat: number;
}

export const KHUMS_RATE = 0.2;

export function calculateKhums(input: KhumsInput): KhumsResult {
  for (const [key, value] of Object.entries(input)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${key} must be a non-negative number`);
    }
  }
  const surplus = Math.max(0, input.savings + input.unusedGoods + input.businessSurplus - input.exempt);
  const khumsDue = Math.round(surplus * KHUMS_RATE);
  // Split in half; any odd rupee goes to Sehme Imam so the two always add up.
  const sehmeSadaat = Math.floor(khumsDue / 2);
  const sehmeImam = khumsDue - sehmeSadaat;
  return { surplus, khumsDue, sehmeImam, sehmeSadaat };
}
