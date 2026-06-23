# INTRA - Known Issues

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
