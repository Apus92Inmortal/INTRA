begin;

-- A01: These SECURITY DEFINER routines must only be invoked by trusted SQL
-- workflows. They are not client-facing RPCs: release_payment is called by
-- confirm_shipment_delivery and auto_release_due_payments; refund_payment has
-- no current application caller; and the notification helper is called by
-- server-side trigger functions.
-- Those callers execute as their postgres owner and keep working after the
-- API roles lose direct EXECUTE. The application does not call these RPCs.
revoke execute on function public.release_payment(uuid, text)
  from public, anon, authenticated, service_role;

revoke execute on function public.refund_payment(uuid, text)
  from public, anon, authenticated, service_role;

revoke execute on function public.create_operational_notification(
  uuid, text, text, text, uuid, text, boolean
)
  from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
