-- Fraud flag reviews and announcements: the database records who did it, not the client.

-- ---------- Fraud flags: an open flag is cleared or confirmed once, by the reviewer ----------
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
     or new.reason is distinct from old.reason then
    raise exception 'Only the review decision can change on a flag';
  end if;
  new.reviewed_by := (select auth.uid());
  new.reviewed_at := now();
  return new;
end;
$$;

create trigger fraud_flags_protect_review
before update on public.fraud_flags
for each row execute function public.protect_fraud_flag_review();

revoke execute on function public.protect_fraud_flag_review() from public, anon, authenticated;

-- ---------- Announcements: the author is whoever is signed in ----------
create or replace function public.stamp_announcement_author()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_system() then
    if tg_op = 'INSERT' then
      new.created_by := (select auth.uid());
    else
      new.created_by := old.created_by;
    end if;
  end if;
  return new;
end;
$$;

create trigger announcements_stamp_author
before insert or update on public.announcements
for each row execute function public.stamp_announcement_author();

revoke execute on function public.stamp_announcement_author() from public, anon, authenticated;
