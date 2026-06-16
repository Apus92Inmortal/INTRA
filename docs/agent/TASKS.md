# INTRA - Active Tasks

## Convencion de estados

- TODO: pendiente
- IN_PROGRESS: en trabajo
- BLOCKED: bloqueado
- REVIEW: pendiente revision
- DONE: terminado

---

## P0 - En revision

### TASK-021.1: Normalize legal/payment legacy typography

Estado: REVIEW
Prioridad: Media
Area: UI/UX v2.2 / Legal / Pagos

Resumen:

- Normalizar tipografia legacy/prohibida detectada en TASK-021 sobre pantallas legales/pagos.
- Archivos objetivo:
  - `app/app/legal/pagos/page.tsx`.
  - `app/app/payments/checkout/wompi/page.tsx`.
- Ajuste menor sobre PR #152:
  - `app/app/wallet/payout/PayoutRequestForm.tsx`.
  - checkbox legal visible de retiro compactado a `Acepto la Política de Pagos`.
  - el link conserva el mismo documento legal completo.
  - se reporto otro uso del texto largo en `app/app/payments/checkout/CheckoutClient.tsx`, sin tocarlo por estar fuera del alcance del ajuste.
- Alcance:
  - reemplazar `text-xs/sm/base/xl/2xl/3xl`, `font-bold`, `font-semibold` y `leading-6` por clases semanticas INTRA.
  - mantener copy legal y Wompi intactos.
  - no tocar logica de pagos, redirects, queries, Supabase, RLS, tablas, migrations, RPCs ni rutas.

Verificacion local:

- `git diff --check`: PASS.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 13 archivos / 42 tests.
- `npm run build`: PASS.
- Validaciones re-ejecutadas despues del ajuste menor del checkbox legal de retiro.
- Auditoria en archivos objetivo:
  - clases tipograficas prohibidas: 0.
  - hex hardcoded: 0.
  - SVG inline: 0.
  - colores arbitrarios: 0.
- Auditoria extra:
  - `confirm()` en `app components lib`: 0.
  - `alert()` en `app components lib`: 0.

Pendiente:

- Crear PR Draft.
- Mantener PR en Draft.
- No merge.
- No deploy manual.

---

### TASK-020.4: Replace native chat send alert with inline failed message state

Estado: DONE
Prioridad: Alta
Area: Chat / Mensajes / UI Error State

Resumen:

- PR #151 reemplaza el `alert()` nativo cuando falla el envio de un mensaje de chat.
- PR #151 fue aprobado visualmente por Aldo y mergeado a `main`.
- Merge commit: `72cdb29`.
- El error ahora se muestra como estado contextual dentro de la conversacion.
- UX aplicada:
  - burbuja propia con el mensaje fallido.
  - texto inline `No se pudo enviar · Reintentar`.
  - `Reintentar` vuelve a intentar enviar el mismo texto.
- La logica funcional queda preservada:
  - mismo insert en `messages`.
  - mismo flujo de notificacion cuando el insert resulta exitoso.
  - sin cambios en realtime, polling, lectura de mensajes, mark as read, Supabase schema, RLS, tablas, migrations, RPCs, rutas ni logica de matches.

Verificacion local:

- `git diff --check`: PASS.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 13 archivos / 42 tests.
- `npm run build`: PASS.

Pendiente:

- Cerrado en `main`.

---

### TASK-020.3: Replace native payout account delete confirm with INTRA modal

Estado: DONE
Prioridad: Alta
Area: Wallet / Retiros / UI Modal

Resumen:

- PR #150 reemplaza el `confirm()` nativo al eliminar un metodo de retiro.
- El modal se renderiza con `createPortal` en `document.body`.
- Usa overlay global, panel centrado y patron visual INTRA.
- Copy operativo:
  - `Eliminar metodo de retiro`.
  - `Esta accion no se puede deshacer.`
  - `Cancelar`.
  - `Eliminar`.
- La logica funcional queda preservada:
  - misma llamada `deletePayoutAccountAction(formData)`.
  - mismo `id`.
  - mismo feedback, reset de formulario editado y `router.refresh()`.
  - sin cambios en logica de wallet, logica de retiros, queries, actions, Supabase, RLS, tablas, migrations, RPCs, rutas ni otros modales.
- PR #150 fue aprobado visualmente por Aldo y mergeado a `main`.
- Merge commit: `e2fba5b`.

Verificacion local:

- `git diff --check`: PASS.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 13 archivos / 42 tests.
- `npm run build`: PASS.

Pendiente:

- Cerrado en `main`.

---

### TASK-020.2: Replace native trip close confirm with INTRA modal

Estado: DONE
Prioridad: Alta
Area: Dashboard / Viajes / UI Modal

Resumen:

- PR #149 reemplaza el `window.confirm()` nativo al cerrar un viaje desde Dashboard.
- El modal se renderiza con `createPortal` en `document.body`.
- Usa overlay global, panel centrado y patron visual INTRA.
- Copy operativo:
  - `Cerrar viaje`.
  - `Los matches pendientes se cancelaran automaticamente.`
  - `Cancelar`.
  - `Cerrar viaje`.
- La logica funcional queda preservada:
  - misma llamada `closeTripAction(tripId)`.
  - mismo `router.refresh()` posterior.
  - sin cambios en queries, actions, Supabase, RLS, tablas, migrations, RPCs, realtime, rutas, trips, matches ni pagos.
- PR #149 fue aprobado visualmente por Aldo y mergeado a `main`.
- Merge commit: `630b198`.

Verificacion local:

- `git diff --check`: PASS.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 13 archivos / 42 tests.
- `npm run build`: PASS.

Pendiente:

- Cerrado en `main`.

---

### TASK-020.1: Fix notification clear-all modal position

Estado: DONE
Prioridad: Alta
Area: Notificaciones / UI / Modal

Resumen:

- PR #148 corrige el posicionamiento del modal de confirmacion para borrar todas las notificaciones.
- El modal se desacopla del bell/dropdown y se renderiza con portal global en `document.body`.
- El backdrop usa el patron modal global existente para quedar centrado, visible completo y con overlay.
- Copy reducido a lenguaje operativo corto:
  - `Borrar notificaciones`.
  - `Esta accion no se puede deshacer.`
  - `Cancelar`.
  - `Borrar`.
- No se tocaron queries, actions, Supabase, RLS, tablas, migrations, RPCs, realtime, rutas ni logica de borrado de notificaciones.
- PR #148 fue aprobado visualmente por Aldo y mergeado a `main`.
- Merge commit: `8ab63c8`.

Verificacion local:

- `git diff --check`: PASS.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 13 archivos / 42 tests.
- `npm run build`: PASS.

Pendiente:

- Cerrado en `main`.

---

### TASK-020: Admin IA + UI/UX redesign v2.2

Estado: REVIEW
Prioridad: Alta
Area: Admin / UI/UX v2.2 / Operacion interna

Resumen:

- PR #147 ajusta el panel admin para separar las categorias principales en cinco modulos:
  - `/app/admin/payouts` -> Retiros.
  - `/app/admin/payout-accounts` -> Cuentas.
  - `/app/admin/verifications` -> Verificaciones.
  - `/app/admin/disputes` -> Disputas.
  - `/app/admin/alerts` -> Alertas.
- Ajuste 2026-06-15: cada modulo queda como bandeja operativa interna de dos estados:
  - Retiros: `Pendientes` / `Gestionados`.
  - Cuentas: `Pendientes` / `Revisadas`.
  - Verificaciones: `Pendientes` / `Revisadas`.
  - Disputas: `Abiertas` / `Resueltas`.
  - Alertas: `Activas` / `Resueltas`.
- Ajuste de copy 2026-06-15:
  - textos explicativos y tutoriales de Admin reducidos a lenguaje operativo corto.
  - empty states normalizados a `Sin registros.`, `Sin pendientes.`, `Sin revisadas.`, `Sin abiertas.`, `Sin resueltas.`, `Sin alertas activas.` y `Sin resultados.`.
  - botones largos reducidos a acciones directas como `Aprobar`, `Rechazar`, `Verificar`, `Abrir`, `Cerrar`, `Escalar` y `Permitir`.
- Ajuste de navegacion mobile 2026-06-15:
  - `app/app/admin/AdminSectionNav.tsx` usa selector compacto en mobile.
  - mobile queda sin scroll horizontal y sin 5 iconos visibles.
  - desktop conserva tabs/chips horizontales.
- No se mezclan cuentas con retiros, retiros con cuentas, disputas con alertas ni alertas con disputas.
- No se tocaron migrations, schemas, tablas, columnas, RLS, Storage, RPCs, `requireAdminUser`, `createAdminClient`, actions admin, actions wallet ni logica sensible de pagos/wallet/verificacion/disputas/alertas.

Verificacion local:

- `git diff --check`: PASS.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 13 archivos / 42 tests.
- `npm run build`: PASS.

Pendiente:

- Revision visual de Aldo.
- Mantener PR #147 en Draft.
- No merge.
- No deploy manual.

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

### TASK-015: PR F4 - Operational notifications

Estado: DONE
Prioridad: Alta
Area: Notificaciones / Operacion / Pagos / Wallet / Admin

Resumen:

- Completar y endurecer notificaciones operativas criticas antes de UI/UX final.
- Corregir la estrategia de unicidad/idempotencia de `notifications`.
- Evitar el indice unico global `(related_match_id, type)` porque bloquea eventos validos entre cliente/viajero y eventos repetibles como `new_message`.
- Cubrir eventos operativos faltantes sin cambiar logica de dinero, pricing, Wompi runtime, wallet/ledger, payouts/refunds/disputas salvo insercion de notificaciones.

Criterios de aceptacion:

- `new_message` queda permitido como evento repetible.
- Eventos idempotentes quedan protegidos por usuario/evento y `dedupe_key` cuando aplique.
- Pago aprobado/fallido/cancelado, pago liberado, refund manual requerido/realizado, caso en revision, alerta escalada, disputa resuelta, retiros, verificacion y cuenta de retiro generan notificaciones contextuales.
- No se toca UI/UX final.
- No se crea E2E.
- No se avanza a F5.
- `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npm run test:unit` y `npm run build` pasan.

Resultado:

- PR #122 fue mergeado a `main`.
- Merge commit PR #122: `d17a0fd`.
- Migracion F4 aplicada en Supabase real:
  - `202606071450_operational_notifications_f4.sql`.
- Checks locales F4 pasan: `git diff --check`, `npm run lint`, `npx tsc --noEmit`, `npm run test:unit`, `npm run build`.
- Checks remotos PR #122 pasan: CI `validate`, detect-impact y Vercel Preview.
- Post-merge `main`: CI remoto, detect-impact remoto y Vercel deploy automatico PASS.
- Post-checks Supabase real confirmados por Aldo:
  - `notifications_unique_dedupe_key`: OK.
  - `notifications_unique_idempotent_match_event`: OK.
  - `dedupe_key` existe como `text nullable`: OK.
  - indices globales peligrosos eliminados: OK.
  - triggers F4 existentes: `trg_notify_payment_operational_event`, `trg_notify_payout_insert_operational_event`, `trg_notify_payout_update_operational_event`, `trg_notify_user_verification_operational_event`, `trg_notify_payout_account_operational_event`, `trg_notify_shipment_report_operational_event`.
- Production validado por Aldo:
  - eventos criticos de notificacion probados.
  - sin novedades reportadas.
  - notificaciones operativas funcionando correctamente.
- F4 queda cerrado en repo, `main`, Supabase real y Production.

Siguiente frente sugerido:

- Smoke test funcional minimo.
- No avanzar sin autorizacion explicita de Aldo.

### TASK-016: Smoke test autenticado minimo

Estado: DONE
Prioridad: Alta
Area: QA / Playwright / Auth / Production smoke

Resumen:

- Validar de forma corta y segura que los flujos autenticados principales siguen vivos despues de F1, F2, F3 y F4.
- Crear harness automatizado minimo con Playwright y workflow manual `Authenticated Smoke`.
- Usar cuentas temporales y GitHub Actions Secrets sin exponer credenciales.
- Mantener alcance no destructivo: no pago real, no release real, no payout completo, no disputa completa con dinero, no fixtures con service role.

Criterios de aceptacion:

- Workflow manual `Authenticated Smoke` disponible en `main`.
- Configuracion segura:
  - `trace: off`.
  - `screenshot: off`.
  - `video: off`.
  - sin upload de artifacts.
  - sin impresion de secrets.
- Smoke v1 cubre:
  - login cliente temporal,
  - dashboard cliente,
  - campana/notificaciones cliente,
  - envio hasta checkout seguro sin pago real,
  - login viajero temporal,
  - dashboard viajero,
  - campana/notificaciones viajero,
  - viaje compatible si el formulario lo permite,
  - oportunidades compatibles,
  - login admin temporal,
  - `/app/admin`,
  - modulos admin de payouts, verificaciones y disputas/reportes,
  - guard de payout pagado sin referencia si existe caso aprobado seguro visible.
- No toca producto, DB, migraciones, pagos, Wompi, UI/UX ni F5.
- Workflow `Authenticated Smoke` ejecutado en `main` con resultado PASS.

Resultado:

- PR #124 fue mergeado a `main`.
- Merge commit PR #124: `d9127e6`.
- PR #125 fue mergeado a `main` para corregir fragilidad del smoke de envio.
- Merge commit PR #125: `2adf17e`.
- PR #126 fue mergeado a `main` para corregir fragilidad del smoke de viaje.
- Merge commit PR #126: `d4f4392`.
- Post-merge PR #126 en `main`:
  - CI remoto: PASS.
  - detect-impact remoto: PASS.
  - Vercel deploy automatico: PASS.
- Workflow manual `Authenticated Smoke` ejecutado en `main`:
  - resultado general: PASS.
  - `Validate smoke secrets`: PASS.
  - `Run authenticated smoke`: PASS.
  - Cliente: PASS.
  - Viajero: PASS.
  - Admin: PASS.
  - duracion aproximada reportada por Aldo: 1 min 2 s.
- Smoke test autenticado minimo queda cerrado y validado.
- PR documental de cierre smoke #127 fue mergeado a `main`.
- Merge commit PR #127: `d5f3e2f`.
- Post-merge PR #127 en `main`:
  - CI remoto: PASS.
  - detect-impact remoto: PASS.
  - Vercel Production deploy: PASS.
- Limpieza posterior confirmada por Aldo:
  - GitHub Actions Secrets del smoke eliminados.
  - No quedan secrets de smoke activos en GitHub Actions.
  - Sin accesos temporales pendientes.
  - Ramas locales/remotas de PRs cerrados eliminadas; queda solo `main` / `origin/main`.

Siguiente frente sugerido:

- Abrir nuevo chat para UI/UX final y Manual UI/UX INTRA v2 definitivo.
- No avanzar a UI/UX ni F5 en este chat.
- Recomendacion pendiente de seguridad: cambiar o eliminar claves usadas en smoke cuando Aldo lo considere conveniente.

### TASK-017: Gobierno documental UI/UX v2.2

Estado: DONE
Prioridad: Alta
Area: UI/UX / Documentacion / Gobierno visual

Resumen:

- Adoptar el Manual Oficial UI/UX INTRA v2.2 como manual actual, vigente y rector de todo el diseno UI/UX del proyecto.
- Evitar doble fuente de verdad con manuales anteriores, anexos tecnicos de viewport, QA visual, iconografia proporcional o documentos previos de reglas visuales.
- Actualizar memoria/instrucciones para que agentes y developers validen cualquier cambio visual contra el manual vigente antes de implementar.

Criterios de aceptacion:

- `docs/ui-ux/Manual_UIUX_INTRA_v2_2.pdf` existe en el repo.
- `docs/ui-ux/README.md` declara que el Manual UI/UX INTRA v2.2 es la fuente oficial unica vigente.
- Manuales anteriores y anexos tecnicos UI/UX quedan derogados, eliminados o archivados si existian.
- `AGENTS.md`, `README.md`, `PROJECT_STATE.md` y `DECISIONS.md` conocen la regla vigente.
- Market no queda como modulo oficial ni item activo de navegacion mientras no este implementado formalmente.
- No se toca UI runtime, pagos, DB, RLS, migraciones, Supabase ni deploy.

Estado actual:

- Rama local: `docs/adopt-uiux-manual-v2-2`.
- PDF incorporado en `docs/ui-ux/Manual_UIUX_INTRA_v2_2.pdf`.
- README rector creado en `docs/ui-ux/README.md`.
- No se encontraron manuales/anexos UI/UX antiguos versionados para eliminar o archivar.
- Se creo `docs/archive/ui-ux-derogados/` como ruta prevista si aparecen documentos derogados.
- Navegacion oficial revisada: no existe item `Market` en `components/app-navbar-client.tsx`; `/app/market` es redirect tecnico heredado hacia `/app`.
- Commit documental creado: `866f41a`.
- Merge a `main`: fast-forward directo.
- Push a `origin/main`: aceptado.
- No hubo deploy manual.
- No se modificaron pantallas.
- No se creo rama de barrida UI/UX.
- `main` contiene el Manual UI/UX INTRA v2.2 como fuente oficial vigente.

### TASK-018: Barrida UI/UX v2.2 - Foundation, Auth Gateway, Dashboard Home y Landing

Estado: DONE
Prioridad: Alta
Area: UI/UX / Pantallas / QA visual responsive

Resumen:

- Ejecutar y cerrar los frentes iniciales de la barrida UI/UX INTRA v2.2 usando el Manual UI/UX INTRA v2.2 como fuente oficial.
- Mantener Market fuera de navegacion.
- No tocar pagos, wallet, admin, auth sensible, Supabase, RLS, realtime ni deploy manual fuera del alcance aprobado.

Resultado:

- Foundation components:
  - PR #129 mergeado a `main`.
  - Rama: `uiux/foundation-components-v2-2`.
  - Merge commit: `9d48c03a4340996bd8aa5513d90631407fd67612`.
  - Estado: cerrado e integrado.
- Auth Gateway:
  - PR #130 mergeado a `main`.
  - Rama: `uiux/auth-gateway-v2-2`.
  - Merge commit: `58515a39bd62f59e6a959e82ab3504c1eb23b61c`.
  - Estado: cerrado e integrado.
- Dashboard Home:
  - PR #131 mergeado a `main`.
  - Rama: `uiux/dashboard-home-v2-2`.
  - Merge commit: `b9e06d7cec8f09d0bf3df2b717c08f3e305323c3`.
  - Dashboard Home `/app` aprobado visualmente por Aldo en desktop y mobile.
  - QA data `QA_DASHBOARD_20260608` limpiada en Supabase por Aldo y verificada en `0`.
  - Rama local y remota eliminadas.
  - No hubo deploy manual.
  - Market sigue fuera de navegacion.
  - No se toco logica sensible.
- Landing CTA copy:
  - PR #132 mergeado a `main`.
  - Rama: `uiux/landing-cta-copy-v2-2`.
  - Merge commit: `ec7719149d0bd96ea88ce7820eeb960868ff2d77`.
  - Cambio: landing publica `/`, CTA navbar `Registrarse gratis` -> `Registrarse`.
  - Archivos modificados: `app/page.tsx` y `tests/unit/app/home-page.test.tsx`.
  - Validaciones: `git diff --check`, `npm run lint`, `npm run test:unit` y checks remotos PASS.
  - Rama local y remota eliminadas.
  - No hubo deploy manual.

### TASK-019: Pulido tipografico menor Dashboard - card match pendiente

Estado: REVIEW
Prioridad: Media
Area: UI/UX / Dashboard / Tipografia

Resumen:

- Pendiente menor no bloqueante detectado durante la revision final del Dashboard contra el Manual UI/UX INTRA v2.2.
- En la card de match pendiente dentro de `Mis envios activos`, cuando aparece un viajero interesado, quedan clases tipograficas manuales en `app/app/page.tsx`.
- Aldo decidio dejarlo para revisar manana.

Alcance futuro sugerido:

- Crear rama solo cuando Aldo lo ordene, sugerida:
  - `uiux/dashboard-typography-polish-v2-2`.
- Reemplazar tamanos manuales por clases oficiales cuando aplique:
  - `intra-h4`.
  - `intra-body`.
  - `intra-caption`.
  - `intra-badge-text`.
- Revisar clases observadas:
  - `text-[16px]`.
  - `text-sm`.
  - `text-[10px]`.
  - `sm:text-xs`.
- Revisar tamanos manuales de iconos:
  - `h-3.5 w-3.5`.
  - `h-4 w-4`.
- Mantener layout, textos y logica igual.
- No tocar Supabase.
- No tocar pagos, wallet, admin, matches backend, auth, RLS ni realtime.
- No agregar Market.

Estado actual:

- Rama: `uiux/dashboard-typography-polish-v2-2`.
- Archivo de codigo modificado: `app/app/page.tsx` (normalizacion tipografica).
- PR #133 actualizado.
- Datos QA inyectados en DB: `QA_DASHBOARD_TYPOGRAPHY_20260609` (real para el usuario de Aldo) y limpiados despues de aprobacion visual.
- Mock runtime revertido para no ensuciar el codigo.
- Cleanup QA verificado: auth users, profiles, shipments, trips, matches, payments, notifications, reviews, evidence, storage objects, messages, report events, declarations, wallet ledger y user verifications en `0`; usuario real de Aldo preservado.
- Auditoria tipografica final: quedan dos `text-sm` visibles en `DashboardPendingMatchActions` para botones `Aceptar` y `Rechazar`; recomendado corregir o justificar antes de merge.
- Validaciones locales: `git diff --check`, `npm run lint`, `npm run test:unit` PASS.
- Revision visual local PASS.
- Preview actualizado con data real vinculada al usuario de Aldo.
- Pendiente: revision/merge de PR; no hubo merge ni deploy manual.

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
