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

Estado: DONE
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

Resultado:

- Auditoria funcional full entregada el 2026-06-06.
- Recomendacion final: opcion C, no pasar a QA integral/UI final hasta cerrar flujos funcionales criticos.
- Primer PR recomendado y autorizado por Aldo: PR F1 hardening RLS de `profiles`/schema.

### TASK-012: PR F1 - Hardening RLS profiles/schema

Estado: DONE
Prioridad: Critica
Area: Seguridad / Supabase RLS / Perfiles / Datos personales

Resumen:

- Cerrar riesgo P0 de exposicion de PII por lectura amplia de `profiles`.
- Evitar que usuarios autenticados puedan leer perfiles completos de terceros.
- Mantener lectura propia completa.
- Mantener datos minimos de contraparte mediante RPC segura.
- Reconciliar `supabase/schema.sql` para que no reinstale policies amplias sobre `profiles`.

Criterios de aceptacion:

- No existe policy amplia de lectura total sobre `profiles`.
- Usuario A no puede leer `phone` ni `document_number` de usuario B.
- Usuario A puede leer su propio perfil completo.
- Contrapartes/dashboard/matches/chat/reviews conservan datos minimos necesarios.
- Admin conserva acceso server-side protegido.
- Migracion nueva documenta el cambio RLS.
- `schema.sql` queda alineado para `profiles`/RLS.
- `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run build` y `git diff --check` pasan.

Resultado:

- PR #117 fue mergeado a `main`.
- Merge commit: `369a4b8`.
- Commit funcional: `0b1bbc3`.
- Post-merge `main`: CI, detect-impact y Vercel deploy automatico PASS.
- Migracion `202606061830_profiles_rls_schema_hardening.sql` aplicada en Supabase real del proyecto Intra-app.
- Supabase real ya no tiene la policy peligrosa `Authenticated users can read profiles`.
- Supabase real conserva solo `profiles_insert_self`, `profiles_select_self`, `profiles_update_self` para `profiles`.
- Supabase real contiene `can_view_profile`, `can_view_public_profile` y `get_public_profiles`.
- Production validado por Aldo:
  - dashboard carga normal,
  - matches carga normal,
  - detalle de match carga normal,
  - chat carga normal,
  - nombres minimos de contraparte cargan correctamente.
- P0 de lectura amplia de `profiles` / exposicion potencial de PII queda cerrado en repo, `main`, Supabase real y Production.

Siguiente frente sugerido:

- PR F2 - Hardening RPC/env/admin client.
- Aldo autorizo iniciar PR F2 el 2026-06-06.

### TASK-013: PR F2 - Hardening RPC/env/admin client

Estado: DONE
Prioridad: Alta
Area: Seguridad / Supabase RPC / Admin client / Env

Resumen:

- Cerrar hardening preventivo detectado en auditoria funcional.
- Revocar grants innecesarios a `anon` en RPCs operativas que requieren usuario autenticado.
- Confirmar que el admin client y `SUPABASE_SERVICE_ROLE_KEY` quedan server-side.
- Revisar nombres de variables Wompi/env y documentar nombres actuales de produccion.
- Mantener alcance quirurgico: no tocar UI/UX, pagos, wallet, payouts, refunds o disputas salvo grants/env/documentacion.

Criterios de aceptacion:

- No hay RPC sensible ejecutable por `anon` sin justificacion.
- `createAdminClient` queda protegido con `server-only`.
- No hay imports del admin client en componentes `use client`.
- Variables env quedan documentadas sin secretos y sin confusion critica entre nombres legacy y actuales.
- Se documenta la migracion nueva y su aplicacion pendiente en Supabase real.
- `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npm run test:unit` y `npm run build` pasan.

Resultado:

- PR #118 fue mergeado a `main`.
- Merge commit: `9d33fec`.
- Commit funcional: `688edb3`.
- Post-merge `main`: limpio y sincronizado con `origin/main`.
- Migracion `202606061930_rpc_anon_grants_hardening.sql` aplicada en Supabase real del proyecto Intra-app.
- Supabase real confirmado por Aldo:
  - `create_trip` sin `anon`, conserva `authenticated`, `postgres`, `service_role`.
  - `mark_match_read` sin `anon`, conserva `authenticated`, `postgres`, `service_role`.
  - `request_match` sin `anon`, conserva `authenticated`, `postgres`, `service_role`.
  - `calculate_payment_amount` conserva `anon` como funcion publica/no mutante de cotizacion.
- `lib/supabase/admin.ts` protegido con `server-only`.
- `.env.example` documenta `INTRA_WOMPI_*` y marca legacy `WOMPI_*` como no usado por la app.
- Production validado por Aldo:
  - publicar viaje OK,
  - solicitar match OK,
  - chat/read OK,
  - sin novedad.
- PR F2 queda cerrado en repo, `main`, Supabase real y Production.

Siguiente frente sugerido:

- PR F3 - Operacion real de refunds/payouts manuales MVP, o revisar primero el roadmap restante de auditoria.
- Aldo autorizo iniciar PR F3 el 2026-06-06.

### TASK-014: PR F3 - Refunds/payouts manual ops

Estado: DONE
Prioridad: Alta
Area: Pagos / Wallet / Refunds / Payouts / Admin / Operacion

Resumen:

- Cerrar frente P1 de operacion real de refunds y payouts para MVP.
- Mantener refunds y payouts manuales, sin integracion bancaria automatica ni refund automatico Wompi.
- Documentar SOP operativo para admin.
- Agregar guards minimos contra doble operacion.
- Endurecer payout manual para que `paid` solo ocurra despues de referencia externa, wallet valida y ledger consistente.
- Hotfix posterior al merge F3: corregir resolucion admin a favor del viajero cuando la disputa viene de paquete sospechoso escalado y `release_payment` devuelve `match_in_dispute`.

Criterios de aceptacion:

- Refund manual MVP queda documentado.
- Payout manual MVP queda documentado.
- Admin tiene pasos claros.
- Se confirma que no hay doble release/doble payout/doble refund.
- Se confirma que dispute/refund bloquea release.
- Se confirma que payout no genera saldo negativo.
- Si hay migracion, queda lista para aplicar en Supabase real.
- Hotfix suspicious/dispute usa una RPC admin transaccional para cerrar disputa y liberar pago sin debilitar `release_payment`.
- `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npm run test:unit` y `npm run build` pasan.
- No se toca UI/UX final ni se integran bancos/refunds automaticos.

Resultado:

- PR #119 fue mergeado a `main`.
- Merge commit PR #119: `b0f8090`.
- Migracion F3 aplicada en Supabase real:
  - `202606070020_manual_refunds_payouts_ops.sql`.
- PR #120 fue mergeado a `main`.
- Merge commit PR #120: `ed0b498`.
- Migracion hotfix F3 aplicada en Supabase real:
  - `202606070140_suspicious_dispute_traveler_resolution.sql`.
- Production validado por Aldo:
  - paquete sospechoso -> escalar a disputa -> resolver a favor del viajero: OK.
  - ya no aparece error `match_in_dispute`.
  - resolver disputa a favor del cliente sigue funcionando.
  - flujo admin de disputa/release queda operativo.
  - no se detectaron novedades en pruebas.
- F3 queda cerrado en repo, `main`, Supabase real y Production.
- No avanzar a F4 hasta autorizacion explicita de Aldo.

Siguiente frente sugerido:

- Revisar roadmap restante de la auditoria funcional y decidir el proximo PR.

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
