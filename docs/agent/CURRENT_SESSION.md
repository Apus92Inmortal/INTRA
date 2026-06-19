# INTRA - Current Session

## Fecha

2026-06-19

## Objetivo de la sesion

Crear PR pequeno para preparar un smoke autenticado no destructivo de cliente y viajero.

## Alcance ejecutado

- Se ajusto el smoke autenticado para cubrir solo:
  - Login de cliente.
  - Dashboard autenticado de cliente.
  - Navegacion segura de cliente por Inicio, Matches, Wallet y Perfil.
  - Logout de cliente.
  - Login de viajero.
  - Dashboard autenticado de viajero.
  - Navegacion segura de viajero por Inicio, Matches, Wallet y Perfil.
  - Logout de viajero.
- Se excluyo admin del smoke automatizado. Admin queda para verificacion manual del owner.
- Se exige `SMOKE_BASE_URL` explicito. El harness no apunta a production por defecto.
- Se exigen credenciales cliente/viajero:
  - `SMOKE_CLIENT_EMAIL`.
  - `SMOKE_CLIENT_PASSWORD`.
  - `SMOKE_TRAVELER_EMAIL`.
  - `SMOKE_TRAVELER_PASSWORD`.
- Se mantiene `trace`, `screenshot` y `video` apagados para evitar artifacts con datos sensibles.

## Archivos tocados

- `.github/workflows/smoke.yml`.
- `playwright.smoke.config.ts`.
- `tests/smoke/intra-smoke.spec.ts`.
- `package.json`.
- `docs/ops/authenticated-smoke.md`.
- `docs/agent/CURRENT_SESSION.md`.
- `docs/agent/TASKS.md`.

## Confirmaciones de alcance

- No se automatizo admin.
- No se crean, modifican ni eliminan datos operativos.
- No se prueban pagos, Wompi, wallet transaccional, webhooks, matches operativos, envios operativos, viajes operativos, chat real, disputas, retiros ni evidencias.
- No se tocaron Supabase/RLS, migrations, service role, variables reales de produccion ni deploy.
- El stash local `session-memory-pr162-close` sigue preservado y no debe aplicarse ni eliminarse en este trabajo.

## Validaciones ejecutadas

- `npm run test:e2e:auth-smoke` sin `SMOKE_BASE_URL`: FAIL esperado y controlado con mensaje claro; no apunta a production por defecto.
- `SMOKE_BASE_URL=http://127.0.0.1:3015 npm run test:e2e:auth-smoke` sin credenciales: FAIL esperado y controlado por falta de `SMOKE_CLIENT_EMAIL`; no imprime secretos.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 14 archivos / 44 tests.
- `npm run build`: PASS. Warning no bloqueante por lockfiles multiples.
- `npm run test:e2e`: PASS, 4 tests.
- `git diff --check`: PASS.
- Auditoria de alcance en archivos activos del smoke: sin `SMOKE_ADMIN`, rutas admin, acciones Wompi/pago ni creacion de envios/viajes.

## Estado PR

- Rama: `test/auth-smoke-client-traveler`.
- PR: pendiente de crear.
- Sin deploy manual.

## Pendiente despues de este PR

- Proveer cuentas temporales cliente/viajero.
- Definir ambiente autorizado: preview, staging, local o produccion controlada.
- Ejecutar smoke autenticado completo con secrets.
- Verificacion manual admin por parte del owner.
