begin;

create or replace function public.is_user_verified_v1(p_user_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.user_verifications uv
    join public.profiles p on p.id = uv.user_id
    join auth.users au on au.id = uv.user_id
    where uv.user_id = p_user_id
      and uv.verification_status = 'verified'
      and au.email_confirmed_at is not null
      and nullif(btrim(coalesce(p.phone, '')), '') is not null
  );
$function$;

revoke execute on function public.is_user_verified_v1(uuid) from public, anon, authenticated;
grant execute on function public.is_user_verified_v1(uuid) to service_role;

alter table public.shipment_declarations
  add column if not exists acceptance_flow text not null default 'shipment_checkout',
  add column if not exists user_agent text,
  add column if not exists ip_address inet,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

drop function if exists public.create_shipment_with_payment_draft(uuid, uuid, text, text, numeric, numeric, boolean, text, boolean, boolean, boolean);

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
  p_ip_address inet default null
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
    metadata
  ) values (
    v_shipment_id,
    v_actor,
    v_declaration_text,
    coalesce(nullif(p_declaration_version, ''), '1.0'),
    now(),
    coalesce(nullif(btrim(p_acceptance_flow), ''), 'shipment_checkout'),
    nullif(btrim(coalesce(p_user_agent, '')), ''),
    p_ip_address,
    jsonb_build_object(
      'verified_v1', v_is_verified_v1,
      'verification_status', v_verification_status,
      'declared_value_limit_cop', v_declared_value_limit,
      'weight_limit_kg', 10
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
      'declaration_version', coalesce(nullif(p_declaration_version, ''), '1.0'),
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

grant execute on function public.create_shipment_with_payment_draft(uuid, uuid, text, text, numeric, numeric, boolean, text, boolean, boolean, boolean, text, text, inet) to authenticated;

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
  v_active_matches integer := 0;
  v_is_verified_v1 boolean := false;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_shipment_id is null or p_trip_id is null then
    return jsonb_build_object('success', false, 'error', 'match_route_required');
  end if;

  v_is_verified_v1 := public.is_user_verified_v1(v_actor);

  if not v_is_verified_v1 then
    select count(*)
    into v_active_matches
    from public.matches m
    join public.shipments s on s.id = m.shipment_id
    where m.requester_id = v_actor
      and m.status in ('pending', 'accepted')
      and coalesce(s.status, 'open') not in ('delivered', 'cancelled');

    if v_active_matches >= 1 then
      return jsonb_build_object(
        'success', false,
        'error', 'active_match_limit_exceeded',
        'active_match_limit', 1
      );
    end if;
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

grant execute on function public.request_match(uuid, uuid) to anon, authenticated;

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
    select p.id
    from public.payments p
    join public.matches m on m.id = p.match_id
    join public.trips t on t.id = m.trip_id
    where p.status = 'held'
      and lower(coalesce(p.gateway_status, '')) = 'approved'
      and p.dispute_status = 'none'
      and coalesce(p.refund_status, 'none') = 'none'
      and lower(coalesce(p.metadata ->> 'manual_refund_required', 'false')) <> 'true'
      and lower(coalesce(p.metadata ->> 'admin_hold', 'false')) <> 'true'
      and lower(coalesce(p.metadata ->> 'freeze', 'false')) <> 'true'
      and lower(coalesce(p.metadata ->> 'release_blocked', 'false')) <> 'true'
      and p.traveler_delivered_at is not null
      and p.auto_release_at is not null
      and p.auto_release_at <= now()
      and public.is_user_verified_v1(t.traveler_id)
    order by p.auto_release_at asc
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

revoke execute on function public.auto_release_due_payments(integer) from public, anon, authenticated;
grant execute on function public.auto_release_due_payments(integer) to service_role;

notify pgrst, 'reload schema';

commit;
