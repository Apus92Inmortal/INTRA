create or replace function public.cancel_match(p_match_id uuid, p_reason text default null::text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_requester_id uuid;
  v_owner_id uuid;
  v_traveler_id uuid;
  v_shipment_id uuid;
  v_match_status text;
  v_recipient_id uuid;
  v_payment_id uuid;
  v_payment_status text;
  v_refund_result jsonb;
begin
  if v_actor is null then
    return json_build_object(
      'success', false,
      'error', 'No autenticado'
    );
  end if;

  select
    m.requester_id,
    s.owner_id,
    t.traveler_id,
    m.shipment_id,
    m.status
  into
    v_requester_id,
    v_owner_id,
    v_traveler_id,
    v_shipment_id,
    v_match_status
  from public.matches m
  join public.shipments s on s.id = m.shipment_id
  join public.trips t on t.id = m.trip_id
  where m.id = p_match_id
  for update;

  if v_requester_id is null then
    return json_build_object(
      'success', false,
      'error', 'Match no encontrado'
    );
  end if;

  if v_actor not in (v_requester_id, v_owner_id, v_traveler_id) then
    return json_build_object(
      'success', false,
      'error', 'No autorizado'
    );
  end if;

  if v_match_status not in ('pending', 'accepted') then
    return json_build_object(
      'success', false,
      'error', 'No se pudo cancelar el match'
    );
  end if;

  if v_match_status = 'accepted' then
    select p.id, p.status
    into v_payment_id, v_payment_status
    from public.payments p
    where p.shipment_id = v_shipment_id
    order by p.created_at desc
    limit 1
    for update;

    if v_payment_id is null then
      return json_build_object(
        'success', false,
        'error', 'No se encontro un pago asociado a este envio'
      );
    end if;

    if v_payment_status <> 'refunded' then
      v_refund_result := public.refund_payment(
        v_payment_id,
        coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'match_cancelled')
      );

      if coalesce((v_refund_result ->> 'success')::boolean, false) = false then
        return json_build_object(
          'success', false,
          'error', coalesce(v_refund_result ->> 'error', 'No se pudo revertir el pago del match')
        );
      end if;
    end if;
  end if;

  update public.matches
  set status = 'cancelled'
  where id = p_match_id;

  v_recipient_id := case
    when v_actor = v_owner_id then v_traveler_id
    else v_owner_id
  end;

  if v_recipient_id is not null and v_recipient_id <> v_actor then
    insert into public.notifications (
      user_id,
      type,
      title,
      message,
      related_match_id
    )
    select
      v_recipient_id,
      'match_cancelled',
      'El match fue cancelado',
      'La otra parte canceló este match.',
      p_match_id
    where not exists (
      select 1
      from public.notifications n
      where n.user_id = v_recipient_id
        and n.type = 'match_cancelled'
        and n.related_match_id = p_match_id
    );
  end if;

  return json_build_object(
    'success', true
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

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id
  )
  select
    v_traveler_user_id,
    'payment_released',
    'Pago liberado',
    'Tu saldo ya está disponible para retiro en tu wallet.',
    v_payment.match_id
  where v_traveler_user_id is not null
    and v_payment.match_id is not null
    and (v_actor is null or v_traveler_user_id <> v_actor)
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = v_traveler_user_id
        and n.type = 'payment_released'
        and n.related_match_id = v_payment.match_id
    );

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

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id
  )
  select
    v_owner_id,
    'refund_processed',
    'Reembolso procesado',
    'Procesamos el reembolso de tu pago seguro.',
    v_payment.match_id
  where v_owner_id is not null
    and v_payment.match_id is not null
    and (v_actor is null or v_owner_id <> v_actor)
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = v_owner_id
        and n.type = 'refund_processed'
        and n.related_match_id = v_payment.match_id
    );

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
  v_traveler_id uuid;
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
  v_config public.fee_configs;
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
    'El cliente confirmó la entrega',
    'La entrega quedó confirmada y tu pago seguro seguirá su flujo normal.',
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
  v_owner_id uuid;
  v_payment_id uuid;
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

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    related_match_id
  )
  select
    v_owner_id,
    'shipment_in_transit',
    'Tu envío está en camino',
    'El viajero marcó tu envío como en tránsito.',
    v_match_id
  where v_owner_id is not null
    and v_owner_id <> v_actor
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = v_owner_id
        and n.type = 'shipment_in_transit'
        and n.related_match_id = v_match_id
    );
end;
$function$;
