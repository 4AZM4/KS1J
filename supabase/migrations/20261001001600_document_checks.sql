-- Document checks: read a fee receipt, bill or mark sheet and show the verifier where it disagrees with the application.
--   * Results come from the check-document server function (AI, or the text of a PDF) or from a verifier typing
--     what the receipt says. Clients never write results directly.
--   * A mismatch raises a fraud flag for a verifier to clear or confirm. Nothing here changes a case's status
--     (CLAUDE.md rule 7: AI only flags and suggests).

create table public.document_checks (
  document_id uuid primary key references public.case_documents (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  outcome text not null check (outcome in ('matches', 'mismatch', 'unreadable')),
  method text not null check (method in ('ai', 'pdf_text', 'manual')),
  found_amount integer check (found_amount >= 0),
  found_name text check (char_length(found_name) <= 200),
  found_institution text check (char_length(found_institution) <= 200),
  expected_amount integer,
  mismatches text[] not null default '{}',
  checked_by uuid references public.members (id),
  checked_at timestamptz not null default now()
);
create index on public.document_checks (case_id);

alter table public.document_checks enable row level security;
-- Staff only. The applicant is not shown fraud checks on their own documents.
create policy "document checks: staff read" on public.document_checks
  for select to authenticated using (public.is_staff());
-- No insert, update or delete policies: results are written only by record_document_check().

alter table public.fraud_flags add column document_id uuid references public.case_documents (id) on delete cascade;

-- Saves what a document says and compares it with the application.
-- Callable by the server function (service role) and by a verifier or trustee entering what they read on the receipt.
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
  applicant_name text;
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
  select full_name into applicant_name from public.members where id = c.applicant_id;

  -- Amount: a receipt or bill should show what the application asks for.
  if p_amount is not null and d.kind in ('fee_receipt', 'medical_report') and p_amount <> c.requested_amount then
    issues := issues || format('The %s shows ₹%s but the application asks for ₹%s',
      case d.kind when 'fee_receipt' then 'fee receipt' else 'bill' end,
      to_char(p_amount, 'FM99,99,99,999'), to_char(c.requested_amount, 'FM99,99,99,999'));
  end if;

  -- Name: at least one word of the applicant's name should appear in the name on the document.
  if nullif(trim(p_name), '') is not null and applicant_name is not null then
    select coalesce(array_agg(lower(w)), '{}') into name_words
      from regexp_split_to_table(applicant_name, '[^[:alpha:]]+') as w where length(w) >= 3 and lower(w) <> 'demo';
    select coalesce(array_agg(lower(w)), '{}') into found_words
      from regexp_split_to_table(p_name, '[^[:alpha:]]+') as w where length(w) >= 3;
    if cardinality(name_words) > 0 and not (name_words && found_words) then
      issues := issues || format('The name on the document (%s) does not match the applicant', left(trim(p_name), 80));
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

-- The flag review guard also keeps the document link fixed.
create or replace function public.protect_fraud_flag_review()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_system() then
    return new;
  end if;
  if old.status <> 'open' then
    raise exception 'This flag has already been reviewed';
  end if;
  if new.status not in ('cleared', 'confirmed') then
    raise exception 'A flag can only be cleared or confirmed';
  end if;
  if new.case_id is distinct from old.case_id
     or new.matched_case_id is distinct from old.matched_case_id
     or new.document_id is distinct from old.document_id
     or new.reason is distinct from old.reason then
    raise exception 'Only the review decision can change on a flag';
  end if;
  new.reviewed_by := (select auth.uid());
  new.reviewed_at := now();
  return new;
end;
$$;
revoke execute on function public.protect_fraud_flag_review() from public, anon, authenticated;
