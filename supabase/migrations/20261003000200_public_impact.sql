-- Totals for the landing page: what the community has done together. Aggregates only, no case,
-- person or amount that could identify a family (CLAUDE.md rule 5). Anyone can read them.
create or replace function public.public_impact()
returns table (
  raised integer,
  families_helped integer,
  open_needs integer,
  students_with_loans integer,
  loans_repaid integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(raised_amount) from public.cases
              where type <> 'education_loan' and status in ('published', 'funded', 'disbursed', 'closed')), 0)::integer,
    (select count(*) from public.cases
      where type <> 'education_loan'
        and (status in ('funded', 'disbursed') or (status = 'closed' and raised_amount >= coalesce(target_amount, 0) and raised_amount > 0)))::integer,
    (select count(*) from public.cases where status = 'published')::integer,
    (select count(*) from public.education_loans where status <> 'converted_to_grant')::integer,
    coalesce((select sum(principal - outstanding) from public.education_loans), 0)::integer;
$$;

revoke execute on function public.public_impact() from public;
grant execute on function public.public_impact() to anon, authenticated;
