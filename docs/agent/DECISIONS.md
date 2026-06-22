# INTRA - Technical Decisions

## DEC-001: Roles contextuales

Fecha: 2026-05-21

Decision:

INTRA no usa roles globales fijos de cliente/viajero. El rol depende del contexto:

- `owner_id` del shipment = cliente.
- `traveler_id` del trip = viajero.

Motivo:

Un mismo usuario puede enviar paquetes y tambien transportar paquetes.

Impacto:

UI, RLS, chat, pagos, reviews y notificaciones deben usar roles contextuales.

## DEC-002: Matriz legal operativa como referencia vigente

Fecha: 2026-05-23

Decision:

La matriz legal operativa v1 queda como referencia vigente para limites MVP, tarifas, disputa, liberacion y copy aprobado.

Referencia:

- `docs/legal-operational-matrix-v1.md`
- `supabase/migrations/202605231700_legal_operational_matrix_v1.sql`

Impacto:

No cambiar limites, tarifas, copy legal, ventanas de disputa o reglas de liberacion sin actualizar esta documentacion y su implementacion correspondiente.

## DEC-003: Memoria operativa versionada en el repo

Fecha: 2026-05-25

Decision:

La memoria operativa de INTRA vive en el repo mediante `AGENTS.md` y `docs/agent/`.

Motivo:

La continuidad del proyecto no debe depender de memoria conversacional. Cualquier agente o colaborador debe poder reconstruir estado, decisiones, pendientes y riesgos desde archivos versionados.

Impacto:

Al iniciar una sesion se leen estos archivos. Al cerrar una sesion se actualizan `CURRENT_SESSION.md`, `TASKS.md` y, si aplica, `DECISIONS.md`, `KNOWN_ISSUES.md` o `DB_NOTES.md`.

## DEC-004: Market fusionado con `/app`

Fecha: 2026-05-25

Decision:

`/app/market` no debe reconstruirse como pantalla independiente porque Market fue fusionado con `/app` como decision de producto.

Motivo:

El flujo principal de descubrimiento/operacion del market debe mantenerse alineado con la experiencia integrada de `/app`, evitando duplicar pantallas o bifurcar comportamiento.

Impacto:

No crear una nueva reconstruccion aislada de `/app/market` sin aprobacion explicita. Cualquier mejora relacionada con market debe revisar primero la integracion actual con `/app`, dashboard, matches y oportunidades operativas.

## DEC-005: Auditoria funcional full antes de UI/UX final

Fecha: 2026-06-06

Decision:

INTRA no pasara todavia a fase de UI/UX. La UI/UX queda reservada para una etapa posterior, antes de las pruebas finales y el lanzamiento.

La prioridad inmediata sera realizar una auditoria funcional full del repo para verificar el estado real de los flujos de negocio, seguridad, pagos, wallet, retiros, evidencias, disputas, reviews, admin, RLS, RPCs, webhooks, variables de entorno y pruebas.

La auditoria debe ignorar por completo diseno visual, tokens, colores, tipografia, responsive, mockups, conversion visual, layout visual y QA visual.

Motivo:

Antes de invertir tiempo en refinamiento visual, INTRA necesita conocer que flujos reales faltan, que modulos estan parciales o mock, que riesgos existen para operar con usuarios reales y dinero real, y que PRs funcionales deben cerrarse.

Impacto:

La secuencia oficial desde este punto es:

1. Auditoria funcional full del repo.
2. Cierre de flujos faltantes por PRs pequenos.
3. Hardening tecnico final.
4. Pruebas end-to-end.
5. QA de pagos, wallet, disputas y seguridad.
6. UI/UX final.
7. QA visual responsive.
8. Pruebas finales antes de lanzamiento.
9. Lanzamiento MVP controlado.

## DEC-006: Refunds y payouts manuales para MVP

Fecha: 2026-06-06

Decision:

Para el MVP, INTRA operara refunds/reembolsos y payouts/retiros de forma manual.

- No se integrara todavia payout bancario automatico.
- No se integrara todavia refund automatico Wompi.
- Admin debe mantener estados claros, trazabilidad y bloqueos contra dobles operaciones.
- Usuario debe ver estados entendibles mientras el proceso esta en revision/manual.
- Toda ejecucion externa debe registrarse desde el admin con nota o referencia operativa.

Motivo:

Antes de automatizar movimientos externos de dinero, INTRA necesita operar el MVP con control manual, evidencia y menor superficie de riesgo.

Impacto:

- Los cambios de codigo deben priorizar guards, ledger, audit y SOP operativo.
- No crear integraciones bancarias ni automatizar refunds sin una decision posterior.
- Cualquier cierre de refund/payout debe confirmar que el movimiento externo ya fue ejecutado.

## DEC-007: Idempotencia de notificaciones operativas

Fecha: 2026-06-07

Decision:

Las notificaciones operativas no deben usar unicidad global por `(related_match_id, type)`.

- Eventos repetibles como `new_message` deben poder generarse varias veces.
- Eventos idempotentes se protegen por usuario/evento, usando `(user_id, related_match_id, type)` cuando dependen de match.
- Eventos sin match o con entidad operativa propia usan `dedupe_key`.

Motivo:

La unicidad global bloquea casos validos: cliente y viajero recibiendo el mismo tipo, varios eventos administrativos del mismo match y mensajes repetidos.

Impacto:

- Las migraciones futuras de notificaciones deben preferir `create_operational_notification(...)`.
- No reintroducir indices unicos globales sobre `(related_match_id, type)`.

## DEC-008: Manual UI/UX INTRA v2.2 como fuente vigente

Fecha: 2026-06-07

Decision:

El Manual Oficial UI/UX INTRA v2.2 queda adoptado como manual actual, vigente y rector de todo el diseno UI/UX del proyecto.

Referencia:

- `docs/ui-ux/Manual_UIUX_INTRA_v2_2.pdf`
- `docs/ui-ux/README.md`

Motivo:

INTRA necesita una sola fuente de verdad para decisiones visuales antes de iniciar UI/UX final y QA visual responsive.

Impacto:

- Manuales anteriores, anexos tecnicos de viewport, QA visual, iconografia proporcional y documentos previos relacionados con reglas visuales quedan derogados.
- Todo cambio UI/UX debe validarse contra el Manual UI/UX INTRA v2.2 antes de implementarse.
- Si una pantalla o componente contradice el manual, se debe reportar la contradiccion, explicar la regla afectada y proponer correccion, excepcion, anexo o nueva regla.
- Market no debe tratarse como modulo activo ni aparecer como item oficial de navegacion mientras no este implementado formalmente.

## DEC-009: Manual UI/UX INTRA v3.0 como fuente vigente

Fecha: 2026-06-16

Decision:

El Manual Oficial UI/UX INTRA v3.0 reemplaza al Manual UI/UX INTRA v2.2 como fuente oficial, vigente y rectora de todo el diseno UI/UX del proyecto.

Referencia:

- `docs/ui-ux/Manual_UIUX_INTRA_v3_0_Oficial.pdf`
- `docs/ui-ux/README.md`

Motivo:

INTRA necesita consolidar la siguiente etapa UI/UX sobre reglas mas explicitas para Core Mobile, Core PC, tokens, tipografia semantica, modales, confirmaciones, errores, chat y QA tecnico.

Impacto:

- El Manual UI/UX INTRA v2.2 queda derogado como fuente vigente.
- Todo cambio UI/UX nuevo debe validarse contra el Manual UI/UX INTRA v3.0.
- La app interna usa solo cinco niveles tipograficos oficiales: titulo, subtitulo, cuerpo, caption/badge y metrica.
- Las acciones criticas deben usar `IntraConfirmDialog`.
- `window.confirm()`, `confirm()`, `window.alert()`, `alert()`, SVG inline en pantallas de producto, clases tipograficas Tailwind legacy directas y hex hardcoded fuera de tokens oficiales quedan prohibidos por regla vigente.
- La adopcion inicial de v3.0 es foundation/tokens/componentes base; la barrida pantalla por pantalla queda para tareas posteriores.

## DEC-010: Limites de cancelacion de envios desde Dashboard

Fecha: 2026-06-16

Decision:

El Dashboard puede ofrecer cancelacion de envios desde menu de tres puntos solo en casos tempranos y sin relacion operativa activa con viajero.

- En Dashboard / Pendientes de pago, el CTA visible debe seguir siendo `Ir al checkout`; la cancelacion vive en el menu de tres puntos.
- En Dashboard / Mis envios activos, la cancelacion por tres puntos solo aplica cuando el envio esta pagado, activo, visualmente `Esperando viajero` y sin matches activos.
- Si ya existe match `pending`, `accepted` o `completed`, la gestion/cancelacion corresponde al modulo Matches, no a la card del Dashboard.
- Las acciones criticas de cancelacion en Dashboard deben usar `IntraConfirmDialog` con `visualVariant="dashboard-critical"`.
- Queda prohibido usar `window.confirm()`, `confirm()`, `window.alert()`, `alert()` o SVG inline para estas acciones.
- En cancelacion temprana de envio pagado sin viajero, Wallet recibe solo el valor neto reembolsable:
  `payment.amount - coalesce(gateway_fee_actual, gateway_fee_estimated, 0)`.
- INTRA no debe devolver a Wallet el costo de pasarela ni ejecutar refund externo automatico Wompi en este flujo.

Motivo:

El Dashboard debe mantener claridad de conversion y operacion: checkout visible antes del pago, cancelacion discreta para casos tempranos, y Matches como lugar unico para relaciones cliente-viajero activas.

Impacto:

- No agregar CTAs destructivos visibles en cards del Dashboard para estos casos.
- No habilitar cancelacion desde Dashboard cuando exista match pendiente, aceptado o completado.
- No acreditar costo de pasarela al Wallet en cancelaciones tempranas de envios ya pagados sin viajero.
- Cualquier cambio futuro de refunds externos, estados parciales o pasarela requiere decision y validacion propia.

## DEC-011: Limpieza obligatoria de ramas cerradas

Fecha: 2026-06-22

Decision:

Cuando una rama ya no se vaya a usar porque su PR fue mergeado, abandonado o reemplazado, debe borrarse de todo lado:

- rama local;
- rama remota en `origin`;
- cualquier referencia operativa pendiente asociada a esa rama.

Motivo:

Evitar acumulacion de ramas muertas, confusiones sobre trabajo activo y riesgo de reutilizar ramas obsoletas.

Impacto:

- Despues de cerrar o mergear un PR, validar si la rama sigue siendo necesaria.
- Si no es necesaria, ejecutar limpieza local/remota y reportarla en el cierre.
- No borrar ramas activas, ramas de terceros o ramas con trabajo no mergeado sin confirmacion explicita.
