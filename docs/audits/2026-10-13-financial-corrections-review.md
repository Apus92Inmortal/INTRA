# Revisión de integridad financiera — 2026-10-13

## Dictamen y alcance

Las correcciones A03/A04/A01 guards/A06 conservan las restricciones financieras
A01/A02 y superan las pruebas locales de concurrencia, reintentos y fallos
transaccionales descritas abajo. Durante esta revisión se reprodujeron y
corrigieron fallos adicionales de cancelación, revisión administrativa,
precisión monetaria y orden de locks. Este resultado certifica el comportamiento
del código probado en PostgreSQL aislado; no certifica todavía su publicación,
las credenciales del proveedor ni un ciclo real Wompi/Wallet/payout.

Se revisaron las cinco migraciones nuevas `20261013*`, sus consumidores en
`shipment-actions.ts`, `admin/actions.ts`, webhook, retorno del checkout,
reconciliación interna, `lib/auth/admin.ts` y las restricciones A01/A02. El
contraste usa el DDL público real inspeccionado el 2026-10-13, versionado sin
filas en `supabase/tests/fixtures/pre-corrections-schema-20261013.json`.
Las consultas al proyecto remoto durante esta revisión fueron de lectura.

## Hallazgos reproducidos y correcciones

| Hallazgo | Evidencia antes de corregir | Comportamiento actual |
| --- | --- | --- |
| Metadata administrativa obsoleta | `reviewing` leía metadata, un refund cerraba la disputa y luego el UPDATE antiguo borraba `wallet_refund_source`/actor. Un reintento devolvía `refund_reconciliation_required`. `rejected` además cerraba payment/match en peticiones separadas. | RPC `admin_review_dispute`, solo servidor, merge desde fila bloqueada, actor explícito y audit dentro de la misma transacción. Una revisión/rechazo que espera un refund ya confirmado falla sin sobrescribirlo. |
| Cancelación sin pago frente a confirmación Wompi | La acción leía `pending`; Wompi cambiaba a `held`; la acción cancelaba shipment sin volver a comprobar payments. Resultado reproducido: payment retenido sobre shipment cancelado. | RPC `cancel_pending_payment_shipment` bloquea shipment, todos sus intentos, matches/reportes y valida antes de cancelar payment/shipment juntos. La confirmación ganadora impide cancelar. La cancelación ganadora deja la aprobación tardía como evento no procesado con `shipment_cancelled_before_approval`. |
| Resoluciones administrativas opuestas | A03 tomaba shipment→payment; la resolución del viajero tomaba payment→match→shipment. Dos sesiones produjeron `40P01`; PostgreSQL revertía los cambios. | La resolución del viajero conserva sus transiciones y permisos, con shipment→payments ordenados por ID→matches→reportes. Las carreras probadas en ambos órdenes confirman una sola resolución y ninguna duplicación. |
| Dashboard frente a aceptación de match | Dashboard esperaba un match que la RPC histórica de aceptación ya bloqueaba, mientras esta esperaba shipment. Se reprodujo `40P01` sin pérdida de ledger. | Dashboard rechaza un match activo inmediatamente después de bloquear shipment, antes de esperar locks de hijos. `request_match` toma ese mismo lock antes de insertar y vuelve a validar disponibilidad. Se conserva DEC-010. |
| Importe con más de dos decimales | Ledger `numeric(12,2)` podía redondear un importe diferente al guardado en metadata/respuesta, rompiendo la igualdad del reintento. | A03 rechaza importes no finitos, no positivos, superiores al neto o diferentes de `round(amount,2)`. Se prueba `10000.001` sin crédito. |

## Autenticación, permisos y contratos

- Dashboard valida `auth.getUser()` y su error antes de obtener el cliente
  privilegiado; el actor procede de la sesión, nunca del formulario.
- Admin requiere el UUID incluido en `ADMIN_USER_IDS`. `ADMIN_EMAILS` ya no
  autoriza: Auth con autoconfirmación no prueba propiedad de un correo escrito
  durante el registro. Production debe tener UUID reales configurados.
- Las nuevas RPC financieras son `SECURITY DEFINER`, propiedad de `postgres`,
  con `search_path` vacío y EXECUTE solo para `service_role`. El helper interno
  de refunds tampoco es ejecutable directamente por `service_role`.
  Su actor explícito no sustituye la comprobación del admin en el servidor;
  el secreto de servicio sigue siendo una frontera de confianza.
- A01 mantiene ledger/release/refund internos inaccesibles para navegador;
  el guard distingue el rol original del invocador de `current_user` dentro de
  SECURITY DEFINER. Conserva cron/servidor legítimos y rechaza actores ausentes
  o relaciones NULL en las rutas endurecidas.
- A02 mantiene bloqueadas escrituras directas a payments/payouts y conserva
  `create_payment_retry` autenticada. Las demas tablas financieras conservan
  sus restricciones previas; A06 no reabre ninguna de las siete verificadas.
- El inventario remoto de ACL confirmó que las RPC legítimas autenticadas
  tienen grants explícitos; revocar el EXECUTE heredado de PUBLIC en A06 no
  elimina su permiso legítimo. La suite comprueba grants A01/A02 después de
  aplicar todas las correcciones.
- Las acciones solo anuncian éxito si el resultado RPC contiene
  `success === true`; un error funcional no provoca revalidación ni éxito falso.

## Montos, estados e idempotencia

La cancelación pagada acredita únicamente
`amount - coalesce(gateway_fee_actual,gateway_fee_estimated,0)`, en COP. El
admin conserva la devolución parcial explícita dentro de ese límite. Las
reversiones del viajero usan los créditos reales de hold/release y evitan
debitar pending dos veces. Saldo disponible gastado o reservado para payouts
bloquea la operación y revierte también la creación de wallet.

El índice parcial único por payment para `refund_available_credit` impide una
segunda acreditación incluso desde otro escritor. La migración bloquea
duplicados históricos sin borrar entradas. Solo una combinación consistente
de ledger, estado, actor/source y audit constituye un reintento exitoso;
historia parcial exige conciliación. Payment/wallet/ledger/shipment/match/audit
comparten transacción. No se ejecuta una devolución externa ni un payout
automático desde estas RPC.

Los locks coherentes cubren los pares financieros probados y las carreras
Dashboard/request/accept descritas. No se afirma haber demostrado ausencia
global de deadlocks en cada combinación de todas las RPC históricas: otras
rutas conservan sus transacciones previas y PostgreSQL revierte un deadlock.
Un `40P01` requiere reintentar el caso y revisar la bitácora; nunca compensarlo
insertando ledger manualmente.

## Webhook, retorno y reconciliación

La firma exige ID/status/importe firmados. Referencia, moneda y estado actual
proceden de la consulta canónica del ID a Wompi. SQL vuelve a validar proveedor,
referencia única, ID de transacción, importe y moneda antes de aplicar estados.
La ingesta bloquea el evento y comparte transacción con payment y sus triggers;
solo éxito marca `processed=true`. Un fallo posterior revierte también payment
y notificaciones. Un PENDING posterior a APPROVED no regresa el saldo, y un
estado terminal contradictorio permanece pendiente de conciliación.

La entrega firmada se conserva antes de consultar Wompi. Una caída del API
deja `awaiting_provider_verification`; el lookup tiene timeout de 15 segundos.
El reintento no resetea eventos ya procesados ni permite cambiar su identidad.
El retorno valida sesión/propiedad del payment y reutiliza la ingesta.

`POST /api/internal/wompi-reconcile` exige admin por UUID y Origin exacto,
acepta un UUID de evento existente, registra audit antes del lookup y consulta
el proveedor de nuevo. No crea un cobro. Es necesario vigilar eventos false
porque los reintentos automáticos del proveedor son finitos. Conflictos de
importe/moneda/identidad/estado terminal y aprobaciones posteriores a cancelación
necesitan revisión del operador. Estas últimas quedan visibles, sin `held`
sobre shipment cancelado y sin inventar una compensación en wallet.

**Gate operativo:** antes del piloto debe existir un responsable que gestione
`shipment_cancelled_before_approval`: comprobar el cobro canónico, ejecutar una
devolución externa por el procedimiento aprobado cuando corresponda y registrar
su evidencia/conciliación. El endpoint de reintento no ejecuta esa devolución;
forzar JSON/estado/`processed=true` por SQL no satisface el gate.

## Validación ejecutada

- PostgreSQL 17 local, DDL público real, las cinco migraciones nuevas aplicadas
  en cada DB desechable; datos, ciudades, usuarios, pagos y referencias sintéticos.
- A03: 18 checks PASS de preflight de duplicados, ACL, actor/contexto, carreras de
  refund, revisión/rechazo, resoluciones opuestas, importes, holds/releases,
  payouts reservados, historia parcial y fallos después del crédito/audit.
- A04: 15 checks PASS de entrega antes del lookup, duplicados concurrentes, payment ausente y
  reintento, seis discrepancias de identidad/valor, estados fuera de orden,
  aprobación/cancelación en ambos órdenes, intento antiguo pagado y fallos
  posteriores de audit/processed.
- A06: cinco grants A01, catorce restricciones A02, dieciséis checks de
  permisos/configuración, pruebas por roles, guards NULL y carreras de matches.
- Unit de los consumidores de refund/cancel/revisión: 9/9 PASS. Lint de los
  archivos cambiados, TypeScript y `git diff --check`: PASS.

Auth y Storage son interfaces stub en estas pruebas; las tablas, constraints,
funciones, índices, policies y triggers públicos provienen del snapshot.
Los buckets privados son fixtures vacíos para aplicar A13. Esto no reemplaza
smoke Auth real, ciclo sandbox Wompi, restauración de respaldo, ni QA autenticado
de cliente/viajero/tercero/admin. Build/lint/unit completos y E2E del cambio global
se reportan en el cierre del agente principal.

## Reproducción sin secretos

Se necesita Node 24, las dependencias de `npm ci` y un PostgreSQL 17 desechable
en loopback con permisos para crear/eliminar sus DB de prueba y roles locales.
Ejemplo de contenedor nuevo, con contraseña sintética que no pertenece a INTRA:

```powershell
docker run --rm --name intra-financial-tests -e POSTGRES_PASSWORD=local_tests_only -p 127.0.0.1:55439:5432 postgres:17
```

En otra terminal, desde el repositorio:

```powershell
npm ci
$env:INTRA_TEST_PG_HOST='127.0.0.1'
$env:INTRA_TEST_PG_PORT='55439'
$env:INTRA_TEST_PG_USER='postgres'
$env:INTRA_TEST_PG_PASSWORD='local_tests_only'
npm run test:db
```

Cada harness crea una DB con prefijo propio, carga el fixture versionado por
defecto, aplica todas las migraciones `20261013*` en orden y elimina su DB al
cerrar. A03 comprueba primero que su migración rechace duplicados; después
aplica A03 y el resto. No lee `.env.local`, no llama Wompi y rechaza hosts
fuera de loopback. El job `database` de CI reproduce el mismo comando con el
servicio PostgreSQL 17 y credenciales sintéticas locales al job.

No ejecutar la historia antigua completa ni `db push` indiscriminado sobre
Production: el drift previo está documentado. Para publicación se debe seguir
`docs/ops/launch-corrections-rollout-20261013.md`, hacer preflight de solo lectura,
respaldo/restauración comprobados, aprobación, aplicación registrada y postflight.
