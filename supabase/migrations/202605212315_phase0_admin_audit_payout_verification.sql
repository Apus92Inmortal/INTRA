begin;

-- Phase 0 admin/audit hardening:
-- - add immutable audit log for sensitive admin operations
-- - add payout-account verification state
-- - require payout_verified level plus verified payout account before withdrawal
-- - move admin payout status transitions into one transactional RPC

create table if not exists public.app_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.app_audit_logs enable row level security;
revoke all on public.app_audit_logs from anon, authenticated;
grant all on public.app_audit_logs to service_role;

create index if not exists app_audit_logs_entity_idx
  on public.app_audit_logs (entity_type, entity_id, created_at desc);
create index if not exists app_audit_logs_actor_idx
  on public.app_audit_logs (actor_id, created_at desc);

alter table public.user_verifications
  add column if not exists verification_level text not null default 'basic_verified';

alter table public.user_verifications
  drop constraint if exists user_verifications_level_check;
alter table public.user_verifications
  add constraint user_verifications_level_check
  check (
    verification_level = any (
      array['basic_verified'::text, 'identity_verified'::text, 'payout_verified'::text]
    )
  );

alter table public.traveler_payout_accounts
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists verification_notes text;

alter table public.traveler_payout_accounts
  drop constraint if exists traveler_payout_accounts_verification_status_check;
alter table public.traveler_payout_accounts
  add constraint traveler_payout_accounts_verification_status_check
  check (verification_status = any (array['pending'::text, 'verified'::text, 'rejected'::text]));

update public.user_verifications uv
set
  verification_level = case
    when uv.verification_status = 'verified'
      and exists (
        select 1
        from public.traveler_payout_accounts tpa
        where tpa.traveler_user_id = uv.user_id
          and tpa.verification_status = 'verified'
      )
      then 'payout_verified'
    when uv.verification_status = 'verified'
      then 'identity_verified'
    else 'basic_verified'
  end,
  updated_at = now();

drop policy if exists traveler_payout_accounts_insert_own on public.traveler_payout_accounts;
create policy traveler_payout_accounts_insert_own
on public.traveler_payout_accounts
for insert
to authenticated
with check (
  traveler_user_id = auth.uid()
  and verification_status = 'pending'
  and verified_at is null
  and verified_by is null
);

drop policy if exists traveler_payout_accounts_update_own on public.traveler_payout_accounts;
create policy traveler_payout_accounts_update_own
on public.traveler_payout_accounts
for update
to authenticated
using (traveler_user_id = auth.uid())
with check (
  traveler_user_id = auth.uid()
  and verification_status = 'pending'
  and verified_at is null
  and verified_by is null
);

create unique index if not exists wallet_ledger_payout_paid_once_idx
  on public.wallet_ledger (payout_id)
  where payout_id is not null
    and entry_type = 'payout_paid_debit';

create or replace function public.request_payout(
  p_amount numeric,
  p_payout_account_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_wallet public.wallets;
  v_config public.fee_configs;
  v_account public.traveler_payout_accounts;
  v_selected_account_id uuid;
  v_reserved_amount numeric := 0;
  v_withdrawable numeric := 0;
  v_verification public.user_verifications;
  v_payout_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  select *
  into v_verification
  from public.user_verifications uv
  where uv.user_id = v_actor
  limit 1;

  if coalesce(v_verification.verification_level, 'basic_verified') <> 'payout_verified' then
    return jsonb_build_object('success', false, 'error', 'payout_verification_required');
  end if;

  select *
  into v_config
  from public.fee_configs
  where is_active = true
  order by updated_at desc, created_at desc
  limit 1;

  if p_amount < coalesce(v_config.minimum_payout_cop, 10000) then
    return jsonb_build_object(
      'success', false,
      'error', 'below_minimum_payout',
      'minimum_payout', coalesce(v_config.minimum_payout_cop, 10000)
    );
  end if;

  select *
  into v_wallet
  from public.wallets
  where user_id = v_actor
  for update;

  if v_wallet.id is null then
    return jsonb_build_object('success', false, 'error', 'wallet_not_found');
  end if;

  v_selected_account_id := p_payout_account_id;

  if v_selected_account_id is null then
    select id
    into v_selected_account_id
    from public.traveler_payout_accounts
    where traveler_user_id = v_actor
      and verification_status = 'verified'
    order by is_default desc, created_at asc
    limit 1;
  end if;

  if v_selected_account_id is null then
    return jsonb_build_object('success', false, 'error', 'payout_account_required');
  end if;

  select *
  into v_account
  from public.traveler_payout_accounts
  where id = v_selected_account_id
    and traveler_user_id = v_actor
  for update;

  if v_account.id is null then
    return jsonb_build_object('success', false, 'error', 'payout_account_invalid');
  end if;

  if coalesce(v_account.verification_status, 'pending') <> 'verified' then
    return jsonb_build_object('success', false, 'error', 'payout_account_verification_required');
  end if;

  perform 1
  from public.payouts p
  where p.traveler_user_id = v_actor
    and p.status in ('pending', 'approved')
  for update;

  select coalesce(sum(amount), 0)
  into v_reserved_amount
  from public.payouts p
  where p.traveler_user_id = v_actor
    and p.status in ('pending', 'approved');

  v_withdrawable := greatest(coalesce(v_wallet.available_balance, 0) - v_reserved_amount, 0);

  if p_amount > v_withdrawable then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_withdrawable_balance',
      'withdrawable_balance', v_withdrawable
    );
  end if;

  insert into public.payouts (
    traveler_user_id,
    wallet_id,
    payout_account_id,
    amount,
    review_notes
  ) values (
    v_actor,
    v_wallet.id,
    v_account.id,
    p_amount,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning id into v_payout_id;

  insert into public.app_audit_logs (actor_id, event_type, entity_type, entity_id, metadata)
  values (
    v_actor,
    'payout_requested',
    'payout',
    v_payout_id,
    jsonb_build_object('amount', p_amount, 'wallet_id', v_wallet.id, 'payout_account_id', v_account.id)
  );

  return jsonb_build_object('success', true, 'payout_id', v_payout_id);
end;
$function$;

create or replace function public.admin_update_payout_status(
  p_payout_id uuid,
  p_status text,
  p_review_notes text default null,
  p_paid_reference text default null,
  p_admin_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payout public.payouts;
  v_wallet public.wallets;
  v_now timestamptz := now();
  v_ledger_id uuid;
begin
  if p_payout_id is null then
    return jsonb_build_object('success', false, 'error', 'payout_required');
  end if;

  if p_status not in ('approved', 'rejected', 'paid') then
    return jsonb_build_object('success', false, 'error', 'invalid_payout_status');
  end if;

  select *
  into v_payout
  from public.payouts
  where id = p_payout_id
  for update;

  if v_payout.id is null then
    return jsonb_build_object('success', false, 'error', 'payout_not_found');
  end if;

  if v_payout.status = 'paid' then
    return jsonb_build_object('success', true, 'payout_id', v_payout.id, 'status', 'paid', 'idempotent', true);
  end if;

  if p_status = 'approved' and v_payout.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'invalid_payout_transition');
  end if;

  if p_status = 'rejected' and v_payout.status not in ('pending', 'approved') then
    return jsonb_build_object('success', false, 'error', 'invalid_payout_transition');
  end if;

  if p_status = 'paid' and v_payout.status <> 'approved' then
    return jsonb_build_object('success', false, 'error', 'payout_must_be_approved_first');
  end if;

  update public.payouts
  set
    status = p_status,
    reviewed_at = case when p_status in ('approved', 'rejected', 'paid') then v_now else reviewed_at end,
    paid_at = case when p_status = 'paid' then v_now else paid_at end,
    paid_reference = case when p_status = 'paid' then nullif(btrim(coalesce(p_paid_reference, '')), '') else paid_reference end,
    review_notes = nullif(btrim(coalesce(p_review_notes, '')), ''),
    updated_at = v_now
  where id = v_payout.id;

  if p_status = 'paid' then
    select *
    into v_wallet
    from public.wallets
    where id = v_payout.wallet_id
    for update;

    if v_wallet.id is null then
      return jsonb_build_object('success', false, 'error', 'wallet_not_found');
    end if;

    if coalesce(v_wallet.available_balance, 0) < v_payout.amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_wallet_balance');
    end if;

    insert into public.wallet_ledger (
      wallet_id,
      user_id,
      payout_id,
      entry_type,
      balance_type,
      direction,
      amount,
      description,
      metadata
    ) values (
      v_payout.wallet_id,
      v_payout.traveler_user_id,
      v_payout.id,
      'payout_paid_debit',
      'available',
      'debit',
      v_payout.amount,
      'Retiro pagado al usuario',
      jsonb_build_object(
        'source', 'admin_payout_review',
        'paid_reference', nullif(btrim(coalesce(p_paid_reference, '')), ''),
        'admin_id', p_admin_id
      )
    )
    on conflict do nothing
    returning id into v_ledger_id;

    if v_ledger_id is not null then
      update public.wallets
      set
        available_balance = greatest(coalesce(available_balance, 0) - v_payout.amount, 0),
        total_withdrawn = coalesce(total_withdrawn, 0) + v_payout.amount,
        updated_at = v_now
      where id = v_wallet.id;
    end if;
  end if;

  insert into public.app_audit_logs (actor_id, event_type, entity_type, entity_id, metadata)
  values (
    p_admin_id,
    'payout_status_updated',
    'payout',
    v_payout.id,
    jsonb_build_object(
      'previous_status', v_payout.status,
      'new_status', p_status,
      'amount', v_payout.amount,
      'paid_reference', nullif(btrim(coalesce(p_paid_reference, '')), '')
    )
  );

  return jsonb_build_object('success', true, 'payout_id', v_payout.id, 'status', p_status);
end;
$function$;

revoke execute on function public.request_payout(numeric, uuid, text) from public, anon;
grant execute on function public.request_payout(numeric, uuid, text) to authenticated;

revoke execute on function public.admin_update_payout_status(uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_update_payout_status(uuid, text, text, text, uuid) to service_role;

commit;
