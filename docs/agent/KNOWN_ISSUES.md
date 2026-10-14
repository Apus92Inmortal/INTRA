# INTRA - Known Issues

## Gate financiero adicional 2026-10-14

- A05: las 7 referencias pendientes no tienen ID de transaccion, webhook
  ni ledger internos; falta consultar Wompi Production. Estos vacios no
  prueban ausencia de cobro externo.
- El SOP anterior proponia resolver `customer_refund` despues de devolver
  externamente, aunque esa accion acredita Wallet. Texto corregido localmente;
  aun no existe ruta validada para registrar/cerrar el refund externo sin
  doble restitucion. Mantener bloqueados nuevos cobros hasta resolverlo.

## Mitigaciones locales 2026-10-14 (no publicadas)

- A03: la nueva validacion local impide refund Wallet parcial sin asignacion
  del remanente; la politica contable parcial continua abierta. Production
  no tiene A03 aplicado. Mantener bloqueo de release hasta gate final.
- A13: la UI local ofrece descarte explicito de factores TOTP *unverified*
  y reconsulta antes de borrar; nunca elimina un factor *verified* desde
  ese flujo. No se ha probado con Auth real ni recuperacion del unico Admin.
- A05, restauracion, correo y aislamiento siguen abiertos sin cambios.

## Hallazgos de revision PR #183 - 2026-10-13

- **A03/P1, bloquea publicacion:** refund admin parcial `p_amount < neto`
  revierte todo `payment_hold` o `release_available_credit` del viajero,
  acredita solo `p_amount` al cliente y marca payment `refunded`. Falta
  asignacion y asiento verificable del remanente neto; resolver regla financiera
  o impedir parciales antes de aplicar la migracion. Ver A03 lineas 121-125,
  215-250 y test de parcial en `supabase/tests/a03-refunds.mjs`.
- **A13/P2, bloquea alta Admin hasta recuperacion probada:** la pantalla MFA
  omite factores TOTP no verificados al recargar y permite crear otros; varios
  intentos abandonados pueden agotar el limite de factores sin ruta UI para
  reanudar/limpiar. Ver `app/app/profile/security/SecurityClient.tsx`.
- Preflight remoto read-only: siete pagos Wompi pending/created de mas de 30
  minutos frente a seis documentados antes. No implica siete cobros efectivos.
  Cinco migraciones nuevas no aplicadas; sin duplicados refund ni referencias
  ambiguas en la consulta actual. No se modifico Production.

## Estado vigente 2026-10-13

- Recuperacion A11: Management API lista 0 backups gestionados y PITR
  desactivado en Production. No existe proyecto aislado disponible; la
  creacion con la credencial operativa devolvio 403. Ningun respaldo DB+Storage
  ni restore se ha probado. Bloquea acreditar recuperacion para el piloto.

El paquete de correcciones esta preparado en `codex/launch-corrections`; aun
no se aplico/publico. Los riesgos financieros/privacy inferiores describen
Production mientras no haya rollout y postflight. Ver [matriz actual](../audits/2026-10-13-launch-corrections-status.md).

- ISSUE-006/009: A01/A02 remotos mitigados; guards NULL y A06 probados local.
- ISSUE-007/008: A03/A04 locales atomicos, con pruebas de carreras/rollback.
  Se corrigio tambien metadata stale admin y cancelacion pendiente vs webhook.
  Late approval de shipment cancelado exige conciliacion, no hold/credito nuevo.
- ISSUE-010: audit prod local 0 y lock alineado. Full audit mantiene 5 high
  derivados de braces3.0.3 sin parche en herramientas dev. Navegador Vercel
  confirma Hobby; diez variables restringidas a Production sin cambiar valores.
  Cinco registros legacy nonprod ya borrados; 16 variables solo Production.
  Deployments antiguos y entorno aislado pendientes. Gates comerciales/operativos
  abiertos; main ya protegido. El borrado no revoco claves en su fuente.
- ISSUE-011: Auth autoconfirm=true, sin factores MFA. Email allowlist admin
  permitia suplantacion por registro; fix local exige UUID y JWT verificado
  `sub` coincidente/`aal2`. Bootstrap TOTP preparado fuera de operaciones admin;
  pendiente enrollment/challenge real del titular y recuperacion por consola.
  Cuenta del titular
  localizada; ADMIN_USER_IDS Secret Production guardado con unico UUID autorizado.
  Efecto tras deployment aprobado y smoke admin pendientes.
- A05: seis intentos antiguos pendientes, referencia del pago reportado sin
  identificar; no iniciar otro cobro para sustituir esa conciliacion.
- SMTP/confirm/reset, leaked-password, SPF/DMARC/DKIM, restore DB+objetos,
  alertas recibidas, aforo y revision legal/contable requieren evidencia externa.
- Correo: titular reporta suspension Google Workspace por impago y acceso a
  buzones; eligio conservarlo con `soporte@intra.com.co`. El borrador SMTP no
  fue guardado ni tiene credencial. 2-step Google desactivada y SIM no disponible
  varios dias; pendiente paso humano. No se verificaron envio/recepcion, ni
  se cambio proveedor/MX, ni se realizo reactivacion o pago.

No declarar lista INTRA hasta aplicar/verificar el paquete y completar esos
gates. Las notas inferiores se conservan como historial y no sustituyen este
estado ni autorizan nuevos movimientos financieros.

## Hallazgos vigentes - auditoria 2026-09-04

**No autorizar nuevos cobros basandose en PASS historicos.** Ver [informe completo](../audits/2026-09-04-launch-readiness.md). Los siguientes hallazgos estan abiertos; no se aplicaron fixes durante la auditoria.

### ISSUE-006: Permisos financieros peligrosos en Supabase Production

Estado: A01/A02 mitigados; P0 por verificaciones y A06/TASK-051 pendientes

- El 2026-09-14 se revoco EXECUTE directo de release_payment/refund_payment
  para PUBLIC, anon, authenticated y service_role; HTTP anon 401/42501.
  Sus guards NULL internos siguen sin reescribirse y falta smoke con cuentas.
- A02 ya revoco INSERT/UPDATE cliente de payments e INSERT de payouts en
  Production (`20260914153000`). La app usa RPC para retry. Comprobaciones
  de grants 14/14 y DML denegado con 42501; falta smoke con cuentas reales y
  concurrencia. No considerar cerrado todo TASK-050.
- create_operational_notification tambien perdio EXECUTE directo para esos
  roles; llamadas anonimas denegadas. No hay prueba de evento real por trigger.
- Evidencia: migraciones remotas `20260914145957`, `20260914152150` y
  `20260914153000`, PR #181, Vercel READY; no movimientos financieros.
- Seguimiento: TASK-050, hallazgos A01/A02 del informe.

### ISSUE-007: Devoluciones no atomicas y credito sin unicidad

Estado: Abierto / P1 antes de nuevos cobros

- Dashboard y refund admin insertan credito/sincronizan wallet antes de actualizar el estado en solicitudes separadas.
- No existe indice unico remoto para refund_available_credit. Riesgo de doble credito o estado parcial; no se reprodujo con dinero real.
- Seguimiento: TASK-051, A03.

### ISSUE-008: Webhook reconoce errores funcionales como procesados

Estado: Abierto / P1

- process_wompi_payment_event puede devolver success:false/payment_not_found; handler solo comprueba rpcError y marca processed:true.
- Reintentos posteriores pueden descartarse como duplicados sin conciliar el pago.
- Seguimiento: TASK-051, A04. No se atribuye a este defecto la ausencia de transacciones historicas sin evidencia.

### ISSUE-009: Privacidad e historial remoto desalineados

Estado: Abierto / P1

- Policy legacy de shipments usa USING(true) para authenticated, excediendo envios abiertos.
- 41 archivos de migracion locales, 5 entradas remotas tras A01; objetos mas
  nuevos si existen. Algunas policies que debian borrarse siguen activas.
- Security Advisor posterior a A01 lista 22 funciones SECURITY DEFINER aun
  ejecutables por anon; algunas tienen guardas y la calculadora publica es
  intencional. Revisar cada firma/definicion y retirar permisos innecesarios.
  [Guia del aviso](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- Dos funciones (`generate_payout_code`, `notify_match_requested`) conservan
  search_path mutable; [guia del aviso](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
- Seguimiento: TASK-050, A06; ampliar ISSUE-001 con diff real, no replay ciego.

### ISSUE-010: Dependencias, aislamiento y gates de lanzamiento pendientes

Estado: Abierto / P1

- npm audit prod: 5 paquetes high; Next 16.2.4 en lock/Production y 16.1.6 instalado localmente.
- Vercel Hobby para producto comercial; Preview comparte acceso a Supabase/credencial administrativa Production.
- main sin proteccion/checks exigidos; smoke autenticado remoto historico, no reciente.
- Conciliacion TASK-047 pendiente: 5 payments pending/created y 0 eventos Wompi/wallets/ledger/payouts en base consultada.
- Recuperacion, alertas y legal final sin evidencia de cierre; mejoras adicionales A12-A15 en informe.
- Seguimiento: TASK-047, TASK-048, TASK-052 y TASK-053.

---

## ISSUE-001: Supabase migrations pueden desalinearse del schema consolidado

Estado: Abierto
Riesgo: Alto

Descripcion:

`supabase/schema.sql` puede no reflejar exactamente todas las migraciones aplicadas en entornos remotos.

Recomendacion:

Antes de crear nuevas migraciones, revisar historial real de migraciones y evitar duplicar columnas, tablas, policies o funciones.

## ISSUE-002: Fase 2 de seguridad cerrada con salvedades

Estado: Abierto
Riesgo: Medio

Descripcion:

La Fase 2 quedo cerrada funcionalmente, pero con salvedades documentadas.

Referencia:

- `docs/phase-2-security-status.md`

Recomendacion:

Si se toca auth, routing, RLS, RPCs criticas, secretos o acceso cruzado, validar de nuevo los flujos sensibles.

## ISSUE-003: Memoria operativa requiere disciplina de cierre

Estado: Abierto
Riesgo: Medio

Descripcion:

La estructura `docs/agent/` solo sera util si se actualiza al cerrar sesiones tecnicas.

Recomendacion:

Cuando el usuario pida cerrar sesion, usar la skill `project-session-memory` y actualizar los archivos antes de reportar cierre.

## ISSUE-004: Eventos operativos no siempre actualizan en vivo

Estado: Abierto
Riesgo: Alto

Descripcion:

Aldo reporto que algunos eventos no se actualizan en vivo y obligan a refrescar paginas. La auditoria inicial detecto que el realtime existente cubre parte de `matches`, `shipments`, `messages` y `notifications`, pero no queda uniforme para pagos, evidencias, alertas de paquete sospechoso y otros estados operativos.

Casos a revisar:

- Dashboard `/app`.
- Detalle de match.
- Admin de disputas/alertas.
- Pagos post-checkout.
- Evidencias de recogida/entrega/estado.
- Alertas en `shipment_report_events`.
- Estado de envio y match despues de acciones remotas.

Recomendacion:

Antes de tocar pantallas operativas, identificar donde falta realtime/refetch y definir una estrategia consistente para matches, notificaciones, pagos, evidencias, alertas, wallet y chat segun aplique. Usar `router.refresh()` con throttling donde sea suficiente, `postgres_changes` para eventos criticos y fallback polling solo donde haga falta resiliencia.

## ISSUE-005: Vercel Production env corregido, pendiente revalidacion final

Estado: Corregido / monitoreo operativo
Riesgo: Medio

Descripcion:

El gate `Vercel production env review` del 2026-06-20 fallo en su momento. Segun contexto operativo actualizado del 2026-06-22, las variables criticas de Vercel Production fueron corregidas, Wompi production quedo configurado, el webhook Wompi production quedo en `https://www.intra.com.co/api/webhooks/wompi`, hubo redeploy production READY y smoke publico/login/admin/checkout sin fallos.

Impacto:

- Production env ya no se considera impedimento actual para produccion controlada.
- Antes de operacion real con dinero debe hacerse revalidacion final de env, Wompi production, webhook production y smoke minimo.
- Primer pago real Wompi fue ejecutado por Aldo y reportado como PASS operativo.
- El gate critico pendiente pasa a ser la conciliacion interna wallet/ledger del pago real y el primer envio controlado con usuarios conocidos.
- RLS remoto y smoke autenticado cliente/viajero/admin se consideran realizados segun memoria operativa reciente.
- E2E publico y smoke publico/login/admin/checkout estan en verde segun memoria operativa reciente.

Recomendacion:

Revalidar antes de operacion real:

- Production env critico sigue corregido.
- Wompi production sigue configurado.
- Webhook Wompi production sigue apuntando a `https://www.intra.com.co/api/webhooks/wompi`.
- Redeploy production requerido sigue READY.
- Smoke publico/login/admin/checkout sigue sin fallos.
- Conciliacion interna del primer pago real Wompi se confirma: webhook, payment/ledger, saldo retenido, liberacion, wallet y retiro/payout manual si aplica.

No abrir mas PRs de diseno o documentacion salvo hallazgo real. El proximo trabajo recomendado es validar la conciliacion interna del pago real y preparar un envio controlado con usuario cliente y viajero conocidos.
