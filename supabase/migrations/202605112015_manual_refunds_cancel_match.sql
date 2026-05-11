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
      update public.payments
      set
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'manual_refund_required', true,
          'manual_refund_reason', coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'match_cancelled'),
          'cancelled_match_id', p_match_id,
          'cancelled_at', now()
        ),
        updated_at = now()
      where id = v_payment_id;
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
    'success', true,
    'manual_refund_required', v_match_status = 'accepted' and v_payment_status <> 'refunded'
  );
end;
$function$;
