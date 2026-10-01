-- Demo helpdesk texts: how the KS1J app works. Loaded by seed_data.sql.
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
   'A verifier checks your documents and need, and Sadaat lineage where it applies. A different trustee then approves the case; the person who verified can never approve the same case. Approved cases are shown to donors without your name, phone or address. The Jamaat pays the hospital, school or family directly and keeps proof. You can follow every step under Services, My applications.'),
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
