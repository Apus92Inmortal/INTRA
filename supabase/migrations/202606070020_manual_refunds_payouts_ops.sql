begin;

-- F3 manual payouts hardening:
-- - marking a payout as paid must require an external reference;
-- - wallet/ledger checks happen before the payout becomes paid;
-- - a paid ledger row can only be inserted once per payout.

create unique index if not exists wallet_ledger_payout_paid_once_idx
  on public.wallet_ledger (payout_id)
  where payout_id is not null
    and entry_type = 'payout_paid_debit';

create or replace function public.admin_update_payout_status(
  p_payout_id uuid,
  p_status text,
  p_review_notes text default null,
  p_paid_reference text default null,
  p_admin_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_payout public.payouts;
  v_wallet public.wallets;
  v_now timestamptz := now();
  v_ledger_id uuid;
  v_review_notes text := nullif(btrim(coalesce(p_review_notes, '')), '');
  v_paid_reference text := nullif(btrim(coalesce(p_paid_reference, '')), '');
begin
  if p_payout_id is null then
    return jsonb_build_object('success', false, 'error', 'payout_required');
  end if;

  if p_status not in ('approved', 'rejected', 'paid') then
    return jsonb_build_object('success', false, 'error', 'invalid_payout_status');
  end if;

  select *
  into v_payout
  from public.payouts
  where id = p_payout_id
  for update;

  if v_payout.id is null then
    return jsonb_build_object('success', false, 'error', 'payout_not_found');
  end if;

  if v_payout.status = 'paid' then
    if p_status = 'paid' then
      return jsonb_build_object('success', true, 'payout_id', v_payout.id, 'status', 'paid', 'idempotent', true);
    end if;

    return jsonb_build_object('success', false, 'error', 'invalid_payout_transition');
  end if;

  if p_status = 'approved' and v_payout.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'invalid_payout_transition');
  end if;

  if p_status = 'rejected' and v_payout.status not in ('pending', 'approved') then
    return jsonb_build_object('success', false, 'error', 'invalid_payout_transition');
  end if;

  if p_status = 'paid' and v_payout.status <> 'approved' then
    return jsonb_build_object('success', false, 'error', 'payout_must_be_approved_first');
  end if;

  if p_status = 'paid' and v_paid_reference is null then
    return jsonb_build_object('success', false, 'error', 'paid_reference_required');
  end if;

  if p_status = 'paid' then
    select *
    into v_wallet
    from public.wallets
    where id = v_payout.wallet_id
    for update;

    if v_wallet.id is null then
      return jsonb_build_object('success', false, 'error', 'wallet_not_found');
    end if;

    if coalesce(v_wallet.available_balance, 0) < v_payout.amount then
      return jsonb_build_object('success', false, 'error', 'insufficient_wallet_balance');
    end if;

    insert into public.wallet_ledger (
      wallet_id,
      user_id,
      payout_id,
      entry_type,
      balance_type,
      direction,
      amount,
      description,
      metadata
    ) values (
      v_payout.wallet_id,
      v_payout.traveler_user_id,
      v_payout.id,
      'payout_paid_debit',
      'available',
      'debit',
      v_payout.amount,
      'Retiro pagado al usuario',
      jsonb_build_object(
        'source', 'admin_payout_review',
        'paid_reference', v_paid_reference,
        'admin_id', p_admin_id
      )
    )
    on conflict do nothing
    returning id into v_ledger_id;

    if v_ledger_id is null then
      return jsonb_build_object('success', false, 'error', 'payout_already_has_paid_ledger');
    end if;

    update public.wallets
    set
      available_balance = coalesce(available_balance, 0) - v_payout.amount,
      total_withdrawn = coalesce(total_withdrawn, 0) + v_payout.amount,
      updated_at = v_now
    where id = v_wallet.id;
  end if;

  update public.payouts
  set
    status = p_status,
    reviewed_at = case when p_status in ('approved', 'rejected', 'paid') then v_now else reviewed_at end,
    paid_at = case when p_status = 'paid' then v_now else paid_at end,
    paid_reference = case when p_status = 'paid' then v_paid_reference else paid_reference end,
    review_notes = v_review_notes,
    updated_at = v_now
  where id = v_payout.id;

  insert into public.app_audit_logs (actor_id, event_type, entity_type, entity_id, metadata)
  values (
    p_admin_id,
    'payout_status_updated',
    'payout',
    v_payout.id,
    jsonb_build_object(
      'previous_status', v_payout.status,
      'new_status', p_status,
      'amount', v_payout.amount,
      'paid_reference', v_paid_reference
    )
  );

  return jsonb_build_object('success', true, 'payout_id', v_payout.id, 'status', p_status);
end;
$function$;

revoke execute on function public.admin_update_payout_status(uuid, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_update_payout_status(uuid, text, text, text, uuid)
  to service_role;

notify pgrst, 'reload schema';

commit;
