-- Read-only postflight. Every row must have passed=true.
with checks as (
  select 'workflow_rls_enabled' as check_name, not exists (
    select 1 from pg_class
    where oid in ('public.shipments'::regclass, 'public.trips'::regclass,
      'public.matches'::regclass, 'public.messages'::regclass) and not relrowsecurity
  ) as passed
  union all select 'authenticated_workflows_read_only',
    not exists (
      select 1 from unnest(array['shipments','trips','matches']) t(name)
      where has_table_privilege('authenticated','public.' || t.name,
        'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or not has_table_privilege('authenticated','public.' || t.name,'SELECT')
    )
  union all select 'anon_no_workflow_table_access',
    not exists (
      select 1 from unnest(array['shipments','trips','matches','messages']) t(name)
      where has_table_privilege('anon','public.' || t.name,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    )
  union all select 'server_workflow_writes_preserved',
    not exists (
      select 1 from unnest(array['shipments','trips','matches','messages']) t(name)
      where not has_table_privilege('service_role','public.' || t.name,'INSERT')
        or not has_table_privilege('service_role','public.' || t.name,'UPDATE')
    )
  union all select 'no_workflow_write_policies',
    not exists (
      select 1 from pg_policies where schemaname='public'
        and tablename in ('shipments','trips','matches')
        and cmd <> 'SELECT'
    )
  union all select 'only_contextual_shipment_policy',
    (select count(*) = 1 and bool_and(
      cmd='SELECT' and roles = array['authenticated']::name[]
      and policyname = 'shipments_select_contextual'
      and qual = 'can_view_shipment(id)')
      from pg_policies where schemaname='public' and tablename='shipments')
  union all select 'no_anon_private_security_definer',
    not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.prosecdef
        and p.proname <> 'calculate_payment_amount'
        and has_function_privilege('anon',p.oid,'EXECUTE')
    )
  union all select 'public_price_calculator_preserved',
    has_function_privilege('anon','public.calculate_payment_amount(numeric,numeric)','EXECUTE')
  union all select 'workflow_rpcs_callable',
    has_function_privilege('authenticated','public.request_match(uuid,uuid)','EXECUTE')
    and has_function_privilege('authenticated','public.accept_match(uuid)','EXECUTE')
    and has_function_privilege('authenticated','public.cancel_match(uuid,text)','EXECUTE')
    and has_function_privilege('authenticated','public.create_trip(uuid,uuid,date,time,numeric,text,boolean,boolean,boolean)','EXECUTE')
    and has_function_privilege('authenticated','public.mark_match_read(uuid,timestamptz)','EXECUTE')
  union all select 'chat_insert_only',
    has_table_privilege('authenticated','public.messages','SELECT')
    and has_table_privilege('authenticated','public.messages','INSERT')
    and not has_table_privilege('authenticated','public.messages','UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    and (select count(*)=2 from pg_policies where schemaname='public' and tablename='messages')
    and exists (select 1 from pg_policies where schemaname='public'
      and tablename='messages' and policyname='messages_insert_accepted'
      and with_check like '%sender_id%' and with_check like '%accepted%')
  union all select 'search_paths_fixed',
    not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in ('generate_payout_code','notify_match_requested')
        and not coalesce(p.proconfig @> array['search_path=""'], false)
    )
  union all select 'triggers_not_api_callable',
    not exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.prorettype='trigger'::regtype
        and (has_function_privilege('anon',p.oid,'EXECUTE')
          or has_function_privilege('authenticated',p.oid,'EXECUTE'))
    )
  union all select 'financial_internal_acl_preserved',
    not has_function_privilege('anon','public.release_payment(uuid,text)','EXECUTE')
    and not has_function_privilege('authenticated','public.release_payment(uuid,text)','EXECUTE')
    and not has_function_privilege('service_role','public.release_payment(uuid,text)','EXECUTE')
    and not has_function_privilege('anon','public.refund_payment(uuid,text)','EXECUTE')
    and not has_function_privilege('authenticated','public.refund_payment(uuid,text)','EXECUTE')
    and not has_function_privilege('service_role','public.refund_payment(uuid,text)','EXECUTE')
  union all select 'release_null_guard_and_cron_context',
    (select prosrc like '%session_user%' and prosrc like '%not_authenticated%'
      and prosrc like '%service_role%' and prosrc like '%is distinct from v_owner_id%'
      from pg_proc where oid='public.release_payment(uuid,text)'::regprocedure)
  union all select 'refund_null_guard',
    (select prosrc like '%if v_actor is null then%' and prosrc like '%not_authenticated%'
      and prosrc like '%is distinct from v_owner_id%'
      from pg_proc where oid='public.refund_payment(uuid,text)'::regprocedure)
  union all select 'private_bucket_limits',
    (select count(*)=2 and bool_and(not public and file_size_limit=5242880
      and allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[])
      from storage.buckets where id in ('identity-verification','shipment-evidence'))
)
select check_name,passed from checks order by check_name;
