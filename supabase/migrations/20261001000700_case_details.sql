-- The applicant's own description of their need. Private: visible only to the applicant and staff
-- (same RLS as the rest of the case). Donors only ever see public_summary, written by the trustee.
alter table public.cases add column details text check (char_length(details) <= 2000);
