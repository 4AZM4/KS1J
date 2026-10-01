-- Puts the hackathon demo back to a clean start. DEMO DATA ONLY.
--
-- 1. Run this file (Supabase SQL editor, or psql as the database owner).
-- 2. Then run supabase/seed_data.sql to load the demo cases, loans and dues again.
--
-- It refuses to run unless jamaat_settings.demo_mode is on, so it can never touch a real
-- Jamaat database. Member accounts (demo logins and anyone who signed up) are kept.
--
-- Ledgers are append-only (CLAUDE.md rule 4). Wiping demo history is the one exception:
-- the guard is switched off inside this transaction only and switched back on before commit.

begin;

do $$
begin
  if not coalesce((select demo_mode from public.jamaat_settings), false) then
    raise exception 'demo_reset.sql only runs while demo mode is on. This looks like a real database: nothing was changed.';
  end if;
end $$;

alter table public.ledger_entries disable trigger ledger_append_only;

delete from public.ledger_entries;
delete from public.disbursements;
delete from public.donations;
delete from public.loan_repayments;
delete from public.loan_hardship_requests;
delete from public.income_declarations;
delete from public.education_loans;
delete from public.lawajam_payments;
delete from public.lawajam_dues;
delete from public.case_documents;
delete from public.case_events;
delete from public.fraud_flags;
delete from public.cases;
delete from public.institutions;
delete from public.khums_calculations;
delete from public.khums_profiles;
delete from public.announcements;

alter table public.ledger_entries enable trigger ledger_append_only;

commit;
