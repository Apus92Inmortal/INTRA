import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { applyLaunchCorrections, defaultSnapshotPath, loadSchemaSnapshot } from './helpers/schema-snapshot.mjs'

// Disposable loopback PostgreSQL only. No application env, Wompi API calls,
// real payment references, remote mutation or production users are used.
const host = process.env.INTRA_TEST_PG_HOST ?? '127.0.0.1'
const port = Number(process.env.INTRA_TEST_PG_PORT)
if (!['127.0.0.1', 'localhost', '::1'].includes(host) || !Number.isInteger(port) || port < 1024) throw new Error('Explicit isolated local PostgreSQL port required')
const imported = await import(process.env.INTRA_TEST_PG_MODULE ? pathToFileURL(process.env.INTRA_TEST_PG_MODULE).href : 'pg')
const { Client } = imported.default ?? imported
const config = {
  host, port, user: process.env.INTRA_TEST_PG_USER ?? 'postgres', password: process.env.INTRA_TEST_PG_PASSWORD,
  connectionTimeoutMillis: 10_000, statement_timeout: 30_000, idle_in_transaction_session_timeout: 30_000,
}
const database = `intra_a04_test_${Date.now()}_${randomUUID().slice(0, 8)}`
const snapshot = JSON.parse(await readFile(process.env.INTRA_TEST_PG_SNAPSHOT ?? defaultSnapshotPath, 'utf8'))
const control = new Client({ ...config, database: 'postgres' })
const clients = []
let db, checks = 0
const cityIds = [randomUUID(), randomUUID()]
const check = (label) => { checks += 1; console.log('PASS ' + label) }

async function connection() {
  const client = new Client({ ...config, database }); await client.connect(); clients.push(client); return client
}
async function payment(reference = 'A04-local-' + randomUUID()) {
  const f = { customer: randomUUID(), shipment: randomUUID(), payment: randomUUID(), reference, transaction: 'a04-tx-' + randomUUID() }
  await db.query('insert into auth.users(id) values($1);', [f.customer])
  await db.query('insert into profiles(id) values($1)', [f.customer])
  await db.query(`insert into shipments(id,owner_id,origin_city_id,destination_city_id,kind,description,weight_kg,status)
    values($1,$2,$3,$4,'package','A04 synthetic isolated test',1,'open')`, [f.shipment, f.customer, ...cityIds])
  await db.query(`insert into payments(id,shipment_id,user_id,amount,traveler_amount,gateway_fee_estimated,status,external_reference)
    values($1,$2,$3,20000,16000,2000,'pending',$4)`, [f.payment, f.shipment, f.customer, f.reference])
  return f
}
function transaction(f, status = 'APPROVED', patch = {}) {
  return { id: f.transaction, reference: f.reference, status, currency: 'COP', amount_in_cents: 2000000, ...patch }
}
async function ingest(client, f, { key = randomUUID(), status = 'APPROVED', payload, patch = {}, eventType = 'transaction.updated' } = {}) {
  const body = payload ?? { verified_transaction: transaction(f, status, patch) }
  return (await client.query('select ingest_wompi_payment_event($1,$2,$3,$4,$5,$6,$7) as result',
    [key, eventType, f.transaction, status, f.reference, body, { 'x-test': 'local-only' }])).rows[0].result
}
async function paymentState(f) {
  return (await db.query('select status,gateway_status,gateway_transaction_id,metadata from payments where id=$1', [f.payment])).rows[0]
}
async function eventState(key) { return (await db.query('select processed,processed_at,processing_error,payload from wompi_webhook_events where event_key=$1', [key])).rows[0] }
async function record(client, f, key) {
  return (await client.query('select record_wompi_delivery($1,$2,$3,$4,$5,$6,$7) as result',
    [key, 'transaction.updated', f.transaction, 'APPROVED', f.reference,
      { data: { transaction: transaction(f) } }, { 'x-test': 'local-only' }])).rows[0].result
}
async function cancelUnpaid(client, f, actor = f.customer) {
  return (await client.query('select cancel_pending_payment_shipment($1,$2) as result', [f.shipment, actor])).rows[0].result
}

try {
  await control.connect()
  await control.query(`do $$ begin
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
  end $$`)
  await control.query(`create database "${database}"`)
  db = await connection()
  await loadSchemaSnapshot(db, snapshot)
  await db.query("insert into cities(id,name,department) values($1,'A04 local origin','test'),($2,'A04 local destination','test')", cityIds)
  await applyLaunchCorrections(db)

  const acl = (await db.query(`select
    has_function_privilege('anon','ingest_wompi_payment_event(text,text,text,text,text,jsonb,jsonb)','execute') as anon,
    has_function_privilege('authenticated','process_wompi_payment_event(text,text,text,jsonb)','execute') as authenticated,
    has_function_privilege('service_role','ingest_wompi_payment_event(text,text,text,text,text,jsonb,jsonb)','execute') as service,
    has_function_privilege('anon','cancel_pending_payment_shipment(uuid,uuid)','execute') as unpaid_anon,
    has_function_privilege('authenticated','cancel_pending_payment_shipment(uuid,uuid)','execute') as unpaid_browser,
    has_function_privilege('service_role','cancel_pending_payment_shipment(uuid,uuid)','execute') as unpaid_server`)).rows[0]
  assert.deepEqual(acl, { anon: false, authenticated: false, service: true, unpaid_anon: false, unpaid_browser: false, unpaid_server: true })
  const unauthorized = await connection(); await unauthorized.query('set role anon')
  await assert.rejects(unauthorized.query("select ingest_wompi_payment_event('test','transaction.updated','tx','APPROVED','ref','{}','{}')"), { code: '42501' })
  check('both financial RPCs are restricted to service_role')

  const outage = await payment(), outageKey = randomUUID()
  assert.equal((await record(db, outage, outageKey)).processed, false)
  assert.equal((await eventState(outageKey)).processing_error, 'awaiting_provider_verification')
  assert.equal((await paymentState(outage)).status, 'pending')
  assert.equal((await record(db, outage, outageKey)).processed, false)
  assert.equal((await ingest(db, outage, { key: outageKey })).success, true)
  assert.equal((await record(db, outage, outageKey)).processed, true)
  assert.equal((await eventState(outageKey)).processing_error, null)
  assert.equal((await ingest(db, { ...outage, transaction: 'different-tx' }, { key: outageKey })).error, 'event_identity_conflict')
  assert.equal((await ingest(db, outage, { key: outageKey, eventType: 'wompi_redirect' })).error, 'event_identity_conflict')
  assert.equal((await record(db, { ...outage, transaction: 'different-tx' }, outageKey)).error, 'event_identity_conflict')
  assert.equal((await eventState(outageKey)).processed, true)
  check('signed API-outage delivery remains pending; retry processes once and identity conflicts never reset processed')

  const missing = { reference: 'A04-late-' + randomUUID(), transaction: 'a04-late-tx-' + randomUUID() }
  const retryKey = randomUUID()
  assert.equal((await ingest(db, missing, { key: retryKey })).error, 'payment_not_found')
  assert.equal((await eventState(retryKey)).processed, false)
  assert.equal((await eventState(retryKey)).processing_error, 'payment_not_found')
  const later = await payment(missing.reference); later.transaction = missing.transaction
  assert.equal((await ingest(db, later, { key: retryKey })).success, true)
  assert.equal((await eventState(retryKey)).processed, true)
  assert.equal((await paymentState(later)).status, 'held')
  check('missing payment stays unprocessed and the same event retry reconciles after it exists')

  const concurrent = await payment(), key = randomUUID()
  const a = await connection(), b = await connection()
  await a.query('begin'); await a.query('set local role service_role')
  assert.equal((await ingest(a, concurrent, { key })).success, true)
  await b.query('set role service_role')
  let finished = false
  const second = ingest(b, concurrent, { key }).then((result) => { finished = true; return result })
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.equal(finished, false, 'duplicate delivery must wait for the first transaction')
  await a.query('commit')
  assert.equal((await second).duplicate, true)
  assert.equal(Number((await db.query('select count(*) n from wompi_webhook_events where event_key=$1', [key])).rows[0].n), 1)
  assert.equal((await paymentState(concurrent)).status, 'held')
  assert.equal(Number((await db.query("select count(*) n from notifications where user_id=$1 and type='payment_confirmed'", [concurrent.customer])).rows[0].n), 1)
  check('concurrent duplicate event creates one processed record and one payment notification')

  for (const [label, patch, expected] of [
    ['amount', { amount_in_cents: 1 }, 'amount_mismatch'],
    ['non-numeric amount', { amount_in_cents: '2000000' }, 'amount_mismatch'],
    ['currency', { currency: 'USD' }, 'currency_mismatch'],
    ['transaction id', { id: 'another-transaction' }, 'transaction_identity_mismatch'],
    ['reference', { reference: 'another-reference' }, 'transaction_identity_mismatch'],
    ['status', { status: 'PENDING' }, 'transaction_identity_mismatch'],
  ]) {
    const f = await payment(), eventKey = randomUUID()
    assert.equal((await ingest(db, f, { key: eventKey, patch })).error, expected, label)
    assert.equal((await eventState(eventKey)).processed, false)
    assert.equal((await paymentState(f)).status, 'pending')
  }
  check('amount, currency, transaction, reference and status mismatches never process or change the payment')

  const reused = await payment(); reused.transaction = concurrent.transaction
  assert.equal((await ingest(db, reused)).error, 'transaction_already_attached')
  const bound = await payment()
  await db.query('update payments set gateway_transaction_id=$1 where id=$2', ['already-bound', bound.payment])
  assert.equal((await ingest(db, bound)).error, 'transaction_mismatch')
  check('a provider transaction cannot bind two payments or replace an existing transaction')

  const staleKey = randomUUID()
  assert.equal((await ingest(db, concurrent, { key: staleKey, status: 'PENDING' })).reason, 'stale_status')
  const approved = await paymentState(concurrent)
  assert.equal(approved.status, 'held'); assert.equal(approved.gateway_status, 'APPROVED')
  assert.equal((await eventState(staleKey)).processed, true)
  assert.equal((await ingest(db, concurrent, { status: 'DECLINED' })).error, 'terminal_state_conflict')
  assert.equal((await ingest(db, concurrent)).unchanged, true)
  const rejected = await payment()
  assert.equal((await ingest(db, rejected, { status: 'DECLINED' })).success, true)
  assert.equal((await ingest(db, rejected)).error, 'terminal_state_conflict')
  assert.equal((await paymentState(rejected)).status, 'failed')
  check('out-of-order pending and contradictory terminal events cannot regress approved or rejected payments')

  const authoritative = await payment()
  assert.equal((await ingest(db, authoritative, { payload: {
    data: { transaction: transaction(authoritative, 'DECLINED', { amount_in_cents: 1 }) },
    verified_transaction: transaction(authoritative),
  } })).success, true)
  assert.equal((await paymentState(authoritative)).status, 'held')
  check('provider-verified transaction fields govern reconciliation over raw event fields')

  const ambiguousRef = 'A04-ambiguous-' + randomUUID()
  const ambiguous = await payment(ambiguousRef); await payment(ambiguousRef)
  assert.equal((await ingest(db, ambiguous)).error, 'ambiguous_reference')
  assert.equal((await paymentState(ambiguous)).status, 'pending')
  check('duplicate checkout references block reconciliation safely')

  const approvedFirst = await payment(), approving = await connection(), cancellingLate = await connection()
  await approving.query('begin'); await approving.query('set local role service_role')
  assert.equal((await ingest(approving, approvedFirst)).success, true)
  await cancellingLate.query('set role service_role')
  let cancelFinished = false
  const lateCancel = cancelUnpaid(cancellingLate, approvedFirst).then((result) => { cancelFinished = true; return result })
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.equal(cancelFinished, false, 'cancellation must wait for confirmation payment lock')
  await approving.query('commit')
  assert.equal((await lateCancel).error, 'shipment_not_cancellable')
  assert.equal((await paymentState(approvedFirst)).status, 'held')
  assert.equal((await db.query('select status from shipments where id=$1', [approvedFirst.shipment])).rows[0].status, 'open')
  check('confirmation winning the race blocks unpaid cancellation without cancelling a held shipment')

  const cancelledFirst = await payment(), cancelling = await connection(), approvingLate = await connection()
  assert.equal((await cancelUnpaid(db, cancelledFirst, null)).success, false)
  assert.equal((await cancelUnpaid(db, cancelledFirst, randomUUID())).success, false)
  await cancelling.query('begin'); await cancelling.query('set local role service_role')
  assert.equal((await cancelUnpaid(cancelling, cancelledFirst)).success, true)
  await approvingLate.query('set role service_role')
  let approvalFinished = false
  const lateKey = randomUUID()
  const lateApproval = ingest(approvingLate, cancelledFirst, { key: lateKey }).then((result) => { approvalFinished = true; return result })
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.equal(approvalFinished, false)
  await cancelling.query('commit')
  assert.equal((await lateApproval).error, 'shipment_cancelled_before_approval')
  assert.equal((await eventState(lateKey)).processed, false)
  assert.equal((await eventState(lateKey)).processing_error, 'shipment_cancelled_before_approval')
  assert.equal((await paymentState(cancelledFirst)).status, 'cancelled')
  assert.equal((await db.query('select status from shipments where id=$1', [cancelledFirst.shipment])).rows[0].status, 'cancelled')
  assert.equal((await cancelUnpaid(db, cancelledFirst)).idempotent, true)
  assert.equal((await ingest(db, cancelledFirst, { key: lateKey })).success, false)
  assert.equal(Number((await db.query('select count(*) n from wallet_ledger where payment_id=$1', [cancelledFirst.payment])).rows[0].n), 0)
  check('cancellation winning the race leaves late approved money as an unprocessed operator case without wallet credit or held state')

  const olderPaid = await payment()
  await db.query("update payments set status='held',gateway_status='APPROVED',created_at=now()-interval '1 day' where id=$1", [olderPaid.payment])
  await db.query(`insert into payments(id,shipment_id,user_id,amount,status,external_reference)
    values($1,$2,$3,20000,'pending',$4)`, [randomUUID(), olderPaid.shipment, olderPaid.customer, 'a04-newer-attempt-' + randomUUID()])
  assert.equal((await cancelUnpaid(db, olderPaid)).error, 'shipment_not_cancellable')
  assert.equal((await db.query('select status from shipments where id=$1', [olderPaid.shipment])).rows[0].status, 'open')
  check('unpaid cancellation validates every attempt and refuses an older approved payment')

  const cancelFailure = await payment()
  await db.query(`create function a04_test_fail_cancel_audit() returns trigger language plpgsql as $$ begin
    if new.event_type='dashboard_unpaid_shipment_cancelled' then raise exception 'injected_cancel_audit_failure'; end if; return new; end $$;
    create trigger a04_test_fail_cancel_audit before insert on app_audit_logs for each row execute function a04_test_fail_cancel_audit()`)
  await assert.rejects(cancelUnpaid(db, cancelFailure), /injected_cancel_audit_failure/)
  assert.equal((await paymentState(cancelFailure)).status, 'pending')
  assert.equal((await db.query('select status from shipments where id=$1', [cancelFailure.shipment])).rows[0].status, 'open')
  await db.query('drop trigger a04_test_fail_cancel_audit on app_audit_logs')
  check('late cancellation audit failure rolls back both payment and shipment cancellation')

  const failure = await payment(), failureKey = randomUUID()
  await db.query(`create function a04_test_fail_processed() returns trigger language plpgsql as $$ begin
    if new.processed then raise exception 'injected_mark_processed_failure'; end if; return new; end $$;
    create trigger a04_test_fail_processed before update on wompi_webhook_events for each row execute function a04_test_fail_processed()`)
  await assert.rejects(ingest(db, failure, { key: failureKey }), /injected_mark_processed_failure/)
  const untouched = await paymentState(failure)
  assert.equal(untouched.status, 'pending'); assert.equal(untouched.gateway_transaction_id, null)
  assert.equal(await eventState(failureKey), undefined)
  assert.equal(Number((await db.query('select count(*) n from notifications where user_id=$1', [failure.customer])).rows[0].n), 0)
  await db.query('drop trigger a04_test_fail_processed on wompi_webhook_events')
  assert.equal((await ingest(db, failure, { key: failureKey })).success, true)
  check('failure marking processed rolls back payment, inserted event and notification; later retry succeeds')

  const repeated = { reference: 'A04-preexisting-' + randomUUID(), transaction: 'a04-preexisting-tx-' + randomUUID() }, existingKey = randomUUID()
  await ingest(db, repeated, { key: existingKey })
  const repeatedPayment = await payment(repeated.reference); repeatedPayment.transaction = repeated.transaction
  await db.query('create trigger a04_test_fail_processed before update on wompi_webhook_events for each row execute function a04_test_fail_processed()')
  await assert.rejects(ingest(db, repeatedPayment, { key: existingKey }), /injected_mark_processed_failure/)
  assert.equal((await paymentState(repeatedPayment)).status, 'pending')
  assert.equal((await eventState(existingKey)).processed, false)
  assert.equal((await eventState(existingKey)).processing_error, 'payment_not_found')
  check('a failed retry preserves a preexisting unprocessed event for future reconciliation')

  console.log(`A04 exact public remote DDL, local PostgreSQL: ${checks} checks passed; no external or Production writes.`)
} finally {
  for (const client of clients) await client.end().catch(() => {})
  if (control._connected) { await control.query(`drop database if exists "${database}"`).catch(() => {}); await control.end() }
}
