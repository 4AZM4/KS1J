-- Demo seed data for local development and the hackathon demo.
-- All people, phones and amounts are fictional. Runs as a direct DB session (system).
-- Demo logins use the fictional @ks1j.test accounts (passwords set by demo_accounts.sql).

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

-- Cases, institutions, loans, dues and announcements (also used by demo_reset.sql).
\ir seed_data.sql
\ir kb_demo.sql
