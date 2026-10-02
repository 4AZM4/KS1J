-- Fixes from the pre-demo review.
--   1. Payouts only from a fully funded case (loans: once the plan is agreed), never more than was raised,
--      and Sehme Sadaat only to a case whose Sadaat lineage is verified (hard rules 1 and 2).
--   2. Once a case is approved, nobody can quietly change who it is for, how much it asks for, or the
--      text the trustee approved.
--   3. Donations cannot take a case past its target.
--   4. Document checks: a name on the document matches anyone in the applicant's household (a parent
--      applying for a child), and when a verifier re-reads a document, problems that are gone are cleared.
--   5. Masking public summaries: addresses are hidden whatever their capitals; dates are no longer
--      mistaken for phone numbers.

-- ---------- 1. Payouts ----------
create or replace function public.on_disbursement()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c public.cases;
  paid_so_far integer;
begin
  -- Lock the case so two payouts at once cannot both pass the total check.
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
  end if;
  insert into public.ledger_entries (fund, amount, case_id, memo, created_by)
  values (new.fund, -new.amount, new.case_id, 'Disbursed to ' || new.payee, new.recorded_by);
  return new;
end;
$$;
revoke execute on function public.on_disbursement() from public, anon, authenticated;

-- ---------- 2. Freeze an approved case ----------
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
    if new.applicant_id is distinct from old.applicant_id or new.submitted_by is distinct from old.submitted_by then
      raise exception 'Who a case is for cannot be changed';
    end if;
    if old.status not in ('submitted', 'verified')
       and (new.requested_amount is distinct from old.requested_amount
            or new.title is distinct from old.title
            or new.public_summary is distinct from old.public_summary) then
      raise exception 'An approved case cannot be edited';
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
revoke execute on function public.enforce_case_transition() from public, anon, authenticated;

-- ---------- 3. No giving past the target ----------
create or replace function public.check_donation_rules()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
  i record;
begin
  if new.case_id is not null then
    select category, status, lineage_verified, target_amount, raised_amount into c from public.cases where id = new.case_id;
    if c.status <> 'published' then
      raise exception 'Donations are only accepted for published cases';
    end if;
    if new.fund = 'sehme_imam' then
      raise exception 'Sehme Imam can only be given to an institution holding ijazah';
    end if;
    if new.fund = 'sehme_sadaat' and (c.category <> 'sadaat' or not c.lineage_verified) then
      raise exception 'Sehme Sadaat can only go to a verified Sadaat case';
    end if;
    if c.target_amount is not null and new.amount > c.target_amount - c.raised_amount then
      raise exception 'This case only needs ₹% more', greatest(c.target_amount - c.raised_amount, 0);
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
revoke execute on function public.check_donation_rules() from public, anon, authenticated;

-- ---------- 4. Document checks ----------
create or replace function public.record_document_check(
  p_document uuid,
  p_method text,
  p_amount integer default null,
  p_name text default null,
  p_institution text default null
)
returns public.document_checks
language plpgsql security definer set search_path = ''
as $$
declare
  d public.case_documents;
  c public.cases;
  issues text[] := '{}';
  result public.document_checks;
  name_words text[];
  found_words text[];
begin
  if not public.is_system() and not (public.has_role('verifier') or public.has_role('trustee')) then
    raise exception 'Only a Jamaat verifier or trustee can record a document check';
  end if;
  if p_method not in ('ai', 'pdf_text', 'manual') then
    raise exception 'Unknown check method';
  end if;
  if not public.is_system() and p_method <> 'manual' then
    raise exception 'Staff record what they read on the document (manual)';
  end if;
  if p_amount is not null and p_amount < 0 then
    raise exception 'Amount cannot be negative';
  end if;

  select * into d from public.case_documents where id = p_document;
  if not found then
    raise exception 'Document not found';
  end if;
  select * into c from public.cases where id = d.case_id;

  -- Amount: a receipt or bill should show what the application asks for.
  if p_amount is not null and d.kind in ('fee_receipt', 'medical_report') and p_amount <> c.requested_amount then
    issues := issues || format('The %s shows ₹%s but the application asks for ₹%s',
      case d.kind when 'fee_receipt' then 'fee receipt' else 'bill' end,
      to_char(p_amount, 'FM99,99,99,999'), to_char(c.requested_amount, 'FM99,99,99,999'));
  end if;

  -- Name: the document should name the applicant, the person who submitted it, or someone in their household
  -- (a parent often applies for a child's fees or a relative's treatment).
  if nullif(trim(p_name), '') is not null then
    select coalesce(array_agg(distinct lower(w)), '{}') into name_words
      from public.members m
      cross join lateral regexp_split_to_table(m.full_name, '[^[:alpha:]]+') as w
     where (m.id in (c.applicant_id, c.submitted_by)
            or (m.household_id is not null
                and m.household_id = (select a.household_id from public.members a where a.id = c.applicant_id)))
       and length(w) >= 3 and lower(w) <> 'demo';
    select coalesce(array_agg(lower(w)), '{}') into found_words
      from regexp_split_to_table(p_name, '[^[:alpha:]]+') as w where length(w) >= 3;
    if cardinality(name_words) > 0 and not (name_words && found_words) then
      issues := issues || format('The name on the document (%s) does not match the applicant or their household', left(trim(p_name), 80));
    end if;
  end if;

  insert into public.document_checks
    (document_id, case_id, outcome, method, found_amount, found_name, found_institution, expected_amount, mismatches, checked_by)
  values
    (d.id, d.case_id,
     case when cardinality(issues) > 0 then 'mismatch'
          when p_amount is null and nullif(trim(p_name), '') is null and nullif(trim(p_institution), '') is null then 'unreadable'
          else 'matches' end,
     p_method, p_amount, nullif(left(trim(p_name), 200), ''), nullif(left(trim(p_institution), 200), ''),
     c.requested_amount, issues,
     case when public.is_system() then null else (select auth.uid()) end)
  on conflict (document_id) do update set
    outcome = excluded.outcome, method = excluded.method, found_amount = excluded.found_amount,
    found_name = excluded.found_name, found_institution = excluded.found_institution,
    expected_amount = excluded.expected_amount, mismatches = excluded.mismatches,
    checked_by = excluded.checked_by, checked_at = now()
  returning * into result;

  -- A verifier re-reading the document clears the problems that are no longer there (recorded as their review).
  -- An automatic read never clears a flag: only people decide.
  if p_method = 'manual' and not public.is_system() then
    update public.fraud_flags f
       set status = 'cleared'
     where f.document_id = d.id and f.status = 'open' and f.matched_case_id is null
       and not (f.reason = any (issues));
  end if;

  -- One open flag per document and problem, for a verifier to clear or confirm.
  insert into public.fraud_flags (case_id, document_id, reason)
  select d.case_id, d.id, i
  from unnest(issues) as i
  where not exists (
    select 1 from public.fraud_flags f where f.document_id = d.id and f.reason = i and f.status = 'open'
  );

  return result;
end;
$$;
revoke all on function public.record_document_check(uuid, text, integer, text, text) from public, anon;
grant execute on function public.record_document_check(uuid, text, integer, text, text) to authenticated, service_role;

-- ---------- 5. Masking ----------
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
  -- Exact phrases first (addresses, phones, Jamaat numbers), longest first, in any capitals.
  for n in select trim(p) from unnest(coalesce(p_phrases, '{}')) as p where length(trim(p)) >= 3 order by length(trim(p)) desc loop
    t := regexp_replace(t, regexp_replace(n, '([^[:alnum:][:space:]])', '\\\1', 'g'), '[hidden]', 'gi');
  end loop;
  t := regexp_replace(t, '[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+', '[email hidden]', 'g');
  -- Phone numbers: 10 or more digits, optionally split by spaces or dashes. Dates (8 digits) stay.
  t := regexp_replace(t, '\+?[0-9](?:[ -]?[0-9]){9,}', '[number hidden]', 'g');
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
revoke execute on function public.mask_identity(text, text[], text[]) from public, anon, authenticated;
