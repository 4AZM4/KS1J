# Module: Education loans (Qard-e-Hasana)

**Owner:** Person C · **Tables:** `education_loans`, `loan_repayments`, `loan_hardship_requests`, `jamaat_settings`, `ledger_entries` · **Shared:** `minimumEmi`, `checkEmiProposal`, `monthsToRepay`, `followUpStage`

## The problem

Most unpaid loans are not hardship. Families who can pay stop paying, and the committee spends its time chasing them. So:

- the repayment plan is agreed **before** any money is paid out,
- AutoPay makes paying the default,
- follow-up is automatic and needs no person until 15 days late,
- genuine hardship gets easy flexibility, with proof.

## Rules

- No interest. No late fees. Ever.
- **EMI is set by the family:** the student and family propose a monthly amount; a trustee accepts it or counter-proposes. The plan is agreed only when both have accepted the same amount (`accept_loan_emi`).
- **Floor:** EMI ≥ principal ÷ maximum tenure (default 48 months). Budget-friendly, but never so low it drags on.
- **Payer:** the student or a family member. A guarantor is named and told if payments stop.
- **Grace period:** first EMI falls due when the grace period ends (default 6 months after the course). One extension with proof of job search (`grace_extension_months`).
- **No payout without a plan:** a disbursement on an `education_loan` case is rejected until the plan is agreed.
- **AutoPay:** UPI AutoPay mandate set up before the grace period ends. Manual payment is the fallback.
- **Paying early:** any amount, any time, no penalty.

Defaults live in `jamaat_settings` (trustees can change them): grace months, maximum tenure, and whether to pause new requests when a loan is overdue.

## Follow-up ladder (automatic)

| Days vs due date | Stage | Action |
| --- | --- | --- |
| 3 days before | `upcoming_reminder` | Reminder to payer |
| 1–6 late | `missed_reminder` | Reminder to payer, AutoPay retried |
| 7–14 late | `notify_guarantor` | Guarantor told as well |
| 15–29 late | `officer_follow_up` | Appears on the case officer's list |
| 30+ late | `committee_review` | Committee review; household's new scholarship and loan requests paused |
| Hardship request pending | `paused_for_review` | Ladder stops while a trustee decides |

`loan_followup_list()` returns every active loan with its stage (staff only). A scheduled server job sends the reminders from the same data. Medical, ration and SOS requests are never paused.

## Hardship

The student or payer submits a request with income proof: **pause** (1–12 months) or **lower EMI**. A trustee approves or rejects. An approved pause moves the next due date; an approved lower EMI replaces the agreed EMI.

## Screens

**Built:** app `/loan` (plan agreement, My loan, AutoPay, pay, receipts) and `/loan-hardship` (proof upload to the private `documents` bucket); web `/admin/loans`. Loan statuses move with the dates via `refresh_loan_statuses()` (nightly with pg_cron).

**App, Services → Education loan:** apply (guarantor, payer, course end date); repayment plan screen (enter EMI → "repaid in N months", with the floor explained); accept counter-proposal; set up AutoPay; My loan (balance, next due date, receipts); request hardship pause or lower EMI.
**Web, /admin/loans:** plans awaiting agreement, follow-up list by stage, AutoPay not set up, hardship requests to decide, repaid this month, fund balance.

## Acceptance tests

- [ ] Proposing ₹900 on a ₹60,000 loan shows the ₹1,250 minimum; ₹2,000 shows "repaid in 30 months".
- [ ] A trustee counter-proposal is not agreed until the family accepts the same amount.
- [ ] Finance cannot pay out a loan with no agreed plan.
- [ ] The first EMI falls due when the grace period ends.
- [ ] A loan 35 days late shows at committee review, and the household cannot apply for a scholarship; a medical request still goes through.
- [ ] A hardship request stops the ladder; an approved pause moves the due date.
- [ ] No screen or message mentions interest or penalties.
