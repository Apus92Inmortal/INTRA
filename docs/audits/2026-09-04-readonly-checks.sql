-- INTRA, auditoría 2026-09-04. Solo lectura; no invoca RPC de negocio.
-- Ejecutar cada SELECT por separado si el cliente solo muestra el ultimo resultado.

-- 1. Permisos efectivos de funciones y modo de seguridad.
select p.oid::regprocedure::text as signature,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('release_payment', 'refund_payment',
      'create_operational_notification', 'process_wompi_payment_event',
      'auto_release_due_payments', 'admin_update_payout_status')
order by signature;

-- 2. Policies efectivas, incluidas las legacy permisivas.
select tablename, policyname, roles, permissive, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('payments', 'payouts', 'shipments', 'matches',
      'profiles', 'user_verifications')
order by tablename, policyname;

-- 3. Grants de tablas: interpretar siempre junto con RLS/policies.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('payments', 'payouts')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 4. Indices: verificar en especial refund_available_credit.
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'wallet_ledger'
order by indexname;

-- 5. Agregados sin PII ni referencias de transaccion.
select jsonb_build_object(
  'payments', (select count(*) from public.payments),
  'wompi_webhook_events', (select count(*) from public.wompi_webhook_events),
  'wallets', (select count(*) from public.wallets),
  'wallet_ledger', (select count(*) from public.wallet_ledger),
  'payouts', (select count(*) from public.payouts)
) as financial_counts;

select status, gateway_status, count(*) as count
from public.payments
group by status, gateway_status;

-- 6. Bucket privado y limites especificos (NULL no implica ausencia de limite global).
select id, public, file_size_limit, allowed_mime_types
from storage.buckets;

-- 7. Scheduler: no seleccionar el comando, que puede contener informacion sensible.
select jobid, jobname, schedule, active from cron.job;
select jobid, status, count(*) as runs
from cron.job_run_details
where start_time > now() - interval '7 days'
group by jobid, status;

-- 8. Historial de migraciones: ausencia no prueba ausencia de todo su DDL.
select version, name
from supabase_migrations.schema_migrations
order by version;
