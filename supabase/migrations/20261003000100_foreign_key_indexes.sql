-- Index every foreign key (Supabase performance advisor: 34 unindexed foreign keys).
-- Speeds up the joins and filters the dashboard and RLS policies use, and deletes on parent rows.

create index if not exists announcements_created_by_idx on public.announcements (created_by);
create index if not exists case_documents_uploaded_by_idx on public.case_documents (uploaded_by);
create index if not exists cases_approved_by_idx on public.cases (approved_by);
create index if not exists cases_assigned_to_idx on public.cases (assigned_to);
create index if not exists cases_submitted_by_idx on public.cases (submitted_by);
create index if not exists cases_verified_by_idx on public.cases (verified_by);
create index if not exists disbursements_case_id_idx on public.disbursements (case_id);
create index if not exists disbursements_recorded_by_idx on public.disbursements (recorded_by);
create index if not exists document_checks_checked_by_idx on public.document_checks (checked_by);
create index if not exists donations_institution_id_idx on public.donations (institution_id);
create index if not exists education_loans_borrower_id_idx on public.education_loans (borrower_id);
create index if not exists education_loans_guarantor_member_id_idx on public.education_loans (guarantor_member_id);
create index if not exists education_loans_payer_member_id_idx on public.education_loans (payer_member_id);
create index if not exists education_loans_plan_agreed_by_idx on public.education_loans (plan_agreed_by);
create index if not exists fraud_flags_case_id_idx on public.fraud_flags (case_id);
create index if not exists fraud_flags_document_id_idx on public.fraud_flags (document_id);
create index if not exists fraud_flags_matched_case_id_idx on public.fraud_flags (matched_case_id);
create index if not exists fraud_flags_reviewed_by_idx on public.fraud_flags (reviewed_by);
create index if not exists income_declarations_loan_id_idx on public.income_declarations (loan_id);
create index if not exists institution_remittances_recorded_by_idx on public.institution_remittances (recorded_by);
create index if not exists institutions_added_by_idx on public.institutions (added_by);
create index if not exists institutions_ijazah_verified_by_idx on public.institutions (ijazah_verified_by);
create index if not exists kb_documents_added_by_idx on public.kb_documents (added_by);
create index if not exists kb_documents_approved_by_idx on public.kb_documents (approved_by);
create index if not exists lawajam_payments_due_id_idx on public.lawajam_payments (due_id);
create index if not exists lawajam_payments_paid_by_idx on public.lawajam_payments (paid_by);
create index if not exists ledger_entries_case_id_idx on public.ledger_entries (case_id);
create index if not exists ledger_entries_donation_id_idx on public.ledger_entries (donation_id);
create index if not exists ledger_entries_institution_id_idx on public.ledger_entries (institution_id);
create index if not exists loan_hardship_requests_decided_by_idx on public.loan_hardship_requests (decided_by);
create index if not exists loan_hardship_requests_requested_by_idx on public.loan_hardship_requests (requested_by);
create index if not exists loan_repayments_loan_id_idx on public.loan_repayments (loan_id);
create index if not exists member_roles_granted_by_idx on public.member_roles (granted_by);
create index if not exists notifications_case_id_idx on public.notifications (case_id);
