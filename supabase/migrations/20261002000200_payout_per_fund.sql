-- Payouts must come from the fund the money was given to.
-- Before this, a case funded with Sehme Sadaat could be paid out from General (only the case total was
-- checked), which pushed General negative and broke fund separation. Now each payout is capped by what
-- was actually paid to this case in that fund, minus earlier payouts from that fund.
-- Loans are unchanged: they are paid from the loan pool once the repayment plan is agreed.

create or replace function public.on_disbursement()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c public.cases;
  paid_so_far integer;
  given_in_fund integer;
  paid_in_fund integer;
begin
  -- Lock the case so two payouts at once cannot both pass the checks.
  select * into c from public.cases where id = new.case_id for update;
  if new.fund = 'sehme_sadaat' and (c.category <> 'sadaat' or not c.lineage_verified) then
    raise exception 'Sehme Sadaat can only be paid out to a Sadaat case with verified lineage';
  end if;
  if c.type = 'education_loan' then
    if c.status not in ('approved', 'published', 'funded') then
      raise exception 'This loan is not approved for payout';
    end if;
    if not exists (
      select 1 from public.education_loans where case_id = new.case_id and plan_agreed_at is not null
    ) then
      raise exception 'A loan cannot be paid out until the family and committee have agreed the repayment plan';
    end if;
  else
    if c.status <> 'funded' then
      raise exception 'Only a fully funded case can be paid out';
    end if;
    select coalesce(sum(amount), 0) into paid_so_far from public.disbursements where case_id = new.case_id and id <> new.id;
    if paid_so_far + new.amount > c.raised_amount then
      raise exception 'Payouts cannot exceed the ₹% raised for this case', c.raised_amount;
    end if;
    select coalesce(sum(amount), 0) into given_in_fund
      from public.donations where case_id = new.case_id and fund = new.fund and status = 'paid';
    select coalesce(sum(amount), 0) into paid_in_fund
      from public.disbursements where case_id = new.case_id and fund = new.fund and id <> new.id;
    if paid_in_fund + new.amount > given_in_fund then
      raise exception 'Only ₹% given to this case from % is left to pay out; pay from the fund the money came from',
        greatest(given_in_fund - paid_in_fund, 0), replace(new.fund::text, '_', ' ');
    end if;
  end if;
  insert into public.ledger_entries (fund, amount, case_id, memo, created_by)
  values (new.fund, -new.amount, new.case_id, 'Disbursed to ' || new.payee, new.recorded_by);
  return new;
end;
$$;

revoke execute on function public.on_disbursement() from public, anon, authenticated;
