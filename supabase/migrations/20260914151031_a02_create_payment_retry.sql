begin;

-- The customer may create a new Wompi attempt only for an owned, open shipment.
-- All amounts and the reference are derived inside the database.
create or replace function public.create_payment_retry(
  p_shipment_id uuid,
  p_retry_payment_id uuid default null,
  p_payment_policy_accepted boolean default false,
  p_payment_policy_version text default '1.0'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_shipment public.shipments%rowtype;
  v_latest_payment public.payments%rowtype;
  v_base_amount integer;
  v_customer_amount integer;
  v_quote jsonb;
  v_payment_id uuid;
begin
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if p_shipment_id is null or not coalesce(p_payment_policy_accepted, false)
    or nullif(btrim(coalesce(p_payment_policy_version, '')), '') is null then
    return jsonb_build_object('success', false, 'error', 'invalid_request');
  end if;

  -- Serialize retries for a shipment so two checkout clicks cannot create two attempts.
  select * into v_shipment
  from public.shipments s
  where s.id = p_shipment_id and s.owner_id = v_actor
  for update;

  if v_shipment.id is null or v_shipment.status <> 'open' then
    return jsonb_build_object('success', false, 'error', 'shipment_not_payable');
  end if;

  if not exists (
    select 1 from public.shipment_evidence e
    where e.shipment_id = p_shipment_id
      and e.evidence_type = 'customer_initial_photo'
      and e.uploaded_by = v_actor
  ) then
    return jsonb_build_object('success', false, 'error', 'initial_evidence_required');
  end if;

  -- Serialize against webhook/admin updates to existing payment attempts.
  perform 1 from public.payments p
  where p.shipment_id = p_shipment_id
  order by p.created_at, p.id
  for update;

  -- A charge already approved or held must never be followed by another charge.
  if exists (
    select 1 from public.payments p
    where p.shipment_id = p_shipment_id
      and (p.status in ('held', 'released', 'refunded')
        or lower(coalesce(p.gateway_status, '')) = 'approved')
  ) then
    return jsonb_build_object('success', false, 'error', 'payment_already_approved');
  end if;

  select * into v_latest_payment
  from public.payments p
  where p.shipment_id = p_shipment_id
  order by p.created_at desc, p.id desc
  limit 1;

  if v_latest_payment.id is not null then
    if v_latest_payment.user_id is distinct from v_actor then
      return jsonb_build_object('success', false, 'error', 'payment_not_retryable');
    end if;

    if v_latest_payment.status in ('pending', 'processing') then
      return jsonb_build_object(
        'success', true, 'shipment_id', p_shipment_id,
        'payment_id', v_latest_payment.id, 'reused', true
      );
    end if;

    if v_latest_payment.status not in ('failed', 'cancelled')
      or (p_retry_payment_id is not null
        and p_retry_payment_id <> v_latest_payment.id) then
      return jsonb_build_object('success', false, 'error', 'payment_not_retryable');
    end if;

    if exists (
      select 1 from public.payments p
      where p.shipment_id = p_shipment_id
        and p.id <> v_latest_payment.id
        and p.status in ('pending', 'processing')
    ) then
      return jsonb_build_object('success', false, 'error', 'pending_payment_exists');
    end if;
  elsif p_retry_payment_id is not null then
    return jsonb_build_object('success', false, 'error', 'payment_not_retryable');
  end if;

  select rp.base_price, rp.customer_price
  into v_base_amount, v_customer_amount
  from public.route_prices rp
  where rp.origin_city_id = v_shipment.origin_city_id
    and rp.destination_city_id = v_shipment.destination_city_id
    and rp.is_active = true
  order by rp.updated_at desc, rp.created_at desc
  limit 1;

  if v_base_amount is null or v_customer_amount is null then
    return jsonb_build_object('success', false, 'error', 'route_not_available');
  end if;

  v_quote := public.calculate_payment_amount(v_base_amount, v_customer_amount);
  if not coalesce((v_quote ->> 'success')::boolean, false) then
    return jsonb_build_object('success', false, 'error', 'quote_error');
  end if;

  insert into public.payments (
    shipment_id, user_id, amount, gross_amount, traveler_amount, intra_fee,
    gateway_fee_estimated, net_amount_received, currency, status,
    gateway_provider, gateway_status, payment_method, external_reference, metadata
  ) values (
    p_shipment_id, v_actor,
    (v_quote ->> 'amount')::numeric,
    (v_quote ->> 'gross_amount')::numeric,
    (v_quote ->> 'traveler_amount')::numeric,
    (v_quote ->> 'intra_fee')::numeric,
    (v_quote ->> 'gateway_fee_estimated')::numeric,
    (v_quote ->> 'net_amount_received')::numeric,
    coalesce(v_quote ->> 'currency', 'COP'),
    'pending', 'wompi', 'created', 'wompi_widget',
    'intra-shipment-' || p_shipment_id::text || '-' || gen_random_uuid()::text,
    jsonb_build_object(
      'source', 'payment_retry_rpc',
      'auto_release_hours', coalesce((v_quote ->> 'auto_release_hours')::integer, 48),
      'dispute_window_hours', coalesce((v_quote ->> 'dispute_window_hours')::integer, 24),
      'payment_conditions_accepted', true,
      'payment_conditions_version', btrim(p_payment_policy_version),
      'payment_conditions_flow', 'shipment_checkout',
      'retry_of_payment_id', v_latest_payment.id
    )
  ) returning id into v_payment_id;

  return jsonb_build_object(
    'success', true, 'shipment_id', p_shipment_id,
    'payment_id', v_payment_id, 'reused', false
  );
end;
$function$;

revoke execute on function public.create_payment_retry(uuid, uuid, boolean, text)
  from public, anon;
grant execute on function public.create_payment_retry(uuid, uuid, boolean, text)
  to authenticated;

notify pgrst, 'reload schema';

commit;
