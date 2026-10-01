# Module: AI, automation and security

**Owner:** Person D (AI) + Person C (security) · **Tables:** `fraud_flags`, plus triggers in migrations

AI and rules only flag and suggest. A person always approves, rejects or pays.

## Fraud detection

- Built: `flag_duplicate_cases` flags a new case when the same applicant or household already has an open case.
- To add: same phone or bank account across different members; same document file hash reused; one person applying to several funds at once.
- Verifiers clear or confirm each flag in `/admin/flags`.

## AI document check

Reads an uploaded fee receipt, bill or mark sheet, extracts name, amount and institution, and shows mismatches with the application next to the case for the verifier. Runs server-side. Never changes case status.

- Built: `check-document` edge function, called after every upload of those kinds (app and website).
  With `ANTHROPIC_API_KEY` set, Claude reads the PDF or photo. Without it, the text of a PDF is read with
  simple rules (`packages/shared/src/documents.ts`); photos wait for a verifier.
- `record_document_check` (SQL) compares with the application and raises a fraud flag per problem.
  Verifiers and trustees can also type what a document says. Results are visible to staff only.

## Automation

Receipts on payment; Khums year-end and Lawajam reminders; case status alerts; loan repayment reminders; "need met" message to donors when a case closes.

## Security (already in migrations)

RLS on every table · two-admin approval trigger · fund-separation trigger · append-only ledger · members cannot self-verify · service-role key server-only.

## Acceptance tests

- [ ] A second case from the same household appears in `/admin/flags`.
- [x] Uploading a fee receipt whose amount differs from the application shows a mismatch warning.
- [x] No AI output changes a case status by itself.
- [ ] `supabase/tests/rules.sql` passes in CI.
