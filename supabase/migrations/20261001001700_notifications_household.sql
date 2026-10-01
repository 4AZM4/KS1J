-- Member notifications, the same-file fraud check, and the household page.
--   * Applicants hear about every step of their case; donors hear when a case they gave to is fully funded.
--   * A file uploaded to two different cases is flagged for a verifier.
--   * A member can see who is in their own household (names only).

-- ---------- Notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  kind text not null check (kind in ('case_status', 'need_met')),
  case_id uuid references public.cases (id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on public.notifications (member_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications
  for select to authenticated using (member_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications
  for update to authenticated using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
-- No insert or delete policies: only the triggers below write notifications.

-- Members may only mark a notification read; nothing else on it changes.
create or replace function public.protect_notification()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if public.is_system() then
    return new;
  end if;
  if new.member_id is distinct from old.member_id or new.kind is distinct from old.kind
     or new.case_id is distinct from old.case_id or new.title is distinct from old.title
     or new.body is distinct from old.body or new.created_at is distinct from old.created_at then
    raise exception 'Only the read time of a notification can change';
  end if;
  return new;
end;
$$;
create trigger notifications_protect
before update on public.notifications
for each row execute function public.protect_notification();

-- Applicant (and whoever submitted for them) hears about each step of their case.
create or replace function public.notify_case_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c public.cases;
  msg text;
begin
  msg := case new.to_status
    when 'verified' then 'A Jamaat verifier has checked your request. It now goes to a trustee.'
    when 'approved' then 'A trustee has approved your request.'
    when 'published' then 'Your request is now open for donors. Your name and contact details are hidden.'
    when 'funded' then 'Your request is fully funded. The Jamaat will now pay the hospital, school or family.'
    when 'disbursed' then 'The Jamaat has made the payment for your request.'
    when 'rejected' then 'Your request was not approved. Please contact the Jamaat office if you have questions.'
    when 'closed' then 'Your request is closed.'
    else null end;
  if msg is null then
    return new;
  end if;
  select * into c from public.cases where id = new.case_id;
  insert into public.notifications (member_id, kind, case_id, title, body)
  select distinct m, 'case_status', c.id, format('Case #%s: %s', c.case_no, c.title), msg
  from unnest(array[c.applicant_id, c.submitted_by]) as m
  where m is not null;
  return new;
end;
$$;
create trigger case_events_notify
after insert on public.case_events
for each row execute function public.notify_case_status();

-- When a gift completes a case, everyone who gave to it hears that the need is met (once per case).
create or replace function public.notify_need_met()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c public.cases;
begin
  if new.status <> 'paid' or old.status = 'paid' or new.case_id is null then
    return new;
  end if;
  select * into c from public.cases where id = new.case_id;
  if c.status <> 'funded' or exists (
    select 1 from public.notifications n where n.case_id = c.id and n.kind = 'need_met'
  ) then
    return new;
  end if;
  insert into public.notifications (member_id, kind, case_id, title, body)
  select distinct d.donor_id, 'need_met', c.id, 'A need you helped with is met',
         format('Case #%s (%s) is fully funded. Thank you for giving.', c.case_no, public.public_case_title(c.type))
  from public.donations d
  where d.case_id = c.id and d.status = 'paid';
  return new;
end;
$$;
create trigger donations_need_met
after update of status on public.donations
for each row execute function public.notify_need_met();

revoke execute on function public.protect_notification() from public, anon, authenticated;
revoke execute on function public.notify_case_status() from public, anon, authenticated;
revoke execute on function public.notify_need_met() from public, anon, authenticated;

-- ---------- Same file on two cases ----------
alter table public.case_documents add column content_hash text check (content_hash ~ '^[0-9a-f]{64}$');
create index on public.case_documents (content_hash);

-- Called by the check-document server function (service role) with the file's SHA-256.
-- If the same file is already attached to a different case, a verifier gets a fraud flag.
create or replace function public.record_document_hash(p_document uuid, p_hash text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  d public.case_documents;
  other record;
begin
  if not public.is_system() then
    raise exception 'Only the server records file fingerprints';
  end if;
  update public.case_documents set content_hash = lower(p_hash) where id = p_document returning * into d;
  if not found then
    raise exception 'Document not found';
  end if;
  for other in
    select distinct on (o.case_id) o.case_id, c.case_no
    from public.case_documents o join public.cases c on c.id = o.case_id
    where o.content_hash = d.content_hash and o.case_id <> d.case_id
  loop
    insert into public.fraud_flags (case_id, matched_case_id, document_id, reason)
    select d.case_id, other.case_id, d.id, format('The same file is also attached to case #%s', other.case_no)
    where not exists (
      select 1 from public.fraud_flags f
      where f.document_id = d.id and f.matched_case_id = other.case_id and f.status = 'open'
    );
  end loop;
end;
$$;
revoke all on function public.record_document_hash(uuid, text) from public, anon, authenticated;
grant execute on function public.record_document_hash(uuid, text) to service_role;

-- ---------- Household page ----------
-- Names of everyone in the caller's own household. Nothing about anyone else.
create or replace function public.my_household_members()
returns table (full_name text, is_me boolean, membership_verified boolean)
language sql stable security definer set search_path = ''
as $$
  select m.full_name, m.id = (select auth.uid()), m.membership_verified
  from public.members m
  where m.household_id is not null
    and m.household_id = (select household_id from public.members where id = (select auth.uid()))
  order by m.id <> (select auth.uid()), m.full_name;
$$;
revoke all on function public.my_household_members() from public, anon;
grant execute on function public.my_household_members() to authenticated;
