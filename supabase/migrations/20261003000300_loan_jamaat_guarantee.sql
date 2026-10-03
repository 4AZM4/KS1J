-- Education loans for a student with no family (an orphan, or no relative who can stand guarantee).
--
-- Instead of being refused, the loan can be guaranteed by the Jamaat itself (the welfare committee),
-- with a mentor: a named committee member who checks in with the student. The rest of the loan is
-- unchanged: interest-free, no late fees, the plan agreed before payout, repayment only after the
-- course and grace period. The safety net already exists: a hardship request pauses reminders, and
-- the committee can convert the loan to a grant.
--   - jamaat_guarantee: the Jamaat guarantees the loan; guarantor_name shows the welfare committee.
--   - mentor_member_id: required for a Jamaat guarantee; must be Jamaat staff.
--   - Staff see the mentor on the loan itself (education_loans.mentor_member_id); the follow-up list
--     already shows the guarantor as the welfare committee, reached on the mentor's phone.

alter table public.education_loans
  add column jamaat_guarantee boolean not null default false,
  add column mentor_member_id uuid references public.members (id);

create index if not exists education_loans_mentor_member_id_idx on public.education_loans (mentor_member_id);

create or replace function public.check_loan_guarantee()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.jamaat_guarantee then
    if new.mentor_member_id is null then
      raise exception 'A loan guaranteed by the Jamaat needs a mentor from the committee';
    end if;
    if not exists (select 1 from public.member_roles where member_id = new.mentor_member_id) then
      raise exception 'The mentor must be a Jamaat committee member';
    end if;
    -- The guarantor shown everywhere is the welfare committee, reached through the mentor.
    new.guarantor_name := 'KSI Jamaat welfare committee';
    new.guarantor_member_id := null;
    new.guarantor_phone := coalesce((select phone from public.members where id = new.mentor_member_id), new.guarantor_phone);
  elsif new.mentor_member_id is not null
        and not exists (select 1 from public.member_roles where member_id = new.mentor_member_id) then
    raise exception 'The mentor must be a Jamaat committee member';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_loan_guarantee() from public, anon, authenticated;

create trigger education_loans_guarantee
before insert or update of jamaat_guarantee, mentor_member_id, guarantor_name, guarantor_phone on public.education_loans
for each row execute function public.check_loan_guarantee();

-- Committee members a trustee or finance can choose as a mentor. Staff only; names and phones only.
create or replace function public.staff_directory()
returns table (id uuid, full_name text, phone text, roles text[])
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only Jamaat staff can see the committee list';
  end if;
  return query
  select m.id, m.full_name, m.phone, array_agg(r.role::text order by r.role::text)
  from public.members m
  join public.member_roles r on r.member_id = m.id
  group by m.id, m.full_name, m.phone
  order by m.full_name;
end;
$$;

revoke execute on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated;
