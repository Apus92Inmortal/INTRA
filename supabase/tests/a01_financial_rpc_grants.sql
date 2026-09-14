-- Read-only verification after applying A01 to an isolated DB and, later,
-- production. All three `blocked_*` columns must be true, while the two
-- legitimate entry-point checks must remain true.
select
  not has_function_privilege('anon',
    'public.release_payment(uuid,text)', 'EXECUTE')
    and not has_function_privilege('authenticated',
      'public.release_payment(uuid,text)', 'EXECUTE')
    and not has_function_privilege('service_role',
      'public.release_payment(uuid,text)', 'EXECUTE') as blocked_release,
  not has_function_privilege('anon',
    'public.refund_payment(uuid,text)', 'EXECUTE')
    and not has_function_privilege('authenticated',
      'public.refund_payment(uuid,text)', 'EXECUTE')
    and not has_function_privilege('service_role',
      'public.refund_payment(uuid,text)', 'EXECUTE') as blocked_refund,
  not has_function_privilege('anon',
    'public.create_operational_notification(uuid,text,text,text,uuid,text,boolean)',
    'EXECUTE')
    and not has_function_privilege('authenticated',
      'public.create_operational_notification(uuid,text,text,text,uuid,text,boolean)',
      'EXECUTE')
    and not has_function_privilege('service_role',
      'public.create_operational_notification(uuid,text,text,text,uuid,text,boolean)',
      'EXECUTE') as blocked_notification_helper,
  has_function_privilege('authenticated',
    'public.confirm_shipment_delivery(uuid)', 'EXECUTE')
    as customer_delivery_still_callable,
  has_function_privilege('service_role',
    'public.auto_release_due_payments(integer)', 'EXECUTE')
    as cron_still_callable;
