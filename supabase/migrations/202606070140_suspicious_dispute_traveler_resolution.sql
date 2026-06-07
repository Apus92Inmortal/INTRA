begin;

-- Hotfix F3:
-- Resolve an admin dispute in favor of the traveler without weakening the
-- normal release_payment guard that blocks open disputes.

create or replace function public.admin_resolve_dispute_for_traveler(
  p_payment_id uuid,
  p_match_id uuid default null,
  p_resolution_notes text default null,
  p_admin_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payment public.payments;
  v_match public.matches;
  v_shipment public.shipments;
  v_trip public.trips;
  v_now timestamptz := now();
  v_notes text := nullif(btrim(coalesce(p_resolution_notes, '')), '');
  v_amount numeric := 0;
  v_report_id uuid;
begin
  if p_payment_id is null then
    return jsonb_build_object('success', false, 'error', 'payment_required');
  end if;

  if v_notes is null then
    return jsonb_build_object('success', false, 'error', 'resolution_notes_required');
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if v_payment.id is null then
    return jsonb_build_object('success', false, 'error', 'payment_not_found');
  end if;

  if v_payment.status = 'released' then
    return jsonb_build_object('success', false, 'error', 'already_released');
  end if;

  if v_payment.status in ('refunded', 'cancelled', 'failed') then
    return jsonb_build_object('success', false, 'error', 'payment_already_closed');
  end if;

  if v_payment.status <> 'held' then
    return jsonb_build_object('success', false, 'error', 'payment_not_held');
  end if;

  if lower(coalesce(v_payment.gateway_status, '')) <> 'approved' then
    return jsonb_build_object('success', false, 'error', 'payment_not_approved');
  end if;

  if coalesce(v_payment.refund_status, 'none') <> 'none'
    or lower(coalesce(v_payment.metadata ->> 'manual_refund_required', 'false')) = 'true'
  then
    return jsonb_build_object('success', false, 'error', 'payment_blocked');
  end if;

  if coalesce(v_payment.dispute_status, 'none') <> 'open' then
    return jsonb_build_object('success', false, 'error', 'dispute_not_open');
  end if;

  select *
  into v_match
  from public.matches
  where id = coalesce(p_match_id, v_payment.match_id)
  for update;

  if v_match.id is null or v_match.id <> v_payment.match_id then
    return jsonb_build_object('success', false, 'error', 'match_not_found');
  end if;

  select *
  into v_shipment
  from public.shipments
  where id = v_match.shipment_id
  for update;

  select *
  into v_trip
  from public.trips
  where id = v_match.trip_id;

  if v_shipment.id is null or v_trip.id is null or v_trip.traveler_id is null then
    return jsonb_build_object('success', false, 'error', 'match_context_not_found');
  end if;

  v_amount := coalesce(v_payment.traveler_amount, v_payment.amount);

  if v_amount is null or v_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_release_amount');
  end if;

  if not exists (
    select 1
    from public.wallet_ledger
    where payment_id = v_payment.id
      and entry_type = 'release_pending_debit'
  ) then
    perform public.add_wallet_ledger_entry(
      v_trip.traveler_id,
      v_payment.id,
      v_match.id,
      null,
      'release_pending_debit',
      'pending',
      'debit',
      v_amount,
      'Liberacion de retencion temporal por resolucion admin',
      jsonb_build_object('reason', 'admin_dispute_resolution', 'admin_id', p_admin_id)
    );
  end if;

  if not exists (
    select 1
    from public.wallet_ledger
    where payment_id = v_payment.id
      and entry_type = 'release_available_credit'
  ) then
    perform public.add_wallet_ledger_entry(
      v_trip.traveler_id,
      v_payment.id,
      v_match.id,
      null,
      'release_available_credit',
      'available',
      'credit',
      v_amount,
      'Saldo disponible por disputa resuelta a favor del viajero',
      jsonb_build_object('reason', 'admin_dispute_resolution', 'admin_id', p_admin_id)
    );
  end if;

  update public.payments
  set
    status = 'released',
    released_at = v_now,
    released_by = 'admin_dispute_resolution',
    dispute_status = 'resolved',
    dispute_resolved_at = v_now,
    updated_at = v_now,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'admin_dispute_status', 'resolved',
      'admin_dispute_resolution', 'traveler_release',
      'admin_dispute_resolved_by', p_admin_id,
      'admin_dispute_resolved_at', v_now,
      'admin_dispute_notes', v_notes
    )
  where id = v_payment.id;

  update public.matches
  set
    status = 'resolved',
    resolved_at = v_now,
    resolution_notes = v_notes
  where id = v_match.id;

  if v_shipment.status = 'in_transit' and v_payment.traveler_delivered_at is not null then
    update public.shipments
    set status = 'delivered'
    where id = v_shipment.id;
  end if;

  if coalesce(v_payment.metadata, '{}'::jsonb) ? 'escalated_from_report_id' then
    begin
      v_report_id := nullif(v_payment.metadata ->> 'escalated_from_report_id', '')::uuid;
    exception when invalid_text_representation then
      v_report_id := null;
    end;
  end if;

  if v_report_id is not null then
    update public.shipment_report_events
    set
      status = 'resolved',
      resolved_at = coalesce(resolved_at, v_now),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'dispute_resolution', 'traveler_release',
        'dispute_resolved_at', v_now,
        'dispute_resolved_by', p_admin_id,
        'dispute_resolution_notes', v_notes
      )
    where id = v_report_id;
  end if;

  insert into public.app_audit_logs (actor_id, event_type, entity_type, entity_id, metadata)
  values (
    p_admin_id,
    'dispute_resolved_traveler_release',
    'payment',
    v_payment.id,
    jsonb_build_object(
      'match_id', v_match.id,
      'shipment_id', v_shipment.id,
      'traveler_user_id', v_trip.traveler_id,
      'amount', v_amount,
      'report_id', v_report_id,
      'resolution_notes', v_notes
    )
  );

  perform public.sync_wallet_balance(v_trip.traveler_id);

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'match_id', v_match.id,
    'status', 'released'
  );
end;
$function$;

revoke execute on function public.admin_resolve_dispute_for_traveler(uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_resolve_dispute_for_traveler(uuid, uuid, text, uuid)
  to service_role;

notify pgrst, 'reload schema';

commit;
