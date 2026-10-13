-- A06 repeatable READ-ONLY inventory. Contains no customer rows or secrets.
-- Save results before/after a corrective migration; compare definitions rather
-- than marking historical files applied without checking their effects.
select version,name from supabase_migrations.schema_migrations order by version;

select c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','v','m','p') order by c.relname;

select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public'
order by table_name,ordinal_position;

select c.conrelid::regclass::text as table_name,c.conname,c.contype,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c join pg_namespace n on n.oid=c.connamespace
where n.nspname='public' order by table_name,c.conname;

select tablename,indexname,indexdef from pg_indexes
where schemaname='public' order by tablename,indexname;

select tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname in ('public','storage') order by schemaname,tablename,policyname;

select table_name,grantee,privilege_type from information_schema.table_privileges
where table_schema='public' and grantee in ('PUBLIC','anon','authenticated','service_role')
order by table_name,grantee,privilege_type;

select p.oid::regprocedure::text as signature,pg_get_userbyid(p.proowner) as owner,
  p.prosecdef,p.proconfig,p.proacl,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute,
  md5(pg_get_functiondef(p.oid)) as definition_md5,
  pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' order by p.proname,p.oid::regprocedure::text;

select t.tgrelid::regclass::text as table_name,t.tgname,
  pg_get_triggerdef(t.oid) as definition
from pg_trigger t where not t.tgisinternal
and t.tgrelid in (select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public')
order by table_name,t.tgname;

select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id;
