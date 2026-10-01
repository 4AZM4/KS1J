-- Education loans, part 2: automatic status changes, AutoPay set-up, and a private
-- documents bucket for proofs (hardship income proof, case documents).

-- ---------- Loan status follows the dates (run daily by the scheduler, and after key changes) ----------
-- studying -> grace once the course ends; grace -> repaying once the grace period ends;
-- paused -> repaying once the paused months are over.
create or replace function public.refresh_loan_statuses()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  n integer;
begin
  if not (public.is_system() or public.is_staff()) then
    raise exception 'Only the server or Jamaat staff can refresh loan statuses';
  end if;
  update public.education_loans
     set status = case
       when status = 'studying' and grace_ends_on is not null and grace_ends_on <= current_date then 'repaying'
       when status = 'studying' and course_end_date is not null and course_end_date <= current_date then 'grace'
       when status = 'grace' and grace_ends_on is not null and grace_ends_on <= current_date then 'repaying'
       when status = 'paused' and next_due_date is not null and next_due_date <= current_date + 3 then 'repaying'
       else status end
   where status in ('studying', 'grace', 'paused');
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.refresh_loan_statuses() from public, anon;
grant execute on function public.refresh_loan_statuses() to authenticated;

-- Schedule it daily where pg_cron is available (Supabase). Plain Postgres in CI skips this.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('ks1j-refresh-loan-statuses', '15 0 * * *', 'select public.refresh_loan_statuses()');
  end if;
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;

-- ---------- AutoPay: the student or payer starts a UPI AutoPay mandate ----------
-- The mandate becomes 'active' only when the payment gateway confirms it (server webhook),
-- or straight away in demo mode. No money moves here.
create or replace function public.start_autopay(p_loan uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  l public.education_loans;
  me uuid := (select auth.uid());
  new_status text;
begin
  select * into l from public.education_loans where id = p_loan for update;
  if not found or me is null or me not in (l.borrower_id, l.payer_member_id) then
    raise exception 'Only the student or the payer can set up AutoPay for this loan';
  end if;
  if l.plan_agreed_at is null then
    raise exception 'Agree the repayment plan first, then set up AutoPay';
  end if;
  if l.autopay_status = 'active' then
    return 'active';
  end if;
  new_status := case when (select demo_mode from public.jamaat_settings) then 'active' else 'pending' end;
  update public.education_loans
     set autopay_status = new_status,
         autopay_ref = case when new_status = 'active' then 'demo_mandate_' || p_loan else autopay_ref end
   where id = p_loan;
  return new_status;
end;
$$;

revoke execute on function public.start_autopay(uuid) from public, anon;
grant execute on function public.start_autopay(uuid) to authenticated;

-- ---------- Private documents bucket ----------
-- Files live under "<uploader's user id>/...". The uploader and Jamaat staff can read them.
-- Nothing in this bucket is public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "documents: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents: owner or staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents'
         and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_staff()));

-- Proof paths must point into the uploader's own folder, so nobody can claim someone else's file.
alter table public.loan_hardship_requests
  add constraint proof_in_own_folder check (proof_path like requested_by::text || '/%');
