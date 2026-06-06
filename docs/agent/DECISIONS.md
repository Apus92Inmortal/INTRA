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
