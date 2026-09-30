-- Row-Level Security. Every table has RLS on; no table is public except
-- announcements that have been published. Writes that move money happen
-- server-side (service role) after the payment gateway confirms.

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.member_roles enable row level security;
alter table public.cases enable row level security;
alter table public.case_events enable row level security;
alter table public.case_documents enable row level security;
alter table public.institutions enable row level security;
alter table public.donations enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.disbursements enable row level security;
alter table public.announcements enable row level security;
alter table public.khums_profiles enable row level security;
alter table public.khums_calculations enable row level security;
alter table public.education_loans enable row level security;
alter table public.income_declarations enable row level security;
alter table public.loan_repayments enable row level security;
alter table public.lawajam_dues enable row level security;
alter table public.lawajam_payments enable row level security;
alter table public.fraud_flags enable row level security;

-- Helper: the signed-in member's household.
create or replace function public.my_household()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select household_id from public.members where id = (select auth.uid());
$$;

-- ---------- Members ----------
create policy "members: read own or staff" on public.members
  for select to authenticated using (id = (select auth.uid()) or public.is_staff());
create policy "members: create own profile" on public.members
  for insert to authenticated with check (id = (select auth.uid()) and membership_verified = false);
create policy "members: update own profile" on public.members
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "members: staff verify" on public.members
  for update to authenticated using (public.has_role('verifier')) with check (public.has_role('verifier'));

create policy "households: read own or staff" on public.households
  for select to authenticated using (id = public.my_household() or public.is_staff());
create policy "households: staff manage" on public.households
  for all to authenticated using (public.has_role('verifier')) with check (public.has_role('verifier'));

create policy "roles: read own" on public.member_roles
  for select to authenticated using (member_id = (select auth.uid()) or public.has_role('super_admin'));
create policy "roles: super admin manages" on public.member_roles
  for all to authenticated using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- ---------- Cases ----------
-- Applicants see their own cases; staff see all. Donors use list_public_cases().
create policy "cases: read own or staff" on public.cases
  for select to authenticated
  using (applicant_id = (select auth.uid()) or submitted_by = (select auth.uid()) or public.is_staff());
create policy "cases: apply for self or as volunteer" on public.cases
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and (applicant_id = (select auth.uid()) or public.has_role('volunteer'))
  );
-- Status changes are policed by the cases_lifecycle trigger.
create policy "cases: staff update" on public.cases
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "case events: read with case" on public.case_events
  for select to authenticated
  using (exists (select 1 from public.cases c where c.id = case_id
                 and (c.applicant_id = (select auth.uid()) or public.is_staff())));

create policy "case documents: read with case" on public.case_documents
  for select to authenticated
  using (exists (select 1 from public.cases c where c.id = case_id
                 and (c.applicant_id = (select auth.uid()) or public.is_staff())));
create policy "case documents: upload to own case" on public.case_documents
  for insert to authenticated
  with check (uploaded_by = (select auth.uid())
              and exists (select 1 from public.cases c where c.id = case_id
                          and (c.applicant_id = (select auth.uid()) or c.submitted_by = (select auth.uid())
                               or public.is_staff())));

-- ---------- Institutions ----------
create policy "institutions: anyone sees verified" on public.institutions
  for select to anon, authenticated
  using ((is_active and ijazah_verified_by is not null) or public.is_staff());
create policy "institutions: trustees manage" on public.institutions
  for all to authenticated using (public.has_role('trustee')) with check (public.has_role('trustee'));

-- ---------- Donations and money ----------
-- Members create a pending donation; only the server marks it paid.
create policy "donations: read own or finance" on public.donations
  for select to authenticated using (donor_id = (select auth.uid()) or public.has_role('finance'));
create policy "donations: create pending" on public.donations
  for insert to authenticated with check (donor_id = (select auth.uid()) and status = 'pending');

create policy "ledger: finance and trustees read" on public.ledger_entries
  for select to authenticated using (public.has_role('finance') or public.has_role('trustee'));

create policy "disbursements: finance and trustees read" on public.disbursements
  for select to authenticated using (public.has_role('finance') or public.has_role('trustee'));
create policy "disbursements: finance records" on public.disbursements
  for insert to authenticated
  with check (public.has_role('finance') and recorded_by = (select auth.uid()));

-- ---------- Announcements ----------
create policy "announcements: anyone reads published" on public.announcements
  for select to anon, authenticated using (published_at is not null and published_at <= now() or public.is_staff());
create policy "announcements: trustees manage" on public.announcements
  for all to authenticated using (public.has_role('trustee')) with check (public.has_role('trustee'));

-- ---------- Khums (private to each member) ----------
create policy "khums profile: own" on public.khums_profiles
  for all to authenticated using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy "khums calculations: own" on public.khums_calculations
  for all to authenticated using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));

-- ---------- Loans ----------
create policy "loans: borrower or staff read" on public.education_loans
  for select to authenticated using (borrower_id = (select auth.uid()) or public.is_staff());
create policy "loans: trustees and finance manage" on public.education_loans
  for all to authenticated
  using (public.has_role('trustee') or public.has_role('finance'))
  with check (public.has_role('trustee') or public.has_role('finance'));

create policy "income: borrower declares" on public.income_declarations
  for insert to authenticated
  with check (exists (select 1 from public.education_loans l where l.id = loan_id and l.borrower_id = (select auth.uid())));
create policy "income: borrower or staff read" on public.income_declarations
  for select to authenticated
  using (public.is_staff() or exists (select 1 from public.education_loans l where l.id = loan_id and l.borrower_id = (select auth.uid())));

create policy "repayments: borrower creates pending" on public.loan_repayments
  for insert to authenticated
  with check (status = 'pending'
              and exists (select 1 from public.education_loans l where l.id = loan_id and l.borrower_id = (select auth.uid())));
create policy "repayments: borrower or finance read" on public.loan_repayments
  for select to authenticated
  using (public.has_role('finance') or exists (select 1 from public.education_loans l where l.id = loan_id and l.borrower_id = (select auth.uid())));

-- ---------- Lawajam ----------
create policy "lawajam dues: own household or finance" on public.lawajam_dues
  for select to authenticated using (household_id = public.my_household() or public.has_role('finance'));
create policy "lawajam dues: finance manages" on public.lawajam_dues
  for all to authenticated using (public.has_role('finance')) with check (public.has_role('finance'));
create policy "lawajam payments: own or finance read" on public.lawajam_payments
  for select to authenticated using (paid_by = (select auth.uid()) or public.has_role('finance'));
create policy "lawajam payments: create pending" on public.lawajam_payments
  for insert to authenticated with check (paid_by = (select auth.uid()) and status = 'pending');

-- ---------- Fraud flags ----------
create policy "fraud flags: verifiers and trustees" on public.fraud_flags
  for select to authenticated using (public.has_role('verifier') or public.has_role('trustee'));
create policy "fraud flags: verifiers review" on public.fraud_flags
  for update to authenticated using (public.has_role('verifier')) with check (public.has_role('verifier'));

-- ---------- Function access ----------
revoke all on function public.list_public_cases(public.case_category) from public;
grant execute on function public.list_public_cases(public.case_category) to anon, authenticated;

-- Members cannot verify themselves or move themselves between households.
create or replace function public.protect_member_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_system() and not public.has_role('verifier') then
    if new.membership_verified is distinct from old.membership_verified
       or new.household_id is distinct from old.household_id then
      raise exception 'Only a Jamaat verifier can change membership or household';
    end if;
  end if;
  return new;
end;
$$;

create trigger members_protect_fields
before update on public.members
for each row execute function public.protect_member_fields();
