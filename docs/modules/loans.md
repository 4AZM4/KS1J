# Module: Education loans (Qard-e-Hasana)

**Owner:** Person C · **Tables:** `education_loans`, `income_declarations`, `loan_repayments`, `ledger_entries` · **Shared:** `monthlyInstalment`

## What it does

Interest-free education loans. Fees go straight to the institution. The graduate repays monthly only once earning above the committee's threshold. Repayments fund the next student.

## Lifecycle

`studying → grace → repaying → closed`, with `paused` (hardship) and `converted_to_grant` possible at any time by a trustee.

1. Apply as a case with `type = 'education_loan'`, plus guarantor name and phone and a signed agreement upload.
2. Verify and approve as any case (two different admins). Trustee sets threshold, share of excess income, minimum instalment.
3. Finance pays fees each semester (disbursements).
4. Studying: yearly progress confirmation.
5. After course end: yearly income declaration with proof → `monthlyInstalment()` sets the instalment; 0 below threshold.
6. Repay monthly (UPI AutoPay or manual). Confirmed repayment reduces `outstanding`; at 0 the loan closes.

## Care rules

- No interest. No late fees. Missed payment → reminder, then a case-officer call. Never public.
- Loan details visible only to borrower, guarantor (future) and staff.
- Closing message tells the graduate how many students their repayments helped.

## Screens

**App:** My loan (balance, next instalment, history, receipts), Declare income, Pay instalment, Request pause.
**Web, /admin/loans:** counts by status, fund balance, repayments this month, overdue list.

## Acceptance tests

- [ ] Income below threshold → instalment ₹0 and no reminder sent.
- [ ] Income ₹40,000 with threshold ₹30,000 and 20% share → ₹2,000 per month.
- [ ] A confirmed repayment lowers the balance and appears in the ledger once.
- [ ] Balance reaching 0 closes the loan automatically.
- [ ] No screen or message mentions interest or penalties.
