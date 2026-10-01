-- Demo mode: lets the hackathon demo confirm payments without a live payment gateway.
-- OFF by default. When it is off, demo_confirm_payment() refuses to run, and payments can only
-- be confirmed by the server after the gateway confirms them (CLAUDE.md rule 3).

alter table public.jamaat_settings add column demo_mode boolean not null default false;

-- Confirms the caller's own pending payment as if the gateway had confirmed it.
-- Runs the same triggers a real confirmation does (ledger entry, case total, loan balance).
create or replace function public.demo_confirm_payment(p_kind text, p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  claims text := current_setting('request.jwt.claims', true);
  n integer;
begin
  if not coalesce((select demo_mode from public.jamaat_settings), false) then
    raise exception 'Demo payments are switched off. Payments are confirmed by the payment gateway.';
  end if;
  if me is null then
    raise exception 'Sign in first';
  end if;

  -- Act as the server for the confirmation itself, then restore the caller's identity.
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  if p_kind = 'donation' then
    update public.donations set status = 'paid', gateway_ref = 'demo_' || p_id
     where id = p_id and donor_id = me and status = 'pending';
  elsif p_kind = 'loan_repayment' then
    update public.loan_repayments r set status = 'paid', gateway_ref = 'demo_' || p_id
      from public.education_loans l
     where r.id = p_id and l.id = r.loan_id and me in (l.borrower_id, l.payer_member_id) and r.status = 'pending';
  elsif p_kind = 'lawajam' then
    update public.lawajam_payments set status = 'paid', gateway_ref = 'demo_' || p_id
     where id = p_id and paid_by = me and status = 'pending';
  else
    perform set_config('request.jwt.claims', claims, true);
    raise exception 'Unknown payment kind %', p_kind;
  end if;
  get diagnostics n = row_count;

  perform set_config('request.jwt.claims', claims, true);
  if n = 0 then
    raise exception 'No pending payment of yours with that id';
  end if;
end;
$$;

revoke execute on function public.demo_confirm_payment(text, uuid) from public, anon;
grant execute on function public.demo_confirm_payment(text, uuid) to authenticated;

-- A paid Lawajam payment marks the household's due as paid.
create or replace function public.on_lawajam_paid()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status <> 'paid' then
    new.paid_at := now();
    update public.lawajam_dues set status = 'paid' where id = new.due_id;
    insert into public.ledger_entries (fund, amount, memo) values ('lawajam', new.amount, 'Lawajam received');
  end if;
  return new;
end;
$$;

create trigger lawajam_payments_paid
before update of status on public.lawajam_payments
for each row execute function public.on_lawajam_paid();

revoke execute on function public.on_lawajam_paid() from public, anon, authenticated;
