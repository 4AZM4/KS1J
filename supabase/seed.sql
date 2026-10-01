-- Demo seed data for local development and the hackathon demo.
-- All people, phones and amounts are fictional. Runs as a direct DB session (system).
-- Demo logins use Supabase test phone numbers with fixed OTPs (set in the Auth dashboard).

insert into auth.users (id, email, phone) values
  ('00000000-0000-0000-0000-000000000001', 'superadmin@ks1j.test', '910000000001'),
  ('00000000-0000-0000-0000-000000000002', 'verifier@ks1j.test',   '910000000002'),
  ('00000000-0000-0000-0000-000000000003', 'trustee@ks1j.test',    '910000000003'),
  ('00000000-0000-0000-0000-000000000004', 'finance@ks1j.test',    '910000000004'),
  ('00000000-0000-0000-0000-000000000005', 'volunteer@ks1j.test',  '910000000005'),
  ('00000000-0000-0000-0000-000000000010', 'fatema@ks1j.test',     '910000000010'),
  ('00000000-0000-0000-0000-000000000011', 'hussain@ks1j.test',    '910000000011'),
  ('00000000-0000-0000-0000-000000000012', 'zainab@ks1j.test',     '910000000012'),
  ('00000000-0000-0000-0000-000000000013', 'abbas@ks1j.test',      '910000000013'),
  ('00000000-0000-0000-0000-000000000020', 'donor@ks1j.test',      '910000000020');

insert into public.households (id, area, address) values
  ('10000000-0000-0000-0000-000000000001', 'Dongri', 'Demo Building A'),
  ('10000000-0000-0000-0000-000000000002', 'Mazgaon', 'Demo Building B'),
  ('10000000-0000-0000-0000-000000000003', 'Andheri', 'Demo Building C');

insert into public.members (id, full_name, phone, household_id, membership_verified) values
  ('00000000-0000-0000-0000-000000000001', 'Demo Super Admin', '910000000001', null, true),
  ('00000000-0000-0000-0000-000000000002', 'Demo Verifier',    '910000000002', null, true),
  ('00000000-0000-0000-0000-000000000003', 'Demo Trustee',     '910000000003', null, true),
  ('00000000-0000-0000-0000-000000000004', 'Demo Finance',     '910000000004', null, true),
  ('00000000-0000-0000-0000-000000000005', 'Demo Volunteer',   '910000000005', null, true),
  ('00000000-0000-0000-0000-000000000010', 'Fatema (demo)',    '910000000010', '10000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000011', 'Hussain (demo)',   '910000000011', '10000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000012', 'Zainab (demo)',    '910000000012', '10000000-0000-0000-0000-000000000002', true),
  ('00000000-0000-0000-0000-000000000013', 'Abbas (demo)',     '910000000013', '10000000-0000-0000-0000-000000000003', true),
  ('00000000-0000-0000-0000-000000000020', 'Demo Donor',       '910000000020', '10000000-0000-0000-0000-000000000003', true);

insert into public.member_roles (member_id, role) values
  ('00000000-0000-0000-0000-000000000001', 'super_admin'),
  ('00000000-0000-0000-0000-000000000002', 'verifier'),
  ('00000000-0000-0000-0000-000000000003', 'trustee'),
  ('00000000-0000-0000-0000-000000000004', 'finance'),
  ('00000000-0000-0000-0000-000000000005', 'volunteer');

-- Cases across the lifecycle. Verifier (…002) and trustee (…003) are always different people.
insert into public.cases
  (id, applicant_id, submitted_by, type, category, status, title, public_summary,
   requested_amount, target_amount, raised_amount, lineage_verified, verified_by, verified_at, approved_by, approved_at)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010',
   'education', 'sadaat', 'submitted', 'School fees for Class 9', null, 36000, null, 0, false, null, null, null, null),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000005',
   'medical', 'non_sadaat', 'verified', 'Knee surgery', null, 150000, null, 0, false,
   '00000000-0000-0000-0000-000000000002', now() - interval '2 days', null, null),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000013',
   'medical', 'sadaat', 'published', 'Dialysis for three months', 'Three months of dialysis for a family member.',
   90000, 90000, 42000, true, '00000000-0000-0000-0000-000000000002', now() - interval '6 days',
   '00000000-0000-0000-0000-000000000003', now() - interval '5 days'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000012',
   'ration', 'non_sadaat', 'published', 'Monthly ration for a family of five', 'Ration support for six months.',
   30000, 30000, 12000, false, '00000000-0000-0000-0000-000000000002', now() - interval '9 days',
   '00000000-0000-0000-0000-000000000003', now() - interval '8 days'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011',
   'scholarship', 'sadaat', 'published', 'Engineering first-year fees', 'First-year engineering fees, paid to the college.',
   120000, 120000, 30000, true, '00000000-0000-0000-0000-000000000002', now() - interval '12 days',
   '00000000-0000-0000-0000-000000000003', now() - interval '11 days'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011',
   'education_loan', 'sadaat', 'disbursed', 'Education loan: B.Com', null, 80000, 80000, 80000, true,
   '00000000-0000-0000-0000-000000000002', now() - interval '800 days',
   '00000000-0000-0000-0000-000000000003', now() - interval '799 days');

insert into public.institutions (id, name, city, marja, ijazah_document_path, ijazah_verified_by, ijazah_verified_at) values
  ('30000000-0000-0000-0000-000000000001', 'Demo Hawza Trust', 'Mumbai', 'Demo Marja''', 'ijazah/demo-hawza.pdf',
   '00000000-0000-0000-0000-000000000003', now() - interval '30 days'),
  ('30000000-0000-0000-0000-000000000002', 'Demo Education Institute', 'Mumbai', 'Demo Marja''', 'ijazah/demo-institute.pdf',
   null, null); -- not yet verified: must not appear to donors

-- A second loan, approved but not yet paid out: the family and committee still have to agree the EMI.
insert into public.cases
  (id, applicant_id, submitted_by, type, category, status, title, requested_amount, target_amount,
   lineage_verified, verified_by, verified_at, approved_by, approved_at)
values
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000013',
   'education_loan', 'sadaat', 'approved', 'Education loan: Diploma in nursing', 60000, 60000, true,
   '00000000-0000-0000-0000-000000000002', now() - interval '3 days',
   '00000000-0000-0000-0000-000000000003', now() - interval '2 days');

-- Hussain's loan: plan agreed, AutoPay on, repaying on time. Fatema (same household) pays the EMI.
insert into public.education_loans
  (id, case_id, borrower_id, payer_member_id, principal, outstanding, status, guarantor_name, guarantor_phone,
   course_end_date, family_accepted_emi, committee_accepted_emi, agreed_emi, plan_agreed_at, plan_agreed_by,
   next_due_date, autopay_status)
values
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010',
   80000, 64000, 'repaying', 'Demo Guarantor', '910000000099', current_date - 200,
   2000, 2000, 2000, now() - interval '800 days', '00000000-0000-0000-0000-000000000003',
   current_date + 10, 'active');

-- Abbas's loan: plan not yet agreed, so it cannot be paid out.
insert into public.education_loans
  (id, case_id, borrower_id, principal, outstanding, status, guarantor_name, guarantor_phone, course_end_date)
values
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000013', 60000, 60000, 'studying', 'Demo Guarantor 2', '910000000098',
   current_date + 365);

insert into public.lawajam_dues (household_id, period, amount, status) values
  ('10000000-0000-0000-0000-000000000001', '2026-27', 1200, 'pending'),
  ('10000000-0000-0000-0000-000000000002', '2026-27', 1200, 'paid'),
  ('10000000-0000-0000-0000-000000000003', '2026-27', 1200, 'pending');

insert into public.announcements (title, body, published_at, created_by) values
  ('Welcome to KS1J', 'Members can now apply for assistance, pay Khums and Lawajam, and ask the Jamaat helpdesk from one app.',
   now() - interval '1 day', '00000000-0000-0000-0000-000000000003');
