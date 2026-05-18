create unique index if not exists wallet_ledger_refund_available_credit_once_idx
  on public.wallet_ledger (payment_id, entry_type)
  where entry_type = 'refund_available_credit'
    and payment_id is not null;

create or replace function public.admin_resolve_dispute_customer_refund(
  p_payment_id uuid,
  p_admin_user_id uuid,
  p_refund_amount numeric,
  p_resolution_notes text default null,
  p_ledger_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payment public.payments;
  v_match public.matches;
  v_traveler_user_id uuid;
  v_customer_user_id uuid;
  v_traveler_amount numeric := 0;
  v_resolution_notes text := nullif(trim(coalesce(p_resolution_notes, '')), '');
  v_ledger_reason text := coalesce(
    nullif(trim(coalesce(p_ledger_reason, '')), ''),
    'Devolución manual por disputa acreditada por administración'
  );
begin
  if p_payment_id is null then
    return jsonb_build_object('success', false, 'error', 'payment_required');
  end if;

  if p_admin_user_id is null then
    return jsonb_build_object('success', false, 'error', 'admin_required');
  end if;

  if p_refund_amount is null or p_refund_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_refund_amount');
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if v_payment.id is null then
    return jsonb_build_object('success', false, 'error', 'payment_not_found');
  end if;

  if v_payment.dispute_status <> 'open' then
    return jsonb_build_object('success', false, 'error', 'dispute_not_open');
  end if;

  if v_payment.status = 'refunded' then
    return jsonb_build_object('success', false, 'error', 'already_processed');
  end if;

  select m.*,
         t.traveler_id,
         s.owner_id
  into v_match, v_traveler_user_id, v_customer_user_id
  from public.matches m
  join public.trips t on t.id = m.trip_id
  join public.shipments s on s.id = m.shipment_id
  where m.id = v_payment.match_id
  for update of m;

  if v_match.id is null then
    return jsonb_build_object('success', false, 'error', 'match_not_found');
  end if;

  v_traveler_amount := coalesce(v_payment.traveler_amount, v_payment.amount, 0);

  if v_traveler_user_id is not null and v_traveler_amount > 0 then
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
        v_traveler_user_id,
        v_payment.id,
        v_payment.match_id,
        null,
        'refund_pending_debit',
        'pending',
        'debit',
        v_traveler_amount,
        'Reverso de retención temporal por disputa resuelta a favor del cliente',
        jsonb_build_object(
          'reason', v_ledger_reason,
          'source', 'admin_dispute_customer_refund'
        )
      );
    end if;

    if exists (
      select 1
      from public.wallet_ledger
      where payment_id = v_payment.id
        and entry_type = 'release_available_credit'
    ) and not exists (
      select 1
      from public.wallet_ledger
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
        v_traveler_amount,
        'Ajuste de saldo por disputa resuelta a favor del cliente',
        jsonb_build_object(
          'reason', v_ledger_reason,
          'source', 'admin_dispute_customer_refund'
        )
      );
    end if;

    perform public.sync_wallet_balance(v_traveler_user_id);
  end if;

  if v_customer_user_id is null then
    return jsonb_build_object('success', false, 'error', 'customer_not_found');
  end if;

  if not exists (
    select 1
    from public.wallet_ledger
    where payment_id = v_payment.id
      and entry_type = 'refund_available_credit'
  ) then
    perform public.add_wallet_ledger_entry(
      v_customer_user_id,
      v_payment.id,
      v_payment.match_id,
      null,
      'refund_available_credit',
      'available',
      'credit',
      p_refund_amount,
      v_ledger_reason,
      jsonb_build_object(
        'reason', v_ledger_reason,
        'source', 'admin_dispute_customer_refund'
      )
    );
  end if;

  perform public.sync_wallet_balance(v_customer_user_id);

  update public.payments
  set
    status = 'refunded',
    refunded_at = now(),
    dispute_status = 'resolved',
    dispute_resolved_at = now(),
    updated_at = now(),
    metadata = coalesce(v_payment.metadata, '{}'::jsonb) || jsonb_build_object(
      'admin_dispute_status', 'resolved',
      'admin_dispute_resolution', 'customer_refund',
      'admin_dispute_resolved_by', p_admin_user_id,
      'admin_dispute_resolved_at', now(),
      'admin_dispute_notes', v_resolution_notes,
      'admin_dispute_refund_amount', p_refund_amount
    )
  where id = v_payment.id;

  update public.matches
  set
    status = 'resolved',
    resolved_at = now(),
    resolution_notes = coalesce(v_resolution_notes, 'Disputa resuelta a favor del cliente con devolución manual.')
  where id = v_match.id;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'match_id', v_match.id,
    'customer_user_id', v_customer_user_id,
    'traveler_user_id', v_traveler_user_id,
    'refund_amount', p_refund_amount,
    'traveler_amount_reverted', v_traveler_amount
  );
end;
$function$;

revoke all on function public.admin_resolve_dispute_customer_refund(uuid, uuid, numeric, text, text) from public, anon, authenticated;
grant execute on function public.admin_resolve_dispute_customer_refund(uuid, uuid, numeric, text, text) to service_role;
