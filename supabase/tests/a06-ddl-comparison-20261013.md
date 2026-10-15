# A06 DDL comparison and corrective scope — 2026-10-13

Production project inspected read-only: `okajyhkdyapbsornjeeb`.
No customer rows, signed URLs or secrets are included in this inventory.

## Verified effective drift

| Object | Inspected Production state | Corrective change |
| --- | --- | --- |
| shipments policies | Legacy SELECT `USING(true)`, open-or-own policy, duplicate owner INSERT/UPDATE/DELETE; restrictive policies combine permissively with these | One contextual SELECT policy; client DML revoked |
| can_view_shipment(uuid) | Older body grants any open shipment, including unpaid; lacks explicit authentication gate | Own shipments, related matches, or open payment-ready market opportunities only; explicit uid guard |
| matches policies | Legacy requester INSERT and participant UPDATE permit transitions outside RPC; duplicate SELECT policies | One participant SELECT; all client DML revoked |
| trips policies | Legacy/duplicate owner writes remain despite phase0 RPC plan | Contextual SELECT; writes through create_trip/close_trip and existing server actions |
| messages policies | Legacy INSERT allows a participant to supply another sender and send before accepted; narrower policy does not override it | Sender must be caller and match accepted; SELECT participants; grants SELECT/INSERT only |
| SECURITY DEFINER EXECUTE | 22 anon-executable routines after A01, including operational RPCs/helpers/triggers; calculator intentionally public | Anon/PUBLIC removed from every private definer routine; authenticated/server grants preserved; trigger direct API grants removed |
| mutable search_path | generate_payout_code() and notify_match_requested() have no fixed path | Empty search_path; inspected bodies use schema-qualified relations and pg_catalog built-ins |
| release/refund guard | Nullable actor and relation comparisons can bypass checks in a future privileged wrapper | Explicit missing-actor handling and IS DISTINCT FROM; trusted SQL/cron/server release preserved |
| private buckets | identity-verification and shipment-evidence have no size/MIME limits | Private, 5 MiB, JPEG/PNG/WebP allowlist for new uploads |

The inspected RPC `request_match` already checks authentication, own available
trip, shipment payment-readiness and the unverified active-match limit. The
patch adds a shipment row lock before those state checks, serializing it with
A03 cancellation. A foreign-key lock during INSERT alone could wait after an
obsolete open/payment-ready check and then insert into a cancelled shipment.
Application callers create shipments/trips/matches through
RPCs; cancellation/admin actions use the guarded service-role client. Direct
chat INSERT and notification updates remain supported.

## Objects inspected and preserved

- Seven registered remote migrations: four historical versions plus
  A01/A02 `20260914145957`, `20260914152150`, `20260914153000`.
- Twenty-two public tables, fifty-five functions, actual policies, constraints,
  indexes and non-internal triggers were cloned as DDL into disposable local
  PostgreSQL 17 for verification. No Production table rows were cloned.
- Match uniqueness (shipment_id, trip_id), extended shipment-evidence types,
  payment state constraints, financial ledger hold/release/refund-debit/payout
  uniqueness and operational notification indexes are present remotely.
- The client-refund CREDIT unique index is absent remotely and belongs to A03;
  the existing similarly named refund AVAILABLE DEBIT index is different.
- Shipments have two historical weight constraints (25/50 kg). Business
  creation RPC enforces the current approved limit. A06 blocks client bypass
  of creation; it does not invent a new weight rule or drop those constraints.
- Storage metadata aggregate: existing object types JPEG, PNG and WebP only;
  largest object 2,046,594 bytes. Existing uploads are not rewritten/deleted.

## History reconciliation limit

Missing migration-history entries do not imply missing DDL. This patch
reconciles verified effective exposures and leaves historical versions intact.
`a06_readonly_inventory.sql` repeats migration/table/column/constraint/index/
policy/grant/function/trigger/bucket inspection without modifying data.
Do not run `supabase db push` or mark old migrations applied until the complete
DDL baseline is backed up and reviewed. A full history repair is a separate
operation; this patch does not certify it.

## Verification

On disposable local PostgreSQL 17 with the inspected Production DDL:

- All five launch migrations (A03/A06/A04/guards/Storage) applied successfully
  in chronological order, using the versioned schema-only fixture.
- `a06_privacy_permissions.sql`: 16/16 passed.
- `a06_privacy_roles.integration.sql`: own/related/third-party/anon/server
  visibility, profile/evidence/chat privacy, direct writes denied, read receipts,
  trip/match RPC success, forged sender and pending chat denied.
- `a01_actor_guards.integration.sql`: missing uid remains denied through an
  intentionally exposed test definer wrapper; NULL match owner/participants
  cannot authorize; SQL cron and trusted service wrapper contexts preserved.
- Fixtures and test wrappers rolled back; shipments/payments/ledger count zero.
- `a06-security.mjs` repeats the complete patch tests in a new disposable local DB, then
  proves a concurrent request waits behind cancellation, rechecks state and
  creates zero matches; a rolled-back reopening cannot leak transient state.

These tests verify PostgreSQL permissions and behavior; they do not substitute
for hosted Auth session/browser smoke, Storage HTTP upload/content validation,
Wompi money movement, or production postflight. MIME configuration limits do
not by themselves prove image bytes are authentic, malware scanning or a
complete retention/deletion/restoration process. Those operational checks
remain release gates.
