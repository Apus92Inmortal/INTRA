# INTRA - Database Notes

## Reglas

- Toda modificacion de DB debe ir por migracion.
- No tocar RLS sin documentar la razon y el alcance.
- No cambiar estados de pagos sin revisar flujo Wompi.
- No crear columnas usadas por frontend sin migracion aplicada.
- No modificar funciones `security definer` sin validar permisos.
- No cambiar wallet, ledger, refunds o payouts sin revisar impacto operativo.

## Tablas criticas

- `profiles`
- `shipments`
- `trips`
- `matches`
- `messages`
- `payments`
- `wallets`
- `wallet_ledger`
- `payouts`
- `notifications`
- `cities`
- `user_policy_acceptances`
- `shipment_declarations`

## RPCs criticas

- `accept_match`
- `reject_match`
- `cancel_match`
- `mark_shipment_in_transit`
- `confirm_shipment_delivery`
- `mark_notification_as_read`
- `mark_all_notifications_as_read`

## Storage

- Usar buckets privados para evidencia o documentos sensibles.
- Las policies deben limitar acceso a usuarios relacionados y admins.
- No asociar liberacion de pagos solo a carga de evidencia sin regla operativa aprobada.

## QA temporal Dashboard Typography - 2026-06-09

- Marker temporal: `QA_DASHBOARD_TYPOGRAPHY_20260609`.
- Objetivo: validar visualmente en PR #133 el bloque de viajero interesado del Dashboard `/app` con nombre visible, badge `Viajero verificado`, `12 entregas completadas` y promedio grande de ganancias.
- No se aplicaron migraciones, cambios de schema, RLS, Storage policies, wallet logic ni reglas de pagos.
- Cleanup ejecutado despues de aprobacion visual:
  - auth users QA: `0`.
  - profiles QA: `0`.
  - shipments QA: `0`.
  - trips QA: `0`.
  - matches QA: `0`.
  - payments QA: `0`.
  - notifications QA: `0`.
  - reviews QA: `0`.
  - shipment evidence QA: `0`.
  - storage evidence QA: `0`.
  - messages QA: `0`.
  - shipment report events QA: `0`.
  - shipment declarations QA: `0`.
  - wallet ledger QA: `0`.
  - user verifications QA: `0`.
- Usuario real de Aldo preservado: `48bcad86-bdb0-4699-9c1e-1946e0087938`.

## Evidencias de envio

- Tabla existente: `shipment_evidence`.
- Bucket existente: `shipment-evidence`.
- Tipos legacy permitidos por constraint: `pickup`, `delivery`, `package_state`.
- La evidencia inicial obligatoria del cliente requiere un tipo semantico propio como `customer_initial_photo`.
- Para no ensuciar semantica, no se recomienda guardar evidencia inicial como `package_state`.
- PR #108 agrego una migracion pequena y aditiva para ampliar `shipment_evidence.evidence_type` con `customer_initial_photo`, `pickup_photo`, `delivery_photo` y `suspicious_photo`, manteniendo compatibilidad con los tipos legacy.
- Migracion remota aplicada y verificada en Supabase real: `202605252230_extend_shipment_evidence_types.sql`.
- Constraint remota verificada: `shipment_evidence_evidence_type_check`.
- Si se muestra evidencia inicial al viajero antes del match desde `/app`, preferir signed URLs generadas server-side para viajeros con viaje compatible y envio payment-ready antes de ampliar RLS.

## Pagos y wallet

- Wompi checkout procesa el pago del cliente.
- La liberacion al viajero depende de reglas operativas, entrega, disputa y bloqueos administrativos.
- No exponer porcentajes internos de tarifa en UI publica; usar copy aprobado de la matriz legal operativa.

## TASK-024 - Cancelacion Dashboard de envio pagado esperando viajero

- TASK-024 quedo cerrada en `main` con PR #157.
- Merge commit: `bed21e1`.
- No se agregaron migraciones, tablas, columnas, RLS ni RPCs.
- Se reutiliza el patron existente de Wallet para devolucion interna al cliente:
  - `wallet_ledger.entry_type = refund_available_credit`.
  - `balance_type = available`.
  - `direction = credit`.
  - `wallet_ledger.amount = payments.amount - coalesce(gateway_fee_actual, gateway_fee_estimated, 0)`.
  - `sync_wallet_balance` para recalcular saldos.
- El costo de pasarela no se acredita al Wallet; queda trazado en metadata como `gateway_fee_amount`.
- Regla financiera vigente: en cancelacion temprana de envio pagado sin viajero, Wallet recibe solo el valor neto reembolsable. INTRA no debe devolver a Wallet el costo de pasarela.
- La action `cancelActiveWaitingTravelerShipmentAction` solo opera si:
  - el envio pertenece al usuario autenticado.
  - `shipments.status = open`.
  - latest payment esta `held`.
  - `gateway_status = approved`.
  - `refund_status = none`.
  - `dispute_status = none`.
  - no existe `metadata.manual_refund_required`.
  - no existen matches `pending`, `accepted` o `completed`.
  - no existen reportes operativos `open` o `reviewing`.
  - no existe ledger `release_available_credit`.
- La action marca:
  - `shipments.status = cancelled`.
  - `payments.status = refunded`.
  - `payments.refund_status = refunded`.
- No ejecuta refund externo automatico Wompi.
- Si existiera hold historico de viajero, registra `refund_pending_debit` antes de sincronizar Wallet del viajero.

## PR F1 - Profiles RLS hardening

- Migracion nueva: `202606061830_profiles_rls_schema_hardening.sql`.
- Estado remoto: aplicada en Supabase real del proyecto Intra-app, segun confirmacion de Aldo el 2026-06-06.
- Objetivo: cerrar lectura amplia de `profiles` y evitar exposicion de PII entre usuarios autenticados.
- `profiles` queda con RLS habilitado y policies self-only:
  - `profiles_select_self`: solo `id = auth.uid()`.
  - `profiles_insert_self`: solo `id = auth.uid()`.
  - `profiles_update_self`: solo `id = auth.uid()`.
- Se eliminan policies legacy/amplias:
  - `Authenticated users can read profiles`.
  - `profiles_select_related_or_self`.
  - policies publicas duplicadas de owner/self.
- Datos sensibles que ya no deben leerse desde cliente para terceros:
  - `phone`.
  - `document_number`.
  - `city_id` y cualquier dato privado del perfil.
- La lectura minima de contraparte se hace mediante RPC:
  - `get_public_profiles(uuid[])` devuelve solo `id` y `full_name`.
  - Usa `can_view_public_profile(uuid)` para permitir nombre propio, contraparte de match, viajero con trip abierto/full u owner de shipment open payment-ready.
- Admin conserva acceso usando cliente server-side protegido con service role.
- `supabase/schema.sql` fue reconciliado para `profiles`/RLS y ya no contiene lectura total de perfiles.

Confirmacion Supabase real:

- La policy peligrosa `Authenticated users can read profiles` ya no existe.
- Las policies legacy/duplicadas de `profiles` fueron eliminadas.
- `profiles` quedo con:
  - `profiles_insert_self`,
  - `profiles_select_self`,
  - `profiles_update_self`.
- Existen las funciones:
  - `can_view_profile`,
  - `can_view_public_profile`,
  - `get_public_profiles`.
- Production validado por Aldo despues de aplicar la migracion:
  - dashboard carga normal,
  - matches carga normal,
  - detalle de match carga normal,
  - chat carga normal,
  - nombres minimos de contraparte cargan correctamente.
- El P0 de lectura amplia de `profiles` / exposicion potencial de PII queda cerrado en repo, `main`, Supabase real y Production.

Verificacion SQL/manual recomendada en Supabase:

```sql
-- Como usuario A autenticado:
select id, full_name, phone, document_number
from public.profiles
where id = auth.uid();

-- Debe devolver 0 filas para usuario B sin relacion:
select id, full_name, phone, document_number
from public.profiles
where id = '<USER_B_ID>';

-- Debe devolver solo id/full_name cuando exista contexto publico valido:
select *
from public.get_public_profiles(array['<USER_B_ID>'::uuid]);

-- Debe fallar o devolver 0 filas para PII de B aun si existe match/contexto:
select phone, document_number
from public.profiles
where id = '<USER_B_ID>';
```

## PR F2 - RPC/env/admin hardening

- Migracion nueva: `202606061930_rpc_anon_grants_hardening.sql`.
- Estado remoto: aplicada en Supabase real del proyecto Intra-app, segun confirmacion de Aldo el 2026-06-06.
- Objetivo: cerrar grants `anon` reintroducidos en RPCs operativas despues del hardening phase0.
- RPCs ajustadas:
  - `mark_match_read(uuid, timestamptz)`: revoca `anon`, mantiene `authenticated`.
  - `request_match(uuid, uuid)`: revoca `anon`, mantiene `authenticated`.
  - `create_trip(uuid, uuid, date, time, numeric, text, boolean, boolean, boolean)`: revoca `anon`, mantiene `authenticated`.
- Motivo: estas RPCs dependen de usuario autenticado y validan `auth.uid()`; `anon` no debe ejecutar operaciones de matches/trips.
- RPC publica justificada:
  - `calculate_payment_amount(...)` conserva grant `anon` porque es calculadora publica de tarifa y no muta datos.
- Admin client:
  - `lib/supabase/admin.ts` queda protegido con `server-only`.
  - `SUPABASE_SERVICE_ROLE_KEY` debe permanecer solo en server actions, route handlers o server-only modules.
- Env:
  - Wompi server-side usa `INTRA_WOMPI_PRIVATE_KEY`, `INTRA_WOMPI_EVENTS_KEY` e `INTRA_WOMPI_INTEGRITY_KEY`.
  - Los nombres legacy `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_KEY` y `WOMPI_INTEGRITY_KEY` no son leidos por la app y no deben usarse como fuente de verdad de produccion.

Confirmacion Supabase real:

- `create_trip` ya no tiene grant para `anon`; conserva `authenticated`, `postgres` y `service_role`.
- `mark_match_read` ya no tiene grant para `anon`; conserva `authenticated`, `postgres` y `service_role`.
- `request_match` ya no tiene grant para `anon`; conserva `authenticated`, `postgres` y `service_role`.
- `calculate_payment_amount` queda publico/`anon` como funcion de cotizacion no mutante.
- Production validado por Aldo despues de aplicar la migracion:
  - publicar viaje OK,
  - solicitar match OK,
  - chat/read OK,
  - sin novedad.
- PR F2 queda cerrado en repo, `main`, Supabase real y Production.

Verificacion SQL recomendada despues de aplicar la migracion:

```sql
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name in ('mark_match_read', 'request_match', 'create_trip', 'calculate_payment_amount')
order by routine_name, grantee;
```

Resultado esperado:

- `mark_match_read`, `request_match` y `create_trip`: sin `anon`, con `authenticated`.
- `calculate_payment_amount`: puede conservar `anon` por pricing publico no mutante.

## PR F3 - Refunds/payouts manual ops

- Migracion nueva: `202606070020_manual_refunds_payouts_ops.sql`.
- Estado remoto: aplicada en Supabase real, segun confirmacion de Aldo.
- Objetivo: endurecer operacion manual de payouts y documentar refunds/payouts manuales MVP.
- Decision MVP:
  - refunds manuales,
  - payouts manuales,
  - sin payout bancario automatico,
  - sin refund automatico Wompi.
- Refund manual:
  - `refund_status` existente: `none`, `manual_required`, `pending`, `processing`, `refunded`, `failed`.
  - `release_payment` y `auto_release_due_payments` bloquean si `refund_status <> 'none'` o `metadata.manual_refund_required = true`.
  - Admin action exige nota operativa al cerrar disputa con resolucion final.
- Payout manual:
  - `request_payout` valida usuario autenticado, politica aceptada, cuenta verificada, nivel `payout_verified`, minimo y saldo retirable.
  - `admin_update_payout_status` se reemplaza para exigir referencia externa antes de `paid`.
  - La RPC valida wallet y saldo antes de cambiar payout a `paid`.
  - Inserta una sola vez `wallet_ledger.entry_type = 'payout_paid_debit'` por `payout_id`.
  - Si ya existe ledger pagado para un payout no marcado `paid`, retorna `payout_already_has_paid_ledger` para congelar y reconciliar.

Verificacion SQL recomendada despues de aplicar la migracion:

```sql
select p.id, p.status, p.amount, p.paid_reference, p.paid_at, count(wl.id) as paid_ledger_rows
from public.payouts p
left join public.wallet_ledger wl
  on wl.payout_id = p.id
 and wl.entry_type = 'payout_paid_debit'
group by p.id, p.status, p.amount, p.paid_reference, p.paid_at
order by p.paid_at desc nulls last, p.requested_at desc;
```

Resultado esperado:

- Payouts `paid` tienen `paid_reference`, `paid_at` y una sola entrada `payout_paid_debit`.
- Payouts `approved` no tienen ledger `payout_paid_debit`.
- Wallet disponible no queda negativa por payout manual.

## Hotfix F3 - Suspicious dispute traveler resolution

- Migracion nueva: `202606070140_suspicious_dispute_traveler_resolution.sql`.
- Estado remoto: aplicada en Supabase real, segun confirmacion de Aldo.
- Objetivo: corregir bug Production donde una alerta de paquete sospechoso escalada a disputa falla con `match_in_dispute` al resolver a favor del viajero.
- Causa: `reviewDisputeAction` llamaba `release_payment` mientras `payments.dispute_status = 'open'`; `release_payment` debe seguir bloqueando disputas abiertas para flujos normales.
- Nueva RPC: `admin_resolve_dispute_for_traveler(uuid, uuid, text, uuid)`.
- Alcance de la RPC:
  - requiere nota operativa,
  - valida payment `held`, gateway `approved`, dispute `open`, sin refund/manual_refund_required,
  - bloquea payment/match/shipment con `for update`,
  - registra ledger `release_pending_debit` y `release_available_credit` de forma idempotente,
  - marca payment `released` y dispute `resolved`,
  - marca match `resolved`,
  - actualiza metadata del `shipment_report_events` escalado si existe,
  - registra `app_audit_logs`,
  - sincroniza wallet del viajero.
- La RPC queda disponible solo para `service_role`.
- No se modifica `release_payment` global.
- PR #120 fue mergeado a `main` con merge commit `ed0b498`.
- Production validado por Aldo despues de aplicar la migracion:
  - paquete sospechoso -> escalar a disputa -> resolver a favor del viajero: OK.
  - ya no aparece error `match_in_dispute`.
  - resolver disputa a favor del cliente sigue funcionando.
  - flujo admin de disputa/release queda operativo.
  - no se detectaron novedades en pruebas.
- F3 queda cerrado en repo, `main`, Supabase real y Production.

Verificacion SQL recomendada despues de aplicar la migracion:

```sql
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name = 'admin_resolve_dispute_for_traveler'
order by grantee;
```

Resultado esperado:

- Sin `anon`.
- Sin `authenticated`.
- Con `service_role`.

## PR F4 - Operational notifications

- Migracion nueva: `202606071450_operational_notifications_f4.sql`.
- Estado remoto: aplicada en Supabase real, segun confirmacion de Aldo el 2026-06-07.
- Objetivo:
  - corregir unicidad/idempotencia de `notifications`,
  - permitir eventos repetibles como `new_message`,
  - completar eventos operativos criticos mediante triggers de notificacion.
- Cambio de tabla:
  - `notifications.dedupe_key text` nuevo, opcional.
- Indices:
  - se elimina el indice global amplio sobre `(related_match_id, type)`.
  - se agrega `notifications_unique_dedupe_key` sobre `(user_id, type, dedupe_key)` cuando `dedupe_key is not null`.
  - se agrega `notifications_unique_idempotent_match_event` sobre `(user_id, related_match_id, type)` solo para eventos idempotentes con match.
- Eventos repetibles:
  - `new_message` no queda dentro de indices unicos fuertes.
  - `shipment_alert` tampoco queda bloqueado globalmente para permitir nuevos reportes legitimos.
- Helper nuevo:
  - `create_operational_notification(uuid, text, text, text, uuid, text, boolean)`.
- Triggers nuevos:
  - `payments`: pago confirmado/fallido/cancelado/liberado, auto-release, refund manual requerido/procesado, disputa abierta, caso en revision, disputa resuelta/cerrada.
  - `payouts`: retiro solicitado/aprobado/rechazado/pagado.
  - `user_verifications`: verificacion aprobada/rechazada.
  - `traveler_payout_accounts`: cuenta de retiro aprobada/rechazada.
  - `shipment_report_events`: caso en revision y alerta escalada a disputa.
- RPC ajustada:
  - `reject_match(uuid)` deja de depender de `on conflict (related_match_id, type)` y usa el helper idempotente.

Verificacion SQL recomendada despues de aplicar la migracion:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'notifications'
order by indexname;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'notifications'
  and column_name = 'dedupe_key';

select tgname, tgrelid::regclass::text as table_name
from pg_trigger
where not tgisinternal
  and tgname in (
    'trg_notify_payment_operational_event',
    'trg_notify_payout_insert_operational_event',
    'trg_notify_payout_update_operational_event',
    'trg_notify_user_verification_operational_event',
    'trg_notify_payout_account_operational_event',
    'trg_notify_shipment_report_operational_event'
  )
order by table_name, tgname;
```

Resultado esperado:

- No existe `notifications_unique_match_type_global`.
- Existe `notifications.dedupe_key`.
- Existen los triggers F4.
- `new_message` puede repetirse para el mismo match/usuario.

Confirmacion Supabase real:

- `notifications_unique_dedupe_key`: OK.
- `notifications_unique_idempotent_match_event`: OK.
- `dedupe_key` existe como `text nullable`: OK.
- Indices globales peligrosos eliminados: OK.
- Triggers F4 existentes:
  - `trg_notify_payment_operational_event`.
  - `trg_notify_payout_insert_operational_event`.
  - `trg_notify_payout_update_operational_event`.
  - `trg_notify_user_verification_operational_event`.
  - `trg_notify_payout_account_operational_event`.
  - `trg_notify_shipment_report_operational_event`.

Validacion Production:

- Aldo valido eventos criticos de notificacion.
- Sin novedades reportadas.
- Notificaciones operativas funcionando correctamente.
- F4 queda cerrado en repo, `main`, Supabase real y Production.
