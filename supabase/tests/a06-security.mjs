import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadSchemaSnapshot, applyLaunchCorrections, defaultSnapshotPath } from './helpers/schema-snapshot.mjs'

// Only a explicitly configured disposable loopback Postgres can be targeted.
// No application env files, hosted DB credentials or Wompi API are consulted.
const host = process.env.INTRA_TEST_PG_HOST ?? '127.0.0.1'
const port = Number(process.env.INTRA_TEST_PG_PORT)
if (!['127.0.0.1', 'localhost', '::1'].includes(host) || !Number.isInteger(port) || port < 1024) {
  throw new Error('Set INTRA_TEST_PG_PORT for an isolated loopback PostgreSQL.')
}
const pg = await import(process.env.INTRA_TEST_PG_MODULE ? pathToFileURL(process.env.INTRA_TEST_PG_MODULE).href : 'pg')
const { Client } = pg.default ?? pg
const config = {
  host, port, user: process.env.INTRA_TEST_PG_USER ?? 'postgres', password: process.env.INTRA_TEST_PG_PASSWORD,
  connectionTimeoutMillis: 10_000, statement_timeout: 30_000, idle_in_transaction_session_timeout: 30_000,
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const database = 'intra_a06_test_' + Date.now() + '_' + randomUUID().slice(0, 8)
const control = new Client({ ...config, database: 'postgres' })
const clients = []
const snapshot = JSON.parse(await readFile(process.env.INTRA_TEST_PG_SNAPSHOT ?? defaultSnapshotPath, 'utf8'))
let created = false

async function connect() {
  const client = new Client({ ...config, database })
  await client.connect()
  clients.push(client)
  return client
}
try {
  await control.connect()
  await control.query('create database "' + database + '"')
  created = true
  const db = await connect()
  await loadSchemaSnapshot(db, snapshot)
  const migrations = await applyLaunchCorrections(db)
  console.log('PASS applied ' + migrations.length + ' launch corrections in order')
  const a01 = (await db.query(await readFile(path.join(root, 'supabase/tests/a01_financial_rpc_grants.sql'), 'utf8'))).rows
  assert.equal(a01.length, 1)
  assert.ok(Object.values(a01[0]).length === 5 && Object.values(a01[0]).every(value => value === true))
  console.log('PASS 5 A01 financial entry-point grants preserved')
  const a02 = (await db.query(await readFile(path.join(root, 'supabase/tests/a02_financial_table_access.sql'), 'utf8'))).rows
  assert.ok(a02.length === 14 && a02.every(row => row.passed))
  console.log('PASS 14 A02 financial table/retry restrictions preserved')
  const checks = (await db.query(await readFile(path.join(root, 'supabase/tests/a06_privacy_permissions.sql'), 'utf8'))).rows
  assert.ok(checks.length === 16 && checks.every(r => r.passed))
  console.log('PASS 16 permission/config postflight checks')
  for (const file of ['a06_privacy_roles.integration.sql','a01_actor_guards.integration.sql']) {
    let sql = await readFile(path.join(root, 'supabase/tests', file), 'utf8')
    // Gate was checked above by loopback port + dedicated newly-created DB;
    // strip the psql-only variable guard and preserve all SQL test assertions.
    sql = sql.slice(sql.indexOf('\nbegin;'))
    await db.query(sql)
    console.log('PASS ' + file)
  }

  const f = Object.fromEntries(['owner','traveler','origin','destination','shipment','trip','payment'].map(k => [k, randomUUID()]))
  await db.query('insert into auth.users(id) values($1),($2)', [f.owner, f.traveler])
  await db.query('insert into profiles(id) values($1),($2)', [f.owner, f.traveler])
  await db.query("insert into cities(id,name,department) values($1,'A06 origin','Test'),($2,'A06 destination','Test')", [f.origin, f.destination])
  await db.query("insert into shipments(id,owner_id,origin_city_id,destination_city_id,kind,description,weight_kg,status) values($1,$2,$3,$4,'package','Concurrent A06 local fixture',1,'open')", [f.shipment, f.owner, f.origin, f.destination])
  await db.query("insert into trips(id,traveler_id,origin_city_id,destination_city_id,departure_date,status) values($1,$2,$3,$4,current_date+1,'open')", [f.trip, f.traveler, f.origin, f.destination])
  await db.query("insert into payments(id,shipment_id,user_id,amount,status,gateway_status) values($1,$2,$3,20000,'held','approved')", [f.payment, f.shipment, f.owner])

  const cancellation = await connect()
  const request = await connect()
  await cancellation.query('begin')
  await cancellation.query('set local role service_role')
  await cancellation.query("update shipments set status='cancelled' where id=$1", [f.shipment])
  await cancellation.query("update payments set status='refunded',refund_status='refunded' where id=$1", [f.payment])
  await request.query('set role authenticated')
  await request.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [f.traveler, JSON.stringify({ sub: f.traveler, role: 'authenticated' })])
  const pending = request.query('select request_match($1,$2) as result', [f.shipment, f.trip])
  let waiting = false
  for (let retry = 0; retry < 100 && !waiting; retry++) {
    waiting = (await db.query("select wait_event_type='Lock' as waiting from pg_stat_activity where pid=$1", [request.processID])).rows[0]?.waiting === true
    if (!waiting) await new Promise(resolve => setTimeout(resolve, 20))
  }
  assert.equal(waiting, true, 'request must serialize behind shipment cancellation lock')
  await cancellation.query('commit')
  const result = (await pending).rows[0].result
  assert.equal(result.success, false)
  assert.equal(result.error, 'shipment_not_available')
  assert.equal(Number((await db.query('select count(*) n from matches where shipment_id=$1', [f.shipment])).rows[0].n), 0)
  console.log('PASS concurrent request waits for cancellation, rechecks state and creates no match')

  const rollback = await connect()
  await rollback.query('begin')
  await rollback.query('set local role service_role')
  await rollback.query("update shipments set status='open' where id=$1", [f.shipment])
  await rollback.query("update payments set status='held',refund_status='none' where id=$1", [f.payment])
  const stillPending = request.query('select request_match($1,$2) as result', [f.shipment, f.trip])
  // Once the cancellation transaction rolls back, original cancelled/refunded
  // state must remain unavailable even though a transient open row was seen.
  await rollback.query('rollback')
  assert.equal((await stillPending).rows[0].result.error, 'shipment_not_available')
  console.log('PASS rolled-back reopening cannot create a match')
  console.log('A06 local isolated permissions/privacy/guards/concurrency PASS; disposable DB removed.')
} finally {
  // Disconnect rolls back open transactions. Never queue ROLLBACK behind a
  // blocked query before closing the later-created connection holding its lock.
  await Promise.allSettled(clients.map(client => client.end()))
  if (created) await control.query('drop database if exists "' + database + '"').catch(() => {})
  await control.end().catch(() => {})
}
