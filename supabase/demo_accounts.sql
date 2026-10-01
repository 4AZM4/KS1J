-- Demo sign-in for the hackathon. Run ONCE on a real Supabase project after seed.sql
-- (not in CI: plain Postgres has no Supabase auth tables).
-- Gives every fictional seed account the same demo password so judges and the team can sign in
-- as any role. Delete these users, or change the password, before real members use the app.
--
-- Demo password: ks1j-demo-2026

update auth.users
   set instance_id = '00000000-0000-0000-0000-000000000000',
       aud = 'authenticated',
       role = 'authenticated',
       encrypted_password = extensions.crypt('ks1j-demo-2026', extensions.gen_salt('bf')),
       email_confirmed_at = coalesce(email_confirmed_at, now()),
       raw_app_meta_data = '{"provider":"email","providers":["email"]}',
       raw_user_meta_data = coalesce(raw_user_meta_data, '{}'),
       confirmation_token = coalesce(confirmation_token, ''),
       recovery_token = coalesce(recovery_token, ''),
       email_change = coalesce(email_change, ''),
       email_change_token_new = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       phone_change = coalesce(phone_change, ''),
       phone_change_token = coalesce(phone_change_token, ''),
       reauthentication_token = coalesce(reauthentication_token, ''),
       created_at = coalesce(created_at, now()),
       updated_at = now()
 where email like '%@ks1j.test';

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
  from auth.users u
 where u.email like '%@ks1j.test'
   and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

-- Lets the demo confirm payments without a payment gateway (see migration ..._demo_mode.sql).
update public.jamaat_settings set demo_mode = true;
