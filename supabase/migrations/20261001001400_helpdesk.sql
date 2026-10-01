-- Helpdesk knowledge base. Answers may only come from documents the Jamaat has approved (CLAUDE.md rule 7).
--   kb_documents: one approved text (title + where it comes from). One trustee adds, a different trustee approves.
--   kb_chunks:    its sections, searched with Postgres full-text search (pgvector can replace this later).
--   helpdesk_questions: what members asked and whether it was answered, so the committee can fill gaps.
--                       No member id is stored with a question.

create table public.kb_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  source_ref text not null check (char_length(source_ref) between 3 and 200), -- e.g. "Jamaat office circular, March 2026"
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  added_by uuid references public.members (id),
  approved_by uuid references public.members (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.kb_documents (id) on delete cascade,
  position integer not null default 0,
  heading text check (char_length(heading) <= 200),
  body text not null check (char_length(body) between 1 and 6000),
  tsv tsvector generated always as (to_tsvector('english', coalesce(heading, '') || ' ' || body)) stored
);
create index on public.kb_chunks using gin (tsv);
create index on public.kb_chunks (document_id, position);

create table public.helpdesk_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 2 and 500),
  outcome text not null check (outcome in ('answered', 'passages', 'unknown', 'ruling')),
  document_ids uuid[] not null default '{}',
  asked_at timestamptz not null default now()
);
create index on public.helpdesk_questions (asked_at desc);

alter table public.kb_documents enable row level security;
alter table public.kb_chunks enable row level security;
alter table public.helpdesk_questions enable row level security;

-- Approved documents are public texts. Staff see drafts too. (Asking the helpdesk itself needs a signed-in member.)
create policy "kb documents: approved are public, staff see all" on public.kb_documents
  for select to anon, authenticated using (status = 'approved' or public.is_staff());
create policy "kb documents: trustees add" on public.kb_documents
  for insert to authenticated with check (public.has_role('trustee') and status = 'draft');
create policy "kb documents: trustees approve or retire" on public.kb_documents
  for update to authenticated using (public.has_role('trustee')) with check (public.has_role('trustee'));

create policy "kb chunks: of approved documents are public, staff see all" on public.kb_chunks
  for select to anon, authenticated
  using (public.is_staff() or exists (select 1 from public.kb_documents d where d.id = document_id and d.status = 'approved'));
-- Sections can only be written while the document is still a draft: approved text never changes silently.
create policy "kb chunks: trustees edit drafts" on public.kb_chunks
  for all to authenticated
  using (public.has_role('trustee') and exists (select 1 from public.kb_documents d where d.id = document_id and d.status = 'draft'))
  with check (public.has_role('trustee') and exists (select 1 from public.kb_documents d where d.id = document_id and d.status = 'draft'));

create policy "helpdesk questions: staff read" on public.helpdesk_questions
  for select to authenticated using (public.is_staff());
-- Rows are written only by log_helpdesk_question().

-- One trustee adds, a different trustee approves; the database stamps who and when.
create or replace function public.protect_kb_document()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if public.is_system() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.added_by := me;
    new.approved_by := null;
    new.approved_at := null;
    return new;
  end if;
  new.added_by := old.added_by;
  if new.title is distinct from old.title or new.source_ref is distinct from old.source_ref then
    if old.status <> 'draft' then
      raise exception 'Only a draft can be edited; retire this document and add a new one';
    end if;
  end if;
  if new.status is distinct from old.status then
    if old.status = 'draft' and new.status = 'approved' then
      if me = old.added_by then
        raise exception 'A different trustee must approve a document you added';
      end if;
      if not exists (select 1 from public.kb_chunks c where c.document_id = new.id) then
        raise exception 'Add at least one section before approving';
      end if;
      new.approved_by := me;
      new.approved_at := now();
    elsif new.status = 'retired' then
      null; -- any trustee can retire a document
    else
      raise exception 'A document can go from draft to approved, or be retired';
    end if;
  else
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$$;

create trigger kb_documents_protect
before insert or update on public.kb_documents
for each row execute function public.protect_kb_document();

-- Search approved sections. Runs with the caller's permissions, so RLS decides what is searchable.
-- First an exact web-style query (all words). If that finds nothing, sections matching at least half
-- of the question's meaningful words, so a single shared word like "open" is not enough to answer.
create or replace function public.search_help(q text, max_results integer default 5)
returns table (chunk_id uuid, document_id uuid, title text, source_ref text, heading text, body text, rank real)
language plpgsql stable security invoker set search_path = ''
as $$
declare
  strict_q tsquery := websearch_to_tsquery('english', q);
  lexemes text[];
  needed integer;
begin
  return query
    select c.id, d.id, d.title, d.source_ref, c.heading, c.body, ts_rank(c.tsv, strict_q)
    from public.kb_chunks c join public.kb_documents d on d.id = c.document_id
    where d.status = 'approved' and c.tsv @@ strict_q
    order by 7 desc limit least(max_results, 10);
  if found then
    return;
  end if;
  select array_agg(lexeme) into lexemes from unnest(to_tsvector('english', q));
  if lexemes is null then
    return;
  end if;
  needed := greatest(1, ceil(array_length(lexemes, 1) * 0.5)::int);
  return query
    select x.id, x.doc_id, x.title, x.source_ref, x.heading, x.body, x.hits::real
    from (
      select c.id, d.id as doc_id, d.title, d.source_ref, c.heading, c.body,
             (select count(*) from unnest(lexemes) l where c.tsv @@ to_tsquery('english', quote_literal(l))) as hits,
             -- Tie-break: words in the heading count more than words in the body.
             ts_rank(setweight(to_tsvector('english', coalesce(c.heading, '')), 'A') || setweight(to_tsvector('english', c.body), 'B'),
                     to_tsquery('english', (select string_agg(quote_literal(l), ' | ') from unnest(lexemes) l))) as weight
      from public.kb_chunks c join public.kb_documents d on d.id = c.document_id
      where d.status = 'approved'
    ) x
    where x.hits >= needed
    order by x.hits desc, x.weight desc limit least(max_results, 10);
end;
$$;

create or replace function public.log_helpdesk_question(p_question text, p_outcome text, p_document_ids uuid[])
returns void
language sql security definer set search_path = ''
as $$
  insert into public.helpdesk_questions (question, outcome, document_ids)
  values (left(trim(p_question), 500), p_outcome, coalesce(p_document_ids, '{}'));
$$;

revoke execute on function public.protect_kb_document() from public, anon, authenticated;
grant execute on function public.search_help(text, integer) to anon, authenticated;
revoke execute on function public.log_helpdesk_question(text, text, uuid[]) from public;
revoke execute on function public.log_helpdesk_question(text, text, uuid[]) from anon;
grant execute on function public.log_helpdesk_question(text, text, uuid[]) to authenticated;
