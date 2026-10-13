begin;

-- Keep the existing service-only signature for the verified checkout redirect.
create or replace function public.process_wompi_payment_event(
  p_gateway_transaction_id text, p_status text,
  p_external_reference text default null, p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $function$
declare
  v_payment public.payments;
  v_transaction jsonb;
  v_status text := lower(coalesce(p_status, ''));
  v_next_status text;
  v_count integer;
begin
  v_transaction := coalesce(p_payload -> 'verified_transaction', p_payload -> 'transaction', p_payload #> '{data,transaction}');
  if nullif(trim(p_gateway_transaction_id), '') is null or nullif(trim(p_external_reference), '') is null then
    return jsonb_build_object('success', false, 'error', 'missing_identifiers');
  end if;
  if v_status not in ('pending','approved','declined','error','voided') then
    return jsonb_build_object('success', false, 'error', 'unsupported_status');
  end if;
  if v_transaction is null or v_transaction ->> 'id' is distinct from p_gateway_transaction_id
    or v_transaction ->> 'reference' is distinct from p_external_reference
    or lower(v_transaction ->> 'status') is distinct from v_status then
    return jsonb_build_object('success', false, 'error', 'transaction_identity_mismatch');
  end if;
  select count(*) into v_count from public.payments where external_reference = p_external_reference;
  if v_count = 0 then return jsonb_build_object('success', false, 'error', 'payment_not_found'); end if;
  if v_count <> 1 then return jsonb_build_object('success', false, 'error', 'ambiguous_reference'); end if;
  select * into v_payment from public.payments where external_reference = p_external_reference for update;
  if v_payment.gateway_provider <> 'wompi' or
    (v_payment.gateway_transaction_id is not null and v_payment.gateway_transaction_id <> p_gateway_transaction_id) then
    return jsonb_build_object('success', false, 'error', 'transaction_mismatch');
  end if;
  if exists(select 1 from public.payments where gateway_transaction_id=p_gateway_transaction_id and id<>v_payment.id) then
    return jsonb_build_object('success', false, 'error', 'transaction_already_attached');
  end if;
  if jsonb_typeof(v_transaction -> 'amount_in_cents') is distinct from 'number' then
    return jsonb_build_object('success', false, 'error', 'amount_mismatch');
  end if;
  if v_payment.amount <= 0 or (v_transaction ->> 'amount_in_cents')::numeric <> round(v_payment.amount * 100) then
    return jsonb_build_object('success', false, 'error', 'amount_mismatch');
  end if;
  if v_transaction ->> 'currency' is distinct from v_payment.currency then
    return jsonb_build_object('success', false, 'error', 'currency_mismatch');
  end if;
  -- Checkout confirmation can arrive after the user cancelled an unpaid
  -- shipment. Retain an unprocessed event for explicit operator reconciliation;
  -- do not restore the shipment, invent wallet credit or acknowledge a refund.
  if v_status = 'approved' and v_payment.status in ('pending', 'processing', 'cancelled')
    and exists(select 1 from public.shipments where id = v_payment.shipment_id and status = 'cancelled') then
    return jsonb_build_object('success', false, 'error', 'shipment_cancelled_before_approval');
  end if;
  -- Never regress an approved balance or silently turn a final rejection into a hold.
  if v_payment.status in ('held','released','refunded') then
    if v_status='pending' then
      return jsonb_build_object('success',true,'payment_id',v_payment.id,'status',v_payment.status,'unchanged',true,'reason','stale_status');
    end if;
    if v_status <> 'approved' then
      return jsonb_build_object('success', false, 'error', 'terminal_state_conflict');
    end if;
    return jsonb_build_object('success', true, 'payment_id', v_payment.id, 'status', v_payment.status, 'unchanged', true);
  end if;
  if v_payment.status in ('failed','cancelled') then
    if (v_payment.status='failed' and v_status in ('declined','error')) or
       (v_payment.status='cancelled' and v_status='voided') then
      return jsonb_build_object('success', true, 'payment_id', v_payment.id, 'status', v_payment.status, 'unchanged', true);
    end if;
    return jsonb_build_object('success', false, 'error', 'terminal_state_conflict');
  end if;
  if v_payment.status not in ('pending','processing') then
    return jsonb_build_object('success', false, 'error', 'payment_not_processable');
  end if;
  if v_status='approved' and (v_payment.refund_status<>'none' or lower(coalesce(v_payment.metadata->>'manual_refund_required','false'))='true') then
    return jsonb_build_object('success', false, 'error', 'refund_in_progress');
  end if;
  v_next_status := case v_status when 'approved' then 'held' when 'declined' then 'failed' when 'error' then 'failed' when 'voided' then 'cancelled' else v_payment.status end;
  update public.payments set gateway_transaction_id=p_gateway_transaction_id,
    gateway_status=upper(v_status), status=v_next_status,
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('last_wompi_event',p_payload), updated_at=now()
  where id=v_payment.id;
  return jsonb_build_object('success',true,'payment_id',v_payment.id,'previous_status',v_payment.status,'status',v_next_status);
end;
$function$;
revoke all on function public.process_wompi_payment_event(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.process_wompi_payment_event(text,text,text,jsonb) to service_role;

-- The event row lock serializes deliveries. Success marking and payment writes
-- share one transaction; a database exception rolls both back. Business errors
-- remain unprocessed and retain a reconciliation reason for provider/operator retry.
create or replace function public.ingest_wompi_payment_event(
  p_event_key text, p_event_type text, p_gateway_transaction_id text,
  p_status text, p_external_reference text, p_payload jsonb, p_headers jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $function$
declare v_event public.wompi_webhook_events; v_result jsonb;
begin
  if nullif(trim(p_event_key),'') is null or length(p_event_key)>512 then
    return jsonb_build_object('success',false,'error','invalid_event_key');
  end if;
  insert into public.wompi_webhook_events(event_key,event_type,event_status,gateway_transaction_id,external_reference,payload,headers)
  values(p_event_key,p_event_type,p_status,p_gateway_transaction_id,p_external_reference,coalesce(p_payload,'{}'),coalesce(p_headers,'{}'))
  on conflict(event_key) do nothing;
  select * into v_event from public.wompi_webhook_events where event_key=p_event_key for update;
  -- A key retry may add provider-verified fields, but cannot change which
  -- transaction/event kind the signed delivery identified. The stored raw
  -- reference/status are not authoritative and may differ from verification.
  if v_event.event_type is distinct from p_event_type or
    (v_event.gateway_transaction_id is not null and p_gateway_transaction_id is not null
      and v_event.gateway_transaction_id <> p_gateway_transaction_id) then
    return jsonb_build_object('success',false,'error','event_identity_conflict','event_id',v_event.id);
  end if;
  if v_event.processed then
    return jsonb_build_object('success',true,'duplicate',true,'event_id',v_event.id);
  end if;
  if p_event_type not in ('transaction.updated','wompi_redirect') then
    v_result:=jsonb_build_object('success',true,'skipped',true,'reason','unsupported_event_type');
  else
    v_result:=public.process_wompi_payment_event(p_gateway_transaction_id,p_status,p_external_reference,p_payload);
  end if;
  if coalesce((v_result->>'success')::boolean,false) then
    update public.wompi_webhook_events set processed=true,processed_at=now(),processing_error=null,
      event_status=p_status,payload=coalesce(p_payload,'{}'),headers=coalesce(p_headers,'{}') where id=v_event.id;
  else
    update public.wompi_webhook_events set processed=false,processed_at=null,
      processing_error=coalesce(v_result->>'error','invalid_rpc_result'),payload=coalesce(p_payload,'{}') where id=v_event.id;
  end if;
  return coalesce(v_result,'{}'::jsonb)||jsonb_build_object('event_id',v_event.id);
end;
$function$;
revoke all on function public.ingest_wompi_payment_event(text,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_wompi_payment_event(text,text,text,text,text,jsonb,jsonb) to service_role;

-- Persist a signed delivery before provider lookup so an API outage remains
-- visible and can be retried after Wompi's finite automatic retry window.
create or replace function public.record_wompi_delivery(
  p_event_key text,p_event_type text,p_gateway_transaction_id text,
  p_status text,p_external_reference text,p_payload jsonb,p_headers jsonb
) returns jsonb language plpgsql security definer set search_path='' as $function$
declare v_event public.wompi_webhook_events;
begin
  if nullif(trim(p_event_key),'') is null or length(p_event_key)>512 then
    return jsonb_build_object('success',false,'error','invalid_event_key');
  end if;
  insert into public.wompi_webhook_events(event_key,event_type,event_status,gateway_transaction_id,external_reference,payload,headers,processing_error)
  values(p_event_key,p_event_type,p_status,p_gateway_transaction_id,p_external_reference,coalesce(p_payload,'{}'),coalesce(p_headers,'{}'),'awaiting_provider_verification')
  on conflict(event_key) do nothing;
  select * into v_event from public.wompi_webhook_events where event_key=p_event_key;
  if v_event.event_type is distinct from p_event_type or
    (v_event.gateway_transaction_id is not null and p_gateway_transaction_id is not null
      and v_event.gateway_transaction_id <> p_gateway_transaction_id) then
    return jsonb_build_object('success',false,'error','event_identity_conflict','event_id',v_event.id);
  end if;
  return jsonb_build_object('success',true,'processed',v_event.processed,'event_id',v_event.id);
end;
$function$;
revoke all on function public.record_wompi_delivery(text,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.record_wompi_delivery(text,text,text,text,text,jsonb,jsonb) to service_role;
alter function public.process_wompi_payment_event(text,text,text,jsonb) owner to postgres;
alter function public.ingest_wompi_payment_event(text,text,text,text,text,jsonb,jsonb) owner to postgres;
alter function public.record_wompi_delivery(text,text,text,text,text,jsonb,jsonb) owner to postgres;
notify pgrst,'reload schema';
commit;
