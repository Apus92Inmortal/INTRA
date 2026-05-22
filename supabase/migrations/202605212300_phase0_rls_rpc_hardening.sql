begin;

-- Phase 0 RLS/RPC hardening:
-- - move read receipts, trip publishing, match requests, and payout requests behind RPCs
-- - remove broad legacy policies that allowed direct writes to sensitive tables
-- - keep selects scoped to contextual roles and ready public marketplace data

create or replace function public.is_match_participant(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.matches m
      join public.shipments s on s.id = m.shipment_id
      join public.trips t on t.id = m.trip_id
      where m.id = p_match_id
        and (
          s.owner_id = auth.uid()
          or t.traveler_id = auth.uid()
        )
    );
$function$;

create or replace function public.is_match_participant_for_shipment(p_shipment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.matches m
      join public.shipments s on s.id = m.shipment_id
      join public.trips t on t.id = m.trip_id
      where m.shipment_id = p_shipment_id
        and (
          s.owner_id = auth.uid()
          or t.traveler_id = auth.uid()
        )
    );
$function$;

create or replace function public.is_match_participant_for_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.matches m
      join public.shipments s on s.id = m.shipment_id
      join public.trips t on t.id = m.trip_id
      where m.trip_id = p_trip_id
        and (
          s.owner_id = auth.uid()
          or t.traveler_id = auth.uid()
        )
    );
$function$;

create or replace function public.is_shipment_payment_ready(p_shipment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.payments p
    where p.shipment_id = p_shipment_id
      and p.status = 'held'
      and lower(coalesce(p.gateway_status, '')) = 'approved'
      and coalesce(p.refund_status, 'none') = 'none'
      and coalesce(p.dispute_status, 'none') = 'none'
      and lower(coalesce(p.metadata ->> 'manual_refund_required', 'false')) <> 'true'
    order by p.created_at desc, p.updated_at desc, p.id desc
    limit 1
  );
$function$;

create or replace function public.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select auth.uid() is not null
    and (
      p_profile_id = auth.uid()
      or exists (
        select 1
        from public.matches m
        join public.shipments s on s.id = m.shipment_id
        join public.trips t on t.id = m.trip_id
        where
          (s.owner_id = auth.uid() and t.traveler_id = p_profile_id)
          or
          (t.traveler_id = auth.uid() and s.owner_id = p_profile_id)
      )
    );
$function$;

create or replace function public.can_view_shipment(p_shipment_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.shipments s
    where s.id = p_shipment_id
      and s.owner_id = auth.uid()
  )
  or public.is_match_participant_for_shipment(p_shipment_id)
  or exists (
    select 1
    from public.shipments s
    where s.id = p_shipment_id
      and s.status = 'open'
      and s.owner_id <> auth.uid()
      and public.is_shipment_payment_ready(s.id)
  );
$function$;

create or replace function public.get_payment_ready_shipments(p_shipment_ids uuid[])
returns table (shipment_id uuid)
language sql
security definer
set search_path to 'public'
as $function$
  select s.id
  from public.shipments s
  where s.id = any(coalesce(p_shipment_ids, '{}'::uuid[]))
    and public.can_view_shipment(s.id)
    and public.is_shipment_payment_ready(s.id);
$function$;

create or replace function public.mark_match_read(
  p_match_id uuid,
  p_read_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_traveler_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select s.owner_id, t.traveler_id
  into v_owner_id, v_traveler_id
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  join public.trips t on t.id = m.trip_id
  where m.id = p_match_id;

  if v_owner_id is null then
    return jsonb_build_object('success', false, 'error', 'match_not_found');
  end if;

  if v_actor = v_owner_id then
    update public.matches
    set last_read_by_owner = p_read_at
    where id = p_match_id;
  elsif v_actor = v_traveler_id then
    update public.matches
    set last_read_by_traveler = p_read_at
    where id = p_match_id;
  else
    return jsonb_build_object('success', false, 'error', 'not_authorized');
  end if;

  return jsonb_build_object('success', true, 'read_at', p_read_at);
end;
$function$;

create or replace function public.request_match(
  p_shipment_id uuid,
  p_trip_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_match_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_shipment_id is null or p_trip_id is null then
    return jsonb_build_object('success', false, 'error', 'match_route_required');
  end if;

  if not exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and t.traveler_id = v_actor
      and t.status in ('open', 'full')
  ) then
    return jsonb_build_object('success', false, 'error', 'trip_not_available');
  end if;

  if not exists (
    select 1
    from public.shipments s
    where s.id = p_shipment_id
      and s.owner_id <> v_actor
      and s.status = 'open'
      and public.is_shipment_payment_ready(s.id)
  ) then
    return jsonb_build_object('success', false, 'error', 'shipment_not_available');
  end if;

  insert into public.matches (
    shipment_id,
    trip_id,
    requester_id,
    status
  ) values (
    p_shipment_id,
    p_trip_id,
    v_actor,
    'pending'
  )
  returning id into v_match_id;

  return jsonb_build_object('success', true, 'match_id', v_match_id);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'match_already_requested');
end;
$function$;

create or replace function public.create_trip(
  p_origin_city_id uuid,
  p_destination_city_id uuid,
  p_departure_date date,
  p_departure_time time default null,
  p_capacity_kg numeric default null,
  p_flight_number text default null,
  p_accepts_fragile boolean default false,
  p_accepts_multiple_packages boolean default false,
  p_has_stopovers boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_trip_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_origin_city_id is null or p_destination_city_id is null then
    return jsonb_build_object('success', false, 'error', 'route_required');
  end if;

  if p_origin_city_id = p_destination_city_id then
    return jsonb_build_object('success', false, 'error', 'same_route');
  end if;

  if p_departure_date is null or p_departure_date < current_date then
    return jsonb_build_object('success', false, 'error', 'invalid_departure_date');
  end if;

  if p_capacity_kg is not null and p_capacity_kg <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_capacity');
  end if;

  insert into public.trips (
    traveler_id,
    origin_city_id,
    destination_city_id,
    departure_date,
    departure_time,
    capacity_kg,
    flight_number,
    accepts_fragile,
    accepts_multiple_packages,
    has_stopovers,
    status
  ) values (
    v_actor,
    p_origin_city_id,
    p_destination_city_id,
    p_departure_date,
    p_departure_time,
    p_capacity_kg,
    nullif(btrim(coalesce(p_flight_number, '')), ''),
    coalesce(p_accepts_fragile, false),
    coalesce(p_accepts_multiple_packages, false),
    coalesce(p_has_stopovers, false),
    'open'
  )
  returning id into v_trip_id;

  return jsonb_build_object('success', true, 'trip_id', v_trip_id);
end;
$function$;

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
  v_payout_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
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

  return jsonb_build_object('success', true, 'payout_id', v_payout_id);
end;
$function$;

alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.trips enable row level security;
alter table public.payouts enable row level security;

drop policy if exists "Matches are insertable by requester" on public.matches;
drop policy if exists "Matches are updatable by involved" on public.matches;
drop policy if exists "Matches are viewable by involved" on public.matches;
drop policy if exists "matches_insert_requester" on public.matches;
drop policy if exists "matches_update_participants" on public.matches;
drop policy if exists "matches_select_participants" on public.matches;

create policy matches_select_participants
on public.matches
for select
to authenticated
using (public.is_match_participant(id));

drop policy if exists "Users can insert messages in their matches" on public.messages;
drop policy if exists "Users can read messages of their matches" on public.messages;
drop policy if exists "messages_insert_accepted" on public.messages;
drop policy if exists "messages_insert_sender_participant" on public.messages;
drop policy if exists "messages_select_participants" on public.messages;

create policy messages_select_participants
on public.messages
for select
to authenticated
using (public.is_match_participant(match_id));

create policy messages_insert_accepted
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.matches m
    where m.id = messages.match_id
      and m.status = 'accepted'
      and public.is_match_participant(m.id)
  )
);

drop policy if exists "payments_insert_own" on public.payments;
drop policy if exists "payments_update_related_users" on public.payments;
drop policy if exists "payments_select_related_users" on public.payments;

create policy payments_select_related_users
on public.payments
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.shipments s
    where s.id = payments.shipment_id
      and s.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.matches m
    join public.trips t on t.id = m.trip_id
    where m.shipment_id = payments.shipment_id
      and t.traveler_id = auth.uid()
  )
);

drop policy if exists "Authenticated users can view open shipments" on public.shipments;
drop policy if exists "Shipments are insertable by owner" on public.shipments;
drop policy if exists "Shipments are updatable by owner" on public.shipments;
drop policy if exists "Shipments are viewable safely" on public.shipments;
drop policy if exists "Users can insert own shipments" on public.shipments;
drop policy if exists "Users can update own shipments" on public.shipments;
drop policy if exists "Users can view own shipments" on public.shipments;
drop policy if exists "shipments_delete_own" on public.shipments;
drop policy if exists "shipments_insert_own" on public.shipments;
drop policy if exists "shipments_select_contextual" on public.shipments;
drop policy if exists "shipments_select_open_or_own" on public.shipments;
drop policy if exists "shipments_update_own" on public.shipments;

create policy shipments_select_contextual
on public.shipments
for select
to authenticated
using (public.can_view_shipment(id));

drop policy if exists "Trips are insertable by traveler" on public.trips;
drop policy if exists "Trips are updatable by traveler" on public.trips;
drop policy if exists "Trips are viewable by traveler" on public.trips;
drop policy if exists "Trips open are viewable by authenticated" on public.trips;
drop policy if exists "trips_delete_own" on public.trips;
drop policy if exists "trips_insert_own" on public.trips;
drop policy if exists "trips_select_open_or_own" on public.trips;
drop policy if exists "trips_update_own" on public.trips;

create policy trips_select_open_or_own
on public.trips
for select
to authenticated
using (
  traveler_id = auth.uid()
  or status in ('open', 'full')
  or public.is_match_participant_for_trip(id)
);

drop policy if exists "payouts_insert_own" on public.payouts;
drop policy if exists "payouts_select_own" on public.payouts;

create policy payouts_select_own
on public.payouts
for select
to authenticated
using (traveler_user_id = auth.uid());

revoke execute on function public.mark_match_read(uuid, timestamptz) from public, anon;
revoke execute on function public.request_match(uuid, uuid) from public, anon;
revoke execute on function public.create_trip(uuid, uuid, date, time, numeric, text, boolean, boolean, boolean) from public, anon;
revoke execute on function public.request_payout(numeric, uuid, text) from public, anon;

grant execute on function public.mark_match_read(uuid, timestamptz) to authenticated;
grant execute on function public.request_match(uuid, uuid) to authenticated;
grant execute on function public.create_trip(uuid, uuid, date, time, numeric, text, boolean, boolean, boolean) to authenticated;
grant execute on function public.request_payout(numeric, uuid, text) to authenticated;
grant execute on function public.get_payment_ready_shipments(uuid[]) to authenticated;

commit;
