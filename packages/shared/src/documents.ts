/**
 * Reading a fee receipt, bill or mark sheet from its text. Used when there is no AI key: the server
 * function pulls the text out of a PDF and these rules find the amount, the name and the institution.
 * Mirrored in supabase/functions/check-document/index.ts. Change both together.
 * The database (record_document_check) decides what counts as a mismatch.
 */

/** Document kinds the check reads. Amounts are compared only for receipts and bills. */
export const CHECKED_DOCUMENT_KINDS = ['fee_receipt', 'medical_report', 'marksheet'] as const;

const AMOUNT = /(?:₹|rs\.?|inr)?\s*((?:\d{1,3}(?:,\d{2,3})+|\d+))(?:\.\d{1,2})?\s*(?:\/-)?/gi;
const TOTAL_LINE = /\b(grand\s+total|total\s+(?:fees?|amount|payable|paid)|net\s+(?:payable|amount)|amount\s+(?:paid|payable|due|received)|total)\b/i;
const CURRENCY = /(₹|\brs\.?|\binr\b)\s*\d/i;

function amountsIn(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(AMOUNT)) {
    const n = Number(m[1].replace(/,/g, ''));
    // Skip things that are clearly not money: years, phone numbers, receipt numbers.
    if (Number.isFinite(n) && n > 0 && n < 100_000_000 && m[1].replace(/,/g, '').length <= 9) out.push(n);
  }
  return out;
}

/** The total on a receipt or bill, in whole rupees, or null when none is clear. */
export function findReceiptAmount(text: string): number | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // 1. Lines that say total / amount paid: the largest amount on them.
  const totals = lines
    .filter((l) => TOTAL_LINE.test(l))
    .flatMap((l) => amountsIn(l.replace(/\b(19|20)\d{2}\b/g, '')))
    .filter((n) => n >= 10);
  if (totals.length > 0) return Math.max(...totals);
  // 2. Otherwise the largest amount written with ₹ / Rs / INR.
  const money = lines.filter((l) => CURRENCY.test(l)).flatMap(amountsIn);
  return money.length > 0 ? Math.max(...money) : null;
}

/** The person named on the document ("Student name: …", "Patient name: …", "Name: …"), or null. */
export function findDocumentName(text: string): string | null {
  const m = text.match(
    /\b(?:student(?:'s)?\s+name|name\s+of\s+(?:the\s+)?(?:student|patient|candidate)|patient(?:'s)?\s+name|candidate(?:'s)?\s+name|name)\s*[:\-]\s*([A-Za-z][A-Za-z .']{2,79})/i,
  );
  if (!m) return null;
  // Stop at the next label on the same line ("Fatema Hussain Class: IX").
  const name = m[1]
    .split(/\s{2,}|\t/)[0]
    .replace(/\s+(class|std|standard|roll|age|date|div|division|section|reg|id|ward|bed|uhid|mrn)\b.*$/i, '')
    .trim()
    .replace(/[ .]+$/, '');
  return name.length >= 3 ? name : null;
}

/** The school, college or hospital the document comes from, or null. */
export function findInstitution(text: string): string | null {
  const line = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /\b(school|college|institute|university|hospital|academy|madressa|clinic)\b/i.test(l) && l.length <= 120);
  return line ? line.split(/\s{2,}/)[0].trim() : null;
}
