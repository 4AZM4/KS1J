-- ONE-STEP DEMO RESET: paste this whole file into the Supabase SQL editor and click Run.
-- It runs demo_reset.sql, seed_data.sql, kb_demo.sql and seed_community.sql in order.
-- Refuses to run unless demo mode is on. Member accounts are kept; announcements are cleared.

-- ===== demo_reset.sql =====
-- Puts the hackathon demo back to a clean start. DEMO DATA ONLY.
--
-- 1. Run this file (Supabase SQL editor, or psql as the database owner).
-- 2. Then run supabase/seed_data.sql to load the demo cases, loans and dues again.
-- 3. Then run supabase/kb_demo.sql to load the demo helpdesk texts again.
-- 4. Then run supabase/seed_community.sql to load the demo community (profiles, posts, groups).
--
-- It refuses to run unless jamaat_settings.demo_mode is on, so it can never touch a real
-- Jamaat database. Member accounts (demo logins and anyone who signed up) are kept.
--
-- Ledgers are append-only (CLAUDE.md rule 4). Wiping demo history is the one exception:
-- the guard is switched off inside this transaction only and switched back on before commit.

begin;

do $$
begin
  if not coalesce((select demo_mode from public.jamaat_settings), false) then
    raise exception 'demo_reset.sql only runs while demo mode is on. This looks like a real database: nothing was changed.';
  end if;
end $$;

alter table public.ledger_entries disable trigger ledger_append_only;

delete from public.ledger_entries;
delete from public.disbursements;
delete from public.donations;
delete from public.institution_remittances;
delete from public.loan_repayments;
delete from public.loan_hardship_requests;
delete from public.income_declarations;
delete from public.education_loans;
delete from public.lawajam_payments;
delete from public.lawajam_dues;
delete from public.notifications;
delete from public.case_documents;
delete from public.case_events;
delete from public.fraud_flags;
delete from public.cases;
delete from public.institutions;
delete from public.khums_calculations;
delete from public.khums_profiles;
delete from public.announcements;
-- Only the demo help texts (kb_demo.sql); texts the committee added stay.
delete from public.kb_documents where id::text like 'a0000000-0000-0000-0000-%';
delete from public.helpdesk_questions;
-- Community: everything goes (profiles cascade to posts, groups, requests and messages).
delete from public.community_reports;
delete from public.community_profiles;

alter table public.ledger_entries enable trigger ledger_append_only;

commit;

-- ===== seed_data.sql =====
-- Demo business data: cases, institutions, loans, Lawajam dues and an announcement.
-- Loaded by seed.sql, and on its own after demo_reset.sql to put the demo back to a clean start.
-- All people, phones and amounts are fictional.

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

-- Demo helpdesk texts are in kb_demo.sql (run it after this file).

-- ===== kb_demo.sql =====
-- Demo helpdesk texts: how the KS1J app works. Run after seed_data.sql (seed.sql loads it for local tests).
-- These are NOT Jamaat documents. Replace them with texts the Jamaat has approved before launch.
-- Religious rulings are deliberately absent: the helpdesk sends those questions to the Marja' or the Jamaat's alim.

insert into public.kb_documents (id, title, source_ref, status, approved_by, approved_at) values
  ('a0000000-0000-0000-0000-000000000001', 'Applying for help', 'KS1J app guide (demo text, to be replaced by Jamaat-approved documents)', 'approved', '00000000-0000-0000-0000-000000000003', now()),
  ('a0000000-0000-0000-0000-000000000002', 'Education loans (Qard-e-Hasana)', 'KS1J app guide (demo text, to be replaced by Jamaat-approved documents)', 'approved', '00000000-0000-0000-0000-000000000003', now()),
  ('a0000000-0000-0000-0000-000000000003', 'Giving: Khums, Sehme Sadaat, Sehme Imam and donations', 'KS1J app guide (demo text, to be replaced by Jamaat-approved documents)', 'approved', '00000000-0000-0000-0000-000000000003', now()),
  ('a0000000-0000-0000-0000-000000000004', 'Lawajam and your account', 'KS1J app guide (demo text, to be replaced by Jamaat-approved documents)', 'approved', '00000000-0000-0000-0000-000000000003', now());

insert into public.kb_chunks (document_id, position, heading, body) values
  ('a0000000-0000-0000-0000-000000000001', 1, 'How to apply',
   'Open Services and choose Welfare assistance for medical, education or ration help, or Scholarship for school and college fees. Choose Sadaat or Non-Sadaat, give a short title, the amount needed and the details. After you submit, the app asks for documents such as a fee receipt, medical report or income proof. A volunteer can also apply on your behalf.'),
  ('a0000000-0000-0000-0000-000000000001', 2, 'What happens after you apply',
   'A verifier checks your documents and need, and, for Sadaat, the Aadhaar card. A different trustee then approves the case; the person who verified can never approve the same case. Approved cases are shown to donors without your name, phone or address. The Jamaat pays the hospital, school or family directly and keeps proof. You can follow every step under Services, My applications.'),
  ('a0000000-0000-0000-0000-000000000001', 3, 'Who can see my details',
   'Only you, the person who submitted the case for you, and the Jamaat committee members working on it can see your details and documents. Donors only see the need, the amount and how much has been raised.'),
  ('a0000000-0000-0000-0000-000000000002', 1, 'No interest and no late fees',
   'Education loans are interest-free. There are no late fees, ever. Repayments go back into the fund so the next student can be helped.'),
  ('a0000000-0000-0000-0000-000000000002', 2, 'Agreeing your monthly EMI',
   'The student and family propose a monthly amount they can keep paying. A trustee accepts it or suggests another amount. The loan is paid out only after both agree the same EMI. The EMI must be large enough to finish repaying within the maximum period, 48 months unless the Jamaat sets otherwise. A family member can be the one who pays.'),
  ('a0000000-0000-0000-0000-000000000002', 3, 'When repayment starts',
   'Repayment starts after a grace period once your course ends, six months unless the Jamaat sets otherwise. The first EMI falls due when the grace period ends. Set up UPI AutoPay so each EMI is paid on time. You can always pay early or pay more, with no charge.'),
  ('a0000000-0000-0000-0000-000000000002', 4, 'If you cannot pay',
   'If you lose a job or face an emergency, ask for a pause of up to 12 months or a lower EMI from the Education loan screen, with income proof. Reminders stop while a trustee reviews it. If a loan is more than 30 days late without a hardship request, the household cannot open new scholarship or loan requests until it is sorted. Medical and ration help are never blocked.'),
  ('a0000000-0000-0000-0000-000000000003', 1, 'Khums in the app',
   'The Khums calculator in Give works out 20 percent of your surplus at your Khums year-end and splits it into Sehme Imam and Sehme Sadaat. It is a guide only. For any question about what is liable to Khums, exemptions or rulings, confirm with your Marja'' or the Jamaat''s alim.'),
  ('a0000000-0000-0000-0000-000000000003', 2, 'Where Sehme Sadaat and Sehme Imam can go',
   'Sehme Sadaat goes only to verified Sadaat (Syed) families. Sehme Imam goes only to institutions holding an ijazah from a Marja'', verified by two trustees, and never to individuals. The app only offers the allowed options, and the system refuses a payment to the wrong place.'),
  ('a0000000-0000-0000-0000-000000000003', 3, 'General donations and receipts',
   'General donations can go to any verified case, Sadaat or Non-Sadaat. Every payment is recorded in the Jamaat ledger and you get a receipt in the app. A payment only counts once the bank confirms it.'),
  ('a0000000-0000-0000-0000-000000000004', 1, 'Paying Lawajam',
   'Lawajam is your household''s yearly membership dues. Open Give, then Lawajam, to see what is due, pay it and get a receipt. Only your own household''s dues are shown, and Lawajam is kept separate from Khums and case funds.'),
  ('a0000000-0000-0000-0000-000000000004', 2, 'Creating an account',
   'Create an account with your name, mobile number, email, area and address. A Jamaat verifier confirms your membership and links you to your household. You can apply for help and give straight away; household dues and family loans appear once you are verified.');

-- ===== seed_community.sql =====
-- Demo content for Community (fictional people only). Run after seed.sql / seed_data.sql.
-- Fatema has no community profile on purpose: the demo shows her joining.

insert into public.community_profiles (member_id, headline, bio, profession, industry, city, skills, listed, open_to_work, is_mentor, mentor_areas, mentor_note) values
  ('00000000-0000-0000-0000-000000000003', 'Chartered accountant, 15 years in audit', 'Happy to help students choosing commerce and young professionals with their first job.',
   'Finance', 'Accounting', 'Mumbai', '{Audit,Tax,Excel}', true, false, true, '{Careers in finance,CA exams,First job}', 'Evenings after 7, or Sunday mornings.'),
  ('00000000-0000-0000-0000-000000000002', 'Family doctor', 'General practice in Dongri. I can guide students thinking about MBBS in India or abroad.',
   'Medicine', 'Healthcare', 'Mumbai', '{General practice,NEET guidance}', true, false, true, '{Medicine,Studying abroad}', 'Saturday afternoons.'),
  ('00000000-0000-0000-0000-000000000020', 'Runs a small printing business', 'Twenty years in print and packaging. Ask me about starting a small business.',
   'Business owner', 'Printing', 'Mumbai', '{Small business,Sales,Printing}', true, false, true, '{Starting a business,Entrepreneurship}', 'Weekday mornings.'),
  ('00000000-0000-0000-0000-000000000004', 'Bank operations', null, 'Banking', 'Finance', 'Mumbai', '{Banking,Loans}', true, false, false, '{}', null),
  ('00000000-0000-0000-0000-000000000005', 'Community volunteer', 'I help families fill in forms and use the app.', 'Teacher', 'Education', 'Mumbai', '{Teaching,Gujarati}', true, false, false, '{}', null),
  ('00000000-0000-0000-0000-000000000013', 'Engineering student, final year', 'Looking for an internship in software or electronics.', 'Student', 'Engineering', 'Mumbai',
   '{Python,Electronics}', true, true, false, '{}', null),
  ('00000000-0000-0000-0000-000000000011', 'Commerce student', null, 'Student', 'Commerce', 'Mumbai', '{Accounts}', true, true, false, '{}', null)
on conflict (member_id) do nothing;

insert into public.community_opportunities (id, author_id, kind, title, body, city, created_at) values
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'job', 'Part-time sales assistant',
   'Printing shop in Mazgaon needs a part-time sales assistant, three afternoons a week. Good for a student.', 'Mumbai', now() - interval '2 days'),
  ('80000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'mentorship', 'Articleship guidance for CA students',
   'I can review CVs and help two CA students find an articleship this term. Send me a message request.', 'Mumbai', now() - interval '1 day'),
  ('80000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000013', 'referral', 'Looking for a software internship',
   'Final-year engineering student. If your company takes interns, a referral would mean a lot.', 'Mumbai', now() - interval '5 hours'),
  ('80000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'business', 'Partner for a home tiffin service',
   'Looking for someone to share a kitchen and deliveries for a tiffin service in Andheri.', 'Mumbai', now() - interval '3 days')
on conflict (id) do nothing;

insert into public.community_groups (id, name, kind, description, private, created_by, created_at) values
  ('81000000-0000-0000-0000-000000000001', 'Students and young professionals', 'interest', 'Exams, admissions, internships and first jobs.', false,
   '00000000-0000-0000-0000-000000000005', now() - interval '6 days'),
  ('81000000-0000-0000-0000-000000000002', 'Finance and accounting', 'profession', 'For people working in finance, audit and banking.', false,
   '00000000-0000-0000-0000-000000000003', now() - interval '6 days'),
  ('81000000-0000-0000-0000-000000000003', 'Healthcare circle', 'profession', 'Doctors, nurses and pharmacists in the Jamaat.', true,
   '00000000-0000-0000-0000-000000000002', now() - interval '5 days')
on conflict (id) do nothing;

insert into public.community_group_members (group_id, member_id) values
  ('81000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013'),
  ('81000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
  ('81000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('81000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004'),
  ('81000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011')
on conflict do nothing;

insert into public.community_posts (id, author_id, group_id, body, created_at) values
  ('82000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', null,
   'Salaam everyone! The Community section is open. Find a mentor, share an opportunity, or just say hello.', now() - interval '3 days'),
  ('82000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', null,
   'Free CV review this Sunday after Zohr at the Jamaat hall for students applying for internships. Bring a printout.', now() - interval '1 day'),
  ('82000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000013', null,
   'Alhamdulillah, I cleared my final-year project review. Shukran to everyone who helped me prepare.', now() - interval '4 hours'),
  ('82000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', '81000000-0000-0000-0000-000000000001',
   'Admissions season: post your questions about colleges and courses here.', now() - interval '2 days'),
  ('82000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000002',
   'GST return dates for this quarter are out. Reminder for anyone helping family businesses.', now() - interval '1 day')
on conflict (id) do nothing;

insert into public.community_appreciations (post_id, member_id) values
  ('82000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000013'),
  ('82000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'),
  ('82000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000013'),
  ('82000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011'),
  ('82000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005')
on conflict do nothing;

-- Hussain and the trustee are already talking; Abbas has asked the donor for a call (waiting).
insert into public.community_connections (id, from_id, to_id, kind, note, preferred_time, created_at) values
  ('83000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000003', 'call',
   'Salaam, I am in my second year of B.Com and want to try for CA. Could we talk for 15 minutes?', 'Sunday morning', now() - interval '2 days'),
  ('83000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000020', 'call',
   'Salaam, I would like advice on starting a small electronics repair business after college.', 'Any weekday morning', now() - interval '3 hours')
on conflict (id) do nothing;
update public.community_connections set status = 'accepted' where id = '83000000-0000-0000-0000-000000000001' and status = 'pending';

insert into public.community_messages (id, connection_id, sender_id, body, created_at) values
  ('84000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   'Walaikum salaam Hussain. Happy to help. Sunday at 10 works for me; I will call you then.', now() - interval '1 day'),
  ('84000000-0000-0000-0000-000000000002', '83000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
   'Shukran! I will be ready with my questions.', now() - interval '20 hours')
on conflict (id) do nothing;

