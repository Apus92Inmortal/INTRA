begin;

-- A01 defense in depth, based on Production definitions inspected 2026-10-13.
-- Preserve existing financial transitions and ACLs; harden missing-actor and
-- NULL relation comparisons. release retains trusted cron/server contexts.
CREATE OR REPLACE FUNCTION public.release_payment(p_payment_id uuid, p_reason text DEFAULT 'delivery_completed'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments;
  v_traveler_user_id uuid;
  v_owner_id uuid;
  v_amount numeric := 0;
begin
  -- current_user is always postgres inside SECURITY DEFINER; it cannot
  -- distinguish an API caller from cron. Check the original SQL role and
  -- login instead. No user-editable JWT metadata is used here.
  if v_actor is null and not (
    coalesce(current_setting('role', true), 'none') = 'service_role'
    or (
      session_user in ('postgres', 'supabase_admin')
      and coalesce(current_setting('role', true), 'none') in ('none', 'postgres', 'supabase_admin')
    )
  ) then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

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

  if v_actor is not null and v_actor is distinct from v_owner_id then
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
$function$
;

CREATE OR REPLACE FUNCTION public.refund_payment(p_payment_id uuid, p_reason text DEFAULT 'cancelled'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments;
  v_traveler_user_id uuid;
  v_owner_id uuid;
  v_amount numeric := 0;
begin
  -- This legacy internal routine has no cron/server caller. Deny a missing
  -- actor even if a privileged wrapper is accidentally added in the future.
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

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

  if v_actor is distinct from v_owner_id and v_actor is distinct from v_traveler_user_id then
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
$function$
;

-- CREATE OR REPLACE preserves ACLs. Assert the A01 policy explicitly so this
-- migration is safe on an environment with a partially applied old history.
revoke execute on function public.release_payment(uuid, text),
  public.refund_payment(uuid, text) from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
