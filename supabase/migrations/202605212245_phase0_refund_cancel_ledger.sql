begin;

-- Phase 0 refund hardening:
-- - Refund workflow state lives in refund_status, not in payment.status.
-- - Cancelling an accepted match before pickup blocks release and reverses traveler pending hold.
-- - Existing manual-refund metadata is backfilled into refund_status for admin visibility.

alter table public.payments
  add column if not exists refund_status text not null default 'none',
  add column if not exists refund_reason text,
  add column if not exists refund_requested_at timestamptz,
  add column if not exists refund_processed_at timestamptz,
  add column if not exists refund_admin_id uuid references public.profiles(id) on delete set null;

alter table public.payments
  drop constraint if exists payments_refund_status_check;
alter table public.payments
  add constraint payments_refund_status_check
  check (
    refund_status = any (
      array[
        'none'::text,
        'manual_required'::text,
        'pending'::text,
        'processing'::text,
        'refunded'::text,
        'failed'::text
      ]
    )
  );

create index if not exists payments_refund_status_idx
  on public.payments (refund_status);

create index if not exists payments_manual_refund_idx
  on public.payments (updated_at desc)
  where refund_status in ('manual_required', 'pending', 'processing', 'failed');

update public.payments
set
  refund_status = 'refunded',
  refund_processed_at = coalesce(refund_processed_at, refunded_at, updated_at),
  updated_at = now()
where status = 'refunded'
  and refund_status <> 'refunded';

update public.payments
set
  refund_status = 'manual_required',
  refund_reason = coalesce(refund_reason, metadata ->> 'manual_refund_reason', 'manual_refund_required'),
  refund_requested_at = coalesce(refund_requested_at, updated_at),
  updated_at = now()
where lower(coalesce(metadata ->> 'manual_refund_required', 'false')) = 'true'
  and status not in ('refunded', 'failed', 'cancelled')
  and refund_status = 'none';

create or replace function public.process_wompi_payment_event(
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
  v_previous_status text;
  v_new_status text;
begin
  v_normalized_status := lower(coalesce(p_status, ''));

  select *
  into v_payment
  from public.payments
  where (
    (p_gateway_transaction_id is not null and gateway_transaction_id = p_gateway_transaction_id)
    or (p_external_reference is not null and external_reference = p_external_reference)
  )
  order by created_at desc
  limit 1
  for update;

  if v_payment.id is null then
    return jsonb_build_object('success', false, 'error', 'payment_not_found');
  end if;

  v_previous_status := v_payment.status;
  v_new_status := v_payment.status;

  if v_normalized_status = 'approved'
    and v_payment.status in ('pending', 'processing')
    and coalesce(v_payment.refund_status, 'none') = 'none'
    and lower(coalesce(v_payment.metadata ->> 'manual_refund_required', 'false')) <> 'true'
  then
    v_new_status := 'held';
  elsif v_normalized_status in ('failed', 'rejected', 'declined', 'error')
    and v_payment.status in ('pending', 'processing')
  then
    v_new_status := 'failed';
  elsif v_normalized_status in ('cancelled', 'canceled', 'voided')
    and v_payment.status in ('pending', 'processing')
  then
    v_new_status := 'cancelled';
  end if;

  update public.payments
  set
    gateway_transaction_id = coalesce(p_gateway_transaction_id, gateway_transaction_id),
    gateway_status = p_status,
    status = v_new_status,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_wompi_event', coalesce(p_payload, '{}'::jsonb)),
    updated_at = now()
  where id = v_payment.id;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'previous_status', v_previous_status,
    'status', v_new_status
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
    and status = 'held'
    and lower(coalesce(gateway_status, '')) = 'approved'
    and coalesce(refund_status, 'none') = 'none'
    and dispute_status = 'none'
    and lower(coalesce(metadata ->> 'manual_refund_required', 'false')) <> 'true'
  order by created_at desc
  limit 1
  for update;

  if v_payment.id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'payment_not_approved'
    );
  end if;

  v_amount := coalesce(v_payment.traveler_amount, v_payment.gross_amount, v_payment.amount);

  update public.payments
  set
    match_id = p_match_id,
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
      'Retencion temporal del pago asociada al match',
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

  if lower(coalesce(v_payment.gateway_status, '')) <> 'approved' then
    return jsonb_build_object('success', false, 'error', 'payment_not_approved');
  end if;

  if v_payment.dispute_status = 'open' then
    return jsonb_build_object('success', false, 'error', 'match_in_dispute');
  end if;

  if coalesce(v_payment.refund_status, 'none') <> 'none'
    or lower(coalesce(v_payment.metadata ->> 'manual_refund_required', 'false')) = 'true'
  then
    return jsonb_build_object('success', false, 'error', 'payment_blocked');
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
      'Liberacion de retencion temporal',
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

  if v_payment.status = 'refunded' or coalesce(v_payment.refund_status, 'none') = 'refunded' then
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
        'Reverso de retencion temporal por reembolso',
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
    refund_status = 'refunded',
    refund_reason = coalesce(refund_reason, p_reason),
    refund_processed_at = coalesce(refund_processed_at, now()),
    refunded_at = coalesce(refunded_at, now()),
    dispute_status = case when dispute_status = 'open' then 'resolved' else dispute_status end,
    updated_at = now(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('refund_reason', p_reason)
  where id = v_payment.id;

  return jsonb_build_object('success', true, 'payment_id', v_payment.id);
end;
$function$;

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
  v_trip_id uuid;
  v_match_status text;
  v_shipment_status text;
  v_recipient_id uuid;
  v_payment public.payments;
  v_payment_id uuid;
  v_payment_status text;
  v_amount numeric := 0;
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
    m.trip_id,
    m.status,
    s.status
  into
    v_requester_id,
    v_owner_id,
    v_traveler_id,
    v_shipment_id,
    v_trip_id,
    v_match_status,
    v_shipment_status
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
    if v_shipment_status not in ('open', 'matched') then
      return json_build_object(
        'success', false,
        'error', 'El envio ya fue recibido por el viajero. Abre una disputa para revisarlo.'
      );
    end if;

    select *
    into v_payment
    from public.payments p
    where p.shipment_id = v_shipment_id
    order by p.created_at desc
    limit 1
    for update;

    v_payment_id := v_payment.id;
    v_payment_status := v_payment.status;

    if v_payment_id is null then
      return json_build_object(
        'success', false,
        'error', 'No se encontro un pago asociado a este envio'
      );
    end if;

    if v_payment.status = 'released' then
      return json_build_object('success', false, 'error', 'El pago ya fue liberado');
    end if;

    if v_payment.status not in ('refunded', 'failed', 'cancelled') then
      v_amount := coalesce(v_payment.traveler_amount, v_payment.gross_amount, v_payment.amount);

      if exists (
        select 1
        from public.wallet_ledger wl
        where wl.payment_id = v_payment.id
          and wl.entry_type = 'payment_hold'
      ) and not exists (
        select 1
        from public.wallet_ledger wl
        where wl.payment_id = v_payment.id
          and wl.entry_type = 'refund_pending_debit'
      ) then
        perform public.add_wallet_ledger_entry(
          v_traveler_id,
          v_payment.id,
          p_match_id,
          null,
          'refund_pending_debit',
          'pending',
          'debit',
          v_amount,
          'Reverso de retencion por cancelacion antes de recogida',
          jsonb_build_object('source', 'cancel_match', 'reason', v_reason)
        );

        perform public.sync_wallet_balance(v_traveler_id);
      end if;

      update public.payments
      set
        refund_status = 'manual_required',
        refund_reason = v_reason,
        refund_requested_at = coalesce(refund_requested_at, now()),
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'manual_refund_required', true,
          'manual_refund_reason', v_reason,
          'cancelled_match_id', p_match_id,
          'cancelled_at', now()
        ),
        updated_at = now()
      where id = v_payment_id;
    end if;

    update public.shipments
    set status = 'cancelled'
    where id = v_shipment_id
      and status in ('open', 'matched');

    update public.trips
    set status = 'open'
    where id = v_trip_id
      and status not in ('closed', 'completed', 'cancelled');
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
      'La otra parte cancelo este match.',
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
    'manual_refund_required', v_match_status = 'accepted' and v_payment_status not in ('refunded', 'failed', 'cancelled')
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
    select id
    from public.payments
    where status = 'held'
      and lower(coalesce(gateway_status, '')) = 'approved'
      and dispute_status = 'none'
      and coalesce(refund_status, 'none') = 'none'
      and lower(coalesce(metadata ->> 'manual_refund_required', 'false')) <> 'true'
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

commit;
