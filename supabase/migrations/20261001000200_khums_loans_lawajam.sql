-- Khums, education loans, Lawajam and fraud flags.

-- ---------- Khums ----------
create table public.khums_profiles (
  member_id uuid primary key references public.members (id) on delete cascade,
  year_end_month smallint not null check (year_end_month between 1 and 12),
  year_end_day smallint not null check (year_end_day between 1 and 31),
  marja text,
  updated_at timestamptz not null default now()
);

create table public.khums_calculations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  khums_year integer not null,
  surplus integer not null check (surplus >= 0),
  khums_due integer not null check (khums_due >= 0),
  sehme_imam integer not null check (sehme_imam >= 0),
  sehme_sadaat integer not null check (sehme_sadaat >= 0),
  created_at timestamptz not null default now(),
  constraint shares_add_up check (sehme_imam + sehme_sadaat = khums_due)
);
create index on public.khums_calculations (member_id);

-- ---------- Education loans (Qard-e-Hasana: no interest, no late fees) ----------
create type public.loan_status as enum ('studying', 'grace', 'repaying', 'paused', 'closed', 'converted_to_grant');

create table public.education_loans (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases (id),
  borrower_id uuid not null references public.members (id),
  principal integer not null check (principal > 0),
  outstanding integer not null check (outstanding >= 0),
  status public.loan_status not null default 'studying',
  income_threshold integer not null check (income_threshold >= 0),
  share_of_excess numeric(4, 3) not null default 0.200 check (share_of_excess > 0 and share_of_excess <= 1),
  minimum_instalment integer not null default 500 check (minimum_instalment > 0),
  current_instalment integer not null default 0 check (current_instalment >= 0),
  guarantor_name text not null,
  guarantor_phone text not null,
  course_end_date date,
  created_at timestamptz not null default now(),
  constraint outstanding_not_above_principal check (outstanding <= principal)
);

create table public.income_declarations (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.education_loans (id) on delete cascade,
  monthly_income integer not null check (monthly_income >= 0),
  proof_path text,
  declared_at timestamptz not null default now()
);

create table public.loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.education_loans (id),
  amount integer not null check (amount > 0),
  status public.payment_status not null default 'pending',
  gateway_ref text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- A confirmed repayment reduces the balance, closes the loan at zero, and goes back
-- into the education fund ledger for the next student.
create or replace function public.on_loan_repayment_paid()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  remaining integer;
begin
  if new.status = 'paid' and old.status <> 'paid' then
    new.paid_at := now();
    update public.education_loans
       set outstanding = greatest(0, outstanding - new.amount)
     where id = new.loan_id
     returning outstanding into remaining;
    if remaining = 0 then
      update public.education_loans set status = 'closed', current_instalment = 0 where id = new.loan_id;
    end if;
    insert into public.ledger_entries (fund, amount, memo)
    values ('loan_repayment', new.amount, 'Education loan repayment');
  end if;
  return new;
end;
$$;

create trigger loan_repayments_paid
before update of status on public.loan_repayments
for each row execute function public.on_loan_repayment_paid();

-- ---------- Lawajam (membership dues) ----------
create table public.lawajam_dues (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id),
  period text not null, -- e.g. '2026-27'
  amount integer not null check (amount > 0),
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (household_id, period)
);

create table public.lawajam_payments (
  id uuid primary key default gen_random_uuid(),
  due_id uuid not null references public.lawajam_dues (id),
  paid_by uuid not null references public.members (id),
  amount integer not null check (amount > 0),
  status public.payment_status not null default 'pending',
  gateway_ref text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Fraud flags (AI and rules only flag; a verifier decides) ----------
create table public.fraud_flags (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  matched_case_id uuid references public.cases (id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'cleared', 'confirmed')),
  reviewed_by uuid references public.members (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.fraud_flags (status);

-- Flags a new case when the same applicant or household already has an open case.
create or replace function public.flag_duplicate_cases()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.fraud_flags (case_id, matched_case_id, reason)
  select new.id, c.id,
         case when c.applicant_id = new.applicant_id
              then 'Same applicant already has an open case'
              else 'Same household already has an open case' end
  from public.cases c
  join public.members m_new on m_new.id = new.applicant_id
  join public.members m_old on m_old.id = c.applicant_id
  where c.id <> new.id
    and c.status not in ('closed', 'rejected')
    and (c.applicant_id = new.applicant_id
         or (m_new.household_id is not null and m_new.household_id = m_old.household_id));
  return new;
end;
$$;

create trigger cases_flag_duplicates
after insert on public.cases
for each row execute function public.flag_duplicate_cases();
