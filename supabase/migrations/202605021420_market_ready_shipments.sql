create or replace function public.get_payment_ready_shipments(p_shipment_ids uuid[])
returns table (shipment_id uuid)
language sql
security definer
set search_path to 'public'
as $function$
  with latest_payments as (
    select distinct on (p.shipment_id)
      p.shipment_id,
      p.status
    from public.payments p
    where p.shipment_id = any(coalesce(p_shipment_ids, '{}'::uuid[]))
      and public.can_view_shipment(p.shipment_id)
    order by p.shipment_id, p.created_at desc, p.updated_at desc, p.id desc
  )
  select latest_payments.shipment_id
  from latest_payments
  where latest_payments.status in ('held', 'released');
$function$;

grant execute on function public.get_payment_ready_shipments(uuid[]) to authenticated;
grant execute on function public.get_payment_ready_shipments(uuid[]) to service_role;
