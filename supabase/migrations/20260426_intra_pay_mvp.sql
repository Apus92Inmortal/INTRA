begin;
create table if not exists public.fee_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_fee_percent numeric not null default 0,
  customer_fee_fixed_cop numeric not null default 0,
  gateway_fee_percent numeric not null default 0,
  gateway_fee_fixed_cop numeric not null default 0,
  min_shipment_amount_cop numeric not null default 20000,
  minimum_payout_cop numeric not null default 10000,
  dispute_window_hours integer not null default 24,
  dispute_sla_hours integer not null default 72,
  auto_release_hours integer not null default 48,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fee_configs_name_key unique (name),
  constraint fee_configs_non_negative_check check (
    customer_fee_percent >= 0
    and customer_fee_fixed_cop >= 0
    and gateway_fee_percent >= 0
    and gateway_fee_fixed_cop >= 0
    and min_shipment_amount_cop >= 0
    and minimum_payout_cop >= 0
    and dispute_window_hours > 0
    and dispute_sla_hours > 0
    and auto_release_hours > 0
  )
);
insert into public.fee_configs (
  name,
  customer_fee_percent,
  customer_fee_fixed_cop,
  gateway_fee_percent,
  gateway_fee_fixed_cop,
  min_shipment_amount_cop,
  minimum_payout_cop,
  dispute_window_hours,
  dispute_sla_hours,
  auto_release_hours,
  is_active
)
select
  'INTRA Pay MVP',
  8,
  0,
  2.9,
  900,
  20000,
  10000,
  24,
  72,
  48,
  true
where not exists (
  select 1
  from public.fee_configs
  where is_active = true
);
alter table public.matches
  drop constraint if exists matches_status_check;
alter table public.matches
  add column if not exists disputed_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_notes text;
alter table public.matches
  add constraint matches_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'accepted'::text,
        'rejected'::text,
        'cancelled'::text,
        'completed'::text,
        'disputed'::text,
        'resolved'::text
      ]
    )
  );
alter table public.payments
  drop constraint if exists payments_status_check;
alter table public.payments
  add column if not exists gateway_provider text not null default 'bold_mvp',
  add column if not exists gateway_transaction_id text,
  add column if not exists gateway_status text,
  add column if not exists currency text not null default 'COP',
  add column if not exists gross_amount numeric,
  add column if not exists traveler_amount numeric,
  add column if not exists intra_fee numeric not null default 0,
  add column if not exists gateway_fee_estimated numeric not null default 0,
  add column if not exists gateway_fee_actual numeric,
  add column if not exists net_amount_received numeric,
  add column if not exists dispute_status text not null default 'none',
  add column if not exists dispute_reason text,
  add column if not exists delivered_at timestamptz,
  add column if not exists dispute_opened_at timestamptz,
  add column if not exists dispute_deadline_at timestamptz,
  add column if not exists dispute_resolved_at timestamptz,
  add column if not exists auto_release_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists released_by text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
update public.payments
set
  gross_amount = coalesce(gross_amount, amount),
  traveler_amount = coalesce(traveler_amount, amount),
  net_amount_received = coalesce(
    net_amount_received,
    greatest(amount - coalesce(gateway_fee_actual, gateway_fee_estimated, 0), 0)
  )
where true;
alter table public.payments
  add constraint payments_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'held'::text,
        'released'::text,
        'refunded'::text,
        'failed'::text,
        'cancelled'::text
      ]
    )
  );
alter table public.payments
  drop constraint if exists payments_dispute_status_check;
alter table public.payments
  add constraint payments_dispute_status_check
  check (dispute_status = any (array['none'::text, 'open'::text, 'resolved'::text]));
create unique index if not exists payments_gateway_transaction_id_idx
  on public.payments (gateway_transaction_id)
  where gateway_transaction_id is not null;
create index if not exists payments_match_id_idx on public.payments (match_id);
create index if not exists payments_auto_release_idx on public.payments (auto_release_at)
  where status = 'held' and dispute_status = 'none';
create index if not exists payments_dispute_status_idx on public.payments (dispute_status);
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  available_balance numeric not null default 0,
  pending_balance numeric not null default 0,
  total_earned numeric not null default 0,
  total_withdrawn numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.traveler_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  traveler_user_id uuid not null references public.profiles(id) on delete cascade,
  account_holder_name text,
  document_number text,
  bank_name text,
  account_type text,
  account_number text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint traveler_payout_accounts_type_check check (
    account_type is null
    or account_type = any (array['ahorros'::text, 'corriente'::text, 'nequi'::text, 'daviplata'::text])
  )
);
create unique index if not exists traveler_payout_accounts_default_idx
  on public.traveler_payout_accounts (traveler_user_id)
  where is_default = true;
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  traveler_user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  payout_account_id uuid references public.traveler_payout_accounts(id) on delete set null,
  amount numeric not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  paid_at timestamptz,
  review_notes text,
  paid_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payouts_amount_positive_check check (amount > 0),
  constraint payouts_status_check check (
    status = any (array['pending'::text, 'approved'::text, 'rejected'::text, 'paid'::text])
  )
);
create index if not exists payouts_traveler_status_idx on public.payouts (traveler_user_id, status);
create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  payout_id uuid references public.payouts(id) on delete set null,
  entry_type text not null,
  balance_type text not null,
  direction text not null,
  amount numeric not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint wallet_ledger_amount_positive_check check (amount > 0),
  constraint wallet_ledger_balance_type_check check (
    balance_type = any (array['available'::text, 'pending'::text])
  ),
  constraint wallet_ledger_direction_check check (
    direction = any (array['credit'::text, 'debit'::text])
  )
);
create index if not exists wallet_ledger_user_created_idx on public.wallet_ledger (user_id, created_at desc);
create index if not exists wallet_ledger_payment_idx on public.wallet_ledger (payment_id);
create index if not exists wallet_ledger_match_idx on public.wallet_ledger (match_id);
create unique index if not exists wallet_ledger_payment_hold_once_idx
  on public.wallet_ledger (payment_id, entry_type)
  where entry_type = 'payment_hold';
create unique index if not exists wallet_ledger_release_pending_once_idx
  on public.wallet_ledger (payment_id, entry_type)
  where entry_type = 'release_pending_debit';
create unique index if not exists wallet_ledger_release_available_once_idx
  on public.wallet_ledger (payment_id, entry_type)
  where entry_type = 'release_available_credit';
create unique index if not exists wallet_ledger_refund_pending_once_idx
  on public.wallet_ledger (payment_id, entry_type)
  where entry_type = 'refund_pending_debit';
create unique index if not exists wallet_ledger_refund_available_once_idx
  on public.wallet_ledger (payment_id, entry_type)
  where entry_type = 'refund_available_debit';
create table if not exists public.reconciliation_logs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete set null,
  gateway_transaction_id text,
  expected_net_amount numeric,
  actual_net_amount numeric,
  status text not null default 'pending',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reconciliation_logs_status_check check (
    status = any (array['pending'::text, 'matched'::text, 'mismatch'::text, 'resolved'::text])
  )
);
create table if not exists public.bold_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text,
  gateway_transaction_id text,
  external_reference text,
  payload jsonb not null default '{}'::jsonb,
  headers jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create or replace function public.ensure_wallet(p_user_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_wallet public.wallets;
begin
  insert into public.wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do update
    set updated_at = now()
  returning * into v_wallet;

  if v_wallet.id is null then
    select *
    into v_wallet
    from public.wallets
    where user_id = p_user_id;
  end if;

  return v_wallet;
end;
$function$;
create or replace function public.sync_wallet_balance(p_user_id uuid)
returns public.wallets
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_wallet public.wallets;
  v_available numeric := 0;
  v_pending numeric := 0;
  v_total_earned numeric := 0;
  v_total_withdrawn numeric := 0;
begin
  v_wallet := public.ensure_wallet(p_user_id);

  select
    coalesce(sum(case when balance_type = 'available' and direction = 'credit' then amount when balance_type = 'available' and direction = 'debit' then -amount else 0 end), 0),
    coalesce(sum(case when balance_type = 'pending' and direction = 'credit' then amount when balance_type = 'pending' and direction = 'debit' then -amount else 0 end), 0),
    coalesce(sum(case when entry_type = 'release_available_credit' then amount else 0 end), 0),
    coalesce(sum(case when entry_type = 'payout_paid_debit' then amount else 0 end), 0)
  into v_available, v_pending, v_total_earned, v_total_withdrawn
  from public.wallet_ledger
  where user_id = p_user_id;

  update public.wallets
  set
    available_balance = coalesce(v_available, 0),
    pending_balance = coalesce(v_pending, 0),
    total_earned = coalesce(v_total_earned, 0),
    total_withdrawn = coalesce(v_total_withdrawn, 0),
    updated_at = now()
  where user_id = p_user_id
  returning * into v_wallet;

  return v_wallet;
end;
$function$;
create or replace function public.add_wallet_ledger_entry(
  p_user_id uuid,
  p_payment_id uuid,
  p_match_id uuid,
  p_payout_id uuid,
  p_entry_type text,
  p_balance_type text,
  p_direction text,
  p_amount numeric,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_ledger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_wallet public.wallets;
  v_entry public.wallet_ledger;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'insufficient_balance';
  end if;

  v_wallet := public.ensure_wallet(p_user_id);

  insert into public.wallet_ledger (
    wallet_id,
    user_id,
    payment_id,
    match_id,
    payout_id,
    entry_type,
    balance_type,
    direction,
    amount,
    description,
    metadata
  )
  values (
    v_wallet.id,
    p_user_id,
    p_payment_id,
    p_match_id,
    p_payout_id,
    p_entry_type,
    p_balance_type,
    p_direction,
    p_amount,
    p_description,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_entry;

  perform public.sync_wallet_balance(p_user_id);

  return v_entry;
end;
$function$;
create or replace function public.calculate_payment_amount(p_base_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_config public.fee_configs;
  v_gateway_percent_factor numeric := 0;
  v_intra_fee numeric := 0;
  v_total numeric := 0;
  v_gateway_fee numeric := 0;
  v_net numeric := 0;
begin
  select *
  into v_config
  from public.fee_configs
  where is_active = true
  order by updated_at desc, created_at desc
  limit 1;

  if v_config.id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'fee_config_not_found'
    );
  end if;

  if p_base_amount is null or p_base_amount <= 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'below_minimum',
      'minimum_amount', v_config.min_shipment_amount_cop
    );
  end if;

  if p_base_amount < v_config.min_shipment_amount_cop then
    return jsonb_build_object(
      'success', false,
      'error', 'below_minimum',
      'minimum_amount', v_config.min_shipment_amount_cop
    );
  end if;

  v_intra_fee := ceil((p_base_amount * v_config.customer_fee_percent / 100) + v_config.customer_fee_fixed_cop);
  v_gateway_percent_factor := coalesce(v_config.gateway_fee_percent, 0) / 100;

  if v_gateway_percent_factor >= 1 then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_gateway_fee_config'
    );
  end if;

  v_total := ceil(
    (p_base_amount + v_intra_fee + coalesce(v_config.gateway_fee_fixed_cop, 0))
    / (1 - v_gateway_percent_factor)
  );

  v_gateway_fee := greatest(v_total - p_base_amount - v_intra_fee, 0);
  v_net := greatest(v_total - v_gateway_fee, 0);

  return jsonb_build_object(
    'success', true,
    'traveler_amount', p_base_amount,
    'gross_amount', v_total,
    'amount', v_total,
    'gateway_fee_estimated', v_gateway_fee,
    'intra_fee', v_intra_fee,
    'net_amount_received', v_net,
    'minimum_amount', v_config.min_shipment_amount_cop,
    'minimum_payout', v_config.minimum_payout_cop,
    'dispute_window_hours', v_config.dispute_window_hours,
    'dispute_sla_hours', v_config.dispute_sla_hours,
    'auto_release_hours', v_config.auto_release_hours,
    'currency', 'COP'
  );
end;
$function$;
create or replace function public.attach_payment_hold_to_match(
  p_match_id uuid,
  p_shipment_id uuid,
  p_traveler_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payment public.payments;
  v_amount numeric := 0;
begin
  select *
  into v_payment
  from public.payments
  where shipment_id = p_shipment_id
    and status = any (array['held'::text, 'pending'::text, 'processing'::text])
  order by created_at desc
  limit 1
  for update;

  if v_payment.id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'no_active_payment'
    );
  end if;

  v_amount := coalesce(v_payment.traveler_amount, v_payment.gross_amount, v_payment.amount);

  update public.payments
  set
    match_id = p_match_id,
    status = case when status in ('pending', 'processing') then 'held' else status end,
    traveler_amount = coalesce(traveler_amount, v_amount),
    gross_amount = coalesce(gross_amount, amount),
    net_amount_received = coalesce(net_amount_received, greatest(coalesce(gross_amount, amount) - coalesce(gateway_fee_actual, gateway_fee_estimated, 0), 0)),
    updated_at = now()
  where id = v_payment.id;

  perform public.ensure_wallet(p_traveler_user_id);

  if not exists (
    select 1
    from public.wallet_ledger wl
    where wl.payment_id = v_payment.id
      and wl.entry_type = 'payment_hold'
  ) then
    perform public.add_wallet_ledger_entry(
      p_traveler_user_id,
      v_payment.id,
      p_match_id,
      null,
      'payment_hold',
      'pending',
      'credit',
      v_amount,
      'Retención temporal del pago asociada al match',
      jsonb_build_object('source', 'accept_match')
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id
  );
end;
$function$;
create or replace function public.release_payment(
  p_payment_id uuid,
  p_reason text default 'delivery_completed'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments;
  v_traveler_user_id uuid;
  v_owner_id uuid;
  v_amount numeric := 0;
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if v_payment.id is null then
    return jsonb_build_object('success', false, 'error', 'payment_not_found');
  end if;

  select t.traveler_id, s.owner_id
  into v_traveler_user_id, v_owner_id
  from public.matches m
  join public.trips t on t.id = m.trip_id
  join public.shipments s on s.id = m.shipment_id
  where m.id = v_payment.match_id;

  if v_actor is not null and v_actor <> v_owner_id then
    raise exception 'No autorizado';
  end if;

  if v_payment.status <> 'held' then
    return jsonb_build_object('success', false, 'error', 'payment_not_held');
  end if;

  if v_payment.dispute_status = 'open' then
    return jsonb_build_object('success', false, 'error', 'match_in_dispute');
  end if;

  if v_traveler_user_id is null then
    return jsonb_build_object('success', false, 'error', 'wallet_not_found');
  end if;

  v_amount := coalesce(v_payment.traveler_amount, v_payment.amount);

  if not exists (
    select 1 from public.wallet_ledger
    where payment_id = v_payment.id
      and entry_type = 'release_pending_debit'
  ) then
    perform public.add_wallet_ledger_entry(
      v_traveler_user_id,
      v_payment.id,
      v_payment.match_id,
      null,
      'release_pending_debit',
      'pending',
      'debit',
      v_amount,
      'Liberación de retención temporal',
      jsonb_build_object('reason', p_reason)
    );
  end if;

  if not exists (
    select 1 from public.wallet_ledger
    where payment_id = v_payment.id
      and entry_type = 'release_available_credit'
  ) then
    perform public.add_wallet_ledger_entry(
      v_traveler_user_id,
      v_payment.id,
      v_payment.match_id,
      null,
      'release_available_credit',
      'available',
      'credit',
      v_amount,
      'Saldo disponible por entrega completada',
      jsonb_build_object('reason', p_reason)
    );
  end if;

  update public.payments
  set
    status = 'released',
    released_at = now(),
    released_by = p_reason,
    dispute_status = case when dispute_status = 'open' then 'resolved' else dispute_status end,
    updated_at = now()
  where id = v_payment.id;

  perform public.sync_wallet_balance(v_traveler_user_id);

  return jsonb_build_object('success', true, 'payment_id', v_payment.id);
end;
$function$;
create or replace function public.refund_payment(
  p_payment_id uuid,
  p_reason text default 'cancelled'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments;
  v_traveler_user_id uuid;
  v_owner_id uuid;
  v_amount numeric := 0;
begin
  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if v_payment.id is null then
    return jsonb_build_object('success', false, 'error', 'payment_not_found');
  end if;

  select t.traveler_id, s.owner_id
  into v_traveler_user_id, v_owner_id
  from public.matches m
  join public.trips t on t.id = m.trip_id
  join public.shipments s on s.id = m.shipment_id
  where m.id = v_payment.match_id;

  if v_actor is not null and v_actor <> v_owner_id and v_actor <> v_traveler_user_id then
    raise exception 'No autorizado';
  end if;

  if v_payment.status = 'refunded' then
    return jsonb_build_object('success', false, 'error', 'already_processed');
  end if;

  v_amount := coalesce(v_payment.traveler_amount, v_payment.amount);

  if v_traveler_user_id is not null then
    if exists (
      select 1 from public.wallet_ledger
      where payment_id = v_payment.id
        and entry_type = 'payment_hold'
    ) and not exists (
      select 1 from public.wallet_ledger
      where payment_id = v_payment.id
        and entry_type = 'refund_pending_debit'
    ) then
      perform public.add_wallet_ledger_entry(
        v_traveler_user_id,
        v_payment.id,
        v_payment.match_id,
        null,
        'refund_pending_debit',
        'pending',
        'debit',
        v_amount,
        'Reverso de retención temporal por reembolso',
        jsonb_build_object('reason', p_reason)
      );
    end if;

    if exists (
      select 1 from public.wallet_ledger
      where payment_id = v_payment.id
        and entry_type = 'release_available_credit'
    ) and not exists (
      select 1 from public.wallet_ledger
      where payment_id = v_payment.id
        and entry_type = 'refund_available_debit'
    ) then
      perform public.add_wallet_ledger_entry(
        v_traveler_user_id,
        v_payment.id,
        v_payment.match_id,
        null,
        'refund_available_debit',
        'available',
        'debit',
        v_amount,
        'Ajuste por reembolso del cliente',
        jsonb_build_object('reason', p_reason)
      );
    end if;

    perform public.sync_wallet_balance(v_traveler_user_id);
  end if;

  update public.payments
  set
    status = 'refunded',
    refunded_at = now(),
    dispute_status = case when dispute_status = 'open' then 'resolved' else dispute_status end,
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('refund_reason', p_reason)
  where id = v_payment.id;

  return jsonb_build_object('success', true, 'payment_id', v_payment.id);
end;
$function$;
create or replace function public.process_bold_webhook(
  p_gateway_transaction_id text,
  p_status text,
  p_external_reference text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payment public.payments;
  v_normalized_status text;
begin
  v_normalized_status := lower(coalesce(p_status, ''));

  select *
  into v_payment
  from public.payments
  where (
    gateway_transaction_id = p_gateway_transaction_id
    or (p_external_reference is not null and external_reference = p_external_reference)
  )
  order by created_at desc
  limit 1
  for update;

  if v_payment.id is null then
    return jsonb_build_object('success', false, 'error', 'payment_not_found');
  end if;

  update public.payments
  set
    gateway_transaction_id = coalesce(p_gateway_transaction_id, gateway_transaction_id),
    gateway_status = p_status,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_bold_webhook', coalesce(p_payload, '{}'::jsonb))
  where id = v_payment.id;

  if v_normalized_status in ('approved', 'paid', 'succeeded', 'success') then
    update public.payments
    set status = case when status = 'pending' then 'held' else status end,
        updated_at = now()
    where id = v_payment.id;
  elsif v_normalized_status in ('failed', 'rejected', 'declined') then
    update public.payments
    set status = 'failed',
        updated_at = now()
    where id = v_payment.id;
  elsif v_normalized_status in ('cancelled', 'canceled', 'voided') then
    update public.payments
    set status = 'cancelled',
        updated_at = now()
    where id = v_payment.id;
  end if;

  return jsonb_build_object('success', true, 'payment_id', v_payment.id);
end;
$function$;
create or replace function public.open_dispute(
  p_match_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments;
  v_payment_id uuid;
  v_owner_id uuid;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  select p.id
  into v_payment_id
  from public.payments p
  where p.match_id = p_match_id
  order by p.created_at desc
  limit 1;

  if v_payment_id is null then
    return jsonb_build_object('success', false, 'error', 'payment_not_found');
  end if;

  select *
  into v_payment
  from public.payments
  where id = v_payment_id
  for update;

  select s.owner_id
  into v_owner_id
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  where m.id = p_match_id;

  if v_actor <> v_owner_id then
    raise exception 'No autorizado: solo el cliente puede abrir disputa';
  end if;

  if v_payment.status <> 'held' then
    return jsonb_build_object('success', false, 'error', 'payment_not_held');
  end if;

  if v_payment.dispute_status = 'open' then
    return jsonb_build_object('success', false, 'error', 'match_in_dispute');
  end if;

  if v_payment.dispute_deadline_at is null or now() > v_payment.dispute_deadline_at then
    return jsonb_build_object('success', false, 'error', 'dispute_window_expired');
  end if;

  update public.matches
  set
    status = 'disputed',
    disputed_at = now(),
    resolution_notes = null,
    resolved_at = null
  where id = p_match_id;

  update public.payments
  set
    dispute_status = 'open',
    dispute_reason = coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'Disputa abierta desde la app'),
    dispute_opened_at = now(),
    updated_at = now()
  where id = v_payment.id;

  return jsonb_build_object('success', true, 'payment_id', v_payment.id);
end;
$function$;
create or replace function public.auto_release_due_payments(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row record;
  v_result jsonb;
  v_count integer := 0;
begin
  for v_row in
    select id
    from public.payments
    where status = 'held'
      and dispute_status = 'none'
      and auto_release_at is not null
      and auto_release_at <= now()
    order by auto_release_at asc
    limit greatest(coalesce(p_limit, 100), 1)
  loop
    v_result := public.release_payment(v_row.id, 'auto_release');
    if coalesce((v_result ->> 'success')::boolean, false) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$function$;
create or replace function public.accept_match(p_match_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_trip_id uuid;
  v_shipment_id uuid;
  v_owner_id uuid;
  v_traveler_id uuid;
  v_capacity numeric;
  v_used_kg numeric;
  v_new_kg numeric;
  v_hold_result jsonb;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  select m.trip_id, m.shipment_id
  into v_trip_id, v_shipment_id
  from public.matches m
  where m.id = p_match_id
  for update;

  if v_trip_id is null then
    raise exception 'Match no existe';
  end if;

  select s.owner_id
  into v_owner_id
  from public.shipments s
  where s.id = v_shipment_id;

  if v_owner_id is null then
    raise exception 'Shipment no existe';
  end if;

  if v_actor <> v_owner_id then
    raise exception 'No autorizado (solo el cliente puede aceptar)';
  end if;

  select t.capacity_kg, t.traveler_id
  into v_capacity, v_traveler_id
  from public.trips t
  where t.id = v_trip_id
  for update;

  if v_traveler_id is null then
    raise exception 'Trip no existe o no tiene traveler';
  end if;

  select coalesce(s.weight_kg, 0)
  into v_new_kg
  from public.shipments s
  where s.id = v_shipment_id;

  select coalesce(sum(coalesce(s2.weight_kg, 0)), 0)
  into v_used_kg
  from public.matches m2
  join public.shipments s2 on s2.id = m2.shipment_id
  where m2.trip_id = v_trip_id
    and m2.status = 'accepted';

  if v_capacity is not null and (v_used_kg + v_new_kg) > v_capacity then
    raise exception 'Capacidad insuficiente: usado=%, nuevo=%, capacidad=%',
      v_used_kg, v_new_kg, v_capacity;
  end if;

  update public.matches
  set status = 'accepted'
  where id = p_match_id
    and status = 'pending';

  if not found then
    raise exception 'Match no estaba en pending (ya fue procesado)';
  end if;

  update public.shipments
  set status = 'matched'
  where id = v_shipment_id
    and status = 'open';

  if not found then
    raise exception 'El shipment no estaba en open';
  end if;

  if v_capacity is null then
    update public.trips
    set status = 'open'
    where id = v_trip_id
      and status <> 'cancelled';
  else
    if (v_used_kg + v_new_kg) >= v_capacity then
      update public.trips
      set status = 'full'
      where id = v_trip_id
        and status <> 'cancelled';
    else
      update public.trips
      set status = 'open'
      where id = v_trip_id
        and status <> 'cancelled';
    end if;
  end if;

  v_hold_result := public.attach_payment_hold_to_match(
    p_match_id,
    v_shipment_id,
    v_traveler_id
  );

  if coalesce((v_hold_result ->> 'success')::boolean, false) = false then
    raise exception '%', coalesce(v_hold_result ->> 'error', 'no_active_payment');
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id
  )
  select
    v_traveler_id,
    'match_accepted',
    'Tu solicitud fue aceptada',
    'El cliente aceptó tu solicitud de transporte.',
    p_match_id
  where not exists (
    select 1
    from public.notifications n
    where n.user_id = v_traveler_id
      and n.type = 'match_accepted'
      and n.related_match_id = p_match_id
  );
end;
$function$;
create or replace function public.confirm_shipment_delivery(p_shipment_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_match_id uuid;
  v_owner_id uuid;
  v_payment public.payments;
  v_config public.fee_configs;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  select m.id, s.owner_id
  into v_match_id, v_owner_id
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  where m.shipment_id = p_shipment_id
    and m.status = 'accepted'
  limit 1;

  if v_match_id is null then
    raise exception 'No existe un match accepted para este shipment';
  end if;

  if v_owner_id is null then
    raise exception 'No se encontró el owner del shipment';
  end if;

  if v_actor <> v_owner_id then
    raise exception 'No autorizado: solo el cliente puede confirmar la entrega';
  end if;

  select *
  into v_payment
  from public.payments
  where shipment_id = p_shipment_id
  order by created_at desc
  limit 1
  for update;

  if v_payment.id is null then
    raise exception 'payment_not_found';
  end if;

  if v_payment.status <> 'held' then
    raise exception 'payment_not_held';
  end if;

  select *
  into v_config
  from public.fee_configs
  where is_active = true
  order by updated_at desc, created_at desc
  limit 1;

  update public.shipments
  set status = 'delivered'
  where id = p_shipment_id
    and status = 'in_transit';

  if not found then
    raise exception 'El shipment no estaba en in_transit';
  end if;

  update public.matches
  set status = 'completed'
  where id = v_match_id
    and status = 'accepted';

  update public.payments
  set
    delivered_at = now(),
    dispute_deadline_at = now() + make_interval(hours => coalesce(v_config.dispute_window_hours, 24)),
    auto_release_at = now() + make_interval(hours => coalesce(v_config.auto_release_hours, 48)),
    updated_at = now()
  where id = v_payment.id;
end;
$function$;
create or replace function public.mark_shipment_in_transit(p_shipment_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_match_id uuid;
  v_trip_id uuid;
  v_traveler_id uuid;
  v_payment_id uuid;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  select m.id, m.trip_id
  into v_match_id, v_trip_id
  from public.matches m
  where m.shipment_id = p_shipment_id
    and m.status = 'accepted'
  limit 1;

  if v_match_id is null then
    raise exception 'No existe un match accepted para este shipment';
  end if;

  select t.traveler_id
  into v_traveler_id
  from public.trips t
  where t.id = v_trip_id;

  if v_traveler_id is null then
    raise exception 'No se encontró el viajero del trip';
  end if;

  if v_actor <> v_traveler_id then
    raise exception 'No autorizado: solo el viajero puede marcar en tránsito';
  end if;

  select p.id
  into v_payment_id
  from public.payments p
  where p.shipment_id = p_shipment_id
    and p.status = 'held'
  order by p.created_at desc
  limit 1;

  if v_payment_id is null then
    raise exception 'payment_not_held';
  end if;

  update public.shipments
  set status = 'in_transit'
  where id = p_shipment_id
    and status = 'matched';

  if not found then
    raise exception 'El shipment no estaba en matched';
  end if;
end;
$function$;
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.traveler_payout_accounts enable row level security;
alter table public.payouts enable row level security;
alter table public.fee_configs enable row level security;
alter table public.reconciliation_logs enable row level security;
alter table public.bold_webhook_events enable row level security;
drop policy if exists wallets_select_own on public.wallets;
create policy wallets_select_own on public.wallets
  for select to authenticated
  using (user_id = auth.uid());
drop policy if exists wallet_ledger_select_own on public.wallet_ledger;
create policy wallet_ledger_select_own on public.wallet_ledger
  for select to authenticated
  using (user_id = auth.uid());
drop policy if exists traveler_payout_accounts_select_own on public.traveler_payout_accounts;
create policy traveler_payout_accounts_select_own on public.traveler_payout_accounts
  for select to authenticated
  using (traveler_user_id = auth.uid());
drop policy if exists traveler_payout_accounts_insert_own on public.traveler_payout_accounts;
create policy traveler_payout_accounts_insert_own on public.traveler_payout_accounts
  for insert to authenticated
  with check (traveler_user_id = auth.uid());
drop policy if exists traveler_payout_accounts_update_own on public.traveler_payout_accounts;
create policy traveler_payout_accounts_update_own on public.traveler_payout_accounts
  for update to authenticated
  using (traveler_user_id = auth.uid())
  with check (traveler_user_id = auth.uid());
drop policy if exists payouts_select_own on public.payouts;
create policy payouts_select_own on public.payouts
  for select to authenticated
  using (traveler_user_id = auth.uid());
drop policy if exists payouts_insert_own on public.payouts;
create policy payouts_insert_own on public.payouts
  for insert to authenticated
  with check (traveler_user_id = auth.uid());
drop policy if exists fee_configs_read_all on public.fee_configs;
create policy fee_configs_read_all on public.fee_configs
  for select to anon, authenticated
  using (is_active = true);
revoke execute on function public.ensure_wallet(uuid) from public, anon, authenticated;
revoke execute on function public.sync_wallet_balance(uuid) from public, anon, authenticated;
revoke execute on function public.add_wallet_ledger_entry(uuid, uuid, uuid, uuid, text, text, text, numeric, text, jsonb) from public, anon, authenticated;
revoke execute on function public.attach_payment_hold_to_match(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.process_bold_webhook(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.auto_release_due_payments(integer) from public, anon, authenticated;
grant execute on function public.calculate_payment_amount(numeric) to anon, authenticated;
grant execute on function public.open_dispute(uuid, text) to authenticated;
grant execute on function public.release_payment(uuid, text) to authenticated;
grant execute on function public.refund_payment(uuid, text) to authenticated;
grant execute on function public.process_bold_webhook(text, text, text, jsonb) to service_role;
grant execute on function public.auto_release_due_payments(integer) to service_role;
commit;
