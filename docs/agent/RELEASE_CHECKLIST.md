# INTRA - Release Checklist

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
