begin;

create or replace function public.calculate_payment_amount(p_base_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_config public.fee_configs;
  v_gateway_percent_factor numeric := 0;
  v_intra_fee numeric := 0;
  v_total numeric := 0;
  v_gateway_fee numeric := 0;
  v_net numeric := 0;
begin
  select *
  into v_config
  from public.fee_configs
  where is_active = true
  order by updated_at desc, created_at desc
  limit 1;

  if v_config.id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'fee_config_not_found'
    );
  end if;

  if p_base_amount is null or p_base_amount <= 0 then
    return jsonb_build_object(
      'success', false,
      'error', 'below_minimum',
      'minimum_amount', v_config.min_shipment_amount_cop
    );
  end if;

  if p_base_amount < v_config.min_shipment_amount_cop then
    return jsonb_build_object(
      'success', false,
      'error', 'below_minimum',
      'minimum_amount', v_config.min_shipment_amount_cop
    );
  end if;

  v_intra_fee := ceil((p_base_amount * v_config.customer_fee_percent / 100) + v_config.customer_fee_fixed_cop);
  v_gateway_percent_factor := coalesce(v_config.gateway_fee_percent, 0) / 100;

  if v_gateway_percent_factor >= 1 then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_gateway_fee_config'
    );
  end if;

  v_total := ceil(
    (p_base_amount + v_intra_fee + coalesce(v_config.gateway_fee_fixed_cop, 0))
    / (1 - v_gateway_percent_factor)
  );

  v_gateway_fee := greatest(v_total - p_base_amount - v_intra_fee, 0);
  v_net := greatest(v_total - v_gateway_fee, 0);

  return jsonb_build_object(
    'success', true,
    'traveler_amount', p_base_amount,
    'gross_amount', v_total,
    'amount', v_total,
    'gateway_fee_estimated', v_gateway_fee,
    'intra_fee', v_intra_fee,
    'net_amount_received', v_net,
    'minimum_amount', v_config.min_shipment_amount_cop,
    'minimum_payout', v_config.minimum_payout_cop,
    'dispute_window_hours', v_config.dispute_window_hours,
    'dispute_sla_hours', v_config.dispute_sla_hours,
    'auto_release_hours', v_config.auto_release_hours,
    'currency', 'COP'
  );
end;
$function$;

commit;
