-- Read-only checks. Each row should have passed = true after A02.
with checks as (
  select 'authenticated_payments_read' as check_name,
    has_table_privilege('authenticated', 'public.payments', 'SELECT') as passed
  union all select 'authenticated_payouts_read',
    has_table_privilege('authenticated', 'public.payouts', 'SELECT')
  union all select 'authenticated_payments_no_write',
    not has_table_privilege('authenticated', 'public.payments',
      'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  union all select 'authenticated_payouts_no_write',
    not has_table_privilege('authenticated', 'public.payouts',
      'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  union all select 'anon_payments_no_write',
    not has_table_privilege('anon', 'public.payments', 'INSERT,UPDATE,DELETE')
  union all select 'anon_payouts_no_write',
    not has_table_privilege('anon', 'public.payouts', 'INSERT,UPDATE,DELETE')
  union all select 'service_role_payments_write',
    has_table_privilege('service_role', 'public.payments', 'INSERT')
    and has_table_privilege('service_role', 'public.payments', 'UPDATE')
  union all select 'service_role_payouts_write',
    has_table_privilege('service_role', 'public.payouts', 'INSERT')
    and has_table_privilege('service_role', 'public.payouts', 'UPDATE')
  union all select 'retry_rpc_authenticated_only',
    has_function_privilege('authenticated',
      'public.create_payment_retry(uuid,uuid,boolean,text)', 'EXECUTE')
    and not has_function_privilege('anon',
      'public.create_payment_retry(uuid,uuid,boolean,text)', 'EXECUTE')
  union all select 'checkout_draft_still_callable',
    has_function_privilege('authenticated',
      'public.create_shipment_with_payment_draft(uuid,uuid,text,text,numeric,numeric,boolean,text,boolean,boolean,boolean,text,text,inet,text,boolean,text)',
      'EXECUTE')
  union all select 'payout_request_still_callable',
    has_function_privilege('authenticated',
      'public.request_payout(numeric,uuid,text,boolean,text,text)', 'EXECUTE')
  union all select 'retry_rpc_definer_owned_by_postgres',
    exists (
      select 1 from pg_proc p
      where p.oid = 'public.create_payment_retry(uuid,uuid,boolean,text)'::regprocedure
        and p.prosecdef
        and pg_get_userbyid(p.proowner) = 'postgres'
    )
  union all select 'financial_rls_and_reads_preserved',
    (select relrowsecurity from pg_class where oid = 'public.payments'::regclass)
    and (select relrowsecurity from pg_class where oid = 'public.payouts'::regclass)
    and exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'payments'
        and policyname = 'payments_select_related_users' and cmd = 'SELECT'
    )
    and exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'payouts'
        and policyname = 'payouts_select_own' and cmd = 'SELECT'
    )
  union all select 'no_stale_financial_write_policies',
    not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename in ('payments', 'payouts')
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    )
)
select check_name, passed from checks order by check_name;
