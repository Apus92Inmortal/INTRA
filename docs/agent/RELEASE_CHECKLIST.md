# INTRA - Release Checklist

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
- [ ] Seguridad: revisar auth, permisos cruzados, rutas protegidas y datos sensibles.
- [ ] Env/secretos: confirmar `SUPABASE_SERVICE_ROLE_KEY` solo server-side y Wompi server envs con prefijo `INTRA_`.
- [ ] UI: revisar Manual UI/UX vigente, mobile y viewports base.
