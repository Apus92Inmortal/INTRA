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
  v_shipment_status text;
  v_match_status text;
  v_recipient_id uuid;
  v_payment public.payments;
  v_traveler_amount numeric := 0;
  v_customer_refund_amount numeric := 0;
  v_reason text := coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'match_cancelled');
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
    s.status,
    m.status
  into
    v_requester_id,
    v_owner_id,
    v_traveler_id,
    v_shipment_id,
    v_shipment_status,
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
      'error', 'No se pudo cancelar el acuerdo'
    );
  end if;

  if v_match_status = 'accepted' and v_shipment_status in ('in_transit', 'delivered', 'cancelled') then
    return json_build_object(
      'success', false,
      'error', 'Este acuerdo ya no se puede cancelar desde aquí'
    );
  end if;

  if v_match_status = 'accepted' then
    select *
    into v_payment
    from public.payments p
    where p.shipment_id = v_shipment_id
    order by p.created_at desc
    limit 1
    for update;

    if v_payment.id is null then
      return json_build_object(
        'success', false,
        'error', 'No se encontro un pago asociado a este envio'
      );
    end if;

    if v_payment.status <> 'held' then
      return json_build_object(
        'success', false,
        'error', 'El pago no esta retenido para devolucion'
      );
    end if;

    v_traveler_amount := coalesce(v_payment.traveler_amount, v_payment.amount, 0);
    v_customer_refund_amount := coalesce(v_payment.gross_amount, v_payment.amount, 0);

    if v_traveler_id is not null and v_traveler_amount > 0 then
      if exists (
        select 1
        from public.wallet_ledger
        where payment_id = v_payment.id
          and entry_type = 'payment_hold'
      ) and not exists (
        select 1
        from public.wallet_ledger
        where payment_id = v_payment.id
          and entry_type = 'refund_pending_debit'
      ) then
        perform public.add_wallet_ledger_entry(
          v_traveler_id,
          v_payment.id,
          p_match_id,
          null,
          'refund_pending_debit',
          'pending',
          'debit',
          v_traveler_amount,
          'Reverso de retención temporal por acuerdo cancelado',
          jsonb_build_object('source', 'cancel_match', 'reason', v_reason)
        );
      end if;

      perform public.sync_wallet_balance(v_traveler_id);
    end if;

    if v_owner_id is not null and v_customer_refund_amount > 0 and not exists (
      select 1
      from public.wallet_ledger
      where payment_id = v_payment.id
        and entry_type = 'refund_available_credit'
    ) then
      perform public.add_wallet_ledger_entry(
        v_owner_id,
        v_payment.id,
        p_match_id,
        null,
        'refund_available_credit',
        'available',
        'credit',
        v_customer_refund_amount,
        'Devolución por acuerdo cancelado',
        jsonb_build_object('source', 'cancel_match', 'reason', v_reason)
      );
    end if;

    if v_owner_id is not null then
      perform public.sync_wallet_balance(v_owner_id);
    end if;

    update public.payments
    set
      status = 'refunded',
      refunded_at = now(),
      updated_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'refund_reason', v_reason,
        'cancelled_match_id', p_match_id,
        'cancelled_at', now()
      )
    where id = v_payment.id;
  end if;

  update public.matches
  set status = 'cancelled'
  where id = p_match_id;

  if v_match_status = 'accepted' then
    update public.shipments
    set status = 'open'
    where id = v_shipment_id
      and status = 'matched';
  end if;

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
    'refunded', v_match_status = 'accepted'
  );
end;
$function$;
