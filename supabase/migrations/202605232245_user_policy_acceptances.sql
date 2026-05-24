begin;

create table if not exists public.user_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  policy_key text not null,
  policy_version text not null,
  acceptance_flow text not null,
  accepted_at timestamptz not null default now(),
  user_agent text,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_policy_acceptances
  drop constraint if exists user_policy_acceptances_policy_key_check;
alter table public.user_policy_acceptances
  add constraint user_policy_acceptances_policy_key_check
  check (
    policy_key = any (
      array[
        'terms-conditions'::text,
        'privacy-policy'::text
      ]
    )
  );

alter table public.user_policy_acceptances enable row level security;

drop policy if exists user_policy_acceptances_select_own on public.user_policy_acceptances;
create policy user_policy_acceptances_select_own
  on public.user_policy_acceptances
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.user_policy_acceptances from anon, authenticated;
grant select on public.user_policy_acceptances to authenticated;
grant all on public.user_policy_acceptances to service_role;

create index if not exists user_policy_acceptances_user_policy_idx
  on public.user_policy_acceptances (user_id, policy_key, policy_version, accepted_at desc);

create index if not exists user_policy_acceptances_flow_idx
  on public.user_policy_acceptances (acceptance_flow, accepted_at desc);

create or replace function public.record_policy_acceptance(
  p_policy_key text,
  p_policy_version text,
  p_acceptance_flow text default 'manual',
  p_user_agent text default null,
  p_ip_address inet default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_policy_key is null or p_policy_key not in (
    'terms-conditions',
    'privacy-policy'
  ) then
    return jsonb_build_object('success', false, 'error', 'invalid_policy_key');
  end if;

  if nullif(btrim(coalesce(p_policy_version, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'invalid_policy_version');
  end if;

  insert into public.user_policy_acceptances (
    user_id,
    policy_key,
    policy_version,
    acceptance_flow,
    user_agent,
    ip_address,
    metadata
  )
  values (
    v_actor,
    p_policy_key,
    btrim(p_policy_version),
    coalesce(nullif(btrim(p_acceptance_flow), ''), 'manual'),
    nullif(btrim(coalesce(p_user_agent, '')), ''),
    p_ip_address,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object('success', true);
end;
$function$;

revoke execute on function public.record_policy_acceptance(text, text, text, text, inet, jsonb)
  from public, anon;
grant execute on function public.record_policy_acceptance(text, text, text, text, inet, jsonb)
  to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_policy_acceptances jsonb := coalesce(new.raw_user_meta_data -> 'policy_acceptances', '{}'::jsonb);
  v_full_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, v_full_name, v_phone)
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone);

  if coalesce(v_policy_acceptances #>> '{terms-conditions,accepted}', 'false') = 'true' then
    insert into public.user_policy_acceptances (
      user_id,
      policy_key,
      policy_version,
      acceptance_flow,
      metadata
    )
    values (
      new.id,
      'terms-conditions',
      coalesce(nullif(v_policy_acceptances #>> '{terms-conditions,version}', ''), '1.0'),
      coalesce(nullif(v_policy_acceptances #>> '{terms-conditions,flow}', ''), 'registration'),
      jsonb_build_object('source', 'signup_metadata')
    );
  end if;

  if coalesce(v_policy_acceptances #>> '{privacy-policy,accepted}', 'false') = 'true' then
    insert into public.user_policy_acceptances (
      user_id,
      policy_key,
      policy_version,
      acceptance_flow,
      metadata
    )
    values (
      new.id,
      'privacy-policy',
      coalesce(nullif(v_policy_acceptances #>> '{privacy-policy,version}', ''), '1.0'),
      coalesce(nullif(v_policy_acceptances #>> '{privacy-policy,flow}', ''), 'registration'),
      jsonb_build_object('source', 'signup_metadata')
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.shipment_declarations
  add column if not exists shipping_policy_version text,
  add column if not exists shipping_policy_accepted_at timestamptz,
  add column if not exists payment_policy_version text,
  add column if not exists payment_policy_accepted_at timestamptz;

alter table public.payouts
  add column if not exists payment_policy_version text,
  add column if not exists payment_policy_accepted_at timestamptz,
  add column if not exists payment_policy_acceptance_flow text,
  add column if not exists legal_metadata jsonb not null default '{}'::jsonb;

drop function if exists public.create_shipment_with_payment_draft(uuid, uuid, text, text, numeric, numeric, boolean, text, boolean, boolean, boolean, text, text, inet);

create or replace function public.create_shipment_with_payment_draft(
  p_origin_city_id uuid,
  p_destination_city_id uuid,
  p_kind text,
  p_description text,
  p_weight_kg numeric,
  p_declared_value_cop numeric,
  p_declaration_accepted boolean,
  p_declaration_version text default '1.0',
  p_is_fragile boolean default false,
  p_is_urgent boolean default false,
  p_is_high_value boolean default false,
  p_acceptance_flow text default 'shipment_checkout',
  p_user_agent text default null,
  p_ip_address inet default null,
  p_shipping_policy_version text default '1.0',
  p_payment_policy_accepted boolean default false,
  p_payment_policy_version text default '1.0'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_verification_status text := 'unverified';
  v_is_verified_v1 boolean := false;
  v_active_shipments integer := 0;
  v_shipments_last_7_days integer := 0;
  v_base_amount integer;
  v_customer_amount integer;
  v_quote jsonb;
  v_shipment_id uuid;
  v_payment_id uuid;
  v_tracking_code text;
  v_external_reference text;
  v_attempts integer := 0;
  v_declared_value_limit integer := 300000;
  v_accepted_at timestamptz := now();
  v_declaration_text text := 'Declaro que el contenido de este envío es lícito, corresponde a la información registrada y no contiene artículos prohibidos por la ley colombiana (armas, drogas, explosivos, dinero en efectivo, mercancía ilegal o falsificada, materiales peligrosos). Entiendo que mi identidad verificada queda asociada a este envío y que cualquier falsedad será mi responsabilidad exclusiva.';
begin
  if v_actor is null then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authenticated'
    );
  end if;

  if p_origin_city_id is null or p_destination_city_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'route_required'
    );
  end if;

  if p_origin_city_id = p_destination_city_id then
    return jsonb_build_object(
      'success', false,
      'error', 'same_route'
    );
  end if;

  if p_kind is null or p_kind not in ('document', 'package', 'ecommerce') then
    return jsonb_build_object(
      'success', false,
      'error', 'kind_not_allowed'
    );
  end if;

  if coalesce(length(btrim(p_description)), 0) < 8 then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_description'
    );
  end if;

  if p_weight_kg is null or p_weight_kg < 0.1 or p_weight_kg > 10 then
    return jsonb_build_object(
      'success', false,
      'error', case when p_weight_kg > 10 then 'weight_limit_exceeded' else 'invalid_weight' end,
      'weight_limit_kg', 10
    );
  end if;

  if p_declared_value_cop is null or p_declared_value_cop < 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_declared_value'
    );
  end if;

  if coalesce(p_declaration_accepted, false) = false then
    return jsonb_build_object(
      'success', false,
      'error', 'declaration_required'
    );
  end if;

  if coalesce(p_payment_policy_accepted, false) = false then
    return jsonb_build_object(
      'success', false,
      'error', 'payment_policy_required'
    );
  end if;

  if nullif(btrim(coalesce(p_shipping_policy_version, '')), '') is null then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_shipping_policy_version'
    );
  end if;

  if nullif(btrim(coalesce(p_payment_policy_version, '')), '') is null then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_payment_policy_version'
    );
  end if;

  select coalesce(uv.verification_status, 'unverified')
  into v_verification_status
  from public.user_verifications uv
  where uv.user_id = v_actor
  limit 1;

  v_is_verified_v1 := public.is_user_verified_v1(v_actor);

  if v_is_verified_v1 then
    v_declared_value_limit := 2000000;
  end if;

  if p_declared_value_cop > v_declared_value_limit then
    return jsonb_build_object(
      'success', false,
      'error', 'declared_value_limit_exceeded',
      'declared_value_limit_cop', v_declared_value_limit,
      'verification_status', v_verification_status,
      'verified_v1', v_is_verified_v1
    );
  end if;

  if not v_is_verified_v1 then
    select count(*)
    into v_active_shipments
    from public.shipments s
    where s.owner_id = v_actor
      and coalesce(s.status, 'open') not in ('delivered', 'cancelled');

    if v_active_shipments >= 1 then
      return jsonb_build_object(
        'success', false,
        'error', 'active_shipment_limit_exceeded',
        'active_shipment_limit', 1
      );
    end if;

    select count(*)
    into v_shipments_last_7_days
    from public.shipments s
    where s.owner_id = v_actor
      and s.created_at >= now() - interval '7 days';

    if v_shipments_last_7_days >= 5 then
      return jsonb_build_object(
        'success', false,
        'error', 'weekly_shipment_limit_exceeded',
        'weekly_shipment_limit', 5
      );
    end if;
  end if;

  select rp.base_price, rp.customer_price
  into v_base_amount, v_customer_amount
  from public.route_prices rp
  where rp.origin_city_id = p_origin_city_id
    and rp.destination_city_id = p_destination_city_id
    and rp.is_active = true
  order by rp.updated_at desc, rp.created_at desc
  limit 1;

  if v_base_amount is null or v_customer_amount is null then
    return jsonb_build_object(
      'success', false,
      'error', 'route_not_available'
    );
  end if;

  v_quote := public.calculate_payment_amount(v_base_amount, v_customer_amount);

  if coalesce((v_quote ->> 'success')::boolean, false) = false then
    return coalesce(v_quote, '{}'::jsonb) || jsonb_build_object(
      'success', false,
      'error', coalesce(v_quote ->> 'error', 'quote_error')
    );
  end if;

  loop
    v_attempts := v_attempts + 1;
    v_tracking_code := 'INTRA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    exit when not exists (
      select 1
      from public.shipments s
      where s.tracking_code = v_tracking_code
    );

    if v_attempts >= 10 then
      return jsonb_build_object(
        'success', false,
        'error', 'tracking_code_generation_failed'
      );
    end if;
  end loop;

  insert into public.shipments (
    owner_id,
    origin_city_id,
    destination_city_id,
    kind,
    description,
    weight_kg,
    declared_value_cop,
    is_fragile,
    is_urgent,
    is_high_value,
    status,
    tracking_code
  ) values (
    v_actor,
    p_origin_city_id,
    p_destination_city_id,
    p_kind,
    btrim(p_description),
    p_weight_kg,
    p_declared_value_cop,
    coalesce(p_is_fragile, false),
    coalesce(p_is_urgent, false),
    coalesce(p_is_high_value, false),
    'open',
    v_tracking_code
  )
  returning id into v_shipment_id;

  insert into public.shipment_declarations (
    shipment_id,
    user_id,
    declaration_text,
    declaration_version,
    accepted_at,
    acceptance_flow,
    user_agent,
    ip_address,
    shipping_policy_version,
    shipping_policy_accepted_at,
    payment_policy_version,
    payment_policy_accepted_at,
    metadata
  ) values (
    v_shipment_id,
    v_actor,
    v_declaration_text,
    coalesce(nullif(btrim(p_declaration_version), ''), '1.0'),
    v_accepted_at,
    coalesce(nullif(btrim(p_acceptance_flow), ''), 'shipment_checkout'),
    nullif(btrim(coalesce(p_user_agent, '')), ''),
    p_ip_address,
    btrim(p_shipping_policy_version),
    v_accepted_at,
    btrim(p_payment_policy_version),
    v_accepted_at,
    jsonb_build_object(
      'verified_v1', v_is_verified_v1,
      'verification_status', v_verification_status,
      'declared_value_limit_cop', v_declared_value_limit,
      'weight_limit_kg', 10,
      'payment_policy_accepted', true
    )
  );

  v_external_reference := 'intra-shipment-' || v_shipment_id::text || '-' || gen_random_uuid()::text;

  insert into public.payments (
    shipment_id,
    user_id,
    amount,
    gross_amount,
    traveler_amount,
    intra_fee,
    gateway_fee_estimated,
    net_amount_received,
    currency,
    status,
    gateway_provider,
    gateway_status,
    payment_method,
    external_reference,
    metadata
  ) values (
    v_shipment_id,
    v_actor,
    coalesce((v_quote ->> 'amount')::numeric, 0),
    coalesce((v_quote ->> 'gross_amount')::numeric, 0),
    coalesce((v_quote ->> 'traveler_amount')::numeric, 0),
    coalesce((v_quote ->> 'intra_fee')::numeric, 0),
    coalesce((v_quote ->> 'gateway_fee_estimated')::numeric, 0),
    coalesce((v_quote ->> 'net_amount_received')::numeric, 0),
    coalesce(v_quote ->> 'currency', 'COP'),
    'pending',
    'wompi',
    'created',
    'wompi_widget',
    v_external_reference,
    jsonb_build_object(
      'source', 'shipment_rpc',
      'auto_release_hours', coalesce((v_quote ->> 'auto_release_hours')::integer, 48),
      'dispute_window_hours', coalesce((v_quote ->> 'dispute_window_hours')::integer, 24),
      'declaration_version', coalesce(nullif(btrim(p_declaration_version), ''), '1.0'),
      'shipping_policy_version', btrim(p_shipping_policy_version),
      'payment_policy_version', btrim(p_payment_policy_version),
      'tracking_code', v_tracking_code,
      'is_fragile', coalesce(p_is_fragile, false),
      'is_urgent', coalesce(p_is_urgent, false),
      'is_high_value', coalesce(p_is_high_value, false),
      'verified_v1', v_is_verified_v1
    )
  )
  returning id into v_payment_id;

  return jsonb_build_object(
    'success', true,
    'shipment_id', v_shipment_id,
    'payment_id', v_payment_id,
    'tracking_code', v_tracking_code,
    'verification_status', v_verification_status,
    'verified_v1', v_is_verified_v1,
    'quote', v_quote
  );
exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', 'unexpected_error',
      'message', SQLERRM
    );
end;
$function$;

grant execute on function public.create_shipment_with_payment_draft(uuid, uuid, text, text, numeric, numeric, boolean, text, boolean, boolean, boolean, text, text, inet, text, boolean, text) to authenticated;

drop function if exists public.request_payout(numeric, uuid, text);

create or replace function public.request_payout(
  p_amount numeric,
  p_payout_account_id uuid default null,
  p_note text default null,
  p_payment_policy_accepted boolean default false,
  p_payment_policy_version text default '1.0',
  p_payment_policy_acceptance_flow text default 'wallet_payout_request'
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
  v_accepted_at timestamptz := now();
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  if coalesce(p_payment_policy_accepted, false) = false then
    return jsonb_build_object('success', false, 'error', 'payment_policy_required');
  end if;

  if nullif(btrim(coalesce(p_payment_policy_version, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'invalid_payment_policy_version');
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
    review_notes,
    payment_policy_version,
    payment_policy_accepted_at,
    payment_policy_acceptance_flow,
    legal_metadata
  ) values (
    v_actor,
    v_wallet.id,
    v_account.id,
    p_amount,
    nullif(btrim(coalesce(p_note, '')), ''),
    btrim(p_payment_policy_version),
    v_accepted_at,
    coalesce(nullif(btrim(p_payment_policy_acceptance_flow), ''), 'wallet_payout_request'),
    jsonb_build_object('payment_policy_accepted', true)
  )
  returning id into v_payout_id;

  insert into public.app_audit_logs (actor_id, event_type, entity_type, entity_id, metadata)
  values (
    v_actor,
    'payout_requested',
    'payout',
    v_payout_id,
    jsonb_build_object(
      'amount', p_amount,
      'wallet_id', v_wallet.id,
      'payout_account_id', v_account.id,
      'payment_policy_version', btrim(p_payment_policy_version)
    )
  );

  return jsonb_build_object('success', true, 'payout_id', v_payout_id);
end;
$function$;

revoke execute on function public.request_payout(numeric, uuid, text, boolean, text, text) from public, anon;
grant execute on function public.request_payout(numeric, uuid, text, boolean, text, text) to authenticated;

commit;
