-- Isolated PostgreSQL fixture. Models the financial columns, constraints and
-- balance calculation used by A03. No production URL, gateway or external I/O.
create table public.profiles (id uuid primary key);
create table public.shipments (id uuid primary key, owner_id uuid not null references public.profiles, status text not null);
create table public.trips (id uuid primary key, traveler_id uuid not null references public.profiles);
create table public.matches (
  id uuid primary key, shipment_id uuid not null references public.shipments, trip_id uuid not null references public.trips,
  status text not null, resolved_at timestamptz, resolution_notes text
);
create table public.payments (
  id uuid primary key, shipment_id uuid references public.shipments, user_id uuid references public.profiles,
  match_id uuid references public.matches, amount numeric not null check (amount > 0), traveler_amount numeric,
  currency text not null default 'COP',
  gateway_fee_actual numeric, gateway_fee_estimated numeric not null default 0, gateway_status text,
  status text not null check (status in ('pending','processing','held','released','refunded','failed','cancelled')),
  refund_status text not null default 'none', dispute_status text not null default 'none',
  refund_reason text, refund_processed_at timestamptz, refunded_at timestamptz, refund_admin_id uuid references public.profiles,
  dispute_resolved_at timestamptz, updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);
create table public.wallets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles,
  available_balance numeric not null default 0, pending_balance numeric not null default 0,
  total_earned numeric not null default 0, total_withdrawn numeric not null default 0, updated_at timestamptz not null default now()
);
create table public.payouts (
  id uuid primary key default gen_random_uuid(), traveler_user_id uuid not null references public.profiles,
  amount numeric not null check (amount > 0), status text not null
);
create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(), wallet_id uuid not null references public.wallets,
  user_id uuid not null references public.profiles, payment_id uuid references public.payments,
  match_id uuid references public.matches, payout_id uuid references public.payouts,
  entry_type text not null, balance_type text not null check (balance_type in ('pending','available')),
  direction text not null check (direction in ('credit','debit')), amount numeric not null check (amount > 0),
  description text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create unique index on public.wallet_ledger (payment_id, entry_type)
  where entry_type in ('payment_hold','release_pending_debit','release_available_credit','refund_pending_debit','refund_available_debit');
create table public.shipment_report_events (
  id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments,
  status text not null, resolved_at timestamptz, metadata jsonb not null default '{}'
);
create table public.app_audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles,
  event_type text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'
);
-- Same calculation as the remote sync_wallet_balance inspected read-only.
create function public.sync_wallet_balance(p_user_id uuid) returns public.wallets
language plpgsql security definer set search_path = '' as $$
declare v_wallet public.wallets;
begin
  insert into public.wallets (user_id) values (p_user_id) on conflict (user_id) do update set updated_at = now();
  update public.wallets set
    available_balance = (select coalesce(sum(case when direction = 'credit' then amount else -amount end),0) from public.wallet_ledger where user_id=p_user_id and balance_type='available'),
    pending_balance = (select coalesce(sum(case when direction = 'credit' then amount else -amount end),0) from public.wallet_ledger where user_id=p_user_id and balance_type='pending'),
    total_earned = (select coalesce(sum(amount),0) from public.wallet_ledger where user_id=p_user_id and entry_type='release_available_credit'),
    total_withdrawn = (select coalesce(sum(amount),0) from public.wallet_ledger where user_id=p_user_id and entry_type='payout_paid_debit'),
    updated_at=now() where user_id=p_user_id returning * into v_wallet;
  return v_wallet;
end;
$$;
