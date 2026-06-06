# INTRA - Active Tasks

## Convencion de estados

- TODO: pendiente
- IN_PROGRESS: en trabajo
- BLOCKED: bloqueado
- REVIEW: pendiente revision
- DONE: terminado

---

## P0 - Critico

### TASK-011: Auditoria funcional full del repo

Estado: TODO
Prioridad: Critica
Area: Producto funcional / Seguridad / Pagos / Operacion / QA

Resumen:

- Esta es la siguiente fase oficial de INTRA.
- Antes de UI/UX final, se debe auditar el repo completo para conocer el estado real de los flujos funcionales y riesgos operativos.
- La auditoria debe ignorar por completo diseno visual, tokens, colores, tipografia, responsive, mockups, conversion visual, layout visual y QA visual.

Criterios de aceptacion:

- Identificar que flujos reales ya estan completos.
- Identificar que flujos estan parciales.
- Identificar que partes son mock o solo visuales.
- Identificar que modulos faltan.
- Identificar riesgos tecnicos.
- Identificar riesgos para operar con usuarios reales y dinero real.
- Identificar PRs funcionales pequenos que deben cerrarse antes de UI/UX final.
- Revisar logica de negocio, flujos funcionales reales, auth, perfiles, roles contextuales, creacion de envios, creacion de viajes, matching, aceptacion/rechazo/cancelacion, chat, notificaciones, pagos/Wompi/INTRA Pay, retencion operativa, wallet, ledger, retiros, evidencias, confirmacion de entrega, auto-release, disputas, reviews, legal versionado, admin, market, dashboard, Supabase RLS, RPCs, webhooks, variables de entorno, tests, build y lint.
- Entregar un mapa funcional del repo con estado por flujo: completo, parcial, mock/visual, faltante o riesgo.
- Proponer secuencia de PRs funcionales antes de hardening, E2E, QA de pagos/wallet/disputas/seguridad, UI/UX final y lanzamiento controlado.
- No implementar cambios durante la auditoria salvo que Aldo o Cristhian lo autoricen despues de revisar hallazgos.

### Frente A: Seguridad operativa del envio

Prioridad: Critica
Area: Matches / Shipments / Evidencias / Disputas / Admin

Resumen:

- Este frente agrupa paquete sospechoso, evidencias y disputa.
- Es el siguiente frente real recomendado porque conecta confianza, trazabilidad, admin, pagos y wallet.
- No debe tocar pagos, RLS, RPCs, Storage o migraciones sin alcance tecnico explicito y revision previa de `DB_NOTES.md`.

### TASK-004: Completar flujo de evidencias

Estado: TODO
Prioridad: Critica
Area: Matches / Shipments / Storage / Admin

Criterios de aceptacion:

- La separacion conceptual queda respetada: evidencia prueba, paquete sospechoso alerta, disputa decide.
- La evidencia inicial del cliente queda definida como obligatoria antes de publicar/activar el envio.
- El viajero puede subir evidencia de recogida, estado del paquete y entrega cuando aplique.
- El viajero puede ver la evidencia inicial desde `/app` antes de solicitar match.
- Cliente, viajero y admin pueden consultar evidencias segun permisos.
- Se valida uso del bucket `shipment-evidence`, signed URLs o descarga segura segun corresponda.
- PR B dejo aplicada y verificada la migracion aditiva para que `customer_initial_photo`, `pickup_photo`, `delivery_photo` y `suspicious_photo` sean tipos validos sin perder compatibilidad con `pickup`, `delivery` y `package_state`.
- PR C implementa checkout-gate para exigir `customer_initial_photo` antes de abrir Wompi, sin tocar reglas de pago ni policies.
- PR D quedo mergeado a `main`: muestra miniatura firmada de `customer_initial_photo` en oportunidades compatibles de `/app`, con QA autenticado 8/8 PASS y sin tocar RLS, Storage policies ni pagos.
- PR E quedo mergeado a `main` en PR #112: integra panel progresivo de evidencias en `/app/matches/[id]`, muestra `customer_initial_photo`, exige `pickup_photo` para marcar recogida, exige `delivery_photo` para reportar entrega, bloquea las server actions si falta evidencia obligatoria, redirige CTAs externos al detalle cuando aplica, agrega visor grande de miniaturas, y no toca pagos, RLS, Storage policies ni migraciones.
- PR #113 agrega `suspicious_photo` como soporte de alerta en el panel de evidencias del detalle de match sin reemplazar `customer_initial_photo`, `pickup_photo` ni `delivery_photo`; QA autenticado de Aldo quedo PASS.
- PR #115 agrega expediente admin en `/app/admin/disputes` para que admin vea evidencias inicial, recogida, entrega y sospechosa con signed URLs server-side, sin exponer paths internos al client.
- No se asocia liberacion de pago solo a carga de evidencia sin regla operativa aprobada.

### TASK-005: Completar flujo de disputa

Estado: IN_PROGRESS
Prioridad: Critica
Area: Disputas / Pagos / Wallet / Admin

Criterios de aceptacion:

- El flujo respeta ventana de disputa y copy aprobado en la matriz legal operativa.
- La disputa queda visible con motivo, estado y siguiente paso para cliente/viajero.
- Admin puede revisar el caso con contexto de match, pago, alerta y evidencia.
- PR G quedo mergeado en PR #115: expediente admin en `/app/admin/disputes` para revisar evidencias, alertas y disputas sin cambiar pagos, refunds, wallet, auto-release, RLS, Storage policies ni migraciones.
- Se valida impacto en `payments`, `wallets`, `wallet_ledger`, refunds y payouts antes de implementar.

## P1 - Alto

### TASK-007: Mejorar pantalla payment / checkout UI/UX

Estado: TODO
Prioridad: Alta, aplazada por DEC-005
Area: Pagos / UI

Criterios de aceptacion:

- UI/UX queda aplazada hasta despues de auditoria funcional full, cierre de flujos faltantes, hardening tecnico, E2E y QA de pagos/wallet/disputas/seguridad.
- Mejorar claridad visual sin cambiar reglas de pago.
- Cubrir estados `pending`, `processing`, `failed`, retry y continuidad hacia Wompi.
- Respetar copy legal y matriz operativa vigente.
- Validar mobile y viewports base si se toca UI.

### TASK-008: Mejorar pantalla payment / success UI/UX

Estado: TODO
Prioridad: Alta, aplazada por DEC-005
Area: Pagos / UI

Criterios de aceptacion:

- UI/UX queda aplazada hasta despues de auditoria funcional full, cierre de flujos faltantes, hardening tecnico, E2E y QA de pagos/wallet/disputas/seguridad.
- Mejorar confirmacion, siguiente paso y estados post-pago.
- Diferenciar pago aprobado/en retencion, pendiente de confirmacion, fallido y retry.
- No cambiar estados de pago ni reglas de liberacion.
- Validar mobile y viewports base si se toca UI.

### TASK-009: Mejorar UI/UX del chat de cada match

Estado: TODO
Prioridad: Alta, aplazada por DEC-005
Area: Matches / Chat / UI

Criterios de aceptacion:

- UI/UX queda aplazada hasta despues de auditoria funcional full, cierre de flujos faltantes, hardening tecnico, E2E y QA de pagos/wallet/disputas/seguridad.
- Mejorar lectura, estados y experiencia operativa del chat.
- Respetar roles contextuales del match.
- Incluir acceso claro a detalle, evidencia o disputa cuando aplique.
- Revisar realtime si el chat depende de actualizaciones en vivo.

## P2 - Medio / Futuro

### TASK-010: Evaluar mover verificacion fuera del perfil

Estado: TODO
Prioridad: Media
Area: Onboarding / Perfil / Verificacion

Criterios de aceptacion:

- Evaluar si la verificacion debe pasar del perfil al inicio del registro.
- Definir impacto en conversion, seguridad, friccion y flujos existentes.
- No implementar sin decision de producto aprobada.

---

## Done Log

### TASK-006-PR-H: Realtime/fallback visible-aware en pantallas operativas

Estado: DONE
Fecha: 2026-06-06
Resumen:

- PR #116 fue mergeado a `main`.
- Merge commit: `e178358`.
- Commit funcional final: `e6721f7`.
- Produccion quedo desplegada automaticamente desde `e178358`.
- Vercel Production marco deployment completo para el merge commit.
- `/app` actualiza automaticamente cambios operativos sin F5 con Realtime best-effort y fallback visible-aware de 12s.
- `/app/matches` refleja cambios de estado/alerta sin F5 con Realtime best-effort y fallback visible-aware de 10s.
- `/app/matches/[id]` actualiza evidencias, alertas y desbloqueos sin F5 con Realtime best-effort y fallback visible-aware de 8s.
- `/app/admin/disputes` actualiza por Realtime o fallback moderado visible-aware de 25s.
- Logs de QA quedan gated por `localStorage.setItem("intraRealtimeDebug", "1")`.
- QA funcional de Aldo: PASS.
- Checks post-merge: CI, `detect-impact` y Vercel Production PASS.
- Validacion local post-merge: `git diff --check HEAD^ HEAD`, `npm run lint`, `npx tsc --noEmit`, `npm run test:unit` 42/42 y `npm run build` PASS.
- No se observaron refresh infinito, errores de consola por subscriptions ni impacto pesado del fallback.
- Chat sigue funcionando normal.
- No se tocaron pagos, Wompi, checkout, wallet, payouts, refunds, auto-release, RLS, Storage policies, migraciones, RPCs financieras ni chat internals.

### TASK-005-PR-G: Expediente admin de evidencias, alertas y disputas

Estado: DONE
Fecha: 2026-06-04
Resumen:

- PR #115 fue mergeado a `main`.
- Merge commit: `d6c77ab`.
- Commit funcional: `82b6ba4`.
- Produccion quedo desplegada automaticamente desde `d6c77ab`.
- Deployment production registrado: `4939477249`.
- Admin ve expediente por disputa y alerta desde `/app/admin/disputes`.
- El expediente muestra ruta, cliente, viajero y estados de match, shipment, payment, alerta y disputa.
- Admin ve evidencias `customer_initial_photo`, `pickup_photo`, `delivery_photo` y `suspicious_photo` si existen.
- Las evidencias usan signed URLs generadas server-side.
- El client recibe solo tipo, signed URL, nota, uploader y fecha; no recibe `file_path`, bucket path ni Storage path.
- Miniaturas abren imagen grande usando `EvidenceImagePreview`.
- Acciones admin existentes quedan visibles y separadas con advertencia de impacto operativo/financiero existente.
- QA funcional de Aldo: PASS.
- Checks post-merge: CI, `detect-impact` y Vercel Production PASS.
- No se tocaron pagos, Wompi, checkout, wallet, payouts, refunds, auto-release, RLS, Storage policies, migraciones, RPCs de pagos/release/refunds, paquete sospechoso en match detail ni realtime.

### TASK-ENV-001: Variables Wompi con prefijo INTRA

Estado: DONE
Fecha: 2026-06-04
Resumen:

- PR #114 fue mergeado a `main`.
- Merge commit: `236f243`.
- Se renombraron las variables server-side de Wompi a `INTRA_WOMPI_PRIVATE_KEY`, `INTRA_WOMPI_EVENTS_KEY` e `INTRA_WOMPI_INTEGRITY_KEY`.
- `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` se mantuvo como variable publica.
- Produccion quedo desplegada automaticamente desde `236f243`.
- Variables nuevas confirmadas en Vercel Production y Preview sin exponer valores.
- Development queda pendiente y no bloqueante.
- No se tocaron pagos, checkout, wallet, payouts, refunds, auto-release, RLS, Storage policies ni migraciones.

### TASK-003-PR-F: Paquete sospechoso con evidencia y bloqueo operativo

Estado: DONE
Fecha: 2026-06-03
Resumen:

- PR #113 fue mergeado a `main` con QA funcional de Aldo PASS.
- Merge commit: `7df5445`.
- Produccion quedo desplegada automaticamente desde el merge commit `7df5445`.
- Deployment production registrado: `4921793067`.
- El viajero puede reportar paquete sospechoso desde `/app/matches/[id]` con foto y descripcion obligatorias.
- El reporte crea evidencia `suspicious_photo` y evento en `shipment_report_events`.
- El evento queda vinculado a la evidencia mediante metadata segura sin guardar paths de Storage.
- Cliente, viajero y admin ven la alerta/evidencia operativa.
- Una alerta activa `open` o `reviewing` bloquea recogida, entrega y confirmacion de recepcion desde detalle y desde `/app/matches`.
- Al resolver la alerta, el flujo operativo puede continuar normalmente.
- No cambia estado de pago, no toca wallet, no libera fondos y no abre disputa automaticamente.
- No se tocaron RLS, Storage policies, migraciones, pagos, Wompi, wallet, payouts, refunds ni auto-release.
- PR #114 quedo separado y bloqueado hasta confirmar variables Wompi nuevas en Vercel.

### TASK-004-PR-E: Evidencias operativas en detalle de match

Estado: DONE
Fecha: 2026-05-31
Resumen:

- PR #112 fue mergeado a `main` con QA final PASS.
- Se agrego panel progresivo de evidencias en `/app/matches/[id]`.
- Se exige `pickup_photo` con descripcion para marcar recogida.
- Se exige `delivery_photo` con descripcion para reportar entrega.
- Las server actions bloquean cambios de estado si falta evidencia obligatoria.
- El CTA externo de `/app/matches` redirige al detalle para completar evidencia.
- Produccion quedo desplegada automaticamente desde el merge commit `bc23e3a`.
- No se tocaron RLS, Storage policies, pagos, Wompi, wallet, payouts, refunds, auto-release, admin disputes ni paquete sospechoso adicional.

### TASK-DOC-001: Disenar sistema de evidencias del Frente A

Estado: DONE
Fecha: 2026-05-25
Resumen:

- Se documento el diseno funcional/tecnico del sistema de evidencias en `docs/shipment-evidence-system.md`.
- Se establecio la regla oficial: evidencia prueba, paquete sospechoso alerta, disputa decide.
- Se definio que la evidencia inicial del cliente sera obligatoria.
- Se documento que el viajero debe ver la foto inicial desde `/app` antes de solicitar match.
- Se registro que la evidencia no libera pagos, no reemplaza confirmacion del cliente y no cambia Wompi, wallet, payouts, refunds ni auto-release.
- Se dejo la salvedad tecnica de migracion futura para ampliar `shipment_evidence.evidence_type`.

### TASK-002: Revisar proximo frente funcional con Atlas/Aldo

Estado: DONE
Fecha: 2026-05-25
Resumen:

- Se inicio una nueva sesion tecnica leyendo la memoria operativa del repo.
- Se auditaron los frentes actuales desde el flujo real de cliente, viajero y admin.
- Se confirmo que Market esta fusionado con `/app` y que `/app/market` es un redirect tecnico heredado.
- Se priorizo como siguiente frente real el Frente A: seguridad operativa del envio.
- Se propuso un primer PR documental para dejar memoria y priorizacion alineadas antes de implementar.

### TASK-001: Mantener memoria operativa del repo

Estado: DONE
Fecha: 2026-05-25
Resumen:

- Se creo `AGENTS.md` como entrada operativa del repo.
- Se creo `docs/agent/` con estado, tareas, sesion, decisiones, riesgos, DB notes y checklist de release.
- Se agrego `.agents/skills/project-session-memory/SKILL.md` para inicio/cierre de sesiones.
- PR #102 fue mergeado a `main` con la memoria operativa base.
- PR #103 fue mergeado a `main` con limpieza Markdown y normalizacion de LF.
- PR #104 fue mergeado a `main` actualizando el estado operativo posterior a los merges.

### TASK-HIST-001: Matriz legal operativa v1

Estado: DONE
Fecha: 2026-05-23
Resumen:

- La matriz legal operativa v1 quedo documentada en `docs/legal-operational-matrix-v1.md`.
- Existe migracion relacionada: `supabase/migrations/202605231700_legal_operational_matrix_v1.sql`.

### TASK-HIST-002: Dashboard interno 3.5

Estado: DONE
Fecha: 2026-05-22
Resumen:

- La migracion 3.5 del dashboard interno quedo marcada como historica en `docs/roadmap-3.5-dashboard-homepage.md`.
