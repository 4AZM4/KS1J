-- Behaviour tests for the money and approval rules. Run after migrations + seed:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rules.sql
-- Each test impersonates an API user by setting the JWT claims Supabase would set.
-- Everything runs in one transaction and is rolled back.

begin;

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.as_system() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Blocked = raised an error, or RLS filtered the row out so nothing changed.
create or replace function pg_temp.expect_error(sql text, label text) returns void language plpgsql as $$
declare
  n bigint;
begin
  begin
    execute sql;
    get diagnostics n = row_count;
  exception when others then
    raise notice 'PASS  %', label;
    return;
  end;
  if n = 0 then
    raise notice 'PASS  % (hidden by RLS)', label;
    return;
  end if;
  raise exception 'FAIL  % (statement succeeded but should have been blocked)', label;
end $$;

create or replace function pg_temp.expect_ok(sql text, label text) returns void language plpgsql as $$
declare
  n bigint;
begin
  execute sql;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'FAIL  % (no rows changed)', label;
  end if;
  raise notice 'PASS  %', label;
end $$;

-- Ids from seed.sql
--   …001 super admin · …002 verifier · …003 trustee · …004 finance · …005 volunteer
--   …010 Fatema · …020 donor
--   case …001 submitted Sadaat · …002 verified Non-Sadaat · …003 published Sadaat · …004 published Non-Sadaat

-- 1. A member cannot see someone else's case.
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$ begin
  if exists (select 1 from public.cases where id = '20000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL  donor can read another member''s case';
  end if;
  raise notice 'PASS  members only see their own cases';
end $$;

-- 2. Donors only see safe columns of published cases.
do $$ begin
  if (select count(*) from public.list_public_cases()) <> 3 then
    raise exception 'FAIL  list_public_cases should return the 3 published cases';
  end if;
  if (select count(*) from public.list_public_cases('sadaat')) <> 2 then
    raise exception 'FAIL  Sadaat list should have 2 cases';
  end if;
  raise notice 'PASS  public case list shows published cases only, split by category';
end $$;

-- 3. Unverified institutions are hidden from donors.
do $$ begin
  if (select count(*) from public.institutions) <> 1 then
    raise exception 'FAIL  donors should only see the one verified institution';
  end if;
  raise notice 'PASS  only institutions with a verified ijazah are visible';
end $$;

-- 4. Fund separation.
select pg_temp.expect_error($$insert into public.donations (donor_id, fund, case_id, amount)
  values ('00000000-0000-0000-0000-000000000020', 'sehme_sadaat', '20000000-0000-0000-0000-000000000004', 1000)$$,
  'Sehme Sadaat to a Non-Sadaat case is blocked');
select pg_temp.expect_error($$insert into public.donations (donor_id, fund, case_id, amount)
  values ('00000000-0000-0000-0000-000000000020', 'sehme_imam', '20000000-0000-0000-0000-000000000003', 1000)$$,
  'Sehme Imam to an individual case is blocked');
select pg_temp.expect_error($$insert into public.donations (donor_id, fund, institution_id, amount)
  values ('00000000-0000-0000-0000-000000000020', 'sehme_imam', '30000000-0000-0000-0000-000000000002', 1000)$$,
  'Sehme Imam to an institution without verified ijazah is blocked');
select pg_temp.expect_error($$insert into public.donations (donor_id, fund, case_id, amount)
  values ('00000000-0000-0000-0000-000000000020', 'general', '20000000-0000-0000-0000-000000000001', 1000)$$,
  'Donations to an unpublished case are blocked');
select pg_temp.expect_error($$insert into public.donations (donor_id, fund, case_id, amount, status)
  values ('00000000-0000-0000-0000-000000000020', 'general', '20000000-0000-0000-0000-000000000004', 1000, 'paid')$$,
  'Members cannot mark their own donation as paid');
select pg_temp.expect_ok($$insert into public.donations (id, donor_id, fund, case_id, amount)
  values ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'sehme_sadaat', '20000000-0000-0000-0000-000000000003', 5000)$$,
  'Sehme Sadaat to a verified Sadaat case is allowed');
select pg_temp.expect_ok($$insert into public.donations (donor_id, fund, institution_id, amount)
  values ('00000000-0000-0000-0000-000000000020', 'sehme_imam', '30000000-0000-0000-0000-000000000001', 5000)$$,
  'Sehme Imam to a verified institution is allowed');

-- 5. Payment confirmation (server) writes the ledger and updates the case once.
select pg_temp.as_system();
update public.donations set status = 'paid', gateway_ref = 'test_1' where id = '40000000-0000-0000-0000-000000000001';
do $$ begin
  if (select raised_amount from public.cases where id = '20000000-0000-0000-0000-000000000003') <> 47000 then
    raise exception 'FAIL  raised amount should be 42000 + 5000';
  end if;
  if (select count(*) from public.ledger_entries where donation_id = '40000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'FAIL  exactly one ledger entry per paid donation';
  end if;
  raise notice 'PASS  confirmed payment updates ledger and case total';
end $$;
select pg_temp.expect_error($$update public.ledger_entries set amount = 1 where donation_id = '40000000-0000-0000-0000-000000000001'$$,
  'Ledger entries cannot be edited, even by the system');

-- 6. Maker-checker approval.
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_error($$update public.cases set status = 'verified' where id = '20000000-0000-0000-0000-000000000001'$$,
  'An applicant cannot verify their own case');
select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
select pg_temp.expect_error($$update public.cases set status = 'verified' where id = '20000000-0000-0000-0000-000000000001'$$,
  'A volunteer cannot verify a case');
select pg_temp.expect_error($$update public.cases set lineage_verified = true where id = '20000000-0000-0000-0000-000000000001'$$,
  'A volunteer cannot confirm Sadaat lineage');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.expect_error($$update public.cases set status = 'approved' where id = '20000000-0000-0000-0000-000000000001'$$,
  'A case cannot skip from submitted to approved');
select pg_temp.expect_ok($$update public.cases set status = 'verified', lineage_verified = true where id = '20000000-0000-0000-0000-000000000001'$$,
  'A verifier can verify a case and confirm lineage');
update public.cases set raised_amount = 999999 where id = '20000000-0000-0000-0000-000000000003';
do $$ begin
  if (select raised_amount from public.cases where id = '20000000-0000-0000-0000-000000000003') = 999999 then
    raise exception 'FAIL  staff changed a raised amount by hand';
  end if;
  raise notice 'PASS  staff cannot change a raised amount by hand';
end $$;

-- A super admin holding every role still cannot approve a case they verified.
select pg_temp.as_system();
update public.cases set status = 'submitted', verified_by = null, verified_at = null where id = '20000000-0000-0000-0000-000000000002';
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect_ok($$update public.cases set status = 'verified' where id = '20000000-0000-0000-0000-000000000002'$$,
  'Super admin verifies a case');
select pg_temp.expect_error($$update public.cases set status = 'approved' where id = '20000000-0000-0000-0000-000000000002'$$,
  'The same person cannot also approve it');
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.expect_ok($$update public.cases set status = 'approved' where id = '20000000-0000-0000-0000-000000000002'$$,
  'A different trustee can approve it');

-- 7. Disbursement rules.
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select pg_temp.expect_error($$insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
  values ('20000000-0000-0000-0000-000000000004', 'sehme_sadaat', 1000, 'Demo Store', '00000000-0000-0000-0000-000000000004')$$,
  'Sehme Sadaat cannot be disbursed to a Non-Sadaat case');

-- 8. Members cannot verify themselves.
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
select pg_temp.expect_error($$update public.members set household_id = '10000000-0000-0000-0000-000000000001' where id = '00000000-0000-0000-0000-000000000020'$$,
  'Members cannot move themselves to another household');

-- 9. Loan repayment reduces the balance, moves the due date, and funds the next student.
select pg_temp.as_system();
insert into public.loan_repayments (id, loan_id, amount)
values ('50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 2000);
update public.loan_repayments set status = 'paid', gateway_ref = 'test_loan_1' where id = '50000000-0000-0000-0000-000000000001';
do $$ begin
  if (select outstanding from public.education_loans where id = '60000000-0000-0000-0000-000000000001') <> 62000 then
    raise exception 'FAIL  outstanding should drop from 64000 to 62000';
  end if;
  if (select next_due_date from public.education_loans where id = '60000000-0000-0000-0000-000000000001')
     <> (current_date + 10 + interval '1 month')::date then
    raise exception 'FAIL  a full EMI should move the next due date by one month';
  end if;
  raise notice 'PASS  loan repayment reduces the balance, moves the due date and is recorded';
end $$;

-- 11. Repayment plan: the family and a trustee must agree the same EMI, above the floor.
-- Abbas's loan: 60000 over at most 48 months → EMI floor 1250.
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select pg_temp.expect_error($$insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
  values ('20000000-0000-0000-0000-000000000007', 'general', 30000, 'Demo Nursing College', '00000000-0000-0000-0000-000000000004')$$,
  'A loan cannot be paid out before the repayment plan is agreed');
select pg_temp.as_user('00000000-0000-0000-0000-000000000013');
select pg_temp.expect_error($$select public.accept_loan_emi('60000000-0000-0000-0000-000000000002', 900)$$,
  'An EMI below the floor is rejected');
select public.accept_loan_emi('60000000-0000-0000-0000-000000000002', 1500);
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
select pg_temp.expect_error($$select public.accept_loan_emi('60000000-0000-0000-0000-000000000002', 1500)$$,
  'Someone outside the family or committee cannot agree the EMI');
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select public.accept_loan_emi('60000000-0000-0000-0000-000000000002', 2000);
do $$ begin
  if (select agreed_emi from public.education_loans where id = '60000000-0000-0000-0000-000000000002') is not null then
    raise exception 'FAIL  a counter-proposal must not count as agreement';
  end if;
  raise notice 'PASS  a trustee counter-proposal waits for the family';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000013');
select public.accept_loan_emi('60000000-0000-0000-0000-000000000002', 2000);
select pg_temp.as_system();
do $$ begin
  if (select agreed_emi from public.education_loans where id = '60000000-0000-0000-0000-000000000002') <> 2000 then
    raise exception 'FAIL  matching amounts should agree the plan';
  end if;
  if (select next_due_date from public.education_loans where id = '60000000-0000-0000-0000-000000000002')
     <> (current_date + 365 + interval '6 months')::date then
    raise exception 'FAIL  first EMI should fall due when the grace period ends';
  end if;
  raise notice 'PASS  family and trustee agree the EMI; first payment is due after the grace period';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select pg_temp.expect_ok($$insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
  values ('20000000-0000-0000-0000-000000000007', 'general', 30000, 'Demo Nursing College', '00000000-0000-0000-0000-000000000004')$$,
  'Once agreed, the loan can be paid out');

-- 12. Follow-up ladder and pausing new non-emergency requests.
select pg_temp.as_system();
update public.education_loans set next_due_date = current_date - 35 where id = '60000000-0000-0000-0000-000000000001';
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select stage from public.loan_followup_list() where loan_id = '60000000-0000-0000-0000-000000000001') <> 'committee_review' then
    raise exception 'FAIL  a loan 35 days late should be at committee review';
  end if;
  raise notice 'PASS  follow-up list puts a 35-day overdue loan at committee review';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
select pg_temp.expect_error($$select * from public.loan_followup_list()$$,
  'Members cannot see the follow-up list');
-- Fatema is in Hussain's household.
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_error($$insert into public.cases (applicant_id, submitted_by, type, category, title, requested_amount)
  values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'scholarship', 'sadaat', 'College fees', 50000)$$,
  'New scholarship requests pause while a household loan is 30+ days overdue');
select pg_temp.expect_ok($$insert into public.cases (applicant_id, submitted_by, type, category, title, requested_amount)
  values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'medical', 'sadaat', 'Hospital bill', 20000)$$,
  'Emergency medical requests are never paused');
do $$ begin
  if not exists (select 1 from public.education_loans where id = '60000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL  the payer should be able to see the loan they pay';
  end if;
  raise notice 'PASS  the payer can see the loan they pay';
end $$;

-- 13. A hardship request (with proof) stops the ladder; an approved pause moves the due date.
select pg_temp.expect_ok($$insert into public.loan_hardship_requests (id, loan_id, requested_by, kind, pause_months, reason, proof_path)
  values ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010',
          'pause', 3, 'Lost job', '00000000-0000-0000-0000-000000000010/demo-income.pdf')$$,
  'The payer can request a hardship pause with proof');
select pg_temp.expect_ok($$insert into public.cases (applicant_id, submitted_by, type, category, title, requested_amount)
  values ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'scholarship', 'sadaat', 'College fees', 50000)$$,
  'A pending hardship review lifts the pause on new requests');
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_error($$update public.loan_hardship_requests set status = 'approved' where id = '70000000-0000-0000-0000-000000000001'$$,
  'Families cannot approve their own hardship request');
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.expect_ok($$update public.loan_hardship_requests set status = 'approved' where id = '70000000-0000-0000-0000-000000000001'$$,
  'A trustee approves the pause');
select pg_temp.as_system();
do $$ begin
  if (select status from public.education_loans where id = '60000000-0000-0000-0000-000000000001') <> 'paused'
     or (select next_due_date from public.education_loans where id = '60000000-0000-0000-0000-000000000001')
        <> (current_date - 35 + interval '3 months')::date then
    raise exception 'FAIL  an approved pause should pause the loan and move the due date by 3 months';
  end if;
  raise notice 'PASS  an approved pause moves the due date';
end $$;

-- 14. Demo payments: off by default; when on, only your own pending payment, with the real triggers.
select pg_temp.as_system();
insert into public.donations (id, donor_id, fund, case_id, amount)
values ('40000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000020', 'general', '20000000-0000-0000-0000-000000000004', 3000);
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
select pg_temp.expect_error($$select public.demo_confirm_payment('donation', '40000000-0000-0000-0000-000000000009')$$,
  'Demo payments are refused while demo mode is off');
select pg_temp.as_system();
update public.jamaat_settings set demo_mode = true;
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_error($$select public.demo_confirm_payment('donation', '40000000-0000-0000-0000-000000000009')$$,
  'Nobody can demo-confirm someone else''s payment');
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
select public.demo_confirm_payment('donation', '40000000-0000-0000-0000-000000000009');
select pg_temp.as_system();
do $$ begin
  if (select status from public.donations where id = '40000000-0000-0000-0000-000000000009') <> 'paid'
     or (select raised_amount from public.cases where id = '20000000-0000-0000-0000-000000000004') <> 15000 then
    raise exception 'FAIL  a demo-confirmed donation should be paid and counted';
  end if;
  raise notice 'PASS  demo mode confirms your own donation through the normal triggers';
end $$;
update public.jamaat_settings set demo_mode = false;

-- 15. Loans part 2: AutoPay needs an agreed plan; statuses follow dates; proofs must be your own files.
select pg_temp.as_system();
update public.education_loans set plan_agreed_at = null, agreed_emi = null where id = '60000000-0000-0000-0000-000000000002';
select pg_temp.as_user('00000000-0000-0000-0000-000000000013');
select pg_temp.expect_error($$select public.start_autopay('60000000-0000-0000-0000-000000000002')$$,
  'AutoPay cannot start before the repayment plan is agreed');
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
select pg_temp.expect_error($$select public.start_autopay('60000000-0000-0000-0000-000000000001')$$,
  'Someone who is not the student or payer cannot set up AutoPay');
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_ok($$select public.start_autopay('60000000-0000-0000-0000-000000000001')$$,
  'The payer can set up AutoPay once the plan is agreed');
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
select pg_temp.expect_error($$select public.refresh_loan_statuses()$$,
  'Members cannot run the loan status job');
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_error($$insert into public.loan_hardship_requests (loan_id, requested_by, kind, pause_months, reason, proof_path)
  values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'pause', 2, 'x',
          '00000000-0000-0000-0000-000000000011/someone-elses.pdf')$$,
  'A hardship proof must be a file from your own folder');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-0000-0000-000000000011/x.pdf')$$,
  'Nobody can upload into another member''s documents folder');
select pg_temp.expect_ok($$insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-0000-0000-000000000010/x.pdf')$$,
  'Members can upload into their own documents folder');
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$ begin
  if exists (select 1 from storage.objects where name = '00000000-0000-0000-0000-000000000010/x.pdf') then
    raise exception 'FAIL  another member should not see Fatema''s documents';
  end if;
  raise notice 'PASS  members cannot see other members'' documents';
end $$;
select pg_temp.as_system();
update public.education_loans set course_end_date = current_date - 30 where id = '60000000-0000-0000-0000-000000000002';
select public.refresh_loan_statuses();
do $$ begin
  if (select status from public.education_loans where id = '60000000-0000-0000-0000-000000000002') <> 'grace' then
    raise exception 'FAIL  a loan whose course has ended should move to the grace period';
  end if;
  raise notice 'PASS  a finished course moves the loan into its grace period';
end $$;

-- 16. Sehme Imam institutions need two trustees; Lawajam is paid only for your own household, in full.
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect_ok($$insert into public.institutions (id, name, marja, ijazah_document_path, ijazah_verified_by)
  values ('30000000-0000-0000-0000-000000000009', 'Test Madrasa', 'Demo Marja', '00000000-0000-0000-0000-000000000001/ijazah.pdf',
          '00000000-0000-0000-0000-000000000001')$$,
  'A trustee can add an institution');
select pg_temp.as_system();
do $$ begin
  if (select ijazah_verified_by from public.institutions where id = '30000000-0000-0000-0000-000000000009') is not null then
    raise exception 'FAIL  a new institution must start unverified, whatever the client sends';
  end if;
  raise notice 'PASS  a new institution always starts unverified';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect_error($$update public.institutions set ijazah_verified_by = '00000000-0000-0000-0000-000000000001'
  where id = '30000000-0000-0000-0000-000000000009'$$,
  'The trustee who added an institution cannot verify its ijazah');
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
select pg_temp.expect_error($$insert into public.donations (donor_id, fund, institution_id, amount)
  values ('00000000-0000-0000-0000-000000000020', 'sehme_imam', '30000000-0000-0000-0000-000000000009', 500)$$,
  'Sehme Imam cannot go to an institution before a second trustee verifies it');
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.expect_ok($$update public.institutions set ijazah_verified_by = '00000000-0000-0000-0000-000000000001'
  where id = '30000000-0000-0000-0000-000000000009'$$,
  'A different trustee can verify the ijazah');
select pg_temp.as_system();
do $$ begin
  if (select ijazah_verified_by from public.institutions where id = '30000000-0000-0000-0000-000000000009')
     <> '00000000-0000-0000-0000-000000000003' then
    raise exception 'FAIL  the verifier should be recorded as the trustee who actually verified';
  end if;
  raise notice 'PASS  verification records the trustee who actually verified';
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_error($$insert into public.lawajam_payments (due_id, paid_by, amount)
  select id, '00000000-0000-0000-0000-000000000010', amount from public.lawajam_dues
  where household_id = '10000000-0000-0000-0000-000000000003'$$,
  'Members cannot pay another household''s Lawajam');
select pg_temp.expect_error($$insert into public.lawajam_payments (due_id, paid_by, amount)
  select id, '00000000-0000-0000-0000-000000000010', 100 from public.lawajam_dues
  where household_id = '10000000-0000-0000-0000-000000000001'$$,
  'Lawajam must be paid for the full amount due');
select pg_temp.expect_ok($$insert into public.lawajam_payments (id, due_id, paid_by, amount)
  select '80000000-0000-0000-0000-000000000001', id, '00000000-0000-0000-0000-000000000010', amount from public.lawajam_dues
  where household_id = '10000000-0000-0000-0000-000000000001'$$,
  'A member can pay their household''s Lawajam');
select pg_temp.expect_error($$select public.create_lawajam_period('2027-28', 1200)$$,
  'Members cannot raise Lawajam dues');
select pg_temp.as_system();
update public.lawajam_payments set status = 'paid' where id = '80000000-0000-0000-0000-000000000001';
do $$ begin
  if (select status from public.lawajam_dues where household_id = '10000000-0000-0000-0000-000000000001' and period = '2026-27') <> 'paid'
     or not exists (select 1 from public.ledger_entries where fund = 'lawajam' and amount = 1200) then
    raise exception 'FAIL  a confirmed Lawajam payment should mark the due paid and go to the Lawajam ledger only';
  end if;
  raise notice 'PASS  a confirmed Lawajam payment marks the due paid, in the Lawajam ledger';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select pg_temp.expect_ok($$select public.create_lawajam_period('2027-28', 1200)$$,
  'Finance can raise a year''s dues for every household');

-- 17. Fraud flag reviews and announcements record the real person.
select pg_temp.as_system();
insert into public.fraud_flags (id, case_id, reason)
values ('90000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'Test flag');
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.expect_error($$update public.fraud_flags set status = 'cleared' where id = '90000000-0000-0000-0000-000000000001'$$,
  'A trustee cannot review fraud flags (verifiers do)');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.expect_error($$update public.fraud_flags set reason = 'changed' where id = '90000000-0000-0000-0000-000000000001'$$,
  'A flag''s reason cannot be rewritten');
select pg_temp.expect_ok($$update public.fraud_flags set status = 'cleared', reviewed_by = '00000000-0000-0000-0000-000000000003'
  where id = '90000000-0000-0000-0000-000000000001'$$,
  'A verifier can clear a flag');
select pg_temp.expect_error($$update public.fraud_flags set status = 'confirmed' where id = '90000000-0000-0000-0000-000000000001'$$,
  'A reviewed flag cannot be changed again');
select pg_temp.as_system();
do $$ begin
  if (select reviewed_by from public.fraud_flags where id = '90000000-0000-0000-0000-000000000001') <> '00000000-0000-0000-0000-000000000002' then
    raise exception 'FAIL  the reviewer should be recorded as the verifier who actually reviewed';
  end if;
  raise notice 'PASS  a flag review records the verifier who actually reviewed';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_error($$insert into public.announcements (title, body, published_at) values ('x', 'y', now())$$,
  'Members cannot post announcements');
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.expect_ok($$insert into public.announcements (id, title, body, published_at, created_by)
  values ('91000000-0000-0000-0000-000000000001', 'Test', 'Body', now(), '00000000-0000-0000-0000-000000000001')$$,
  'A trustee can post an announcement');
select pg_temp.as_system();
do $$ begin
  if (select created_by from public.announcements where id = '91000000-0000-0000-0000-000000000001') <> '00000000-0000-0000-0000-000000000003' then
    raise exception 'FAIL  the author should be the trustee who posted';
  end if;
  raise notice 'PASS  an announcement records the trustee who posted it';
end $$;

-- 18. Signup creates an unverified profile with no household; members cannot join a household themselves.
select pg_temp.as_system();
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000099', 'new@ks1j.test',
   '{"full_name": "New Member", "phone": "+91 90000 00099", "area": "Byculla", "address": "Flat 1"}');
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000098', 'dupe@ks1j.test', '{"full_name": "Same Phone", "phone": "910000000010"}');
do $$ begin
  if not exists (select 1 from public.members where id = '00000000-0000-0000-0000-000000000099'
                 and phone = '919000000099' and area = 'Byculla' and not membership_verified and household_id is null) then
    raise exception 'FAIL  signup should create an unverified profile with no household';
  end if;
  if not exists (select 1 from public.members where id = '00000000-0000-0000-0000-000000000098' and phone is null) then
    raise exception 'FAIL  a signup with an already-registered mobile should still create the account';
  end if;
  raise notice 'PASS  signup creates an unverified profile, even when the mobile is already registered';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000099');
select pg_temp.expect_error($$update public.members set household_id = '10000000-0000-0000-0000-000000000001'
  where id = '00000000-0000-0000-0000-000000000099'$$,
  'A new member cannot put themselves in a household');
select pg_temp.expect_error($$update public.members set membership_verified = true
  where id = '00000000-0000-0000-0000-000000000099'$$,
  'A new member cannot mark themselves verified');
do $$ begin
  if exists (select 1 from public.lawajam_dues) then
    raise exception 'FAIL  a member without a household should see no household dues';
  end if;
  raise notice 'PASS  an unverified member sees no household data';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.expect_ok($$update public.members set household_id = '10000000-0000-0000-0000-000000000002', membership_verified = true
  where id = '00000000-0000-0000-0000-000000000099'$$,
  'A verifier links the new member to a household and verifies them');

-- 19. Case documents: only your own files, only on cases you can see.
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_ok($$insert into public.case_documents (case_id, kind, storage_path, uploaded_by)
  values ('20000000-0000-0000-0000-000000000001', 'fee_receipt', '00000000-0000-0000-0000-000000000010/fees.pdf',
          '00000000-0000-0000-0000-000000000010')$$,
  'An applicant can attach a document from their own folder to their case');
select pg_temp.expect_error($$insert into public.case_documents (case_id, kind, storage_path, uploaded_by)
  values ('20000000-0000-0000-0000-000000000001', 'fee_receipt', '00000000-0000-0000-0000-000000000011/x.pdf',
          '00000000-0000-0000-0000-000000000010')$$,
  'Nobody can attach a file from someone else''s folder');
select pg_temp.expect_error($$insert into public.case_documents (case_id, kind, storage_path, uploaded_by)
  values ('20000000-0000-0000-0000-000000000003', 'fee_receipt', '00000000-0000-0000-0000-000000000010/y.pdf',
          '00000000-0000-0000-0000-000000000010')$$,
  'Nobody can attach documents to another family''s case');
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$ begin
  if exists (select 1 from public.case_documents) then
    raise exception 'FAIL  a donor should not see any case documents';
  end if;
  raise notice 'PASS  donors never see case documents';
end $$;

-- 20. Sehme Imam remittances: finance only, never more than is held, and recorded in the ledger.
select pg_temp.as_system();
insert into public.donations (id, donor_id, fund, institution_id, amount)
values ('40000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000020', 'sehme_imam', '30000000-0000-0000-0000-000000000001', 10000);
update public.donations set status = 'paid' where id = '40000000-0000-0000-0000-0000000000b1';
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.expect_error($$insert into public.institution_remittances (institution_id, amount, reference)
  values ('30000000-0000-0000-0000-000000000001', 1000, 'NEFT-1')$$,
  'Trustees cannot record remittances (finance does)');
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
select pg_temp.expect_error($$select public.institution_sehme_imam_balance('30000000-0000-0000-0000-000000000001')$$,
  'Members cannot see an institution''s fund balance');
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select pg_temp.expect_error($$insert into public.institution_remittances (institution_id, amount, reference)
  values ('30000000-0000-0000-0000-000000000001', 10001, 'NEFT-2')$$,
  'Finance cannot remit more Sehme Imam than is held for the institution');
select pg_temp.expect_ok($$insert into public.institution_remittances (institution_id, amount, reference)
  values ('30000000-0000-0000-0000-000000000001', 6000, 'NEFT-3')$$,
  'Finance can remit Sehme Imam that is held');
do $$ begin
  if public.institution_sehme_imam_balance('30000000-0000-0000-0000-000000000001') <> 4000 then
    raise exception 'FAIL  after remitting 6,000 of 10,000, 4,000 should still be held';
  end if;
  raise notice 'PASS  a remittance is taken off the institution''s Sehme Imam in the ledger';
end $$;
select pg_temp.expect_error($$insert into public.institution_remittances (institution_id, amount, reference)
  values ('30000000-0000-0000-0000-000000000001', 4001, 'NEFT-4')$$,
  'A second remittance cannot exceed what is left');

-- 21. Helpdesk: only approved texts are searchable; two trustees per document; approved text cannot be edited.
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$ begin
  if not exists (select 1 from public.search_help('how do I pay back my education loan')) then
    raise exception 'FAIL  a member should find approved help about loans';
  end if;
  if (select title from public.search_help('interest late fee') limit 1) <> 'Education loans (Qard-e-Hasana)' then
    raise exception 'FAIL  "interest late fee" should find the loans document first';
  end if;
  raise notice 'PASS  members can search approved help texts';
end $$;
select pg_temp.expect_error($$insert into public.kb_documents (title, source_ref) values ('Fake', 'Made up')$$,
  'Members cannot add help documents');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect_ok($$insert into public.kb_documents (id, title, source_ref) values
  ('a1000000-0000-0000-0000-000000000001', 'Hall booking', 'Jamaat office circular (test)')$$,
  'A trustee can add a draft document');
select pg_temp.expect_ok($$insert into public.kb_chunks (document_id, heading, body) values
  ('a1000000-0000-0000-0000-000000000001', 'Booking the hall', 'Book the hall for a majlis at the Jamaat office.')$$,
  'A trustee can add sections to a draft');
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$ begin
  if exists (select 1 from public.search_help('majlis hall booking')) then
    raise exception 'FAIL  a draft must not be searchable';
  end if;
  raise notice 'PASS  drafts are never used for answers';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
select pg_temp.expect_error($$update public.kb_documents set status = 'approved' where id = 'a1000000-0000-0000-0000-000000000001'$$,
  'The trustee who added a document cannot approve it');
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.expect_ok($$update public.kb_documents set status = 'approved' where id = 'a1000000-0000-0000-0000-000000000001'$$,
  'A different trustee can approve it');
select pg_temp.expect_error($$update public.kb_chunks set body = 'Changed after approval' where document_id = 'a1000000-0000-0000-0000-000000000001'$$,
  'Approved text cannot be edited');
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$ begin
  if (select title from public.search_help('book the hall for a majlis') limit 1) <> 'Hall booking' then
    raise exception 'FAIL  an approved document should be searchable';
  end if;
  raise notice 'PASS  once approved by a second trustee, the document answers questions';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$ begin
  if exists (select 1 from public.search_help('What time does the mosque library open?')) then
    raise exception 'FAIL  one shared word should not make an unrelated text an answer';
  end if;
  if (select heading from public.search_help('What happens if I cannot pay my loan EMI?') limit 1) <> 'If you cannot pay' then
    raise exception 'FAIL  the hardship section should come first for "cannot pay my loan EMI"';
  end if;
  if (select heading from public.search_help('When does my loan repayment start?') limit 1) <> 'When repayment starts' then
    raise exception 'FAIL  a matching heading should rank first';
  end if;
  raise notice 'PASS  search finds the right section and ignores one-word coincidences';
end $$;

select public.log_helpdesk_question('Where is the hall?', 'answered', '{}');
select pg_temp.expect_error($$select 1/count(*) from public.helpdesk_questions$$,
  'Members cannot read the question log');

-- 10. Khums shares must add up.
select pg_temp.expect_error($$insert into public.khums_calculations (member_id, khums_year, surplus, khums_due, sehme_imam, sehme_sadaat)
  values ('00000000-0000-0000-0000-000000000020', 2026, 100000, 20000, 10000, 9000)$$,
  'Khums shares that do not add up are rejected');

-- 11. Public case cards never identify the person who asked for help.
select pg_temp.as_system();
update public.cases
   set public_summary = 'Zainab and her husband ZAINAB-son need ration. Call +91 12345 67890 or zainab@mail.test.'
 where id = '20000000-0000-0000-0000-000000000004';
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$
declare
  r record;
begin
  select * into r from public.list_public_cases() where id = '20000000-0000-0000-0000-000000000004';
  if r.title = 'Monthly ration for a family of five' or r.title <> 'Monthly ration for a family' then
    raise exception 'FAIL  the applicant''s own title must not be shown publicly (got %)', r.title;
  end if;
  if r.public_summary ~* 'zainab|98200|@' then
    raise exception 'FAIL  name, phone or email leaked: %', r.public_summary;
  end if;
  if r.public_summary not like '%need ration%' then
    raise exception 'FAIL  the useful part of the summary should stay: %', r.public_summary;
  end if;
  raise notice 'PASS  public cards hide the applicant''s name, phone and email but keep the need';
end $$;
select pg_temp.expect_error($$select * from public.preview_public_case('20000000-0000-0000-0000-000000000004', 'x')$$,
  'Members cannot use the staff preview');
select pg_temp.expect_error($$select public.public_case_summary('20000000-0000-0000-0000-000000000004', 'x')$$,
  'The masking helper is not callable from the API');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
do $$ begin
  if (select public_summary from public.preview_public_case('20000000-0000-0000-0000-000000000004', 'For Zainab today.'))
     <> 'For [name hidden] today.' then
    raise exception 'FAIL  staff preview should mask the same way';
  end if;
  raise notice 'PASS  staff see exactly what donors will see before approving';
end $$;

-- 12. Document checks: a receipt that disagrees with the application raises a flag; nothing changes the case.
select pg_temp.as_system();
insert into public.case_documents (id, case_id, kind, storage_path, uploaded_by) values
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'fee_receipt',
   '00000000-0000-0000-0000-000000000010/receipt.pdf', '00000000-0000-0000-0000-000000000010'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'fee_receipt',
   '00000000-0000-0000-0000-000000000010/receipt2.pdf', '00000000-0000-0000-0000-000000000010');
select set_config('test.case1_status', (select status::text from public.cases where id = '20000000-0000-0000-0000-000000000001'), false);
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
select pg_temp.expect_error($$select public.record_document_check('50000000-0000-0000-0000-000000000001', 'manual', 36000)$$,
  'An applicant cannot mark their own receipt as checked');
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.expect_error($$select public.record_document_check('50000000-0000-0000-0000-000000000001', 'ai', 36000)$$,
  'Staff cannot pretend a manual reading came from the AI');
select public.record_document_check('50000000-0000-0000-0000-000000000001', 'manual', 40000, 'Fatema Hussain', 'Demo School');
select public.record_document_check('50000000-0000-0000-0000-000000000002', 'manual', 36000, 'Someone Else');
do $$ begin
  if (select outcome from public.document_checks where document_id = '50000000-0000-0000-0000-000000000001') <> 'mismatch' then
    raise exception 'FAIL  a receipt for a different amount should be a mismatch';
  end if;
  if not exists (select 1 from public.fraud_flags where document_id = '50000000-0000-0000-0000-000000000001'
                 and reason like '%₹40,000%₹36,000%' and status = 'open') then
    raise exception 'FAIL  the amount mismatch should raise an open flag';
  end if;
  if not exists (select 1 from public.fraud_flags where document_id = '50000000-0000-0000-0000-000000000002'
                 and reason like '%does not match the applicant%') then
    raise exception 'FAIL  a different name on the receipt should raise a flag';
  end if;
  if exists (select 1 from public.fraud_flags where document_id = '50000000-0000-0000-0000-000000000002' and reason like '%₹%') then
    raise exception 'FAIL  a matching amount should not raise an amount flag';
  end if;
  if (select status::text from public.cases where id = '20000000-0000-0000-0000-000000000001') <> current_setting('test.case1_status') then
    raise exception 'FAIL  a document check must never change the case status';
  end if;
  raise notice 'PASS  receipt mismatches raise flags for the verifier and leave the case alone';
end $$;
select public.record_document_check('50000000-0000-0000-0000-000000000001', 'manual', 40000, 'Fatema Hussain');
do $$ begin
  if (select count(*) from public.fraud_flags where document_id = '50000000-0000-0000-0000-000000000001' and status = 'open') <> 1 then
    raise exception 'FAIL  checking again should not duplicate the open flag';
  end if;
  raise notice 'PASS  checking a document again does not duplicate flags';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$ begin
  if exists (select 1 from public.document_checks) then
    raise exception 'FAIL  members must not see document checks';
  end if;
  raise notice 'PASS  only staff see document checks';
end $$;
select pg_temp.expect_error($$insert into public.document_checks (document_id, case_id, outcome, method)
  values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'matches', 'manual')$$,
  'Nobody writes check results directly');

-- 13. Notifications: applicants hear each step, donors hear when the need is met.
select pg_temp.as_system();
select set_config('test.left', (select (target_amount - raised_amount)::text from public.cases where id = '20000000-0000-0000-0000-000000000004'), false);
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$
declare left_amount integer := current_setting('test.left')::integer;
begin
  insert into public.donations (id, donor_id, fund, case_id, amount)
  values ('40000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000020', 'general', '20000000-0000-0000-0000-000000000004', left_amount);
end $$;
select pg_temp.as_system();
update public.donations set status = 'paid', gateway_ref = 'test_need_met' where id = '40000000-0000-0000-0000-0000000000f1';
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$ begin
  if (select count(*) from public.notifications where kind = 'need_met' and case_id = '20000000-0000-0000-0000-000000000004') <> 1 then
    raise exception 'FAIL  the donor who completed the case should hear the need is met, once';
  end if;
  if exists (select 1 from public.notifications where member_id <> '00000000-0000-0000-0000-000000000020') then
    raise exception 'FAIL  members must only see their own notifications';
  end if;
  raise notice 'PASS  donors hear when a case they gave to is fully funded';
end $$;
select pg_temp.expect_error($$update public.notifications set body = 'changed' where case_id = '20000000-0000-0000-0000-000000000004'$$,
  'Notification text cannot be changed by members');
select pg_temp.expect_ok($$update public.notifications set read_at = now() where case_id = '20000000-0000-0000-0000-000000000004'$$,
  'Members can mark their notifications read');
select pg_temp.expect_error($$insert into public.notifications (member_id, kind, title, body) values ('00000000-0000-0000-0000-000000000020', 'need_met', 'x', 'y')$$,
  'Members cannot create notifications');
select pg_temp.as_user('00000000-0000-0000-0000-000000000012');
do $$ begin
  if not exists (select 1 from public.notifications where kind = 'case_status' and case_id = '20000000-0000-0000-0000-000000000004'
                 and body like '%fully funded%') then
    raise exception 'FAIL  the applicant should hear that the case is fully funded';
  end if;
  raise notice 'PASS  applicants hear each step of their case';
end $$;

-- 14. The same file on two different cases is flagged.
select pg_temp.as_system();
select public.record_document_hash('50000000-0000-0000-0000-000000000001', repeat('ab', 32));
insert into public.case_documents (id, case_id, kind, storage_path, uploaded_by) values
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'fee_receipt',
   '00000000-0000-0000-0000-000000000012/same.pdf', '00000000-0000-0000-0000-000000000012');
select public.record_document_hash('50000000-0000-0000-0000-000000000003', repeat('ab', 32));
do $$ begin
  if not exists (select 1 from public.fraud_flags where document_id = '50000000-0000-0000-0000-000000000003'
                 and matched_case_id = '20000000-0000-0000-0000-000000000001' and reason like 'The same file is also attached to case #%') then
    raise exception 'FAIL  a file reused on another case should be flagged';
  end if;
  raise notice 'PASS  the same file on two cases raises a flag';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.expect_error($$select public.record_document_hash('50000000-0000-0000-0000-000000000003', repeat('cd', 32))$$,
  'Only the server records file fingerprints');

-- 15. Household page shows only your own household.
select pg_temp.as_user('00000000-0000-0000-0000-000000000010');
do $$ begin
  if (select count(*) from public.my_household_members()) <> 2 then
    raise exception 'FAIL  Fatema should see the 2 people in her household (got %)', (select count(*) from public.my_household_members());
  end if;
  if exists (select 1 from public.my_household_members() where full_name like 'Zainab%') then
    raise exception 'FAIL  another household must not appear';
  end if;
  raise notice 'PASS  members see only their own household';
end $$;

-- 16. A second open request from the same applicant or household is flagged, never blocked.
select pg_temp.as_system();
do $$
declare v_case uuid;
begin
  select id into v_case from public.cases
   where applicant_id = '00000000-0000-0000-0000-000000000010' and title = 'Hospital bill';
  if v_case is null then
    raise exception 'FAIL  the medical request from test 12 should exist';
  end if;
  if not exists (select 1 from public.fraud_flags where case_id = v_case and matched_case_id is not null
                 and reason in ('Same applicant already has an open case', 'Same household already has an open case')) then
    raise exception 'FAIL  a second open request from the same household should be flagged';
  end if;
  if (select status from public.cases where id = v_case) <> 'submitted' then
    raise exception 'FAIL  a duplicate flag must not change the case status';
  end if;
  raise notice 'PASS  a second open request from the same household is flagged for a verifier';
end $$;

-- 17. Payouts: only from a fully funded case, never more than was raised.
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select pg_temp.expect_error($$insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
  values ('20000000-0000-0000-0000-000000000001', 'sehme_sadaat', 36000, 'Demo School', '00000000-0000-0000-0000-000000000004')$$,
  'A case that is only submitted cannot be paid out (and not from Sehme Sadaat before lineage is verified)');
select pg_temp.expect_error($$insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
  values ('20000000-0000-0000-0000-000000000003', 'general', 1000, 'Demo Hospital', '00000000-0000-0000-0000-000000000004')$$,
  'A case still raising money cannot be paid out');
select pg_temp.as_system();
-- What was actually given to case 4 from General (the seeded opening amount has no gifts behind it).
select set_config('test.raised4', (select coalesce(sum(amount), 0)::text from public.donations
  where case_id = '20000000-0000-0000-0000-000000000004' and fund = 'general' and status = 'paid'), false);
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
do $$
declare raised integer := current_setting('test.raised4')::integer;
begin
  begin
    insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
    values ('20000000-0000-0000-0000-000000000004', 'general', raised + 1, 'Demo Store', '00000000-0000-0000-0000-000000000004');
    raise exception 'FAIL  paying out more than was given should be refused';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
  values ('20000000-0000-0000-0000-000000000004', 'general', raised, 'Demo Store', '00000000-0000-0000-0000-000000000004');
  raise notice 'PASS  a funded case pays out up to what was given, and no more';
end $$;

-- 18. An approved case cannot be quietly edited.
select pg_temp.as_user('00000000-0000-0000-0000-000000000005');
select pg_temp.expect_error($$update public.cases set public_summary = 'Changed' where id = '20000000-0000-0000-0000-000000000003'$$,
  'The text a trustee approved cannot be changed afterwards');
select pg_temp.expect_error($$update public.cases set requested_amount = 1 where id = '20000000-0000-0000-0000-000000000003'$$,
  'The amount asked for cannot change after approval');
select pg_temp.expect_error($$update public.cases set applicant_id = '00000000-0000-0000-0000-000000000020' where id = '20000000-0000-0000-0000-000000000002'$$,
  'Who a case is for cannot be changed');

-- 19. Nobody can give past a case's target.
select pg_temp.as_system();
select set_config('test.left3', (select (target_amount - raised_amount)::text from public.cases where id = '20000000-0000-0000-0000-000000000003'), false);
select pg_temp.as_user('00000000-0000-0000-0000-000000000020');
do $$
declare left_amount integer := current_setting('test.left3')::integer;
begin
  begin
    insert into public.donations (donor_id, fund, case_id, amount)
    values ('00000000-0000-0000-0000-000000000020', 'general', '20000000-0000-0000-0000-000000000003', left_amount + 1);
    raise exception 'FAIL  a gift larger than what is still needed should be refused';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  insert into public.donations (donor_id, fund, case_id, amount)
  values ('00000000-0000-0000-0000-000000000020', 'general', '20000000-0000-0000-0000-000000000003', left_amount);
  raise notice 'PASS  a gift can complete a case but not go past its target';
end $$;

-- 20. Document names: someone in the household is fine; a verifier's corrected reading clears the old flag.
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select public.record_document_check('50000000-0000-0000-0000-000000000002', 'manual', 36000, 'Hussain Demo');
do $$ begin
  if (select outcome from public.document_checks where document_id = '50000000-0000-0000-0000-000000000002') <> 'matches' then
    raise exception 'FAIL  a receipt in a household member''s name should match';
  end if;
  if exists (select 1 from public.fraud_flags where document_id = '50000000-0000-0000-0000-000000000002' and status = 'open') then
    raise exception 'FAIL  the verifier''s corrected reading should clear the old name flag';
  end if;
  if (select reviewed_by from public.fraud_flags where document_id = '50000000-0000-0000-0000-000000000002' limit 1)
     <> '00000000-0000-0000-0000-000000000002' then
    raise exception 'FAIL  the cleared flag should record who reviewed it';
  end if;
  raise notice 'PASS  household names match, and a corrected reading clears the old flag';
end $$;

-- 21. Public summaries hide addresses in any capitals and leave dates alone.
select pg_temp.as_system();
do $$ begin
  if public.mask_identity('Lives at demo building a since 2026-09-14, call +91 12345 67890.', '{}', '{Demo Building A}')
     <> 'Lives at [hidden] since 2026-09-14, call [number hidden].' then
    raise exception 'FAIL  masking: got %',
      public.mask_identity('Lives at demo building a since 2026-09-14, call +91 12345 67890.', '{}', '{Demo Building A}');
  end if;
  raise notice 'PASS  addresses are hidden whatever their capitals; dates are not mistaken for phones';
end $$;

-- 22. Payouts come from the fund the money was given to.
select pg_temp.as_system();
do $$
declare left_amount integer;
begin
  select target_amount - raised_amount into left_amount from public.cases where id = '20000000-0000-0000-0000-000000000003';
  insert into public.donations (id, donor_id, fund, case_id, amount)
  values ('40000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-000000000020', 'sehme_sadaat', '20000000-0000-0000-0000-000000000003', left_amount);
  update public.donations set status = 'paid', gateway_ref = 'test_payout_fund' where id = '40000000-0000-0000-0000-0000000000f3';
  if (select status from public.cases where id = '20000000-0000-0000-0000-000000000003') <> 'funded' then
    raise exception 'FAIL  case 3 should now be funded';
  end if;
  perform set_config('test.sadaat3', (select sum(amount)::text from public.donations
    where case_id = '20000000-0000-0000-0000-000000000003' and fund = 'sehme_sadaat' and status = 'paid'), false);
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select pg_temp.expect_error($$insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
  values ('20000000-0000-0000-0000-000000000003', 'general', 1000, 'Demo Hospital', '00000000-0000-0000-0000-000000000004')$$,
  'A case funded with Sehme Sadaat cannot be paid out from General');
do $$
declare given integer := current_setting('test.sadaat3')::integer;
begin
  begin
    insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
    values ('20000000-0000-0000-0000-000000000003', 'sehme_sadaat', given + 1, 'Demo Hospital', '00000000-0000-0000-0000-000000000004');
    raise exception 'FAIL  paying out more Sehme Sadaat than was given should be refused';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  insert into public.disbursements (case_id, fund, amount, payee, recorded_by)
  values ('20000000-0000-0000-0000-000000000003', 'sehme_sadaat', given, 'Demo Hospital', '00000000-0000-0000-0000-000000000004');
  raise notice 'PASS  payouts come from the fund the money was given to, never another';
end $$;

-- 23. Landing-page totals: anyone can read them, and they are totals only.
select pg_temp.as_system();
set local role anon;
do $$
declare r record;
begin
  select * into r from public.public_impact();
  if r.raised is null or r.families_helped is null or r.open_needs is null then
    raise exception 'FAIL  public totals should always return numbers';
  end if;
  raise notice 'PASS  anyone can read the landing-page totals (aggregates only)';
end $$;

-- 24. A student with no family: the Jamaat can guarantee the loan, with a committee mentor.
select pg_temp.as_system();
insert into public.cases (id, applicant_id, submitted_by, type, category, status, title, requested_amount)
values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012',
        'education_loan', 'non_sadaat', 'approved', 'Education loan: Diploma', 50000);
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select pg_temp.expect_error($$insert into public.education_loans (case_id, borrower_id, principal, outstanding, guarantor_name, guarantor_phone, course_end_date, jamaat_guarantee)
  values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000012', 50000, 50000, 'x', '910000000000', current_date + 300, true)$$,
  'A Jamaat-guaranteed loan needs a mentor');
select pg_temp.expect_error($$insert into public.education_loans (case_id, borrower_id, principal, outstanding, guarantor_name, guarantor_phone, course_end_date, jamaat_guarantee, mentor_member_id)
  values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000012', 50000, 50000, 'x', '910000000000', current_date + 300, true, '00000000-0000-0000-0000-000000000013')$$,
  'The mentor must be a committee member');
select pg_temp.expect_ok($$insert into public.education_loans (id, case_id, borrower_id, principal, outstanding, guarantor_name, guarantor_phone, course_end_date, jamaat_guarantee, mentor_member_id)
  values ('60000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000012', 50000, 50000, '', '', current_date + 300, true, '00000000-0000-0000-0000-000000000005')$$,
  'A trustee sets up a Jamaat-guaranteed loan with a volunteer as mentor');
do $$ begin
  if (select guarantor_name from public.education_loans where id = '60000000-0000-0000-0000-0000000000a1') <> 'KSI Jamaat welfare committee'
     or (select guarantor_phone from public.education_loans where id = '60000000-0000-0000-0000-0000000000a1') <> '910000000005' then
    raise exception 'FAIL  the guarantor should read as the welfare committee, reached through the mentor';
  end if;
  if not exists (select 1 from public.staff_directory() where id = '00000000-0000-0000-0000-000000000005') then
    raise exception 'FAIL  staff should be able to choose a mentor from the committee list';
  end if;
  raise notice 'PASS  the Jamaat can guarantee a loan for a student with no family, with a mentor';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-000000000013');
select pg_temp.expect_error($$select * from public.staff_directory()$$, 'Members cannot read the committee list');

rollback;
