-- KS1J core schema: members, roles, cases, institutions, donations, ledgers.
-- Rules enforced here (not just in the apps):
--   * Verify and approve must be done by two different admins (maker-checker).
--   * Sehme Sadaat only to verified Sadaat cases; Sehme Imam only to institutions with a verified ijazah.
--   * Ledgers are append-only: corrections are new reversing rows.

create extension if not exists pgcrypto;

-- ---------- Enums (mirror packages/shared/src/domain.ts) ----------
create type public.admin_role as enum ('volunteer', 'verifier', 'trustee', 'finance', 'super_admin');
create type public.case_type as enum ('medical', 'education', 'ration', 'scholarship', 'education_loan', 'other');
create type public.case_category as enum ('sadaat', 'non_sadaat');
create type public.case_status as enum ('submitted', 'verified', 'approved', 'published', 'funded', 'disbursed', 'closed', 'rejected');
create type public.fund_type as enum ('sehme_sadaat', 'sehme_imam', 'general', 'lawajam', 'loan_repayment');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

-- ---------- Members and roles ----------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  area text not null,
  address text,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text unique,
  household_id uuid references public.households (id),
  membership_verified boolean not null default false,
  language text not null default 'en' check (language in ('en', 'gu', 'hi', 'ur')),
  created_at timestamptz not null default now()
);
create index on public.members (household_id);

create table public.member_roles (
  member_id uuid not null references public.members (id) on delete cascade,
  role public.admin_role not null,
  granted_by uuid references public.members (id),
  granted_at timestamptz not null default now(),
  primary key (member_id, role)
);

-- Role check used by RLS policies. SECURITY DEFINER so policies can read member_roles
-- without granting members read access to the whole roles table.
create or replace function public.has_role(r public.admin_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.member_roles
    where member_id = (select auth.uid()) and (role = r or role = 'super_admin')
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.member_roles where member_id = (select auth.uid()));
$$;

-- True for server-side jobs: requests made with the service-role key (payment webhooks),
-- or direct database sessions with no API JWT at all (migrations, seed, SQL editor).
-- Anonymous and signed-in API requests always carry JWT claims, so they are never "system".
create or replace function public.is_system()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce((select auth.role()), '') = 'service_role'
      or nullif(current_setting('request.jwt.claims', true), '') is null;
$$;

-- ---------- Cases (welfare, scholarships, loans) ----------
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_no bigint generated always as identity unique,
  applicant_id uuid not null references public.members (id),
  submitted_by uuid not null references public.members (id),
  type public.case_type not null,
  category public.case_category not null,
  status public.case_status not null default 'submitted',
  title text not null,
  -- Shown to donors only if the beneficiary approved it. No names, phones or addresses.
  public_summary text,
  show_identity boolean not null default false,
  requested_amount integer not null check (requested_amount > 0),
  target_amount integer check (target_amount > 0),
  raised_amount integer not null default 0 check (raised_amount >= 0),
  lineage_verified boolean not null default false,
  assigned_to uuid references public.members (id),
  verified_by uuid references public.members (id),
  verified_at timestamptz,
  approved_by uuid references public.members (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Maker-checker: the approver can never be the verifier.
  constraint verifier_is_not_approver check (approved_by is null or approved_by <> verified_by),
  -- A Sadaat case must have lineage verified before it can be approved.
  constraint sadaat_needs_lineage check (
    category <> 'sadaat' or status in ('submitted', 'verified', 'rejected') or lineage_verified
  )
);
create index on public.cases (status);
create index on public.cases (applicant_id);

create table public.case_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.cases (id) on delete cascade,
  from_status public.case_status,
  to_status public.case_status not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index on public.case_events (case_id);

create table public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  kind text not null, -- fee_receipt, marksheet, income_proof, medical_report, lineage_proof, ...
  storage_path text not null,
  uploaded_by uuid not null references public.members (id),
  created_at timestamptz not null default now()
);
create index on public.case_documents (case_id);

-- Enforces the case lifecycle and who may perform each step.
create or replace function public.enforce_case_transition()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if new.status <> 'submitted' and not public.is_system() then
      raise exception 'New cases must start as submitted';
    end if;
    if not public.is_system() then
      new.verified_by := null; new.approved_by := null; new.raised_amount := 0; new.lineage_verified := false;
    end if;
    return new;
  end if;

  new.updated_at := now();
  if not public.is_system() then
    -- Money totals and sign-offs are never set by hand.
    new.raised_amount := old.raised_amount;
    new.verified_by := old.verified_by; new.verified_at := old.verified_at;
    new.approved_by := old.approved_by; new.approved_at := old.approved_at;
    if new.lineage_verified is distinct from old.lineage_verified and not public.has_role('verifier') then
      raise exception 'Only a verifier can confirm Sadaat lineage';
    end if;
    if old.status not in ('submitted', 'verified')
       and (new.category is distinct from old.category or new.target_amount is distinct from old.target_amount) then
      raise exception 'Category and target cannot change after approval';
    end if;
  end if;
  if new.status = old.status then
    return new;
  end if;

  if public.is_system() then
    null; -- payment webhooks may move published -> funded
  elsif not (
       (old.status = 'submitted' and new.status in ('verified', 'rejected') and public.has_role('verifier'))
    or (old.status = 'verified'  and new.status in ('approved', 'rejected') and public.has_role('trustee'))
    or (old.status = 'approved'  and new.status = 'published' and public.has_role('trustee'))
    or (old.status = 'published' and new.status = 'funded'    and public.has_role('trustee'))
    or (old.status = 'funded'    and new.status = 'disbursed' and public.has_role('finance'))
    or (old.status = 'disbursed' and new.status = 'closed'    and public.has_role('finance'))
  ) then
    raise exception 'Not allowed to move case from % to %', old.status, new.status;
  end if;

  if new.status = 'verified' then
    new.verified_by := coalesce(actor, new.verified_by); new.verified_at := now();
  elsif new.status = 'approved' then
    new.approved_by := coalesce(actor, new.approved_by); new.approved_at := now();
    if new.approved_by = old.verified_by then
      raise exception 'The trustee who approves a case cannot be the person who verified it';
    end if;
    if new.target_amount is null then new.target_amount := new.requested_amount; end if;
  end if;

  insert into public.case_events (case_id, from_status, to_status, actor_id)
  values (new.id, old.status, new.status, actor);
  return new;
end;
$$;

create trigger cases_lifecycle
before insert or update on public.cases
for each row execute function public.enforce_case_transition();

-- ---------- Sehme Imam institutions ----------
create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  marja text not null,               -- the Marja' who granted the ijazah
  ijazah_document_path text not null,
  ijazah_verified_by uuid references public.members (id),
  ijazah_verified_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Donations and ledgers ----------
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.members (id),
  fund public.fund_type not null check (fund in ('sehme_sadaat', 'sehme_imam', 'general')),
  case_id uuid references public.cases (id),
  institution_id uuid references public.institutions (id),
  amount integer not null check (amount > 0),
  status public.payment_status not null default 'pending',
  gateway_ref text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint exactly_one_target check ((case_id is null) <> (institution_id is null))
);
create index on public.donations (case_id);
create index on public.donations (donor_id);

-- The fund-separation rules. Mirrors isDonationAllowed() in packages/shared.
create or replace function public.check_donation_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
  i record;
begin
  if new.case_id is not null then
    select category, status, lineage_verified into c from public.cases where id = new.case_id;
    if c.status <> 'published' then
      raise exception 'Donations are only accepted for published cases';
    end if;
    if new.fund = 'sehme_imam' then
      raise exception 'Sehme Imam can only be given to an institution holding ijazah';
    end if;
    if new.fund = 'sehme_sadaat' and (c.category <> 'sadaat' or not c.lineage_verified) then
      raise exception 'Sehme Sadaat can only go to a verified Sadaat case';
    end if;
  else
    select ijazah_verified_by, is_active into i from public.institutions where id = new.institution_id;
    if new.fund <> 'sehme_imam' then
      raise exception 'Institutions on this list receive Sehme Imam only';
    end if;
    if i.ijazah_verified_by is null or not i.is_active then
      raise exception 'This institution does not have a verified ijazah';
    end if;
  end if;
  return new;
end;
$$;

create trigger donations_rules
before insert on public.donations
for each row execute function public.check_donation_rules();

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  fund public.fund_type not null,
  amount integer not null check (amount <> 0), -- positive = in, negative = out
  donation_id uuid references public.donations (id),
  case_id uuid references public.cases (id),
  institution_id uuid references public.institutions (id),
  memo text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.ledger_entries (fund);

create or replace function public.forbid_ledger_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Ledger entries cannot be changed or deleted; add a reversing entry instead';
end;
$$;

create trigger ledger_append_only
before update or delete on public.ledger_entries
for each row execute function public.forbid_ledger_changes();

-- When the gateway confirms a payment (server-side, service role), record it once.
create or replace function public.on_donation_paid()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status <> 'paid' then
    new.paid_at := now();
    insert into public.ledger_entries (fund, amount, donation_id, case_id, institution_id, memo)
    values (new.fund, new.amount, new.id, new.case_id, new.institution_id, 'Donation received');
    if new.case_id is not null then
      update public.cases
         set raised_amount = raised_amount + new.amount,
             status = case when raised_amount + new.amount >= target_amount then 'funded'::public.case_status else status end
       where id = new.case_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger donations_paid
before update of status on public.donations
for each row execute function public.on_donation_paid();

create table public.disbursements (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id),
  fund public.fund_type not null check (fund in ('sehme_sadaat', 'general')),
  amount integer not null check (amount > 0),
  payee text not null, -- the hospital, school or beneficiary actually paid
  proof_path text,
  recorded_by uuid not null references public.members (id),
  created_at timestamptz not null default now()
);

create or replace function public.on_disbursement()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  cat public.case_category;
begin
  select category into cat from public.cases where id = new.case_id;
  if new.fund = 'sehme_sadaat' and cat <> 'sadaat' then
    raise exception 'Sehme Sadaat can only be disbursed to a Sadaat case';
  end if;
  insert into public.ledger_entries (fund, amount, case_id, memo, created_by)
  values (new.fund, -new.amount, new.case_id, 'Disbursed to ' || new.payee, new.recorded_by);
  return new;
end;
$$;

create trigger disbursements_ledger
after insert on public.disbursements
for each row execute function public.on_disbursement();

-- Published case cards for donors: only safe columns, only published or funded cases.
create or replace function public.list_public_cases(p_category public.case_category default null)
returns table (
  id uuid, case_no bigint, type public.case_type, category public.case_category,
  title text, public_summary text, target_amount integer, raised_amount integer, status public.case_status
)
language sql stable security definer set search_path = ''
as $$
  select id, case_no, type, category, title, public_summary, target_amount, raised_amount, status
  from public.cases
  where status in ('published', 'funded')
    and (p_category is null or category = p_category)
  order by created_at desc;
$$;

-- ---------- Announcements ----------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published_at timestamptz,
  created_by uuid references public.members (id),
  created_at timestamptz not null default now()
);
