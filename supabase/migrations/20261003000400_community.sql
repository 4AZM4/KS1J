-- Community: the member network inside the app (Learn → Community).
--   Directory and mentors · Opportunities board · Feed · Messages that open only with consent · Groups.
--
-- Rules, enforced here rather than in the apps:
--   * Only verified members take part (membership_verified). Staff can read everything to moderate.
--   * You appear to other members only after you create a community profile. Your name on it is always
--     your name on your membership (no impersonation). No phone numbers or addresses are ever stored here.
--   * A conversation opens only when the other person accepts your request. Nobody else, staff included,
--     can read the messages.
--   * A "Request a call" can only go to someone who has chosen to be a mentor.
--   * Private groups: posts are visible to members only; the group owner approves who joins.
--   * Members can report a post, opportunity, profile or group. Only staff can remove (hide) content;
--     removed content stays in the database for the record.

create or replace function public.is_verified_member()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.members where id = (select auth.uid()) and membership_verified);
$$;
revoke execute on function public.is_verified_member() from public, anon;
grant execute on function public.is_verified_member() to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Profiles (directory and mentors)
create table public.community_profiles (
  member_id uuid primary key default auth.uid() references public.members (id) on delete cascade,
  display_name text not null default '',
  headline text check (headline is null or length(headline) <= 120),
  bio text check (bio is null or length(bio) <= 1000),
  profession text check (profession is null or length(profession) <= 60),
  industry text check (industry is null or length(industry) <= 60),
  city text check (city is null or length(city) <= 60),
  skills text[] not null default '{}' check (cardinality(skills) <= 12),
  listed boolean not null default true,
  open_to_work boolean not null default false,
  is_mentor boolean not null default false,
  mentor_areas text[] not null default '{}' check (cardinality(mentor_areas) <= 8),
  mentor_note text check (mentor_note is null or length(mentor_note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.community_profiles (listed, is_mentor);

-- The name shown is always the name on the membership, and a profile never changes owner.
create or replace function public.stamp_community_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.member_id := old.member_id;
    new.created_at := old.created_at;
  end if;
  new.display_name := coalesce((select full_name from public.members where id = new.member_id), '');
  new.updated_at := now();
  return new;
end $$;
create trigger community_profile_stamp before insert or update on public.community_profiles
  for each row execute function public.stamp_community_profile();

alter table public.community_profiles enable row level security;
create policy "community profiles: verified members and staff read" on public.community_profiles
  for select to authenticated using (member_id = (select auth.uid()) or public.is_verified_member() or public.is_staff());
create policy "community profiles: create your own" on public.community_profiles
  for insert to authenticated with check (member_id = (select auth.uid()) and public.is_verified_member());
create policy "community profiles: edit your own" on public.community_profiles
  for update to authenticated using (member_id = (select auth.uid())) with check (member_id = (select auth.uid()));
create policy "community profiles: delete your own" on public.community_profiles
  for delete to authenticated using (member_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------------
-- Moderation: only staff may remove content or bring it back.
create or replace function public.protect_community_moderation()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  was_removed boolean := false;
  is_removed boolean;
begin
  if tg_table_name = 'community_posts' then
    is_removed := new.removed;
    if tg_op = 'UPDATE' then was_removed := old.removed; end if;
  else
    is_removed := new.status = 'removed';
    if tg_op = 'UPDATE' then was_removed := old.status = 'removed'; end if;
  end if;
  if is_removed is distinct from was_removed and not (public.is_staff() or public.is_system()) then
    raise exception 'Only the committee can remove or restore community content';
  end if;
  if tg_op = 'UPDATE' then
    new.author_id := old.author_id;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------------------
-- Opportunities board
create table public.community_opportunities (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.community_profiles (member_id) on delete cascade,
  kind text not null check (kind in ('job', 'referral', 'business', 'mentorship')),
  title text not null check (length(trim(title)) between 4 and 120),
  body text not null check (length(trim(body)) between 10 and 2000),
  city text check (city is null or length(city) <= 60),
  status text not null default 'open' check (status in ('open', 'closed', 'removed')),
  created_at timestamptz not null default now()
);
create index on public.community_opportunities (author_id);
create index on public.community_opportunities (status, created_at desc);
create trigger community_opportunity_moderation before insert or update on public.community_opportunities
  for each row execute function public.protect_community_moderation();

alter table public.community_opportunities enable row level security;
create policy "opportunities: verified members read open and closed" on public.community_opportunities
  for select to authenticated using (
    public.is_staff() or author_id = (select auth.uid()) or (status <> 'removed' and public.is_verified_member()));
create policy "opportunities: post as yourself" on public.community_opportunities
  for insert to authenticated with check (author_id = (select auth.uid()) and public.is_verified_member());
create policy "opportunities: author or staff update" on public.community_opportunities
  for update to authenticated using (author_id = (select auth.uid()) or public.is_staff())
  with check (author_id = (select auth.uid()) or public.is_staff());
create policy "opportunities: author deletes" on public.community_opportunities
  for delete to authenticated using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------------
-- Groups
create table public.community_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 3 and 60),
  kind text not null check (kind in ('profession', 'interest')),
  description text check (description is null or length(description) <= 300),
  private boolean not null default false,
  created_by uuid not null default auth.uid() references public.community_profiles (member_id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.community_groups (created_by);

create table public.community_group_members (
  group_id uuid not null references public.community_groups (id) on delete cascade,
  member_id uuid not null default auth.uid() references public.community_profiles (member_id) on delete cascade,
  status text not null default 'member' check (status in ('pending', 'member')),
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, member_id)
);
create index on public.community_group_members (member_id);

create or replace function public.is_group_member(p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.community_group_members
                 where group_id = p_group and member_id = (select auth.uid()) and status = 'member');
$$;
create or replace function public.is_group_owner(p_group uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.community_group_members
                 where group_id = p_group and member_id = (select auth.uid()) and status = 'member' and role = 'owner');
$$;
revoke execute on function public.is_group_member(uuid), public.is_group_owner(uuid) from public, anon;
grant execute on function public.is_group_member(uuid), public.is_group_owner(uuid) to authenticated;

-- Joining: the creator becomes the owner; anyone else joins an open group at once or waits for the
-- owner of a private group. Nobody can make themselves an owner, and a membership never moves.
create or replace function public.stamp_group_membership()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  g record;
begin
  select private, created_by into g from public.community_groups where id = new.group_id;
  if tg_op = 'INSERT' then
    if g.created_by = new.member_id then
      new.role := 'owner'; new.status := 'member';
    else
      new.role := 'member';
      new.status := case when g.private then 'pending' else 'member' end;
    end if;
  else
    new.group_id := old.group_id; new.member_id := old.member_id; new.role := old.role;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
create trigger community_group_membership_stamp before insert or update on public.community_group_members
  for each row execute function public.stamp_group_membership();

create or replace function public.add_group_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.community_group_members (group_id, member_id) values (new.id, new.created_by);
  return new;
end $$;
create trigger community_group_owner after insert on public.community_groups
  for each row execute function public.add_group_owner();

alter table public.community_groups enable row level security;
create policy "groups: verified members and staff see the list" on public.community_groups
  for select to authenticated using (public.is_verified_member() or public.is_staff());
create policy "groups: create as yourself" on public.community_groups
  for insert to authenticated with check (created_by = (select auth.uid()) and public.is_verified_member());
create policy "groups: owner edits" on public.community_groups
  for update to authenticated using (public.is_group_owner(id)) with check (public.is_group_owner(id));
create policy "groups: owner deletes" on public.community_groups
  for delete to authenticated using (public.is_group_owner(id));

alter table public.community_group_members enable row level security;
create policy "group members: you, fellow members and staff see the roster" on public.community_group_members
  for select to authenticated using (
    member_id = (select auth.uid()) or public.is_group_member(group_id) or public.is_staff());
create policy "group members: ask to join as yourself" on public.community_group_members
  for insert to authenticated with check (member_id = (select auth.uid()) and public.is_verified_member());
create policy "group members: owner approves" on public.community_group_members
  for update to authenticated using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));
create policy "group members: leave, or the owner removes" on public.community_group_members
  for delete to authenticated using (member_id = (select auth.uid()) or public.is_group_owner(group_id));

-- ---------------------------------------------------------------------------------------------------
-- Posts: the feed (group_id is null) and group discussions. Text only, by design.
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.community_profiles (member_id) on delete cascade,
  group_id uuid references public.community_groups (id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  removed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.community_posts (author_id);
create index on public.community_posts (group_id, created_at desc);
create trigger community_post_moderation before insert or update on public.community_posts
  for each row execute function public.protect_community_moderation();

alter table public.community_posts enable row level security;
create policy "posts: members of the feed or the group read" on public.community_posts
  for select to authenticated using (
    public.is_staff()
    or author_id = (select auth.uid())
    or (not removed and public.is_verified_member() and (group_id is null or public.is_group_member(group_id))));
create policy "posts: post as yourself" on public.community_posts
  for insert to authenticated with check (
    author_id = (select auth.uid()) and public.is_verified_member()
    and (group_id is null or public.is_group_member(group_id)));
create policy "posts: author edits, staff moderate" on public.community_posts
  for update to authenticated using (author_id = (select auth.uid()) or public.is_staff())
  with check (author_id = (select auth.uid()) or public.is_staff());
create policy "posts: author deletes" on public.community_posts
  for delete to authenticated using (author_id = (select auth.uid()));

create table public.community_appreciations (
  post_id uuid not null references public.community_posts (id) on delete cascade,
  member_id uuid not null default auth.uid() references public.community_profiles (member_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);
create index on public.community_appreciations (member_id);
alter table public.community_appreciations enable row level security;
-- Seeing an appreciation needs seeing the post (the subquery runs under the posts policy).
create policy "appreciations: read with the post" on public.community_appreciations
  for select to authenticated using (exists (select 1 from public.community_posts p where p.id = post_id));
create policy "appreciations: appreciate as yourself" on public.community_appreciations
  for insert to authenticated with check (
    member_id = (select auth.uid()) and exists (select 1 from public.community_posts p where p.id = post_id));
create policy "appreciations: take back your own" on public.community_appreciations
  for delete to authenticated using (member_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------------
-- Messages, with consent. A request ("message" or, to a mentor, "call") opens a conversation only once
-- the other person accepts it.
create table public.community_connections (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null default auth.uid() references public.community_profiles (member_id) on delete cascade,
  to_id uuid not null references public.community_profiles (member_id) on delete cascade,
  kind text not null default 'message' check (kind in ('message', 'call')),
  note text not null check (length(trim(note)) between 1 and 500),
  preferred_time text check (preferred_time is null or length(preferred_time) <= 80),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_id <> to_id)
);
create index on public.community_connections (from_id);
create index on public.community_connections (to_id, status);
create unique index community_connections_one_pending on public.community_connections (from_id, to_id, kind)
  where status = 'pending';

create or replace function public.guard_community_connection()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending'; new.responded_at := null;
    if new.kind = 'call' and not exists (
      select 1 from public.community_profiles where member_id = new.to_id and is_mentor) then
      raise exception 'You can request a call only from a mentor';
    end if;
    return new;
  end if;
  -- Only the person asked can answer, once; nothing else about the request can change.
  if (select auth.uid()) is distinct from old.to_id and not public.is_system() then
    raise exception 'Only the person you asked can answer this request';
  end if;
  if old.status <> 'pending' or new.status not in ('accepted', 'declined') then
    raise exception 'This request has already been answered';
  end if;
  new.from_id := old.from_id; new.to_id := old.to_id; new.kind := old.kind; new.note := old.note;
  new.preferred_time := old.preferred_time; new.created_at := old.created_at; new.responded_at := now();
  return new;
end $$;
create trigger community_connection_guard before insert or update on public.community_connections
  for each row execute function public.guard_community_connection();

alter table public.community_connections enable row level security;
create policy "connections: the two people involved read" on public.community_connections
  for select to authenticated using (from_id = (select auth.uid()) or to_id = (select auth.uid()));
create policy "connections: ask as yourself" on public.community_connections
  for insert to authenticated with check (from_id = (select auth.uid()) and public.is_verified_member());
create policy "connections: the person asked answers" on public.community_connections
  for update to authenticated using (to_id = (select auth.uid())) with check (to_id = (select auth.uid()));

create table public.community_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.community_connections (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.community_profiles (member_id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.community_messages (connection_id, created_at);
create index on public.community_messages (sender_id);

alter table public.community_messages enable row level security;
-- No staff exception: private conversations stay private.
create policy "messages: only the two people read" on public.community_messages
  for select to authenticated using (exists (
    select 1 from public.community_connections c where c.id = connection_id
      and (c.from_id = (select auth.uid()) or c.to_id = (select auth.uid()))));
create policy "messages: write only in an accepted conversation" on public.community_messages
  for insert to authenticated with check (
    sender_id = (select auth.uid()) and exists (
      select 1 from public.community_connections c where c.id = connection_id and c.status = 'accepted'
        and (c.from_id = (select auth.uid()) or c.to_id = (select auth.uid()))));

-- ---------------------------------------------------------------------------------------------------
-- Reports for the committee
create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.members (id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'opportunity', 'profile', 'group')),
  target_id uuid not null,
  reason text not null check (length(trim(reason)) between 3 and 300),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.members (id),
  resolved_at timestamptz
);
create index on public.community_reports (reporter_id);
create index on public.community_reports (resolved_by);
create index on public.community_reports (status, created_at desc);

create or replace function public.stamp_community_report()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'open'; new.resolved_by := null; new.resolved_at := null;
  else
    new.reporter_id := old.reporter_id; new.target_kind := old.target_kind; new.target_id := old.target_id;
    new.reason := old.reason; new.created_at := old.created_at;
    if new.status = 'resolved' and old.status <> 'resolved' then
      new.resolved_by := (select auth.uid()); new.resolved_at := now();
    end if;
  end if;
  return new;
end $$;
create trigger community_report_stamp before insert or update on public.community_reports
  for each row execute function public.stamp_community_report();

alter table public.community_reports enable row level security;
create policy "reports: you see yours, staff see all" on public.community_reports
  for select to authenticated using (reporter_id = (select auth.uid()) or public.is_staff());
create policy "reports: report as yourself" on public.community_reports
  for insert to authenticated with check (reporter_id = (select auth.uid()) and public.is_verified_member());
create policy "reports: staff resolve" on public.community_reports
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Trigger functions are never called directly.
revoke execute on function public.stamp_community_profile(), public.protect_community_moderation(),
  public.stamp_group_membership(), public.add_group_owner(), public.guard_community_connection(),
  public.stamp_community_report() from public, anon, authenticated;
