begin;

drop table if exists public.reconciliation_logs;

alter table if exists public.bold_webhook_events
  rename to wompi_webhook_events;

alter table if exists public.wompi_webhook_events
  rename constraint bold_webhook_events_pkey to wompi_webhook_events_pkey;

alter table if exists public.wompi_webhook_events
  rename constraint bold_webhook_events_event_key_key to wompi_webhook_events_event_key_key;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_bold_webhook'
      and pg_get_function_identity_arguments(p.oid) = 'p_gateway_transaction_id text, p_status text, p_external_reference text, p_payload jsonb'
  ) then
    alter function public.process_bold_webhook(text, text, text, jsonb)
      rename to process_wompi_payment_event;
  end if;
end $$;

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
begin
  v_normalized_status := lower(coalesce(p_status, ''));

  select *
  into v_payment
  from public.payments
  where (
    gateway_transaction_id = p_gateway_transaction_id
    or (p_external_reference is not null and external_reference = p_external_reference)
  )
  order by created_at desc
  limit 1
  for update;

  if v_payment.id is null then
    return jsonb_build_object('success', false, 'error', 'payment_not_found');
  end if;

  update public.payments
  set
    gateway_transaction_id = coalesce(p_gateway_transaction_id, gateway_transaction_id),
    gateway_status = p_status,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_wompi_event', coalesce(p_payload, '{}'::jsonb))
  where id = v_payment.id;

  if v_normalized_status in ('approved', 'paid', 'succeeded', 'success') then
    update public.payments
    set status = case when status = 'pending' then 'held' else status end,
        updated_at = now()
    where id = v_payment.id;
  elsif v_normalized_status in ('failed', 'rejected', 'declined') then
    update public.payments
    set status = 'failed',
        updated_at = now()
    where id = v_payment.id;
  elsif v_normalized_status in ('cancelled', 'canceled', 'voided') then
    update public.payments
    set status = 'cancelled',
        updated_at = now()
    where id = v_payment.id;
  end if;

  return jsonb_build_object('success', true, 'payment_id', v_payment.id);
end;
$function$;

grant execute on function public.process_wompi_payment_event(text, text, text, jsonb) to service_role;

commit;
