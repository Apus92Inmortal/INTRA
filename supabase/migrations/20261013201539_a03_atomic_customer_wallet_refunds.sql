begin;

-- Stop rather than silently reconcile historic duplicate credits. This lock
-- also closes the gap between the preflight and installing the unique index.
lock table public.wallet_ledger in share row exclusive mode;
do $preflight$
begin
  if exists (
    select payment_id from public.wallet_ledger
    where entry_type = 'refund_available_credit' and payment_id is not null
    group by payment_id having count(*) > 1
  ) then
    raise exception 'a03_duplicate_refund_credits: reconcile wallet_ledger before applying';
  end if;
end;
$preflight$;

create unique index wallet_ledger_refund_credit_once_idx
  on public.wallet_ledger (payment_id)
  where entry_type = 'refund_available_credit' and payment_id is not null;

-- Internal transaction shared by the two server-only entry points below.
-- Server actions authenticate the actor (and admin allowlist) before calling.
-- No caller supplies financial amounts for Dashboard cancellation.
create function public.process_customer_wallet_refund(
  p_shipment_id uuid,
  p_payment_id uuid,
  p_match_id uuid,
  p_actor_id uuid,
  p_source text,
  p_amount numeric,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_shipment public.shipments;
  v_payment public.payments;
  v_match public.matches;
  v_hold public.wallet_ledger;
  v_release public.wallet_ledger;
  v_credit public.wallet_ledger;
  v_customer_wallet uuid;
  v_traveler_wallet uuid;
  v_traveler_id uuid;
  v_user_id uuid;
  v_shipment_id uuid := p_shipment_id;
  v_source text := p_source;
  v_notes text := nullif(btrim(p_notes), '');
  v_amount numeric;
  v_fee numeric;
  v_net numeric;
  v_pending numeric;
  v_available numeric;
  v_reserved numeric;
  v_now timestamptz := now();
  v_meta jsonb;
  v_report_id uuid;
begin
  if p_actor_id is null or not exists (select 1 from public.profiles where id = p_actor_id) then
    return jsonb_build_object('success', false, 'error', 'actor_required');
  end if;
  if v_source not in ('dashboard_waiting_traveler_cancel', 'admin_dispute_customer_refund') or v_source is null then
    return jsonb_build_object('success', false, 'error', 'invalid_refund_source');
  end if;
  if v_source = 'admin_dispute_customer_refund' then
    if p_payment_id is null or v_notes is null then
      return jsonb_build_object('success', false, 'error', 'payment_and_notes_required');
    end if;
    select shipment_id into v_shipment_id from public.payments where id = p_payment_id;
  end if;

  -- Consistent order for both refund paths: shipment, payments, matches,
  -- reports, then wallets in user UUID order. Shipment lock also blocks FK
  -- inserts of a new match/payment until the cancellation commits.
  select * into v_shipment from public.shipments where id = v_shipment_id for update;
  if v_shipment.id is null or
    (v_source = 'dashboard_waiting_traveler_cancel' and v_shipment.owner_id <> p_actor_id) then
    return jsonb_build_object('success', false, 'error', 'shipment_not_found');
  end if;
  -- Dashboard has no authority over an active match (DEC-010). Reject before
  -- waiting for a legacy match transition that may itself need this shipment.
  -- request_match also locks the shipment before insertion, so no new match
  -- can appear between this check and a successful cancellation.
  if v_source = 'dashboard_waiting_traveler_cancel' and exists(select 1 from public.matches
    where shipment_id = v_shipment.id and status in ('pending', 'accepted', 'completed', 'disputed')) then
    return jsonb_build_object('success', false, 'error', 'shipment_not_cancellable');
  end if;
  perform id from public.payments where shipment_id = v_shipment.id order by id for update;
  if v_source = 'dashboard_waiting_traveler_cancel' then
    select * into v_payment from public.payments where shipment_id = v_shipment.id
    order by created_at desc, id desc limit 1;
  else
    select * into v_payment from public.payments
    where id = p_payment_id and shipment_id = v_shipment.id;
  end if;
  if v_payment.id is null or v_payment.user_id is distinct from v_shipment.owner_id
    or v_payment.currency is distinct from 'COP' then
    return jsonb_build_object('success', false, 'error', 'payment_context_invalid');
  end if;
  perform id from public.matches where shipment_id = v_shipment.id order by id for update;
  perform id from public.shipment_report_events where shipment_id = v_shipment.id order by id for update;

  if v_source = 'admin_dispute_customer_refund' then
    select * into v_match from public.matches
    where id = coalesce(p_match_id, v_payment.match_id) and shipment_id = v_shipment.id;
    if v_match.id is null or v_match.id is distinct from v_payment.match_id then
      return jsonb_build_object('success', false, 'error', 'match_context_invalid');
    end if;
    select traveler_id into v_traveler_id from public.trips where id = v_match.trip_id;
    if v_traveler_id is null or v_traveler_id = v_shipment.owner_id then
      return jsonb_build_object('success', false, 'error', 'traveler_context_invalid');
    end if;
  end if;

  v_fee := coalesce(v_payment.gateway_fee_actual, v_payment.gateway_fee_estimated, 0);
  v_net := v_payment.amount - v_fee;
  v_amount := case when v_source = 'dashboard_waiting_traveler_cancel' then v_net else p_amount end;
  -- A partial amount would reverse the entire traveler hold/release while
  -- crediting only part of the net to the customer, leaving an unassigned
  -- remainder. Until a partial-refund ledger policy exists, require full net.
  if v_fee < 0 or v_net <= 0 or v_amount is null or v_amount <> v_net
    or v_amount::text in ('NaN', 'Infinity', '-Infinity') or v_net::text in ('NaN', 'Infinity', '-Infinity')
    or v_amount <> round(v_amount, 2) then
    return jsonb_build_object('success', false, 'error', 'invalid_refund_amount');
  end if;

  select * into v_credit from public.wallet_ledger
  where payment_id = v_payment.id and entry_type = 'refund_available_credit';
  if v_credit.id is not null then
    -- Only a fully committed transaction of this path is a successful retry.
    -- Legacy partial writes require reconciliation; never insert another credit.
    if v_payment.status = 'refunded' and v_payment.refund_status = 'refunded'
      and v_payment.metadata ->> 'wallet_refund_source' = v_source
      and v_payment.metadata ->> 'wallet_refund_actor_id' = p_actor_id::text
      and v_credit.user_id = v_shipment.owner_id and v_credit.amount = v_amount
      and v_credit.balance_type = 'available' and v_credit.direction = 'credit'
      and exists (select 1 from public.app_audit_logs where entity_id = v_payment.id
        and event_type = v_source and actor_id = p_actor_id)
      and ((v_source = 'dashboard_waiting_traveler_cancel' and v_shipment.status = 'cancelled')
        or (v_source = 'admin_dispute_customer_refund' and v_payment.dispute_status = 'resolved'
          and v_match.status = 'resolved')) then
      return jsonb_build_object('success', true, 'payment_id', v_payment.id, 'shipment_id', v_shipment.id,
        'match_id', v_match.id, 'amount', v_amount, 'idempotent', true);
    end if;
    return jsonb_build_object('success', false, 'error', 'refund_reconciliation_required');
  end if;

  if v_payment.refund_status <> 'none' or lower(coalesce(v_payment.gateway_status, '')) <> 'approved'
    or lower(coalesce(v_payment.metadata ->> 'manual_refund_required', 'false')) = 'true'
    or exists (select 1 from public.wallet_ledger where payment_id = v_payment.id
      and entry_type in ('refund_pending_debit', 'refund_available_debit')) then
    return jsonb_build_object('success', false, 'error', 'payment_blocked');
  end if;
  if v_source = 'dashboard_waiting_traveler_cancel' then
    if v_shipment.status <> 'open' or v_payment.status <> 'held' or v_payment.dispute_status <> 'none'
      or exists (select 1 from public.matches where shipment_id = v_shipment.id
        and status in ('pending', 'accepted', 'completed', 'disputed'))
      or exists (select 1 from public.shipment_report_events where shipment_id = v_shipment.id
        and status in ('open', 'reviewing'))
      or exists (select 1 from public.wallet_ledger where payment_id = v_payment.id
        and entry_type = 'release_available_credit')
      or exists (select 1 from public.payments where shipment_id = v_shipment.id and id <> v_payment.id
        and (status in ('held', 'released', 'refunded') or lower(coalesce(gateway_status, '')) = 'approved')) then
      return jsonb_build_object('success', false, 'error', 'shipment_not_cancellable');
    end if;
  elsif v_payment.status not in ('held', 'released') or v_payment.dispute_status <> 'open'
    or v_match.status not in ('accepted', 'completed', 'disputed') then
    return jsonb_build_object('success', false, 'error', 'dispute_not_open');
  end if;

  select * into v_hold from public.wallet_ledger where payment_id = v_payment.id and entry_type = 'payment_hold';
  select * into v_release from public.wallet_ledger where payment_id = v_payment.id and entry_type = 'release_available_credit';
  if v_hold.id is not null then
    if v_hold.direction <> 'credit' or v_hold.balance_type <> 'pending' or v_hold.amount <= 0
      or v_hold.user_id = v_shipment.owner_id
      or (v_traveler_id is not null and v_hold.user_id <> v_traveler_id) then
      return jsonb_build_object('success', false, 'error', 'hold_reconciliation_required');
    end if;
    v_traveler_id := v_hold.user_id;
  end if;
  if v_release.id is not null and (v_traveler_id is null or v_release.user_id <> v_traveler_id
    or v_release.direction <> 'credit' or v_release.balance_type <> 'available') then
    return jsonb_build_object('success', false, 'error', 'release_reconciliation_required');
  end if;
  if (v_payment.status = 'released' and v_release.id is null)
    or (v_payment.status = 'held' and v_release.id is not null)
    or (v_release.id is null and exists (select 1 from public.wallet_ledger
      where payment_id = v_payment.id and entry_type = 'release_pending_debit'))
    or (v_release.id is not null and (v_hold.id is null or not exists (select 1 from public.wallet_ledger
      where payment_id = v_payment.id and entry_type = 'release_pending_debit'
        and amount = v_hold.amount and user_id = v_traveler_id))) then
    return jsonb_build_object('success', false, 'error', 'release_reconciliation_required');
  end if;

  -- All rejecting checks above precede mutations. Any late error below is an
  -- exception and rolls the complete RPC back, including wallet creation.
  for v_user_id in
    select distinct user_id from unnest(array[v_shipment.owner_id, v_traveler_id]) u(user_id)
    where user_id is not null order by user_id
  loop
    insert into public.wallets (user_id) values (v_user_id) on conflict (user_id) do nothing;
    perform id from public.wallets where user_id = v_user_id for update;
  end loop;
  select id into v_customer_wallet from public.wallets where user_id = v_shipment.owner_id;
  select id into v_traveler_wallet from public.wallets where user_id = v_traveler_id;

  if v_hold.id is not null and not exists (select 1 from public.wallet_ledger
    where payment_id = v_payment.id and entry_type = 'release_pending_debit') then
    select coalesce(sum(case when direction = 'credit' then amount else -amount end), 0)
    into v_pending from public.wallet_ledger where user_id = v_traveler_id and balance_type = 'pending';
    if v_pending < v_hold.amount then
      raise exception 'insufficient_pending_balance';
    end if;
    insert into public.wallet_ledger (wallet_id, user_id, payment_id, match_id, entry_type, balance_type, direction, amount, description, metadata)
    values (v_traveler_wallet, v_traveler_id, v_payment.id, v_hold.match_id, 'refund_pending_debit', 'pending', 'debit', v_hold.amount,
      'Reverso de retención por devolución al cliente', jsonb_build_object('source', v_source, 'actor_id', p_actor_id));
  end if;
  if v_release.id is not null then
    select coalesce(sum(case when direction = 'credit' then amount else -amount end), 0)
    into v_available from public.wallet_ledger where user_id = v_traveler_id and balance_type = 'available';
    select coalesce(sum(amount), 0) into v_reserved from public.payouts
    where traveler_user_id = v_traveler_id and status in ('pending', 'approved');
    if v_available - v_reserved < v_release.amount then
      raise exception 'insufficient_available_balance';
    end if;
    insert into public.wallet_ledger (wallet_id, user_id, payment_id, match_id, entry_type, balance_type, direction, amount, description, metadata)
    values (v_traveler_wallet, v_traveler_id, v_payment.id, v_match.id, 'refund_available_debit', 'available', 'debit', v_release.amount,
      'Ajuste de saldo por disputa resuelta a favor del cliente', jsonb_build_object('source', v_source, 'actor_id', p_actor_id));
  end if;

  v_meta := jsonb_build_object('source', v_source, 'actor_id', p_actor_id, 'shipment_id', v_shipment.id,
    'gross_payment_amount', v_payment.amount, 'gateway_fee_amount', v_fee, 'wallet_refund_amount', v_amount);
  insert into public.wallet_ledger (wallet_id, user_id, payment_id, match_id, entry_type, balance_type, direction, amount, description, metadata)
  values (v_customer_wallet, v_shipment.owner_id, v_payment.id, v_match.id, 'refund_available_credit', 'available', 'credit', v_amount,
    coalesce(v_notes, 'Devolución a Wallet por cancelación de envío sin viajero asignado'), v_meta);

  update public.payments set status = 'refunded', refund_status = 'refunded',
    refund_reason = coalesce(v_notes, v_source), refund_processed_at = v_now, refunded_at = v_now,
    refund_admin_id = case when v_source = 'admin_dispute_customer_refund' then p_actor_id else null end,
    dispute_status = case when v_source = 'admin_dispute_customer_refund' then 'resolved' else dispute_status end,
    dispute_resolved_at = case when v_source = 'admin_dispute_customer_refund' then v_now else dispute_resolved_at end,
    updated_at = v_now, metadata = coalesce(metadata, '{}'::jsonb) || v_meta || jsonb_build_object(
      'wallet_refund_processed', true, 'wallet_refund_source', v_source, 'wallet_refund_actor_id', p_actor_id,
      'gateway_fee_excluded_from_wallet_refund', true,
      'admin_dispute_status', case when v_source = 'admin_dispute_customer_refund' then 'resolved' else null end,
      'admin_dispute_resolution', case when v_source = 'admin_dispute_customer_refund' then 'customer_refund' else null end,
      'admin_dispute_resolved_by', case when v_source = 'admin_dispute_customer_refund' then p_actor_id else null end,
      'admin_dispute_resolved_at', case when v_source = 'admin_dispute_customer_refund' then v_now else null end,
      'admin_dispute_notes', v_notes, 'admin_dispute_refund_amount', v_amount)
    where id = v_payment.id;
  if v_source = 'dashboard_waiting_traveler_cancel' then
    update public.shipments set status = 'cancelled' where id = v_shipment.id;
  else
    update public.matches set status = 'resolved', resolved_at = v_now, resolution_notes = v_notes where id = v_match.id;
    -- Mirror the existing admin traveler resolution's escalated report audit.
    begin
      v_report_id := nullif(v_payment.metadata ->> 'escalated_from_report_id', '')::uuid;
    exception when invalid_text_representation then
      v_report_id := null;
    end;
    if v_report_id is not null then
      update public.shipment_report_events set status = 'resolved', resolved_at = coalesce(resolved_at, v_now),
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('dispute_resolution', 'customer_refund',
          'dispute_resolved_at', v_now, 'dispute_resolved_by', p_actor_id, 'dispute_resolution_notes', v_notes)
      where id = v_report_id and shipment_id = v_shipment.id;
    end if;
  end if;
  insert into public.app_audit_logs (actor_id, event_type, entity_type, entity_id, metadata)
    values (p_actor_id, v_source, 'payment', v_payment.id, v_meta || jsonb_build_object('match_id', v_match.id, 'resolution_notes', v_notes));
  for v_user_id in
    select distinct user_id from unnest(array[v_shipment.owner_id, v_traveler_id]) u(user_id)
    where user_id is not null order by user_id
  loop
    perform public.sync_wallet_balance(v_user_id);
  end loop;
  return jsonb_build_object('success', true, 'payment_id', v_payment.id, 'shipment_id', v_shipment.id,
    'match_id', v_match.id, 'amount', v_amount, 'idempotent', false);
end;
$function$;

-- Unpaid cancellation uses the same serialization boundary as refunds. A
-- provider confirmation that wins first blocks cancellation. A confirmation
-- after cancellation remains an unprocessed reconciliation case in A04.
create function public.cancel_pending_payment_shipment(p_shipment_id uuid, p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_shipment public.shipments;
  v_now timestamptz := now();
begin
  if p_actor_id is null then
    return jsonb_build_object('success', false, 'error', 'actor_required');
  end if;
  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if v_shipment.id is null or v_shipment.owner_id is distinct from p_actor_id then
    return jsonb_build_object('success', false, 'error', 'shipment_not_found');
  end if;
  if exists(select 1 from public.matches where shipment_id = v_shipment.id
    and status in ('pending', 'accepted', 'completed', 'disputed')) then
    return jsonb_build_object('success', false, 'error', 'shipment_not_cancellable');
  end if;
  perform id from public.payments where shipment_id = v_shipment.id order by id for update;
  perform id from public.matches where shipment_id = v_shipment.id order by id for update;
  perform id from public.shipment_report_events where shipment_id = v_shipment.id order by id for update;
  if v_shipment.status = 'cancelled' and exists(select 1 from public.app_audit_logs
    where entity_id = v_shipment.id and event_type = 'dashboard_unpaid_shipment_cancelled' and actor_id = p_actor_id)
    and not exists(select 1 from public.payments where shipment_id = v_shipment.id
      and (status in ('pending', 'processing', 'held', 'released', 'refunded')
        or lower(coalesce(gateway_status, '')) = 'approved' or refund_status <> 'none')) then
    return jsonb_build_object('success', true, 'shipment_id', v_shipment.id, 'idempotent', true);
  end if;
  if v_shipment.status not in ('open', 'matched')
    or exists(select 1 from public.payments where shipment_id = v_shipment.id
      and (status in ('held', 'released', 'refunded') or lower(coalesce(gateway_status, '')) = 'approved'
        or refund_status <> 'none' or dispute_status = 'open'
        or lower(coalesce(metadata->>'manual_refund_required', 'false')) = 'true'))
    or exists(select 1 from public.matches where shipment_id = v_shipment.id
      and status in ('pending', 'accepted', 'completed', 'disputed'))
    or exists(select 1 from public.shipment_report_events where shipment_id = v_shipment.id and status in ('open', 'reviewing')) then
    return jsonb_build_object('success', false, 'error', 'shipment_not_cancellable');
  end if;
  update public.payments set status = 'cancelled', updated_at = v_now,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('dashboard_cancelled_before_confirmation', true,
      'dashboard_cancelled_by', p_actor_id, 'dashboard_cancelled_at', v_now)
  where shipment_id = v_shipment.id and status in ('pending', 'processing');
  update public.shipments set status = 'cancelled' where id = v_shipment.id;
  insert into public.app_audit_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values(p_actor_id,'dashboard_unpaid_shipment_cancelled','shipment',v_shipment.id,
    jsonb_build_object('source','dashboard_unpaid_cancel','cancelled_at',v_now));
  return jsonb_build_object('success', true, 'shipment_id', v_shipment.id, 'idempotent', false);
end;
$function$;

create function public.cancel_waiting_traveler_shipment(p_shipment_id uuid, p_actor_id uuid)
returns jsonb language sql security definer set search_path = ''
as $function$
  select public.process_customer_wallet_refund(p_shipment_id, null, null, p_actor_id,
    'dashboard_waiting_traveler_cancel', null, null);
$function$;

create function public.admin_resolve_dispute_for_customer(
  p_payment_id uuid, p_match_id uuid, p_refund_amount numeric, p_resolution_notes text, p_admin_id uuid
)
returns jsonb language sql security definer set search_path = ''
as $function$
  select public.process_customer_wallet_refund(null, p_payment_id, p_match_id, p_admin_id,
    'admin_dispute_customer_refund', p_refund_amount, p_resolution_notes);
$function$;

-- Reviewing/rejecting an open dispute must serialize with its resolution.
-- Merge metadata from the locked row instead of a stale server-side copy.
create function public.admin_review_dispute(
  p_payment_id uuid, p_match_id uuid, p_action text, p_notes text, p_admin_id uuid
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_shipment public.shipments;
  v_payment public.payments;
  v_match public.matches;
  v_shipment_id uuid;
  v_notes text := nullif(btrim(p_notes), '');
  v_now timestamptz := now();
  v_meta jsonb;
begin
  if p_admin_id is null or not exists (select 1 from public.profiles where id = p_admin_id) then
    return jsonb_build_object('success', false, 'error', 'actor_required');
  end if;
  if p_action is null or p_action not in ('reviewing', 'rejected')
    or p_payment_id is null or (p_action = 'rejected' and v_notes is null) then
    return jsonb_build_object('success', false, 'error', 'invalid_dispute_review');
  end if;
  select shipment_id into v_shipment_id from public.payments where id = p_payment_id;
  select * into v_shipment from public.shipments where id = v_shipment_id for update;
  if v_shipment.id is null then
    return jsonb_build_object('success', false, 'error', 'payment_context_invalid');
  end if;
  perform id from public.payments where shipment_id = v_shipment.id order by id for update;
  select * into v_payment from public.payments where id = p_payment_id and shipment_id = v_shipment.id;
  perform id from public.matches where shipment_id = v_shipment.id order by id for update;
  select * into v_match from public.matches
  where id = coalesce(p_match_id, v_payment.match_id) and shipment_id = v_shipment.id;
  if v_payment.id is null or v_payment.user_id is distinct from v_shipment.owner_id
    or v_match.id is null or v_match.id is distinct from v_payment.match_id then
    return jsonb_build_object('success', false, 'error', 'match_context_invalid');
  end if;

  if p_action = 'rejected' and v_payment.dispute_status = 'resolved'
    and v_match.status = 'resolved' and v_payment.status in ('held', 'released')
    and v_payment.refund_status = 'none'
    and v_payment.metadata ->> 'admin_dispute_resolution' = 'rejected'
    and v_payment.metadata ->> 'admin_dispute_resolved_by' = p_admin_id::text
    and v_payment.metadata ->> 'admin_dispute_notes' = v_notes
    and v_match.resolution_notes = v_notes
    and exists (select 1 from public.app_audit_logs where entity_id = v_payment.id
      and actor_id = p_admin_id and event_type = 'admin_dispute_rejected') then
    return jsonb_build_object('success', true, 'payment_id', v_payment.id, 'match_id', v_match.id, 'idempotent', true);
  end if;
  if v_payment.dispute_status <> 'open' or v_payment.status not in ('held', 'released')
    or v_payment.refund_status <> 'none' or v_match.status not in ('accepted', 'completed', 'disputed') then
    return jsonb_build_object('success', false, 'error', 'dispute_not_open');
  end if;
  if p_action = 'reviewing' then
    if v_payment.metadata ->> 'admin_dispute_status' = 'reviewing'
      and v_payment.metadata ->> 'admin_dispute_reviewed_by' = p_admin_id::text
      and (v_payment.metadata ->> 'admin_dispute_notes') is not distinct from v_notes
      and exists (select 1 from public.app_audit_logs where entity_id = v_payment.id
        and actor_id = p_admin_id and event_type = 'admin_dispute_reviewing') then
      return jsonb_build_object('success', true, 'payment_id', v_payment.id, 'match_id', v_match.id, 'idempotent', true);
    end if;
    v_meta := jsonb_build_object('admin_dispute_status', 'reviewing', 'admin_dispute_reviewed_by', p_admin_id,
      'admin_dispute_reviewed_at', v_now, 'admin_dispute_notes', v_notes);
  else
    v_meta := jsonb_build_object('admin_dispute_status', 'resolved', 'admin_dispute_resolution', 'rejected',
      'admin_dispute_resolved_by', p_admin_id, 'admin_dispute_resolved_at', v_now,
      'admin_dispute_notes', v_notes, 'admin_dispute_refund_amount', null);
  end if;
  update public.payments set metadata = coalesce(metadata, '{}'::jsonb) || v_meta, updated_at = v_now,
    dispute_status = case when p_action = 'rejected' then 'resolved' else dispute_status end,
    dispute_resolved_at = case when p_action = 'rejected' then v_now else dispute_resolved_at end
  where id = v_payment.id;
  if p_action = 'rejected' then
    update public.matches set status = 'resolved', resolved_at = v_now, resolution_notes = v_notes where id = v_match.id;
  end if;
  insert into public.app_audit_logs(actor_id,event_type,entity_type,entity_id,metadata)
  values(p_admin_id, 'admin_dispute_' || p_action, 'payment', v_payment.id,
    jsonb_build_object('match_id', v_match.id, 'shipment_id', v_shipment.id, 'notes', v_notes));
  return jsonb_build_object('success', true, 'payment_id', v_payment.id, 'match_id', v_match.id, 'idempotent', false);
end;
$function$;

-- Preserve the existing traveler resolution, with coherent lock order and
-- explicit actor/context guards. Financial transitions remain unchanged.
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute_for_traveler(p_payment_id uuid, p_match_id uuid DEFAULT NULL::uuid, p_resolution_notes text DEFAULT NULL::text, p_admin_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
declare
  v_payment public.payments;
  v_match public.matches;
  v_shipment public.shipments;
  v_trip public.trips;
  v_shipment_id uuid;
  v_now timestamptz := now();
  v_notes text := nullif(btrim(coalesce(p_resolution_notes, '')), '');
  v_amount numeric := 0;
  v_report_id uuid;
begin
  if p_admin_id is null or not exists(select 1 from public.profiles where id = p_admin_id) then
    return jsonb_build_object('success', false, 'error', 'actor_required');
  end if;
  if p_payment_id is null then
    return jsonb_build_object('success', false, 'error', 'payment_required');
  end if;

  if v_notes is null then
    return jsonb_build_object('success', false, 'error', 'resolution_notes_required');
  end if;

  -- Match the A03 serialization boundary before taking any payment lock.
  select shipment_id into v_shipment_id from public.payments where id = p_payment_id;
  select * into v_shipment from public.shipments where id = v_shipment_id for update;
  if v_shipment.id is null then
    return jsonb_build_object('success', false, 'error', 'payment_not_found');
  end if;
  perform id from public.payments where shipment_id = v_shipment.id order by id for update;
  select * into v_payment from public.payments where id = p_payment_id and shipment_id = v_shipment.id;
  perform id from public.matches where shipment_id = v_shipment.id order by id for update;
  perform id from public.shipment_report_events where shipment_id = v_shipment.id order by id for update;

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

  if v_match.id is null or v_match.id is distinct from v_payment.match_id or v_match.shipment_id is distinct from v_shipment.id or v_payment.user_id is distinct from v_shipment.owner_id then
    return jsonb_build_object('success', false, 'error', 'match_not_found');
  end if;



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
$function$
;

alter function public.process_customer_wallet_refund(uuid,uuid,uuid,uuid,text,numeric,text) owner to postgres;
alter function public.cancel_waiting_traveler_shipment(uuid,uuid) owner to postgres;
alter function public.cancel_pending_payment_shipment(uuid,uuid) owner to postgres;
alter function public.admin_resolve_dispute_for_customer(uuid,uuid,numeric,text,uuid) owner to postgres;
alter function public.admin_review_dispute(uuid,uuid,text,text,uuid) owner to postgres;
revoke all on function public.process_customer_wallet_refund(uuid,uuid,uuid,uuid,text,numeric,text) from public,anon,authenticated,service_role;
revoke all on function public.cancel_waiting_traveler_shipment(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.cancel_pending_payment_shipment(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.admin_resolve_dispute_for_customer(uuid,uuid,numeric,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.admin_review_dispute(uuid,uuid,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.cancel_waiting_traveler_shipment(uuid,uuid) to service_role;
grant execute on function public.cancel_pending_payment_shipment(uuid,uuid) to service_role;
grant execute on function public.admin_resolve_dispute_for_customer(uuid,uuid,numeric,text,uuid) to service_role;
grant execute on function public.admin_review_dispute(uuid,uuid,text,text,uuid) to service_role;
alter function public.admin_resolve_dispute_for_traveler(uuid,uuid,text,uuid) owner to postgres;
revoke all on function public.admin_resolve_dispute_for_traveler(uuid,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.admin_resolve_dispute_for_traveler(uuid,uuid,text,uuid) to service_role;
notify pgrst, 'reload schema';
commit;
