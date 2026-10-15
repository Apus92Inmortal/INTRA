# INTRA - Release Checklist

## Plan vigente sin segundo entorno obligatorio - 2026-10-15

- DEC-020 de Aldo supera las menciones anteriores a crear un proyecto de
  pruebas adicional. No es requisito ni bloqueo del paquete actual.
- Conservar pruebas automaticas y bases desechables locales; preparar una
  prueba integral final controlada sobre la instalacion existente. Cambios
  remotos, migraciones, publicacion y dinero mantienen su autorizacion propia.
- Correo pausado por indisponibilidad del telefono del titular; no marca
  como cerrados MFA, restauracion completa, alertas ni los otros pendientes.

## Recuperacion parcial / correo / MFA - 2026-10-15

- [x] Copia privada cifrada de filas/esquema y 23 objetos; GCM/SHA verificados.
- [x] Ensayo aislado: 22 tablas publicas/147 filas con hashes coincidentes,
  48 FK y 23 archivos recuperados; contenedor/temporales retirados.
- [ ] Backup nativo completo y restore real de Auth/Storage/API/roles,
  copia externa, custodia separada y RPO/RTO. No cerrar A11 por este ensayo.
- [ ] SMTP con credencial privada valida, DNS/selector DKIM real y entrega
  autorizada de confirmacion/reset/soporte; configuracion actual vacia.
- [ ] Enrollment/challenge/recuperacion MFA con titular y version corregida.
  Factores actuales: 0; no se crearon por el agente.
- Evidencia: `docs/ops/recovery-mail-mfa-preparation-20261015.md`.

## Gate local actualizado 2026-10-14

- [x] Cinco migraciones aplicadas en orden en PostgreSQL 17 desechable;
  A03 18, A04 15 y A06 permisos/privacidad/concurrencia PASS.
- [x] 168 unitarias, lint 0 errores/1 aviso previo, TypeScript, build webpack
  y audit de dependencias Production 0 vulnerabilidades PASS.
- [ ] CI y Preview del ultimo SHA: la rama sigue local, sin push. Los checks
  verdes actuales del PR #183 corresponden a un SHA anterior.
- [ ] Prueba integral final con cuentas controladas y Wompi sandbox, despues
  de cerrar cambios y gates operativos. El pago historico exitoso no se repite.

## Actualizacion 2026-10-14: limpieza QA en Production

- [x] Aldo identifico los 7 intentos pendientes como QA sin pago y autorizo
  limpieza operativa. Postflight: 14/14 tablas seleccionadas en 0; usuarios,
  perfiles, precios, aceptaciones y verificacion aprobada preservados.
- [x] Primer pago real Wompi + Wallet/Ledger confirmado como PASS operativo
  por Aldo el 2026-06-27 y reiterado el 2026-10-14. No repetirlo por los
  siete intentos QA ya limpiados.
- [ ] Probar ciclo financiero integral de la version corregida, incluido
  webhook, retencion, entrega, disputa/refund y retiro, antes del piloto.
- [ ] Revisar los 23 objetos Storage conservados y su retencion sin borrado
  indiscriminado; respaldo/restauracion DB+Storage sigue sin verificar.
- [ ] Resolver cierre de refund externo sin duplicar credito Wallet.

## Gate adicional 2026-10-14: refund externo y A05

- [x] Preflight agregado y read-only para los 7 pagos antiguos, sin PII.
- [x] SOP local corregido: prohibido usar `customer_refund` tras devolver
  externamente; no forzar estados ni ledger por SQL.
- [ ] Cotejar las 7 referencias con transacciones Wompi Production.
- [ ] Definir y probar ruta de cierre interno de refund externo sin credito
  Wallet duplicado; no iniciar nuevos cobros del piloto antes.

## Avance local 2026-10-14

- [x] A03 rechaza refund Wallet parcial sin mutaciones; A03 18 checks aislados.
- [x] MFA local detecta/descarta solo factores TOTP no verificados; 12
  pruebas focales, sin enrollment/challenge remoto.
- [x] Unit 168/168, DB A03/A04/A06, lint (0 errores/1 aviso previo),
  TypeScript y build webpack PASS.
- [ ] Publicar nuevo SHA mediante checkpoint autorizado, repetir CI y
  preflight; no usar los checks verdes del SHA remoto anterior.
- [ ] Probar Auth MFA real y recuperacion, backup/restore, conciliacion de
  pagos y gates del piloto. Nada de esto se acredita con el cambio local.

## Paquete de correcciones para piloto - 2026-10-13

Este bloque registra el estado del 13-oct; la actualizacion del 14-oct esta
arriba. Los checks antiguos no certifican el nuevo SHA ni reemplazan sus gates.

- [x] Rama `codex/launch-corrections` desde `5574036`; A01/A02 previo publicado.
- [x] Manual UI/UX v3.0 y decisiones/DB_NOTES revisados.
- [x] Cinco migraciones nuevas revisadas contra DDL remoto exacto sin filas.
- [x] SQL aislado PASS: A03 18, A04 15, roles/privacidad/guards/concurrencia A06.
- [x] Lint PASS (una advertencia de redirect existente), unit 165/26 PASS,
  TypeScript PASS, build webpack PASS, audit Production 0.
- [x] E2E publico/seguridad 8/8 PASS tras ajuste de URL vacia.
- [x] Callback guard/cookies y MFA JWT verificado `sub`/`aal2` probados localmente.
- [x] Retorno Auth bloquea controles/destinos externos y mantiene query/hash interno.
- [x] Pantalla MFA sintetica revisada en mobile/PC con CSS/fuentes reales.
- [x] Memoria, matriz A01-A15, revision financiera y rollout preparados.
- [x] PR #183 y checks `validate`, `database`, `detect-impact` del producto `d7ded3d` PASS.
- [ ] CI postmerge del SHA aprobado antes de publicar; consultar HEAD/checks en PR #183.
- [x] Proteccion main efectiva verificada por API: tres checks strict,
  enforcement admins, PR obligatorio, sin force-push/borrado.
- [ ] ADMIN_USER_IDS efectivo y acceso del titular comprobados.
- [x] ADMIN_USER_IDS Secret Production guardado al unico UUID autorizado.
- [x] Diez variables Vercel restringidas a Production sin cambiar valores.
- [x] Cinco registros legacy nonprod retirados segun el lote autorizado.
- [ ] Preview/Development aislados y credenciales/overrides antiguos retirados.
- [ ] Plan Vercel/configuracion comercial del proveedor verificados.
- [ ] SMTP/confirm/reset, MFA con enforcement y DNS verificados.
- [x] Google Workspace/cuenta remitente elegidos y formulario SMTP preparado.
- [ ] 2-step Google/App Password por titular y guardado SMTP; borrador sin guardar.
- [ ] Enrollment/challenge real MFA admin y recuperacion por consola probados.
- [ ] Restore DB+Storage aislado y alertas recibidas demostrados.
- [ ] Smoke Auth por roles y ciclo Wompi sandbox sin datos Production.
- [x] TASK-047 primer pago real + Wallet/Ledger reportado PASS por Aldo;
  intentos QA pendientes posteriores limpiados con autorizacion.
- [ ] Ciclo financiero integral actual, incluido caso de aprobacion tardia,
  resuelto por procedimiento externo sin duplicar creditos Wallet.
- [ ] Limites/participantes/soporte y revision legal/contable fijados.
- [ ] Aprobacion final de migraciones, merge y deployment Production.
- [ ] Aplicacion/postflight, CI postmerge y deployment READY del SHA aprobado.

Estado: correcciones en PR con CI PASS; piloto con dinero permanece bloqueado.
Detalle en [matriz](../audits/2026-10-13-launch-corrections-status.md) y
[gates externos](../ops/launch-external-gates-20261013.md).

## Smoke autenticado minimo - 2026-06-07

- [x] PR #124 creado para harness `Authenticated Smoke`.
- [x] PR #124 mergeado a `main`: `d9127e6`.
- [x] Workflow manual `Authenticated Smoke` disponible en `main`.
- [x] GitHub Actions Secrets definidos como fuente segura de credenciales temporales.
- [x] Configuracion segura del smoke confirmada:
  - [x] `trace: off`.
  - [x] `screenshot: off`.
  - [x] `video: off`.
  - [x] sin upload de artifacts.
  - [x] sin impresion de secrets.
- [x] PR #125 mergeado a `main`: `2adf17e`.
- [x] PR #125 corrige fragilidad del smoke de envio sin tocar producto.
- [x] PR #126 mergeado a `main`: `d4f4392`.
- [x] PR #126 corrige fragilidad del smoke de viaje sin tocar producto.
- [x] Post-merge PR #126 `main`: CI remoto PASS.
- [x] Post-merge PR #126 `main`: detect-impact remoto PASS.
- [x] Post-merge PR #126 `main`: Vercel deploy automatico PASS.
- [x] Workflow manual `Authenticated Smoke` ejecutado en `main`.
- [x] `Validate smoke secrets`: PASS.
- [x] `Run authenticated smoke`: PASS.
- [x] Smoke cliente temporal: PASS.
- [x] Smoke viajero temporal: PASS.
- [x] Smoke admin temporal: PASS.
- [x] Resultado general `Authenticated Smoke`: PASS.
- [x] Smoke autenticado minimo cerrado y validado.
- [x] PR documental smoke #127 mergeado a `main`: `d5f3e2f`.
- [x] Post-merge PR #127 `main`: CI remoto PASS.
- [x] Post-merge PR #127 `main`: detect-impact remoto PASS.
- [x] Post-merge PR #127 `main`: Vercel Production deploy PASS.
- [x] GitHub Actions Secrets del smoke eliminados por Aldo.
- [x] Sin secrets de smoke activos en GitHub Actions.
- [x] Sin accesos temporales pendientes.
- [x] Limpieza de ramas locales/remotas completada; queda solo `main` / `origin/main`.
- [x] No se ejecutaron pagos reales, release real, payout completo, disputa completa con dinero ni fixtures con service role.
- [x] No se avanzo a UI/UX ni F5.
- [ ] Recomendado: cambiar o eliminar claves usadas en smoke cuando Aldo lo considere conveniente.

## PR F4 operational notifications - 2026-06-07

- [x] PR F4 creado desde `fix/f4-operational-notifications`: #122.
- [x] PR #122 mergeado a `main`: `d17a0fd`.
- [x] Migracion F4 revisada: `202606071450_operational_notifications_f4.sql`.
- [x] Confirmado que no se toca UI/UX final.
- [x] Confirmado que no se avanza a F5 ni se crea E2E.
- [x] Confirmado que no se cambia logica de dinero/pricing/Wompi runtime/wallet/ledger.
- [x] `git diff --check`.
- [x] `npm run lint`.
- [x] `npx tsc --noEmit`.
- [x] `npm run test:unit`.
- [x] `npm run build`.
- [x] Post-merge `main`: CI remoto PASS.
- [x] Post-merge `main`: detect-impact remoto PASS.
- [x] Post-merge `main`: Vercel deploy automatico PASS.
- [x] Despues de merge: aplicar migracion F4 en Supabase real.
- [x] Post-check Supabase real: indices, `dedupe_key` y triggers F4 OK.
- [x] Despues de migracion: validar Production con eventos operativos criticos.
- [x] F4 cerrado en repo, `main`, Supabase real y Production.
- [x] No avanzar al siguiente frente sin autorizacion explicita de Aldo.

## Cierre F3 operativo - 2026-06-07

- [x] PR #119 mergeado a `main`: `b0f8090`.
- [x] Migracion F3 aplicada en Supabase real: `202606070020_manual_refunds_payouts_ops.sql`.
- [x] PR #120 mergeado a `main`: `ed0b498`.
- [x] Migracion hotfix F3 aplicada en Supabase real: `202606070140_suspicious_dispute_traveler_resolution.sql`.
- [x] Production validado por Aldo: paquete sospechoso -> disputa -> resolver a favor del viajero OK.
- [x] Production validado por Aldo: no reaparece error `match_in_dispute`.
- [x] Production validado por Aldo: resolver disputa a favor del cliente sigue funcionando.
- [x] Flujo admin de disputa/release queda operativo.
- [x] F3 cerrado en repo, `main`, Supabase real y Production.
- [x] No avanzar a F4 sin autorizacion explicita de Aldo.

## Antes de pedir revision

- [ ] `docs/agent/CURRENT_SESSION.md` actualizado.
- [ ] `docs/agent/TASKS.md` actualizado.
- [ ] `docs/agent/DECISIONS.md` actualizado si hubo decisiones nuevas.
- [ ] `docs/agent/DB_NOTES.md` actualizado si hubo cambios de DB.
- [ ] Migraciones revisadas si hubo cambios de Supabase.
- [ ] RLS revisado si hubo cambios de permisos.
- [ ] Confirmado que no hay secretos, tokens, credenciales, datos bancarios reales ni URLs privadas con credenciales en el diff.

## Validacion tecnica

- [ ] `npm run lint`
- [ ] `npm run test:unit`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] `npm run test:e2e` si aplica

## Revision funcional

- [ ] Flujo feliz validado.
- [ ] Empty states validados.
- [ ] Error states validados cuando aplique.
- [ ] Flujo cliente/viajero revisado cuando el cambio toque roles, matches, envios, viajes, pagos o wallet.
- [ ] Mobile revisado cuando toque UI.
- [ ] Viewport 1440x800 revisado cuando toque UI.
- [ ] Viewport 1366x650 revisado cuando toque UI.
- [ ] Copy legal revisado cuando toque pagos, disputa, wallet o politicas.

## Antes de produccion

- [ ] Rama limpia.
- [ ] Commit atomico.
- [ ] PR creado si aplica.
- [ ] Aprobacion explicita para merge.
- [ ] Aprobacion explicita para deploy.
- [ ] Estado final reportado: local, rama, main o produccion.
- [ ] Si la rama ya no se va a usar, borrarla local y remotamente despues de merge/cierre.

## Checks criticos por area

- [ ] Supabase: revisar migraciones, RLS, RPCs y policies de Storage.
- [ ] Pagos: revisar Wompi, `payments`, wallet, ledger, refunds y payouts.
- [ ] Operacion manual dinero: confirmar SOP vigente antes de cerrar refunds o payouts manuales.
- [ ] Seguridad: revisar auth, permisos cruzados, rutas protegidas y datos sensibles.
- [ ] Env/secretos: confirmar `SUPABASE_SERVICE_ROLE_KEY` solo server-side y Wompi server envs con prefijo `INTRA_`.
- [ ] UI: revisar Manual UI/UX vigente, mobile y viewports base.
