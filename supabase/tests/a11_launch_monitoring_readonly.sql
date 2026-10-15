-- READ ONLY, server/operator access only. Aggregates avoid PII and payloads.
-- Initial pilot thresholds; agree operating windows before routing alerts.
select 'unprocessed_webhooks_15m' as signal,
  count(*) as affected_count, min(created_at) as oldest_at
from public.wompi_webhook_events where not processed and created_at < now() - interval '15 minutes'
union all
select 'webhook_errors_unprocessed', count(*), min(created_at)
from public.wompi_webhook_events where not processed and nullif(processing_error, '') is not null
union all
select 'pending_payments_30m', count(*), min(updated_at)
from public.payments where gateway_provider = 'wompi' and status in ('pending', 'processing')
  and updated_at < now() - interval '30 minutes'
union all
select 'manual_or_failed_refunds_1d', count(*), min(updated_at)
from public.payments where refund_status in ('manual_required', 'pending', 'processing', 'failed')
  and updated_at < now() - interval '1 day'
union all
select 'held_auto_release_overdue_26h', count(*), min(auto_release_at)
from public.payments where status = 'held' and dispute_status = 'none'
  and auto_release_at < now() - interval '26 hours'
union all
select 'wallets_negative', count(*), min(updated_at)
from public.wallets where available_balance < 0 or pending_balance < 0;
