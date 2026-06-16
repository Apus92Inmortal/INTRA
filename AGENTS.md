# AGENTS.md - INTRA

## Regla de entrada

Antes de modificar codigo en INTRA, leer:

1. `AGENTS.md`
2. `docs/agent/START_HERE.md`
3. `docs/agent/PROJECT_STATE.md`
4. `docs/agent/TASKS.md`
5. `docs/agent/CURRENT_SESSION.md`
6. `docs/agent/DECISIONS.md`
7. `docs/agent/KNOWN_ISSUES.md`
8. `docs/agent/DB_NOTES.md`
9. `docs/agent/RELEASE_CHECKLIST.md`

Si la sesion es sobre evidencias, leer tambien:

10. `docs/shipment-evidence-system.md`

No asumir contexto del chat como fuente principal. La memoria oficial del proyecto vive en el repo.

Antes de tocar codigo, resumir:

- estado actual entendido
- tarea siguiente
- riesgos activos
- archivos que se planea tocar

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
- Al cerrar una sesion tecnica, actualizar `docs/agent/CURRENT_SESSION.md` y `docs/agent/TASKS.md`; actualizar `docs/agent/DECISIONS.md` solo si hubo una decision nueva; actualizar `docs/agent/KNOWN_ISSUES.md` si aparecio un riesgo nuevo; actualizar `docs/agent/DB_NOTES.md` si se tocaron base de datos, Supabase, RLS, Storage o migraciones.

## Manual UI/UX vigente

El manual oficial y vigente de UI/UX para INTRA es:

`docs/ui-ux/Manual_UIUX_INTRA_v3_0_Oficial.pdf`

Este documento es la fuente unica de verdad para decisiones visuales, componentes, tokens, navegacion, Core Mobile, Core PC, CTAs, cards, inputs, badges, iconografia, tablas, ventanas emergentes, estados de carga, errores, mensajes, microcopy y QA visual.

El Manual UI/UX INTRA v2.2 y manuales anteriores quedan derogados.

Antes de implementar cualquier cambio UI/UX, se debe revisar si el cambio cumple el Manual UI/UX INTRA v3.0.

Si una pantalla o componente contradice el manual:

1. Reportar la contradiccion.
2. Explicar que regla contradice.
3. Proponer si debe corregirse o si amerita crear una excepcion, anexo o nueva regla.
4. No improvisar estilos por criterio personal.

Regla clave:

El manual manda, pero puede evolucionar. Lo que no se permite es improvisar.

## Validacion esperada

Segun el cambio, correr y reportar:

- `npm run lint`
- `npm run test:unit`
- `npx tsc --noEmit`
- `npm run build`
- `npm run test:e2e` cuando aplique a flujo visual o end-to-end

Si una validacion no aplica o no puede ejecutarse, reportarlo explicitamente.
