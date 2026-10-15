// Loads a schema-only snapshot into a newly created disposable PostgreSQL DB.
// Auth/Storage interfaces are local stubs; all public definitions are exact.
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
export const defaultSnapshotPath = path.join(root, 'supabase/tests/fixtures/pre-corrections-schema-20261013.json')

export async function applyLaunchCorrections(db, { exclude = [] } = {}) {
  const directory = path.join(root, 'supabase/migrations')
  const names = (await readdir(directory)).filter((name) => /^20261013\d+_[a-z0-9_]+\.sql$/.test(name) && !exclude.includes(name)).sort()
  for (const name of names) await db.query(await readFile(path.join(directory, name), 'utf8'))
  return names
}

export async function loadSchemaSnapshot(db, snapshot) {
  const quote = (value) => '"' + value.replaceAll('"', '""') + '"'
  await db.query(`create schema auth; create schema storage; create schema extensions;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',email_confirmed_at timestamptz);
    create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
    insert into storage.buckets(id,name,public) values ('identity-verification','identity-verification',false),('shipment-evidence','shipment-evidence',false);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid,metadata jsonb);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),auth.jwt()->>'sub')::uuid$$;
    create function auth.role() returns text language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.role',true),''),auth.jwt()->>'role')$$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    set check_function_bodies=off`)
  for (const sequence of snapshot.sequences ?? []) await db.query('create sequence public.' + quote(sequence.name))
  for (const fn of snapshot.functions.filter((f) => f.signature === 'generate_payout_code()')) await db.query(fn.definition)
  for (const table of snapshot.tables) await db.query('create table public.' + quote(table.name) + '(' + table.columns + ')')
  for (const constraint of [...snapshot.constraints.filter((c) => c.type !== 'f'), ...snapshot.constraints.filter((c) => c.type === 'f')]) {
    await db.query('alter table public.' + quote(constraint.table) + ' add constraint ' + quote(constraint.name) + ' ' + constraint.definition)
  }
  for (const fn of snapshot.functions) {
    await db.query(fn.definition)
    await db.query('revoke execute on function ' + fn.signature + ' from public,anon,authenticated,service_role')
    for (const role of ['anon', 'authenticated', 'service_role']) if (fn[role]) await db.query('grant execute on function ' + fn.signature + ' to ' + role)
  }
  for (const index of snapshot.indexes) await db.query(index.definition.replace('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ').replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS '))
  for (const table of snapshot.tables) if (table.rls) await db.query('alter table public.' + quote(table.name) + ' enable row level security')
  for (const policy of snapshot.policies) {
    let sql = 'create policy ' + quote(policy.policyname) + ' on public.' + quote(policy.tablename) + ' as ' + policy.permissive + ' for ' + policy.cmd + ' to ' + policy.roles.map((r) => r === 'public' ? 'public' : quote(r)).join(',')
    if (policy.qual) sql += ' using (' + policy.qual + ')'
    if (policy.with_check) sql += ' with check (' + policy.with_check + ')'
    await db.query(sql)
  }
  for (const view of snapshot.views ?? []) await db.query('create view public.' + quote(view.name) + ' as ' + view.definition)
  for (const trigger of snapshot.triggers ?? []) await db.query(trigger)
  for (const grant of snapshot.grants ?? []) await db.query('grant ' + grant.privilege_type + ' on public.' + quote(grant.table_name) + ' to ' + (grant.grantee === 'PUBLIC' ? 'public' : quote(grant.grantee)))
  await db.query('grant all on all sequences in schema public to service_role; set check_function_bodies=on')
}
