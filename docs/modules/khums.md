# Module: Khums

**Owner:** Person C · **Tables:** `khums_profiles`, `khums_calculations`, `donations`, `institutions`, `ledger_entries` · **Shared:** `calculateKhums`

## What it does

Members calculate Khums, see it split into Sehme Imam and Sehme Sadaat, and pay each share to an allowed recipient.

## Rules

- 20% of annual surplus; split half and half (`calculateKhums` keeps the two shares summing exactly).
- **Sehme Sadaat** → only verified Sadaat (Syed) cases.
- **Sehme Imam** → only institutions with a verified ijazah from a Marja'. Never individuals or cases.
- Every Khums screen shows: "This is a guide only. Confirm with your Marja' or the Jamaat's alim."
- Helper text wording must be approved by the Jamaat's scholar before launch.

## Screens

1. **Setup:** Khums year-end date and Marja' (free text for now).
2. **Calculator:** savings, unused goods, business surplus, exempt amounts → due, Sehme Imam, Sehme Sadaat. Save to `khums_calculations`.
3. **Pay Sehme Imam:** list verified institutions (RLS already hides unverified) → amount → pay.
4. **Pay Sehme Sadaat:** Sadaat cases list → amount → pay.
5. **History:** past calculations and payments with receipts.
6. **Admin, /admin/institutions:** trustees add institutions and verify the ijazah document.
7. **Admin, /admin/khums:** collections per share from `ledger_entries`.

## On the day

Payments use Razorpay test mode, or the mock gateway when `DEMO_MODE=true`.

## Acceptance tests

- [ ] Entering ₹1,00,000 savings shows ₹20,000 due, ₹10,000 per share.
- [ ] The guidance line is visible on every Khums screen.
- [ ] An institution without a verified ijazah never appears in the Sehme Imam list.
- [ ] Sehme Sadaat cannot be sent to a Non-Sadaat case (UI hides it; DB rejects it).
- [ ] A reminder is scheduled for the member's Khums year-end date.
