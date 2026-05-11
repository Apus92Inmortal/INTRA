create or replace function public.admin_send_refund(
  p_user_id uuid,
  p_amount numeric,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_entry public.wallet_ledger;
  v_reason text := coalesce(nullif(trim(coalesce(p_reason, '')), ''), 'Devolución manual acreditada por administración');
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'user_required');
  end if;

  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'invalid_amount');
  end if;

  v_entry := public.add_wallet_ledger_entry(
    p_user_id,
    null,
    null,
    null,
    'refund_available_credit',
    'available',
    'credit',
    p_amount,
    v_reason,
    jsonb_build_object(
      'source', 'admin_manual_refund',
      'reason', v_reason
    )
  );

  return jsonb_build_object(
    'success', true,
    'wallet_entry_id', v_entry.id,
    'wallet_id', v_entry.wallet_id,
    'user_id', p_user_id,
    'amount', p_amount
  );
end;
$function$;

revoke all on function public.admin_send_refund(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.admin_send_refund(uuid, numeric, text) to service_role;
