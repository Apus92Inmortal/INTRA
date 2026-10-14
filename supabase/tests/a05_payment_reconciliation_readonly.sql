-- READ ONLY: aggregate preflight for stale Wompi payment attempts.
-- Do not interpret pending rows or missing local events as proof of no charge.
-- Compare each internal reference with Wompi Production through an authorized
-- operator session; do not print references, customer data or provider tokens.
with old as (
  select id, external_reference, gateway_transaction_id, gateway_status, updated_at
  from public.payments
  where gateway_provider = 'wompi' and status in ('pending', 'processing')
    and updated_at < now() - interval '30 minutes'
)
select count(*)::int as stale_30m,
  count(gateway_transaction_id)::int as with_transaction_id,
  count(*) filter (where nullif(btrim(external_reference), '') is not null)::int as with_reference,
  count(*) filter (where lower(coalesce(gateway_status, '')) = 'approved')::int as internally_marked_approved,
  count(*) filter (where exists (select 1 from public.wallet_ledger l where l.payment_id = old.id))::int as with_ledger,
  count(*) filter (where exists (select 1 from public.wompi_webhook_events e
    where e.external_reference = old.external_reference))::int as with_webhook,
  count(*) filter (where exists (select 1 from public.payments other
    where other.external_reference = old.external_reference and other.id <> old.id))::int as duplicate_reference,
  min(updated_at) as oldest_updated_at
from old;
