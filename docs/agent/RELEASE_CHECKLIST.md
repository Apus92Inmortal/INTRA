# INTRA - Release Checklist

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

## Checks criticos por area

- [ ] Supabase: revisar migraciones, RLS, RPCs y policies de Storage.
- [ ] Pagos: revisar Wompi, `payments`, wallet, ledger, refunds y payouts.
- [ ] Operacion manual dinero: confirmar SOP vigente antes de cerrar refunds o payouts manuales.
- [ ] Seguridad: revisar auth, permisos cruzados, rutas protegidas y datos sensibles.
- [ ] Env/secretos: confirmar `SUPABASE_SERVICE_ROLE_KEY` solo server-side y Wompi server envs con prefijo `INTRA_`.
- [ ] UI: revisar Manual UI/UX vigente, mobile y viewports base.
