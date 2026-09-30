# Module: Cases (welfare, scholarships) and donations

**Owner:** Person A (app) + Person B (admin web) · **Tables:** `cases`, `case_events`, `case_documents`, `donations`, `disbursements`, `ledger_entries`, `institutions`

## What it does

Members apply for medical, education or ration help, or a scholarship. Two different Jamaat admins check each case before it reaches donors. Donors give to Sadaat or Non-Sadaat cases from separate lists. Every rupee goes through the Jamaat's account.

## Lifecycle

`submitted → verified → approved → published → funded → disbursed → closed` (or `rejected` from the first two)

| Step | Who | Where |
| --- | --- | --- |
| Submit | Applicant, or volunteer on their behalf | App: Services |
| Verify documents, need, and lineage for Sadaat | Verifier | Web: /admin/cases |
| Approve category and target | Trustee, never the verifier | Web |
| Publish | Trustee | Web |
| Funded | Automatic when raised ≥ target | Server |
| Disburse (pay hospital/school/beneficiary, upload proof) | Finance | Web |
| Close, notify donors | Finance | Web |

## Screens

**App, Services tab:** Apply (type, title, amount, documents) → My applications (status timeline from `case_events`).
**App, Give tab:** Sadaat cases list and Non-Sadaat cases list via `list_public_cases('sadaat' | 'non_sadaat')`; case detail; donate (fund picker only shows allowed funds via `isDonationAllowed`).
**Web, /admin/cases:** queue filtered by status; case detail with documents, fraud flags, AI document check result; action buttons for the viewer's role only.

## Scholarships

A case with `type = 'scholarship'`. Required documents: marksheet, fee receipt, income proof. Disbursement payee is always the school or college.

## Acceptance tests

- [ ] Applicant submits a case with two documents from a phone; it appears in the verifier's queue.
- [ ] Verifier verifies; the same person cannot approve it (error shown, not a crash).
- [ ] A different trustee approves and publishes; the case appears in the correct list only.
- [ ] Choosing Sehme Sadaat shows only Sadaat cases; a Non-Sadaat case never offers it.
- [ ] A donation stays `pending` until the payment webhook confirms; then raised amount and ledger update.
- [ ] Public card shows no name, phone or address.
- [ ] Finance disburses with proof; donors see "Need met" when closed.
- [ ] `supabase/tests/rules.sql` passes.
