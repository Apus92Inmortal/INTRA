-- READ ONLY. Run before Production migration; any returned rows require
-- manual financial reconciliation. Never delete a ledger entry to pass this.
select payment_id, count(*) as refund_credit_count, sum(amount) as refund_credit_total
from public.wallet_ledger
where entry_type = 'refund_available_credit' and payment_id is not null
group by payment_id
having count(*) > 1;

select p.id as payment_id, p.status, p.refund_status, l.user_id, l.amount,
  p.metadata ->> 'wallet_refund_source' as refund_source
from public.payments p
join public.wallet_ledger l on l.payment_id = p.id and l.entry_type = 'refund_available_credit'
where p.status <> 'refunded' or p.refund_status <> 'refunded';

-- Post-migration ACL/index check. All booleans must be true.
select
  not has_function_privilege('anon', 'public.cancel_pending_payment_shipment(uuid,uuid)', 'execute') as unpaid_anon_blocked,
  not has_function_privilege('authenticated', 'public.cancel_pending_payment_shipment(uuid,uuid)', 'execute') as unpaid_browser_blocked,
  has_function_privilege('service_role', 'public.cancel_pending_payment_shipment(uuid,uuid)', 'execute') as unpaid_server_allowed,
  not has_function_privilege('anon', 'public.cancel_waiting_traveler_shipment(uuid,uuid)', 'execute') as dashboard_anon_blocked,
  not has_function_privilege('authenticated', 'public.cancel_waiting_traveler_shipment(uuid,uuid)', 'execute') as dashboard_authenticated_blocked,
  has_function_privilege('service_role', 'public.cancel_waiting_traveler_shipment(uuid,uuid)', 'execute') as dashboard_server_allowed,
  not has_function_privilege('anon', 'public.admin_resolve_dispute_for_customer(uuid,uuid,numeric,text,uuid)', 'execute') as admin_anon_blocked,
  not has_function_privilege('authenticated', 'public.admin_resolve_dispute_for_customer(uuid,uuid,numeric,text,uuid)', 'execute') as admin_authenticated_blocked,
  has_function_privilege('service_role', 'public.admin_resolve_dispute_for_customer(uuid,uuid,numeric,text,uuid)', 'execute') as admin_server_allowed,
  not has_function_privilege('anon', 'public.admin_review_dispute(uuid,uuid,text,text,uuid)', 'execute') as review_anon_blocked,
  not has_function_privilege('authenticated', 'public.admin_review_dispute(uuid,uuid,text,text,uuid)', 'execute') as review_browser_blocked,
  has_function_privilege('service_role', 'public.admin_review_dispute(uuid,uuid,text,text,uuid)', 'execute') as review_server_allowed,
  not has_function_privilege('authenticated', 'public.admin_resolve_dispute_for_traveler(uuid,uuid,text,uuid)', 'execute') as traveler_browser_blocked,
  has_function_privilege('service_role', 'public.admin_resolve_dispute_for_traveler(uuid,uuid,text,uuid)', 'execute') as traveler_server_allowed,
  not has_function_privilege('service_role', 'public.process_customer_wallet_refund(uuid,uuid,uuid,uuid,text,numeric,text)', 'execute') as internal_helper_blocked,
  exists (select 1 from pg_index where indexrelid = 'public.wallet_ledger_refund_credit_once_idx'::regclass and indisunique and indisvalid) as unique_credit_index_valid;
