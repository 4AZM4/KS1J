-- Education loans: family-agreed EMI, payer, grace period, AutoPay, hardship requests,
-- automatic follow-up, and pausing new non-emergency requests while a loan is overdue.
-- Replaces the earlier income-based instalment. Mirrors packages/shared/src/loans.ts.

-- ---------- Jamaat-wide loan settings (one row; trustees can change them) ----------
create table public.jamaat_settings (
  id boolean primary key default true check (id),
  loan_grace_months smallint not null default 6 check (loan_grace_months between 0 and 24),
  loan_max_tenure_months smallint not null default 48 check (loan_max_tenure_months between 6 and 120),
  pause_requests_when_loan_overdue boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.jamaat_settings default values;

-- ---------- New loan columns ----------
alter table public.education_loans
  add column payer_member_id uuid references public.members (id),
  add column guarantor_member_id uuid references public.members (id),
  add column max_tenure_months smallint check (max_tenure_months between 6 and 120),
  add column grace_months smallint check (grace_months between 0 and 24),
  add column grace_extension_months smallint not null default 0 check (grace_extension_months between 0 and 12),
  add column family_accepted_emi integer check (family_accepted_emi > 0),
  add column committee_accepted_emi integer check (committee_accepted_emi > 0),
  add column agreed_emi integer check (agreed_emi > 0),
  add column plan_agreed_at timestamptz,
  add column plan_agreed_by uuid references public.members (id),
  add column next_due_date date,
  add column autopay_status text not null default 'not_set'
    check (autopay_status in ('not_set', 'pending', 'active', 'failed', 'cancelled')),
  add column autopay_ref text;

-- Carry over existing loans (fresh databases have none): fill in the new plan from the old instalment.
update public.education_loans l
   set payer_member_id = l.borrower_id,
       max_tenure_months = s.loan_max_tenure_months,
       grace_months = s.loan_grace_months,
       agreed_emi = greatest(l.current_instalment, ceil(l.principal::numeric / s.loan_max_tenure_months)::int),
       plan_agreed_at = now(),
       next_due_date = case when l.status = 'repaying' then current_date + 30 end
  from public.jamaat_settings s;

alter table public.education_loans
  alter column payer_member_id set not null,
  alter column max_tenure_months set not null,
  alter column grace_months set not null,
  drop column income_threshold,
  drop column share_of_excess,
  drop column minimum_instalment,
  drop column current_instalment,
  add column grace_ends_on date generated always as (
    (course_end_date + make_interval(months => (grace_months + grace_extension_months)::int))::date
  ) stored;

create index on public.education_loans (next_due_date);

-- ---------- Defaults and the first due date ----------
create or replace function public.prepare_education_loan()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  s record;
begin
  select * into s from public.jamaat_settings;
  if tg_op = 'INSERT' then
    new.payer_member_id := coalesce(new.payer_member_id, new.borrower_id);
    new.max_tenure_months := coalesce(new.max_tenure_months, s.loan_max_tenure_months);
    new.grace_months := coalesce(new.grace_months, s.loan_grace_months);
  end if;
  -- The plan is binding once agreed; only the agreed EMI changes later (via an approved hardship request).
  if tg_op = 'UPDATE' and old.plan_agreed_at is not null and not public.is_system() then
    if new.max_tenure_months is distinct from old.max_tenure_months
       or new.principal is distinct from old.principal then
      raise exception 'Loan amount and tenure cannot change after the plan is agreed';
    end if;
  end if;
  return new;
end;
$$;

create trigger education_loans_prepare
before insert or update on public.education_loans
for each row execute function public.prepare_education_loan();

-- grace_ends_on is a generated column, so it is only readable in an AFTER trigger.
create or replace function public.set_first_due_date()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.next_due_date is null and new.agreed_emi is not null and new.grace_ends_on is not null then
    update public.education_loans set next_due_date = new.grace_ends_on where id = new.id;
  end if;
  return null;
end;
$$;

create trigger education_loans_first_due
after insert or update of agreed_emi, course_end_date, grace_extension_months on public.education_loans
for each row execute function public.set_first_due_date();

-- ---------- Agreeing the EMI: both the family and a trustee must accept the same amount ----------
create or replace function public.accept_loan_emi(p_loan uuid, p_emi integer)
returns public.education_loans
language plpgsql security definer set search_path = ''
as $$
declare
  l public.education_loans;
  me uuid := (select auth.uid());
  floor_emi integer;
begin
  select * into l from public.education_loans where id = p_loan for update;
  if not found then raise exception 'Loan not found'; end if;
  if l.plan_agreed_at is not null then raise exception 'This repayment plan is already agreed'; end if;

  floor_emi := ceil(l.principal::numeric / l.max_tenure_months)::int;
  if p_emi is null or p_emi < floor_emi then
    raise exception 'The EMI must be at least % so the loan is repaid within % months', floor_emi, l.max_tenure_months;
  end if;
  p_emi := least(p_emi, l.principal);

  if me in (l.borrower_id, l.payer_member_id) then
    update public.education_loans set family_accepted_emi = p_emi where id = p_loan returning * into l;
  elsif public.has_role('trustee') then
    update public.education_loans set committee_accepted_emi = p_emi, plan_agreed_by = me
     where id = p_loan returning * into l;
  else
    raise exception 'Only the student, the payer or a trustee can agree the EMI';
  end if;

  if l.family_accepted_emi = l.committee_accepted_emi then
    update public.education_loans
       set agreed_emi = l.family_accepted_emi,
           plan_agreed_at = now()
     where id = p_loan
     returning * into l;
  end if;
  return l;
end;
$$;

-- ---------- No disbursement of a loan without an agreed plan ----------
create or replace function public.on_disbursement()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
begin
  select category, type into c from public.cases where id = new.case_id;
  if new.fund = 'sehme_sadaat' and c.category <> 'sadaat' then
    raise exception 'Sehme Sadaat can only be disbursed to a Sadaat case';
  end if;
  if c.type = 'education_loan' and not exists (
    select 1 from public.education_loans where case_id = new.case_id and plan_agreed_at is not null
  ) then
    raise exception 'A loan cannot be paid out until the family and committee have agreed the repayment plan';
  end if;
  insert into public.ledger_entries (fund, amount, case_id, memo, created_by)
  values (new.fund, -new.amount, new.case_id, 'Disbursed to ' || new.payee, new.recorded_by);
  return new;
end;
$$;

-- ---------- Repayments: reduce the balance, move the due date, close at zero ----------
create or replace function public.on_loan_repayment_paid()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  l public.education_loans;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    new.paid_at := now();
    update public.education_loans
       set outstanding = greatest(0, outstanding - new.amount),
           next_due_date = case when new.amount >= agreed_emi and next_due_date is not null
                                then (next_due_date + interval '1 month')::date else next_due_date end
     where id = new.loan_id
     returning * into l;
    if l.outstanding = 0 then
      update public.education_loans set status = 'closed', next_due_date = null where id = new.loan_id;
    end if;
    insert into public.ledger_entries (fund, amount, memo)
    values ('loan_repayment', new.amount, 'Education loan repayment');
  end if;
  return new;
end;
$$;

-- ---------- Hardship requests: genuine cases get flexibility with proof ----------
create table public.loan_hardship_requests (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.education_loans (id) on delete cascade,
  requested_by uuid not null references public.members (id),
  kind text not null check (kind in ('pause', 'lower_emi')),
  pause_months smallint check (pause_months between 1 and 12),
  new_emi integer check (new_emi > 0),
  reason text not null,
  proof_path text not null, -- income proof is required
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_by uuid references public.members (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint request_has_detail check (
    (kind = 'pause' and pause_months is not null) or (kind = 'lower_emi' and new_emi is not null)
  )
);
create index on public.loan_hardship_requests (loan_id) where status = 'pending';

create or replace function public.on_hardship_decision()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    new.decided_by := (select auth.uid());
    new.decided_at := now();
    if new.status = 'approved' then
      if new.kind = 'pause' then
        update public.education_loans
           set status = 'paused',
               next_due_date = (coalesce(next_due_date, current_date) + make_interval(months => new.pause_months::int))::date
         where id = new.loan_id;
      else
        update public.education_loans set agreed_emi = new.new_emi where id = new.loan_id;
      end if;
    end if;
  elsif new.status is distinct from old.status then
    raise exception 'A decided request cannot be changed';
  end if;
  return new;
end;
$$;

create trigger hardship_decision
before update on public.loan_hardship_requests
for each row execute function public.on_hardship_decision();

-- ---------- Automatic follow-up ladder (mirrors followUpStage in packages/shared) ----------
create or replace function public.loan_followup_stage(p_next_due date, p_pending_hardship boolean)
returns text
language sql stable set search_path = ''
as $$
  select case
    when p_pending_hardship then 'paused_for_review'
    when p_next_due is null then 'none'
    when current_date - p_next_due < -3 then 'none'
    when current_date - p_next_due <= 0 then 'upcoming_reminder'
    when current_date - p_next_due < 7 then 'missed_reminder'
    when current_date - p_next_due < 15 then 'notify_guarantor'
    when current_date - p_next_due < 30 then 'officer_follow_up'
    else 'committee_review'
  end;
$$;

-- The case officer's list. Staff only; a scheduled server job reads the same data to send reminders.
create or replace function public.loan_followup_list()
returns table (
  loan_id uuid, borrower text, payer text, guarantor text, guarantor_phone text,
  outstanding integer, agreed_emi integer, next_due_date date, days_late integer,
  stage text, autopay_status text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only Jamaat staff can see the follow-up list';
  end if;
  return query
  select l.id, b.full_name, p.full_name, coalesce(g.full_name, l.guarantor_name), l.guarantor_phone,
         l.outstanding, l.agreed_emi, l.next_due_date,
         greatest(0, current_date - l.next_due_date)::int,
         public.loan_followup_stage(l.next_due_date,
           exists (select 1 from public.loan_hardship_requests h where h.loan_id = l.id and h.status = 'pending')),
         l.autopay_status
  from public.education_loans l
  join public.members b on b.id = l.borrower_id
  join public.members p on p.id = l.payer_member_id
  left join public.members g on g.id = l.guarantor_member_id
  where l.status in ('grace', 'repaying', 'paused') and l.next_due_date is not null
  order by l.next_due_date;
end;
$$;

-- True when someone in the household has a loan 30+ days overdue with no pending hardship request.
create or replace function public.household_loan_overdue(p_household uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_household is not null and exists (
    select 1
    from public.education_loans l
    join public.members m on m.id = l.borrower_id
    where m.household_id = p_household
      and l.status = 'repaying'
      and l.next_due_date <= current_date - 30
      and not exists (select 1 from public.loan_hardship_requests h where h.loan_id = l.id and h.status = 'pending')
  );
$$;

-- New non-emergency requests (scholarships, loans) pause while the household has an overdue loan.
-- Medical, ration and other emergency help is never blocked.
create or replace function public.block_requests_when_loan_overdue()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  hh uuid;
begin
  if new.type in ('scholarship', 'education_loan')
     and (select pause_requests_when_loan_overdue from public.jamaat_settings)
     and not public.is_system() then
    select household_id into hh from public.members where id = new.applicant_id;
    if public.household_loan_overdue(hh) then
      raise exception 'New scholarship and loan requests are paused while a family loan is more than 30 days overdue. Please contact the Jamaat office or request a hardship review.';
    end if;
  end if;
  return new;
end;
$$;

create trigger cases_block_when_loan_overdue
before insert on public.cases
for each row execute function public.block_requests_when_loan_overdue();

-- ---------- Row-Level Security ----------
alter table public.jamaat_settings enable row level security;
alter table public.loan_hardship_requests enable row level security;

create policy "settings: signed-in read" on public.jamaat_settings
  for select to authenticated using (true);
create policy "settings: trustees change" on public.jamaat_settings
  for update to authenticated using (public.has_role('trustee')) with check (public.has_role('trustee'));

-- Payer and guarantor can see the loan they are responsible for.
drop policy "loans: borrower or staff read" on public.education_loans;
create policy "loans: borrower, payer, guarantor or staff read" on public.education_loans
  for select to authenticated
  using ((select auth.uid()) in (borrower_id, payer_member_id, guarantor_member_id) or public.is_staff());

drop policy "repayments: borrower creates pending" on public.loan_repayments;
create policy "repayments: borrower or payer creates pending" on public.loan_repayments
  for insert to authenticated
  with check (status = 'pending' and exists (
    select 1 from public.education_loans l
    where l.id = loan_id and (select auth.uid()) in (l.borrower_id, l.payer_member_id)));

drop policy "repayments: borrower or finance read" on public.loan_repayments;
create policy "repayments: borrower, payer or finance read" on public.loan_repayments
  for select to authenticated
  using (public.has_role('finance') or exists (
    select 1 from public.education_loans l
    where l.id = loan_id and (select auth.uid()) in (l.borrower_id, l.payer_member_id, l.guarantor_member_id)));

create policy "hardship: borrower or payer requests" on public.loan_hardship_requests
  for insert to authenticated
  with check (requested_by = (select auth.uid()) and status = 'pending' and exists (
    select 1 from public.education_loans l
    where l.id = loan_id and (select auth.uid()) in (l.borrower_id, l.payer_member_id)));
create policy "hardship: requester or staff read" on public.loan_hardship_requests
  for select to authenticated using (requested_by = (select auth.uid()) or public.is_staff());
create policy "hardship: trustees decide" on public.loan_hardship_requests
  for update to authenticated using (public.has_role('trustee')) with check (public.has_role('trustee'));

-- ---------- Function access ----------
revoke execute on function public.prepare_education_loan() from public, anon, authenticated;
revoke execute on function public.set_first_due_date() from public, anon, authenticated;
revoke execute on function public.on_hardship_decision() from public, anon, authenticated;
revoke execute on function public.block_requests_when_loan_overdue() from public, anon, authenticated;
revoke execute on function public.household_loan_overdue(uuid) from public, anon, authenticated;
-- Re-created above, so re-apply the lock-down from the previous migration.
revoke execute on function public.on_disbursement() from public, anon, authenticated;
revoke execute on function public.on_loan_repayment_paid() from public, anon, authenticated;

revoke execute on function public.accept_loan_emi(uuid, integer) from public, anon;
grant execute on function public.accept_loan_emi(uuid, integer) to authenticated;
revoke execute on function public.loan_followup_list() from public, anon;
grant execute on function public.loan_followup_list() to authenticated;
revoke execute on function public.loan_followup_stage(date, boolean) from public, anon;
grant execute on function public.loan_followup_stage(date, boolean) to authenticated;
