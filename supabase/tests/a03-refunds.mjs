import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { applyLaunchCorrections, defaultSnapshotPath, loadSchemaSnapshot } from './helpers/schema-snapshot.mjs'

// Requires an explicitly configured disposable LOCAL PostgreSQL instance.
// Never reads .env.local or the application's Supabase/Wompi credentials.
const host = process.env.INTRA_TEST_PG_HOST ?? '127.0.0.1'
const port = Number(process.env.INTRA_TEST_PG_PORT)
if (!['127.0.0.1', 'localhost', '::1'].includes(host) || !Number.isInteger(port) || port < 1024) {
  throw new Error('Set INTRA_TEST_PG_PORT for an isolated loopback PostgreSQL instance.')
}
const modulePath = process.env.INTRA_TEST_PG_MODULE
const pg = await import(modulePath ? pathToFileURL(modulePath).href : 'pg')
const { Client } = pg.default ?? pg
const config = {
  host, port, user: process.env.INTRA_TEST_PG_USER ?? 'postgres', password: process.env.INTRA_TEST_PG_PASSWORD,
  connectionTimeoutMillis: 10_000, statement_timeout: 30_000, idle_in_transaction_session_timeout: 30_000,
}
const database = `intra_a03_test_${Date.now()}_${randomUUID().slice(0, 8)}`
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const migration = await readFile(path.join(root, 'supabase/migrations/20261013201539_a03_atomic_customer_wallet_refunds.sql'), 'utf8')
const schema = await readFile(path.join(root, 'supabase/tests/fixtures/a03_refund_schema.sql'), 'utf8')
const snapshotPath = process.env.INTRA_TEST_PG_SNAPSHOT ?? defaultSnapshotPath
const snapshot = process.env.INTRA_TEST_PG_MINIMAL === '1' ? null : JSON.parse(await readFile(snapshotPath, 'utf8'))
let extraMigrations = []
const cities = [randomUUID(), randomUUID()]
const control = new Client({ ...config, database: 'postgres' })
let db
let checks = 0
const check = (message) => { checks += 1; console.log(`PASS ${message}`) }
const clients = []

async function connection() {
  const client = new Client({ ...config, database })
  await client.connect()
  clients.push(client)
  return client
}
async function fixture({ match = false, hold = false, release = false, dispute = false } = {}) {
  const f = { customer: randomUUID(), traveler: randomUUID(), admin: randomUUID(), shipment: randomUUID(), payment: randomUUID(), trip: randomUUID(), match: match ? randomUUID() : null }
  if (snapshot) await db.query('insert into auth.users(id) values ($1),($2),($3)', [f.customer, f.traveler, f.admin])
  await db.query('insert into profiles(id) values ($1),($2),($3)', [f.customer, f.traveler, f.admin])
  if (snapshot) {
    await db.query(`insert into shipments(id,owner_id,status,origin_city_id,destination_city_id,kind,description,weight_kg)
      values($1,$2,$3,$4,$5,'package','Synthetic A03 local test',1)`, [f.shipment, f.customer, match ? 'matched' : 'open', ...cities])
  } else await db.query("insert into shipments(id,owner_id,status) values($1,$2,$3)", [f.shipment, f.customer, match ? 'matched' : 'open'])
  if (match) {
    if (snapshot) {
      await db.query('insert into trips(id,traveler_id,origin_city_id,destination_city_id,departure_date) values($1,$2,$3,$4,current_date+1)', [f.trip, f.traveler, ...cities])
      await db.query('insert into matches(id,shipment_id,trip_id,status,requester_id) values($1,$2,$3,$4,$5)', [f.match, f.shipment, f.trip, dispute ? 'disputed' : 'pending', f.traveler])
    } else {
      await db.query('insert into trips(id,traveler_id) values($1,$2)', [f.trip, f.traveler])
      await db.query('insert into matches(id,shipment_id,trip_id,status) values($1,$2,$3,$4)', [f.match, f.shipment, f.trip, dispute ? 'disputed' : 'pending'])
    }
  }
  await db.query(`insert into payments(id,shipment_id,user_id,match_id,amount,traveler_amount,gateway_fee_estimated,gateway_status,status,dispute_status)
    values($1,$2,$3,$4,20000,16000,2000,'approved',$5,$6)`, [f.payment, f.shipment, f.customer, f.match, release ? 'released' : 'held', dispute ? 'open' : 'none'])
  if (hold) {
    const wallet = (await db.query('insert into wallets(user_id) values($1) returning id', [f.traveler])).rows[0].id
    await db.query(`insert into wallet_ledger(wallet_id,user_id,payment_id,match_id,entry_type,balance_type,direction,amount)
      values($1,$2,$3,$4,'payment_hold','pending','credit',16000)`, [wallet, f.traveler, f.payment, f.match])
    if (release) {
      await db.query(`insert into wallet_ledger(wallet_id,user_id,payment_id,match_id,entry_type,balance_type,direction,amount)
        values($1,$2,$3,$4,'release_pending_debit','pending','debit',16000),($1,$2,$3,$4,'release_available_credit','available','credit',16000)`, [wallet, f.traveler, f.payment, f.match])
    }
    await db.query('select sync_wallet_balance($1)', [f.traveler])
  }
  return f
}
async function dashboard(client, f, actor = f.customer) {
  return (await client.query('select cancel_waiting_traveler_shipment($1,$2) as result', [f.shipment, actor])).rows[0].result
}
async function admin(client, f, amount = 18000, match = f.match) {
  return (await client.query('select admin_resolve_dispute_for_customer($1,$2,$3,$4,$5) as result', [f.payment, match, amount, 'Caso sintético aislado', f.admin])).rows[0].result
}
async function review(client, f, action = 'reviewing', notes = 'Revisión sintética') {
  return (await client.query('select admin_review_dispute($1,$2,$3,$4,$5) as result', [f.payment, f.match, action, notes, f.admin])).rows[0].result
}
async function travelerResolution(client, f) {
  return (await client.query('select admin_resolve_dispute_for_traveler($1,$2,$3,$4) as result', [f.payment, f.match, 'Resolución sintética viajero', f.admin])).rows[0].result
}
async function creditCount(f) {
  return Number((await db.query("select count(*) as n from wallet_ledger where payment_id=$1 and entry_type='refund_available_credit'", [f.payment])).rows[0].n)
}
async function state(f) {
  return (await db.query(`select p.status, p.refund_status, p.dispute_status, s.status as shipment_status,
    (select status from matches where id=p.match_id) as match_status,
    (select count(*)::int from app_audit_logs where entity_id=p.id) as audits,
    (select count(*)::int from wallets where user_id=s.owner_id) as customer_wallets
    from payments p join shipments s on s.id=p.shipment_id where p.id=$1`, [f.payment])).rows[0]
}
async function race(f, call) {
  const a = await connection(), b = await connection()
  await a.query('begin'); await a.query('set local role service_role')
  const first = await call(a, f)
  assert.equal(first.success, true)
  await b.query('set role service_role')
  let finished = false
  const pending = call(b, f).then((result) => { finished = true; return result })
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.equal(finished, false, 'second session must wait on the transaction lock')
  await a.query('commit')
  const second = await pending
  assert.equal(second.success, true)
  assert.equal(second.idempotent, true)
  assert.equal(await creditCount(f), 1)
  assert.equal((await state(f)).audits, 1)
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
  if (snapshot) {
    await loadSchemaSnapshot(db, snapshot)
    await db.query("insert into cities(id,name,department) values($1,'A03 test origin','test'),($2,'A03 test destination','test')", cities)
  }
  else await db.query(schema)

  const duplicate = await fixture()
  const wallet = (await db.query('insert into wallets(user_id) values($1) returning id', [duplicate.customer])).rows[0].id
  await db.query(`insert into wallet_ledger(wallet_id,user_id,payment_id,entry_type,balance_type,direction,amount)
    values($1,$2,$3,'refund_available_credit','available','credit',18000),($1,$2,$3,'refund_available_credit','available','credit',18000)`, [wallet, duplicate.customer, duplicate.payment])
  await assert.rejects(db.query(migration), /a03_duplicate_refund_credits/)
  await db.query('rollback')
  assert.equal(await creditCount(duplicate), 2)
  check('migration blocks duplicate history without deleting credits')
  await db.query('delete from wallet_ledger where payment_id=$1', [duplicate.payment])
  await db.query(migration)
  if (snapshot) extraMigrations = await applyLaunchCorrections(db, { exclude: ['20261013201539_a03_atomic_customer_wallet_refunds.sql'] })

  const acl = (await db.query(`select
    has_function_privilege('anon','cancel_waiting_traveler_shipment(uuid,uuid)','execute') as anon,
    has_function_privilege('authenticated','admin_resolve_dispute_for_customer(uuid,uuid,numeric,text,uuid)','execute') as authenticated,
    has_function_privilege('service_role','cancel_waiting_traveler_shipment(uuid,uuid)','execute') as service,
    has_function_privilege('service_role','process_customer_wallet_refund(uuid,uuid,uuid,uuid,text,numeric,text)','execute') as internal,
    has_function_privilege('authenticated','admin_review_dispute(uuid,uuid,text,text,uuid)','execute') as review_browser,
    has_function_privilege('anon','admin_review_dispute(uuid,uuid,text,text,uuid)','execute') as review_anon,
    has_function_privilege('service_role','admin_review_dispute(uuid,uuid,text,text,uuid)','execute') as review_server`)).rows[0]
  assert.deepEqual(acl, { anon: false, authenticated: false, service: true, internal: false, review_browser: false, review_anon: false, review_server: true })
  const unauthorized = await connection()
  await unauthorized.query('set role authenticated')
  await assert.rejects(dashboard(unauthorized, duplicate), { code: '42501' })
  check('RPC ACL blocks browser roles and the internal helper')

  const guarded = await fixture()
  assert.equal((await dashboard(db, guarded, null)).success, false)
  assert.equal((await dashboard(db, guarded, guarded.traveler)).success, false)
  assert.equal(await creditCount(guarded), 0)
  assert.equal((await state(guarded)).customer_wallets, 0)
  const active = await fixture({ match: true })
  assert.equal((await dashboard(db, active)).error, 'shipment_not_cancellable')
  check('missing actor, another owner and an active match cannot refund')

  if (snapshot) {
    const accepting = await fixture({ match: true })
    await db.query("update shipments set status='open' where id=$1", [accepting.shipment])
    const cancelling = await connection(), matchOwner = await connection()
    await cancelling.query('begin'); await matchOwner.query('begin')
    await cancelling.query('select id from shipments where id=$1 for update', [accepting.shipment])
    await matchOwner.query('select id from matches where id=$1 for update', [accepting.match])
    await matchOwner.query("select set_config('request.jwt.claim.sub',$1,false)", [accepting.customer])
    assert.equal((await dashboard(cancelling, accepting)).error, 'shipment_not_cancellable')
    const accepted = matchOwner.query('select accept_match($1)', [accepting.match])
    await cancelling.query('commit')
    await accepted
    await matchOwner.query('rollback')
    assert.equal(await creditCount(accepting), 0)
    check('Dashboard rejects active match before child locks, avoiding legacy acceptance lock inversion')
  }

  const d = await fixture()
  await race(d, dashboard)
  assert.equal((await state(d)).shipment_status, 'cancelled')
  assert.equal((await db.query('select available_balance from wallets where user_id=$1', [d.customer])).rows[0].available_balance, '18000')
  await assert.rejects(db.query(`insert into wallet_ledger(wallet_id,user_id,payment_id,entry_type,balance_type,direction,amount)
    select id,user_id,$1,'refund_available_credit','available','credit',18000 from wallets where user_id=$2`, [d.payment, d.customer]), { code: '23505' })
  check('concurrent Dashboard requests credit net once and durable unique prevents another writer')

  if (snapshot && extraMigrations.some((name) => name.includes('a06'))) {
    const matching = await fixture()
    await db.query('insert into trips(id,traveler_id,origin_city_id,destination_city_id,departure_date) values($1,$2,$3,$4,current_date+1)', [matching.trip, matching.traveler, ...cities])
    const cancelClient = await connection(), matchClient = await connection()
    await cancelClient.query('begin'); await cancelClient.query('set local role service_role')
    assert.equal((await dashboard(cancelClient, matching)).success, true)
    await matchClient.query('set role authenticated')
    await matchClient.query("select set_config('request.jwt.claim.sub',$1,false)", [matching.traveler])
    let finished = false
    const request = matchClient.query('select request_match($1,$2) as result', [matching.shipment, matching.trip]).then((response) => { finished = true; return response.rows[0].result })
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(finished, false, 'match must wait for refund shipment lock')
    await cancelClient.query('commit')
    assert.equal((await request).error, 'shipment_not_available')
    assert.equal(Number((await db.query('select count(*) n from matches where shipment_id=$1', [matching.shipment])).rows[0].n), 0)
    check('A06 match request waits for cancellation then rejects cancelled shipment')
  }

  const ad = await fixture({ match: true, hold: true, dispute: true })
  assert.equal((await admin(db, ad, 20000)).error, 'invalid_refund_amount')
  assert.equal((await admin(db, ad, 10000.001)).error, 'invalid_refund_amount')
  assert.equal((await admin(db, ad, 18000, randomUUID())).error, 'match_context_invalid')
  assert.equal(await creditCount(ad), 0)
  await race(ad, admin)
  assert.equal((await state(ad)).match_status, 'resolved')
  assert.equal((await db.query('select pending_balance from wallets where user_id=$1', [ad.traveler])).rows[0].pending_balance, '0')
  assert.equal((await admin(db, ad, 10000)).error, 'invalid_refund_amount')
  check('concurrent admin refund reverses real hold once, closes dispute, caps net and rejects changed retry')

  for (const action of ['reviewing', 'rejected']) {
    const interleaving = await fixture({ match: true, hold: true, dispute: true })
    const refundClient = await connection(), staleReviewClient = await connection()
    await refundClient.query('begin'); await refundClient.query('set local role service_role')
    assert.equal((await admin(refundClient, interleaving)).success, true)
    await staleReviewClient.query('set role service_role')
    let finished = false
    const pending = review(staleReviewClient, interleaving, action).then((result) => { finished = true; return result })
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(finished, false, 'review must wait on refund transaction')
    await refundClient.query('commit')
    assert.equal((await pending).error, 'dispute_not_open')
    const metadata = (await db.query('select metadata from payments where id=$1', [interleaving.payment])).rows[0].metadata
    assert.equal(metadata.wallet_refund_source, 'admin_dispute_customer_refund')
    assert.equal(metadata.admin_dispute_resolution, 'customer_refund')
    assert.equal((await admin(db, interleaving)).idempotent, true)
    assert.equal((await state(interleaving)).audits, 1)
  }
  check('reviewing/rejected interleaved after refund cannot overwrite resolution or durable retry markers')

  const reviewFirst = await fixture({ match: true, hold: true, dispute: true })
  const reviewer = await connection(), refundAfterReview = await connection()
  await reviewer.query('begin'); await reviewer.query('set local role service_role')
  assert.equal((await review(reviewer, reviewFirst)).success, true)
  await refundAfterReview.query('set role service_role')
  let refundFinished = false
  const afterReview = admin(refundAfterReview, reviewFirst).then((result) => { refundFinished = true; return result })
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.equal(refundFinished, false)
  await reviewer.query('commit')
  assert.equal((await afterReview).success, true)
  const reviewedMetadata = (await db.query('select metadata from payments where id=$1', [reviewFirst.payment])).rows[0].metadata
  assert.equal(reviewedMetadata.admin_dispute_reviewed_by, reviewFirst.admin)
  assert.equal(reviewedMetadata.admin_dispute_resolution, 'customer_refund')
  assert.equal((await state(reviewFirst)).audits, 2)
  check('refund waits for reviewing and merges latest metadata while preserving both audit entries')

  const rejected = await fixture({ match: true, hold: true, dispute: true })
  assert.equal((await review(db, rejected, 'rejected')).success, true)
  assert.equal((await review(db, rejected, 'rejected')).idempotent, true)
  assert.equal((await admin(db, rejected)).error, 'dispute_not_open')
  assert.equal((await state(rejected)).status, 'held')
  assert.equal((await state(rejected)).match_status, 'resolved')
  assert.equal((await state(rejected)).audits, 1)
  assert.equal(await creditCount(rejected), 0)
  assert.equal((await review(db, rejected)).error, 'dispute_not_open')
  check('rejected closes payment/match atomically without money, idempotent retry and no reopening')

  if (snapshot) {
    for (const winner of ['customer', 'traveler']) {
      const opposing = await fixture({ match: true, hold: true, dispute: true })
      const firstClient = await connection(), otherClient = await connection()
      await firstClient.query('begin'); await firstClient.query('set local role service_role')
      const firstCall = winner === 'customer' ? admin : travelerResolution
      const otherCall = winner === 'customer' ? travelerResolution : admin
      assert.equal((await firstCall(firstClient, opposing)).success, true)
      await otherClient.query('set role service_role')
      let finished = false
      const pending = otherCall(otherClient, opposing).then((result) => { finished = true; return result })
      await new Promise((resolve) => setTimeout(resolve, 80))
      assert.equal(finished, false, 'opposing resolution must wait on the same shipment lock')
      await firstClient.query('commit')
      assert.equal((await pending).success, false)
      assert.equal((await state(opposing)).audits, 1)
      assert.equal(await creditCount(opposing), winner === 'customer' ? 1 : 0)
      const releases = Number((await db.query("select count(*) n from wallet_ledger where payment_id=$1 and entry_type='release_available_credit'", [opposing.payment])).rows[0].n)
      assert.equal(releases, winner === 'traveler' ? 1 : 0)
    }
    check('opposing customer/traveler resolutions serialize without deadlock and commit exactly one outcome')
  }

  const partial = await fixture({ match: true, hold: true, dispute: true })
  assert.equal((await admin(db, partial, 10000)).error, 'invalid_refund_amount')
  assert.equal((await state(partial)).status, 'held')
  assert.equal((await state(partial)).dispute_status, 'open')
  assert.equal((await db.query('select pending_balance from wallets where user_id=$1', [partial.traveler])).rows[0].pending_balance, '16000')
  assert.equal(await creditCount(partial), 0)
  assert.equal((await state(partial)).audits, 0)
  check('partial customer refund is rejected without moving traveler or customer funds')

  const released = await fixture({ match: true, hold: true, release: true, dispute: true })
  assert.equal((await admin(db, released)).success, true)
  const releasedWallet = (await db.query('select available_balance,pending_balance from wallets where user_id=$1', [released.traveler])).rows[0]
  assert.deepEqual(releasedWallet, { available_balance: '0', pending_balance: '0' })
  check('released refund debits available without debiting pending twice')

  const reserved = await fixture({ match: true, hold: true, release: true, dispute: true })
  if (snapshot) {
    await db.query("insert into payouts(traveler_user_id,wallet_id,amount,status) select user_id,id,16000,'approved' from wallets where user_id=$1", [reserved.traveler])
  } else await db.query("insert into payouts(traveler_user_id,amount,status) values($1,16000,'approved')", [reserved.traveler])
  await assert.rejects(admin(db, reserved), /insufficient_available_balance/)
  assert.equal(await creditCount(reserved), 0)
  assert.equal((await state(reserved)).status, 'released')
  assert.equal((await state(reserved)).customer_wallets, 0)
  check('spent or reserved traveler funds block and roll back customer wallet creation')

  const legacy = await fixture()
  const legacyWallet = (await db.query('insert into wallets(user_id) values($1) returning id', [legacy.customer])).rows[0].id
  await db.query(`insert into wallet_ledger(wallet_id,user_id,payment_id,entry_type,balance_type,direction,amount)
    values($1,$2,$3,'refund_available_credit','available','credit',18000)`, [legacyWallet, legacy.customer, legacy.payment])
  assert.equal((await dashboard(db, legacy)).error, 'refund_reconciliation_required')
  assert.equal(await creditCount(legacy), 1)
  assert.equal((await state(legacy)).status, 'held')
  check('legacy partial credit requires reconciliation without another credit or state repair')

  const failure = await fixture()
  await db.query(`create function a03_test_fail_payment() returns trigger language plpgsql as $$ begin raise exception 'injected_after_credit'; end $$;
    create trigger a03_test_fail_payment before update on payments for each row execute function a03_test_fail_payment()`)
  await assert.rejects(dashboard(db, failure), /injected_after_credit/)
  assert.equal(await creditCount(failure), 0)
  assert.equal((await state(failure)).status, 'held')
  assert.equal((await state(failure)).shipment_status, 'open')
  assert.equal((await state(failure)).customer_wallets, 0)
  await db.query('drop trigger a03_test_fail_payment on payments')
  check('failure after ledger credit rolls back ledger, wallet, payment and shipment')

  const auditFailure = await fixture({ match: true, hold: true, dispute: true })
  await db.query(`create function a03_test_fail_audit() returns trigger language plpgsql as $$ begin raise exception 'injected_audit_failure'; end $$;
    create trigger a03_test_fail_audit before insert on app_audit_logs for each row execute function a03_test_fail_audit()`)
  await assert.rejects(admin(db, auditFailure), /injected_audit_failure/)
  assert.equal(await creditCount(auditFailure), 0)
  const after = await state(auditFailure)
  assert.equal(after.status, 'held'); assert.equal(after.match_status, 'disputed'); assert.equal(after.dispute_status, 'open')
  assert.equal(after.customer_wallets, 0); assert.equal(after.audits, 0)
  assert.equal(Number((await db.query("select count(*) n from wallet_ledger where payment_id=$1 and entry_type='refund_pending_debit'", [auditFailure.payment])).rows[0].n), 0)
  check('late audit failure also rolls back traveler debit and dispute/match resolution')
  const reviewFailure = await fixture({ match: true, hold: true, dispute: true })
  const beforeReviewFailure = (await db.query('select metadata from payments where id=$1', [reviewFailure.payment])).rows[0].metadata
  await assert.rejects(review(db, reviewFailure, 'rejected'), /injected_audit_failure/)
  assert.equal((await state(reviewFailure)).dispute_status, 'open')
  assert.equal((await state(reviewFailure)).match_status, 'disputed')
  assert.equal((await state(reviewFailure)).audits, 0)
  assert.deepEqual((await db.query('select metadata from payments where id=$1', [reviewFailure.payment])).rows[0].metadata, beforeReviewFailure)
  check('late review audit failure rolls back metadata and both dispute/match states')
  console.log(`A03 isolated PostgreSQL (${snapshot ? 'remote schema with real public triggers' : 'minimal fixture'}): ${checks} checks passed; no external payments or production writes.`)
} finally {
  for (const client of clients) await client.end().catch(() => {})
  if (control._connected) {
    await control.query(`drop database if exists "${database}"`).catch(() => {})
    await control.end()
  }
}
