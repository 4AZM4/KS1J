-- Member signup: anyone can create an account; a Jamaat verifier links it to a household
-- and verifies the membership. Until then the member has no household (so sees no family data).

alter table public.members
  add column area text check (char_length(area) <= 80),
  add column address text check (char_length(address) <= 300),
  add column jamaat_number text check (char_length(jamaat_number) <= 40);

-- Members can never place themselves in a household or verify themselves, on insert or update.
create or replace function public.protect_member_fields()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_system() or public.has_role('verifier') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.household_id := null;
    new.membership_verified := false;
  elsif new.membership_verified is distinct from old.membership_verified
     or new.household_id is distinct from old.household_id then
    raise exception 'Only a Jamaat verifier can change membership or household';
  end if;
  return new;
end;
$$;

drop trigger members_protect_fields on public.members;
create trigger members_protect_fields
before insert or update on public.members
for each row execute function public.protect_member_fields();

-- Creates the member profile from the signup form as soon as the account exists
-- (even before the email is confirmed). Accounts made without a name (e.g. seeds) are skipped.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := nullif(trim(meta->>'full_name'), '');
  phone text := nullif(regexp_replace(coalesce(meta->>'phone', ''), '\D', '', 'g'), '');
begin
  if name is null then
    return new;
  end if;
  begin
    insert into public.members (id, full_name, phone, area, address, jamaat_number)
    values (new.id, left(name, 120), phone, left(nullif(trim(meta->>'area'), ''), 80),
            left(nullif(trim(meta->>'address'), ''), 300), left(nullif(trim(meta->>'jamaat_number'), ''), 40));
  exception when unique_violation then
    -- That mobile number is already registered: keep the account, leave the number for a verifier to sort out.
    insert into public.members (id, full_name, area, address, jamaat_number)
    values (new.id, left(name, 120), left(nullif(trim(meta->>'area'), ''), 80),
            left(nullif(trim(meta->>'address'), ''), 300), left(nullif(trim(meta->>'jamaat_number'), ''), 40))
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
