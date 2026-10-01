-- Public case cards never identify the person who asked for help.
--   * The applicant's own title is never shown publicly; donors see a plain title made from the case type.
--   * The public summary written by staff is masked: names of the applicant, the person who submitted it and
--     everyone in their household, their phones, addresses, Jamaat numbers, and any phone number or email.
--   * Staff can preview exactly what donors will see before approving.

-- Plain public title from the case type. Nothing personal goes in it.
create or replace function public.public_case_title(p_type public.case_type)
returns text
language sql immutable set search_path = ''
as $$
  select case p_type
    when 'medical' then 'Medical help for a family'
    when 'education' then 'School fees for a student'
    when 'ration' then 'Monthly ration for a family'
    when 'scholarship' then 'Scholarship for a student'
    when 'education_loan' then 'Education loan for a student'
    else 'Help for a family'
  end;
$$;

-- Hides each listed name (word by word), each listed phrase (addresses, numbers), and any phone number or email.
create or replace function public.mask_identity(p_text text, p_names text[], p_phrases text[])
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  t text := p_text;
  n text;
  w text;
begin
  if t is null then
    return null;
  end if;
  -- Exact phrases first (addresses, phones, Jamaat numbers), longest first.
  for n in select p from unnest(coalesce(p_phrases, '{}')) as p where length(trim(p)) >= 3 order by length(p) desc loop
    t := replace(t, trim(n), '[hidden]');
  end loop;
  t := regexp_replace(t, '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+', '[email hidden]', 'g');
  t := regexp_replace(t, '\+?[0-9][0-9 -]{6,}[0-9]', '[number hidden]', 'g');
  -- Every word of every name, 3 letters or more, as a whole word in any case.
  for n in select x from unnest(coalesce(p_names, '{}')) as x loop
    foreach w in array regexp_split_to_array(trim(coalesce(n, '')), '[^[:alnum:]'']+') loop
      if length(w) >= 3 then
        t := regexp_replace(t, '\m' || regexp_replace(w, '([^[:alnum:]])', '\\\1', 'g') || '\M', '[name hidden]', 'gi');
      end if;
    end loop;
  end loop;
  -- "[name hidden] [name hidden]" reads as one hidden name.
  t := regexp_replace(t, '\[name hidden\](\s+\[name hidden\])+', '[name hidden]', 'g');
  return t;
end;
$$;

-- What donors may see of one case's summary.
create or replace function public.public_case_summary(p_case uuid, p_summary text)
returns text
language sql stable security definer set search_path = ''
as $$
  with people as (
    select m.full_name, m.phone, m.address, m.jamaat_number
    from public.cases c
    join public.members m
      on m.id in (c.applicant_id, c.submitted_by)
      or (m.household_id is not null
          and m.household_id = (select a.household_id from public.members a where a.id = c.applicant_id))
    where c.id = p_case
  )
  select public.mask_identity(
    p_summary,
    (select coalesce(array_agg(full_name), '{}') from people),
    (select coalesce(array_agg(x), '{}') from people,
       unnest(array[phone, address, jamaat_number]) as x where x is not null)
    || (select coalesce(array_agg(h.address), '{}') from public.cases c
          join public.members a on a.id = c.applicant_id
          join public.households h on h.id = a.household_id
        where c.id = p_case and h.address is not null)
  );
$$;

-- Public list: no names, phones, addresses, or the applicant's own words.
create or replace function public.list_public_cases(p_category public.case_category default null)
returns table (
  id uuid, case_no bigint, type public.case_type, category public.case_category,
  title text, public_summary text, target_amount integer, raised_amount integer, status public.case_status
)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.case_no, c.type, c.category,
         public.public_case_title(c.type),
         public.public_case_summary(c.id, c.public_summary),
         c.target_amount, c.raised_amount, c.status
  from public.cases c
  where c.status in ('published', 'funded')
    and (p_category is null or c.category = p_category)
  order by c.created_at desc;
$$;
revoke all on function public.list_public_cases(public.case_category) from public;
grant execute on function public.list_public_cases(public.case_category) to anon, authenticated;

-- Staff preview of the public card for a summary they are about to approve.
create or replace function public.preview_public_case(p_case uuid, p_summary text)
returns table (title text, public_summary text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only Jamaat staff can preview a case';
  end if;
  return query
    select public.public_case_title(c.type), public.public_case_summary(c.id, p_summary)
    from public.cases c where c.id = p_case;
end;
$$;

revoke all on function public.public_case_summary(uuid, text) from public, anon, authenticated;
revoke all on function public.preview_public_case(uuid, text) from public, anon;
grant execute on function public.preview_public_case(uuid, text) to authenticated;
revoke all on function public.mask_identity(text, text[], text[]) from public, anon, authenticated;
grant execute on function public.public_case_title(public.case_type) to anon, authenticated;
