-- Khums and Lawajam, part 2.
--   * Sehme Imam institutions: the trustee who adds an institution cannot also verify its ijazah
--     (same two-person rule as cases). Verification is stamped by the database, not the client.
--   * Lawajam: members pay only their own household's due, for the exact amount.
--   * Finance creates a year's dues for every household in one step.

-- ---------- Institutions: two trustees ----------
alter table public.institutions add column added_by uuid references public.members (id);

create or replace function public.protect_institution_verification()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if public.is_system() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.added_by := me;
    new.ijazah_verified_by := null;
    new.ijazah_verified_at := null;
    return new;
  end if;
  new.added_by := old.added_by;
  if new.ijazah_verified_by is distinct from old.ijazah_verified_by then
    if new.ijazah_verified_by is null then
      new.ijazah_verified_at := null;           -- verification withdrawn
    else
      if me = old.added_by then
        raise exception 'A different trustee must verify the ijazah of an institution you added';
      end if;
      new.ijazah_verified_by := me;             -- always the person actually verifying
      new.ijazah_verified_at := now();
    end if;
  elsif new.ijazah_verified_at is distinct from old.ijazah_verified_at then
    new.ijazah_verified_at := old.ijazah_verified_at;
  end if;
  return new;
end;
$$;

create trigger institutions_protect_verification
before insert or update on public.institutions
for each row execute function public.protect_institution_verification();

revoke execute on function public.protect_institution_verification() from public, anon, authenticated;

-- ---------- Lawajam: pay only your household's due, in full ----------
drop policy "lawajam payments: create pending" on public.lawajam_payments;
create policy "lawajam payments: create pending for own household" on public.lawajam_payments
  for insert to authenticated
  with check (
    paid_by = (select auth.uid()) and status = 'pending'
    and exists (
      select 1 from public.lawajam_dues d
      where d.id = due_id and d.household_id = public.my_household()
        and d.status = 'pending' and d.amount = lawajam_payments.amount
    )
  );

-- ---------- Lawajam: finance raises a period's dues for every household ----------
create or replace function public.create_lawajam_period(p_period text, p_amount integer)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  n integer;
begin
  if not public.has_role('finance') then
    raise exception 'Only finance can raise Lawajam dues';
  end if;
  if p_period !~ '^\d{4}-\d{2}$' then
    raise exception 'Period must look like 2026-27';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be more than zero';
  end if;
  insert into public.lawajam_dues (household_id, period, amount)
  select h.id, p_period, p_amount from public.households h
  on conflict (household_id, period) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.create_lawajam_period(text, integer) from public, anon;
grant execute on function public.create_lawajam_period(text, integer) to authenticated;
