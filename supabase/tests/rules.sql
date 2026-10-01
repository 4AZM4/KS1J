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

-- 10. Khums shares must add up.
select pg_temp.expect_error($$insert into public.khums_calculations (member_id, khums_year, surplus, khums_due, sehme_imam, sehme_sadaat)
  values ('00000000-0000-0000-0000-000000000020', 2026, 100000, 20000, 10000, 9000)$$,
  'Khums shares that do not add up are rejected');

rollback;
