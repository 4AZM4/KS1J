-- Case documents (table from the core migration): tighten the rules now that the apps upload files.
--   * A document must point at a file in the uploader's own folder of the private `documents` bucket,
--     so nobody can attach someone else's file to a case.
--   * Kinds are a fixed list (mirrors DOCUMENT_KINDS in packages/shared/src/labels.ts).
--   * No uploads to closed or rejected cases.
--   * Whoever submitted the case (e.g. a volunteer) can read its documents, as well as the applicant and staff.
--   * Documents are kept as submitted: there are no update or delete policies.

alter table public.case_documents
  add constraint case_documents_kind_check
    check (kind in ('fee_receipt', 'marksheet', 'income_proof', 'medical_report', 'lineage_proof', 'id_proof', 'other')),
  add constraint case_documents_path_in_uploader_folder
    check (storage_path like uploaded_by::text || '/%');

drop policy "case documents: upload to own case" on public.case_documents;
create policy "case documents: upload to own case" on public.case_documents
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.cases c
      where c.id = case_id
        and c.status not in ('closed', 'rejected')
        and (c.applicant_id = (select auth.uid()) or c.submitted_by = (select auth.uid()) or public.is_staff())
    )
  );

drop policy "case documents: read with case" on public.case_documents;
create policy "case documents: read with case" on public.case_documents
  for select to authenticated
  using (exists (
    select 1 from public.cases c
    where c.id = case_id
      and (c.applicant_id = (select auth.uid()) or c.submitted_by = (select auth.uid()) or public.is_staff())
  ));
