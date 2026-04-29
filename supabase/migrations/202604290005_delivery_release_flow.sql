alter table public.payments
  add column if not exists traveler_delivered_at timestamptz;

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
  v_traveler_id uuid;
  v_config public.fee_configs;
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

  select s.owner_id, t.traveler_id
  into v_owner_id, v_traveler_id
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  join public.trips t on t.id = m.trip_id
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

  select *
  into v_config
  from public.fee_configs
  where is_active = true
  order by updated_at desc, created_at desc
  limit 1;

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
    dispute_deadline_at = now() + make_interval(hours => coalesce(v_config.dispute_window_hours, 24)),
    updated_at = now()
  where id = v_payment.id;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id
  )
  select
    v_traveler_id,
    'dispute_opened',
    'Se abrió una disputa',
    'El cliente abrió una disputa sobre este servicio.',
    p_match_id
  where v_traveler_id is not null
    and v_traveler_id <> v_actor
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = v_traveler_id
        and n.type = 'dispute_opened'
        and n.related_match_id = p_match_id
    );

  return jsonb_build_object('success', true, 'payment_id', v_payment.id);
end;
$function$;

create or replace function public.mark_shipment_delivered(p_shipment_id uuid)
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
  v_owner_id uuid;
  v_payment public.payments;
  v_config public.fee_configs;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  select m.id, m.trip_id, s.owner_id
  into v_match_id, v_trip_id, v_owner_id
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
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
    raise exception 'No autorizado: solo el viajero puede marcar entregado';
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

  if v_payment.dispute_status = 'open' then
    raise exception 'match_in_dispute';
  end if;

  if v_payment.traveler_delivered_at is not null then
    raise exception 'delivery_already_reported';
  end if;

  select *
  into v_config
  from public.fee_configs
  where is_active = true
  order by updated_at desc, created_at desc
  limit 1;

  update public.payments
  set
    traveler_delivered_at = now(),
    auto_release_at = now() + make_interval(hours => coalesce(v_config.auto_release_hours, 48)),
    updated_at = now()
  where id = v_payment.id;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id
  )
  select
    v_owner_id,
    'delivery_reported',
    'El viajero reportó la entrega',
    'El viajero marcó el paquete como entregado. Confirma si ya lo recibiste o abre disputa si algo salió mal.',
    v_match_id
  where v_owner_id is not null
    and v_owner_id <> v_actor
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = v_owner_id
        and n.type = 'delivery_reported'
        and n.related_match_id = v_match_id
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
  v_traveler_id uuid;
  v_payment public.payments;
  v_release_result jsonb;
begin
  if v_actor is null then
    raise exception 'No autenticado';
  end if;

  select m.id, s.owner_id, t.traveler_id
  into v_match_id, v_owner_id, v_traveler_id
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  join public.trips t on t.id = m.trip_id
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
    raise exception 'No autorizado: solo el cliente puede confirmar la recepción';
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

  if v_payment.dispute_status = 'open' then
    raise exception 'match_in_dispute';
  end if;

  if v_payment.traveler_delivered_at is null then
    raise exception 'traveler_delivery_not_reported';
  end if;

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
    auto_release_at = null,
    updated_at = now()
  where id = v_payment.id;

  v_release_result := public.release_payment(v_payment.id, 'customer_received');

  if coalesce((v_release_result ->> 'success')::boolean, false) is not true then
    raise exception '%', coalesce(v_release_result ->> 'error', 'release_payment_failed');
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
    'delivery_confirmed',
    'El cliente confirmó la recepción',
    'El cliente confirmó que recibió el paquete y el pago fue liberado.',
    v_match_id
  where v_traveler_id is not null
    and v_traveler_id <> v_actor
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = v_traveler_id
        and n.type = 'delivery_confirmed'
        and n.related_match_id = v_match_id
    );
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
    select id, shipment_id, match_id
    from public.payments
    where status = 'held'
      and dispute_status = 'none'
      and traveler_delivered_at is not null
      and auto_release_at is not null
      and auto_release_at <= now()
    order by auto_release_at asc
    limit greatest(coalesce(p_limit, 100), 1)
  loop
    update public.shipments
    set status = 'delivered'
    where id = v_row.shipment_id
      and status = 'in_transit';

    update public.matches
    set status = 'completed'
    where id = v_row.match_id
      and status = 'accepted';

    v_result := public.release_payment(v_row.id, 'auto_release');
    if coalesce((v_result ->> 'success')::boolean, false) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$function$;

grant execute on function public.mark_shipment_delivered(uuid) to authenticated;
