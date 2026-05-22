begin;

-- Phase 0 payment hardening:
-- - Wompi events are tracked by transaction/event/status.
-- - Wompi APPROVED is the only gateway status that can create a held payment.
-- - Match acceptance, release, and auto-release require a real approved hold.

alter table public.wompi_webhook_events
  add column if not exists event_status text,
  add column if not exists processing_error text;

create index if not exists wompi_webhook_events_transaction_status_idx
  on public.wompi_webhook_events (gateway_transaction_id, event_status, created_at desc);

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

  if lower(coalesce(v_payment.metadata ->> 'manual_refund_required', 'false')) = 'true' then
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

revoke execute on function public.attach_payment_hold_to_match(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.process_wompi_payment_event(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.auto_release_due_payments(integer) from public, anon, authenticated;

grant execute on function public.process_wompi_payment_event(text, text, text, jsonb) to service_role;
grant execute on function public.auto_release_due_payments(integer) to service_role;

commit;
