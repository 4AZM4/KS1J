# Demo script (about 7 minutes)

Live: https://4azm4.github.io/KS1J/ · Member app: https://4azm4.github.io/KS1J/app/ · Admin: https://4azm4.github.io/KS1J/login/

All people and amounts are fictional. Every demo account signs in with one tap on the sign-in screen.

## Before you start (10 minutes before judging)

1. Reset the demo: run `supabase/demo_reset.sql`, then `supabase/seed_data.sql` (Supabase SQL editor).
2. Open two windows side by side: the **member app** on a phone (or a narrow browser window) and the **admin** on a laptop.
3. Check the landing page loads and shows the "Welcome to KS1J" announcement.

## 1. The problem, in one line (30 s)

"Help, giving and dues are spread across offices, paper and WhatsApp. Donors can't see where money goes, and families wait without knowing the status. KS1J puts it in one app, with rules the system enforces."

Show the **landing page**: the live app in the phone frame, the five steps, and *Where your money goes*.

## 2. A family asks for help (1 min) — app, **Fatema**

1. Services → **Welfare assistance** → Education, Sadaat, "Class 10 fees", ₹40,000 → **Submit**.
2. The app goes straight to **Add your documents**: pick *Fee receipt*, attach a photo or PDF.
3. **My applications** shows the step tracker: Submitted.

Point out: only the committee sees the details and documents; donors never see her name.

## 3. Two different people must agree (1.5 min) — admin

1. Sign in as **Verifier** → Overview shows the queue → Cases → *To verify* → open Fatema's case.
2. **Documents** card → *Open* the fee receipt. Tick *Sadaat lineage verified* → **Verify**.
3. Sign out, sign in as **Trustee** → open the same case → set the target and public summary → **Approve** → **Publish**.
4. Try it the wrong way round if asked: sign in as **Super admin**, verify a case, then try to approve it — the database refuses.

Point out the **fraud flags** page: duplicate requests from the same household are flagged automatically; a verifier decides.

## 4. Giving, with funds that never mix (1 min) — app, **Donor**

1. Give → **Sadaat cases** → open Fatema's case → choose **Sehme Sadaat** → ₹5,000 → **Give**. The progress bar moves.
2. Give → **Non-Sadaat cases** → open a case: Sehme Sadaat is **not offered** (and the database would reject it).
3. Give → **Full Khums calculator** → ₹1,00,000 savings → ₹20,000 due, ₹10,000 per share → **Pay Sehme Imam**: only the institution with a verified ijazah is listed.

## 5. Education loans that get repaid (1.5 min)

1. App, **Abbas** → Services → Education loan → propose ₹900 → refused (minimum ₹1,250) → propose ₹2,000 → "repaid in 30 months".
2. Admin, **Trustee** → Education loans → *Repayment plans to agree* → **Accept ₹2,000**. Only now can finance pay out.
3. App, **Fatema** (she pays her brother Hussain's loan) → Education loan: balance, next due date, AutoPay on, **Pay ₹2,000**, receipt.
4. Admin → Education loans → **Follow-up list** (automatic reminders, guarantor told at 7 days, committee at 30) and the **hardship request** waiting for a decision.

Point out: no interest, no late fees; the plan is agreed before money goes out; a household with a loan 30+ days late can't open new scholarship or loan requests, but medical help is never blocked.

## 6. Dues and the committee's view (45 s)

1. App, **Abbas** → Give → **Lawajam** → Pay ₹1,200 → receipt.
2. Admin, **Finance** → **Khums & ledgers**: each fund separate, append-only; **Lawajam**: by area, *Copy reminder list*.
3. Admin, **Trustee** → **Announcements** → publish one → it appears on the app Home and the landing page.

## 7. New members (30 s)

Landing page → **Create account** → the account starts *unverified* with no household (so it sees no family data). Admin, **Verifier** → **Members to verify** → link to a household → **Verify member**.

## Questions judges ask

- **Is the money real?** Demo mode confirms payments instantly. In production, only the server marks a payment paid after the gateway (Razorpay) confirms it; apps can only create *pending* payments.
- **What stops one person approving their own case?** A database trigger, tested by 81 automated rule tests that run on every change.
- **Privacy?** Row-level security on every table; public case cards come from one function with no names, phones or addresses.
- **What's next?** AI helpdesk answering only from Jamaat-approved texts (with the source shown), eMadressa and History of the Jamaat, push reminders for Khums year-end and EMIs.
