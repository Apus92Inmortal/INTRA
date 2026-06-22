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

## ISSUE-005: Vercel Production env no esta listo para produccion controlada

Estado: Abierto
Riesgo: Critico

Descripcion:

El gate `Vercel production env review` del 2026-06-20 fallo. El ambiente efectivo de Production tiene vacias variables criticas para Supabase service role, admins, Wompi publico, bandera sandbox y cron. Las variables `INTRA_WOMPI_*` existen, pero clasifican como sandbox-like en Production.

Impacto:

- Checkout Wompi real puede fallar por llave publica ausente/vacia.
- Webhook Wompi y cron de liberacion pueden fallar por `SUPABASE_SERVICE_ROLE_KEY` o secretos de cron vacios.
- Admin puede quedar no configurado por allowlist vacia.
- Production no debe avanzar a produccion controlada hasta corregir env y redeployar con aprobacion.

Recomendacion:

Configurar Vercel Production con llaves reales de Wompi, `NEXT_PUBLIC_WOMPI_SANDBOX=false`, service role, admins, `NEXT_PUBLIC_SITE_URL=https://www.intra.com.co` y secretos de cron. Mantener Preview en sandbox. Confirmar webhook Wompi de produccion y ejecutar smoke minimo posterior al redeploy.
