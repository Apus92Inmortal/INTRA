# AGENTS.md - INTRA

## Regla de entrada

Antes de modificar codigo en INTRA, leer:

1. `docs/agent/START_HERE.md`
2. `docs/agent/PROJECT_STATE.md`
3. `docs/agent/TASKS.md`
4. `docs/agent/CURRENT_SESSION.md`
5. `docs/agent/KNOWN_ISSUES.md`
6. `docs/agent/DECISIONS.md`

No asumir contexto del chat como fuente principal. La memoria oficial del proyecto vive en el repo.

## Proyecto

INTRA es una plataforma peer-to-peer de envios que conecta clientes que necesitan enviar paquetes con viajeros disponibles para transportarlos.

## Stack actual

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Supabase Realtime
- Supabase Storage cuando aplique
- Wompi checkout
- Vitest
- Playwright

## Reglas de trabajo

- Trabajar en rama, no directo en `main`.
- No hacer push a `main` ni deploy a produccion sin aprobacion explicita.
- Antes de tocar base de datos, revisar `docs/agent/DB_NOTES.md`.
- Toda modificacion de base de datos debe ir por migracion.
- No tocar pagos, wallet, refunds, payouts o RLS sin revisar decisiones y notas vigentes.
- No cambiar UI sin respetar los documentos visuales aprobados en `docs/`.
- Al cerrar una sesion tecnica, actualizar `docs/agent/CURRENT_SESSION.md` y `docs/agent/TASKS.md`; actualizar `docs/agent/DECISIONS.md` solo si hubo una decision nueva.

## Validacion esperada

Segun el cambio, correr y reportar:

- `npm run lint`
- `npm run test:unit`
- `npx tsc --noEmit`
- `npm run build`
- `npm run test:e2e` cuando aplique a flujo visual o end-to-end

Si una validacion no aplica o no puede ejecutarse, reportarlo explicitamente.
