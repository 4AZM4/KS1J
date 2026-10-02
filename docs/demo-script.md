# Demo script (about 8 minutes)

Live: https://4azm4.github.io/KS1J/ · Member app: https://4azm4.github.io/KS1J/app/ · Admin: https://4azm4.github.io/KS1J/login/

All people and amounts are fictional. Every demo account signs in with one tap on the sign-in screen.

## Before you start (10 minutes before judging)

1. Reset the demo in the Supabase SQL editor: run `supabase/demo_reset.sql`, then `supabase/seed_data.sql`, then `supabase/kb_demo.sql` (the helpdesk texts).
   This clears test gifts, receipts, flags and notifications.
2. Open two windows side by side: the **member app** on a phone (or a narrow browser window) and the **admin** on a laptop.
3. Check the landing page loads and shows the "Welcome to KS1J" announcement.
4. Have `docs/demo/fee-receipt-36000.pdf` on the phone or laptop: a fictional receipt that says **₹36,000** (the request will say ₹40,000).

## 1. The problem, in one line (30 s)

"Help, giving and dues are spread across offices, paper and WhatsApp. Donors can't see where money goes, and families wait without knowing the status. KS1J puts it in one app, with rules the system enforces."

Show the **landing page**: the artwork, the live app in the phone frame, the five steps, the redacted case card and *Where your money goes*.

## 2. A family asks for help, in their own language (1.5 min) — app, **Fatema**

1. On the sign-in screen tap **ગુજરાતી**. The whole app switches to Gujarati. Tap **اردو**: Urdu reads right to left. Switch back to English.
2. Services → **Welfare assistance** → Education, Sadaat, "Class 10 fees", ₹40,000 → **Submit**.
3. The app goes straight to **Add your documents**: pick *Fee receipt*, attach the ₹36,000 PDF.
4. **My applications** shows the step tracker: Submitted.
5. Tap the profile: her details, membership status and her **household**.

Point out: only the committee sees the details and documents; donors never see her name.

## 3. Two different people must agree (1.5 min) — admin

1. Sign in as **Verifier** → Overview shows the queue → Cases → *To verify* → open Fatema's case.
2. **Documents** card: the receipt check has already read the file and flagged **"Receipt says ₹36,000, request says ₹40,000"**. It only flags; the verifier decides.
3. **Fraud flags** page: a second open request from the same household is flagged too. Re-using one file on two cases would be flagged the same way.
4. Tick *Sadaat lineage verified* → **Verify**. Back on the app, Fatema's Home shows **"A Jamaat verifier has checked your request"**.
5. Sign out, sign in as **Trustee** → open the same case → set the target and public summary → **Approve** → **Publish**.
   The preview shows her name and phone are masked in the public summary.
6. Try it the wrong way round if asked: sign in as **Super admin**, verify a case, then try to approve it. The database refuses.

## 4. Giving, with funds that never mix (1.5 min) — app, **Donor**

1. Give → **Sadaat cases** → open Fatema's case: no name, no phone, a generic title. Choose **Sehme Sadaat** → ₹5,000 → **Give**. The progress bar moves.
2. Tap **View receipt** → **Save or print (PDF)**. Khums receipts carry "Confirm with your Marja' or the Jamaat's alim".
3. Give the rest of the target. The donor's Home shows **"A need you helped with is met"**; Fatema's shows **"Your request is fully funded"**.
4. Give → **Non-Sadaat cases** → open a case: Sehme Sadaat is **not offered** (and the database would reject it).
5. Give → **Full Khums calculator** → ₹1,00,000 savings → ₹20,000 due, ₹10,000 per share → **Pay Sehme Imam**: only the institution with a verified ijazah is listed.

Same on the website: **Cases** on the public site, and anyone can give without the app.

## 5. Education loans that get repaid (1.5 min)

1. App, **Abbas** → Home shows **For you: Agree your repayment plan** (and his Lawajam due) → tap it, or Services → Education loan → propose ₹900 → refused (minimum ₹1,250) → propose ₹2,000 → "repaid in 30 months".
2. Admin, **Trustee** → Education loans → *Repayment plans to agree* → **Accept ₹2,000**. Only now can finance pay out.
3. App, **Fatema** (she pays her brother Hussain's loan) → Education loan: balance, next due date, AutoPay on, **Pay ₹2,000**, receipt.
4. Admin → Education loans → **Follow-up list** (automatic reminders, guarantor told at 7 days, committee at 30) and the **hardship request** waiting for a decision.

Point out: no interest, no late fees; the plan is agreed before money goes out; a household with a loan 30+ days late can't open new scholarship or loan requests, but medical help is never blocked.

## 6. Dues, help and the committee's view (1 min)

1. App, **Abbas** → Give → **Lawajam** → Pay ₹1,200 → receipt.
2. Learn → **Helpdesk** → tap "Where can Sehme Imam go?" The answer cites a Jamaat-approved source. Ask something it has no source for: it says it does not know.
3. Admin, **Finance** → **Khums & ledgers**: each fund separate, append-only; **Lawajam**: by area, *Copy reminder list*.
4. Admin, **Trustee** → **Announcements** → publish one → it appears on the app Home and the landing page.

## 7. New members (30 s)

Landing page → **Create account** → the account starts *unverified* with no household (so it sees no family data). Admin, **Verifier** → **Members to verify** → link to a household → **Verify member**.

## Questions judges ask

- **Is the money real?** Demo mode confirms payments instantly. In production, only the server marks a payment paid after the gateway (Razorpay) confirms it; apps can only create *pending* payments.
- **What stops one person approving their own case?** A database trigger, tested by 126 automated rule tests that run on every change.
- **Privacy?** Row-level security on every table. Public case cards come from one function with a generic title and a summary with names, phones and emails masked.
- **Does the AI decide anything?** No. It reads receipts and flags mismatches, and the helpdesk only answers from approved sources. People verify, approve and pay.
- **Elders?** Large text, plain words, four tabs, and Gujarati, Hindi and Urdu. Translations will be checked by native speakers before launch.
- **What's next?** Push notifications for Khums year-end and EMIs, eMadressa and History of the Jamaat, payment gateway go-live.
