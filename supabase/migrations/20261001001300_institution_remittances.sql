-- Sehme Imam handed over to institutions. Finance records each remittance; the database checks it
-- does not exceed what has been collected for that institution and writes the matching ledger entry.
-- Remittances, like ledger entries, are never edited or deleted.

create table public.institution_remittances (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id),
  amount integer not null check (amount > 0),
  reference text not null check (char_length(reference) between 3 and 120), -- bank transfer or cheque number
  remitted_on date not null default current_date,
  recorded_by uuid references public.members (id),
  created_at timestamptz not null default now()
);
create index on public.institution_remittances (institution_id);

alter table public.institution_remittances enable row level security;

create policy "remittances: finance and trustees read" on public.institution_remittances
  for select to authenticated using (public.has_role('finance') or public.has_role('trustee'));
create policy "remittances: finance records" on public.institution_remittances
  for insert to authenticated with check (public.has_role('finance'));
-- No update or delete policies.

-- Sehme Imam still held for an institution: received minus already remitted (from the ledger).
create or replace function public.institution_sehme_imam_balance(p_institution uuid)
returns integer
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (public.is_system() or public.has_role('finance') or public.has_role('trustee')) then
    raise exception 'Only finance and trustees can see fund balances';
  end if;
  return (select coalesce(sum(amount), 0)::int
          from public.ledger_entries
          where fund = 'sehme_imam' and institution_id = p_institution);
end;
$$;

create or replace function public.on_institution_remittance()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  held integer;
  inst_name text;
begin
  new.recorded_by := coalesce((select auth.uid()), new.recorded_by);
  -- Serialise remittances for the same institution so two at once cannot overdraw it.
  perform pg_advisory_xact_lock(hashtext(new.institution_id::text));
  held := public.institution_sehme_imam_balance(new.institution_id);
  if new.amount > held then
    raise exception 'Only % of Sehme Imam is held for this institution', held;
  end if;
  select name into inst_name from public.institutions where id = new.institution_id;
  insert into public.ledger_entries (fund, amount, institution_id, memo, created_by)
  values ('sehme_imam', -new.amount, new.institution_id,
          'Remitted to ' || inst_name || ' (' || new.reference || ')', new.recorded_by);
  return new;
end;
$$;

create trigger institution_remittances_ledger
before insert on public.institution_remittances
for each row execute function public.on_institution_remittance();

revoke execute on function public.on_institution_remittance() from public, anon, authenticated;
revoke execute on function public.institution_sehme_imam_balance(uuid) from public, anon;
grant execute on function public.institution_sehme_imam_balance(uuid) to authenticated;
