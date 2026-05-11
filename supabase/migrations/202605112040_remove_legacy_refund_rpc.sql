revoke execute on function public.refund_payment(uuid, text) from public, anon, authenticated, service_role;
drop function if exists public.refund_payment(uuid, text);
