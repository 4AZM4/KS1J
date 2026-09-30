# Prompts for Claude Code

Paste one per session, each on its own branch (`feat/<module>`). Always let Claude plan first and approve the plan before code.

## Cases and donations
> Read CLAUDE.md and docs/modules/cases.md. Plan first and show me the plan. Then build the Services → Apply flow and My applications in apps/mobile, the Give tab Sadaat and Non-Sadaat lists using list_public_cases, and /admin/cases in apps/web. Use @ks1j/shared for rules. Do not change migrations. Finish by walking through every acceptance test.

## Khums
> Read CLAUDE.md and docs/modules/khums.md. Plan first. Build Khums setup, calculator (calculateKhums), pay Sehme Imam (verified institutions only) and pay Sehme Sadaat (Sadaat cases only), plus /admin/institutions and /admin/khums. Payments stay pending until a server confirms. Show the guidance line on every Khums screen.

## Education loans
> Read CLAUDE.md and docs/modules/loans.md. Plan first. Build My loan, Declare income (monthlyInstalment), Pay instalment and Request pause in the app, and /admin/loans on the web. No interest or penalty anywhere.

## Lawajam
> Read CLAUDE.md and docs/modules/lawajam.md. Plan first. Build Give → Lawajam in the app and /admin/lawajam on the web.

## AI helpdesk
> Read CLAUDE.md and docs/modules/helpdesk.md. Plan first. Add a migration for kb_documents and kb_chunks with pgvector and RLS, an ingestion script, and a server-side answer endpoint that cites sources and refuses when nothing matches. Wire it to the Learn tab and the website.

## AI, automation and security
> Read CLAUDE.md and docs/modules/ai-and-security.md. Plan first. Build /admin/flags, the server-side AI document check shown on the case detail page, and receipts/reminders. AI must never change a case status.

## Payment webhook (backend owner only)
> Read CLAUDE.md. Plan first. Add a server-side route that verifies the Razorpay test-mode signature and sets donations, loan_repayments or lawajam_payments to paid using the service role. Add DEMO_MODE with a mock gateway. Never expose the service-role key to clients.
