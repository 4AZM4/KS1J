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
