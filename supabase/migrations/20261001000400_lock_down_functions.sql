-- Tighten function access (from the Supabase security advisor).
-- Trigger functions are never called directly, so nobody on the API needs EXECUTE on them.
-- Triggers still fire: Postgres checks EXECUTE when a trigger is created, not when it runs.

alter function public.forbid_ledger_changes() set search_path = '';

revoke execute on function public.enforce_case_transition() from public, anon, authenticated;
revoke execute on function public.check_donation_rules() from public, anon, authenticated;
revoke execute on function public.forbid_ledger_changes() from public, anon, authenticated;
revoke execute on function public.on_donation_paid() from public, anon, authenticated;
revoke execute on function public.on_disbursement() from public, anon, authenticated;
revoke execute on function public.on_loan_repayment_paid() from public, anon, authenticated;
revoke execute on function public.flag_duplicate_cases() from public, anon, authenticated;
revoke execute on function public.protect_member_fields() from public, anon, authenticated;
revoke execute on function public.is_system() from public, anon, authenticated;

-- Helpers used inside RLS policies. Policies run as the caller, so signed-in users keep EXECUTE.
-- is_staff() also backs the anon-visible policies on institutions and announcements, and only
-- ever answers false for anonymous callers. has_role() and my_household() are never needed by anon.
revoke execute on function public.has_role(public.admin_role) from public, anon;
revoke execute on function public.my_household() from public, anon;
grant execute on function public.has_role(public.admin_role) to authenticated;
grant execute on function public.my_household() to authenticated;
grant execute on function public.is_staff() to anon, authenticated;
