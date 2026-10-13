-- READ ONLY before/after migration. Ambiguous references require manual
-- reconciliation; the event processor deliberately refuses to pick a row.
select external_reference, count(*) as payment_count
from public.payments
where external_reference is not null
group by external_reference
having count(*) > 1;

-- Post-migration: passed must be true for every row.
select p.proname,
  (not has_function_privilege('anon', p.oid, 'execute')
    and not has_function_privilege('authenticated', p.oid, 'execute')
    and has_function_privilege('service_role', p.oid, 'execute')
    and p.prosecdef and pg_get_userbyid(p.proowner) = 'postgres'
    and p.proconfig @> array['search_path=""']::text[]) as passed
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('process_wompi_payment_event', 'ingest_wompi_payment_event', 'record_wompi_delivery');

-- Existing events needing reconciliation, without exposing raw payloads.
select processed, processing_error, count(*) as event_count
from public.wompi_webhook_events
group by processed, processing_error;
