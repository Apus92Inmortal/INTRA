# INTRA - Release Checklist

## Antes de pedir revision

- [ ] `docs/agent/CURRENT_SESSION.md` actualizado.
- [ ] `docs/agent/TASKS.md` actualizado.
- [ ] `docs/agent/DECISIONS.md` actualizado si hubo decisiones nuevas.
- [ ] `docs/agent/DB_NOTES.md` actualizado si hubo cambios de DB.
- [ ] Migraciones revisadas si hubo cambios de Supabase.
- [ ] RLS revisado si hubo cambios de permisos.

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
- [ ] Mobile revisado cuando toque UI.
- [ ] Copy legal revisado cuando toque pagos, disputa, wallet o politicas.

## Antes de produccion

- [ ] Rama limpia.
- [ ] Commit atomico.
- [ ] PR creado si aplica.
- [ ] Aprobacion explicita para merge.
- [ ] Aprobacion explicita para deploy.
- [ ] Estado final reportado: local, rama, main o produccion.
