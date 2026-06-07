# INTRA - Current Session

## Fecha

2026-06-06

## Objetivo de la sesion

Ejecutar PR F3: operacion manual MVP de refunds y payouts, sin integracion bancaria ni refund automatico.

## Estado actual

- La auditoria funcional full fue entregada el 2026-06-06.
- Aldo autorizo iniciar PR F1 como primer cierre funcional/seguridad post-auditoria.
- PR #117 fue mergeado a `main`.
- Merge commit: `369a4b8`.
- Commit funcional: `0b1bbc3`.
- La migracion `202606061830_profiles_rls_schema_hardening.sql` fue aplicada en Supabase real del proyecto Intra-app, segun confirmacion de Aldo.
- Production fue validado funcionalmente por Aldo despues de aplicar la migracion.
- El P0 de lectura amplia de `profiles` / exposicion potencial de PII queda cerrado en repo, `main`, Supabase real y Production.
- Aldo autorizo iniciar PR F2 en la rama `fix/f2-rpc-env-admin-hardening`.
- Alcance F2: revocar grants `anon` innecesarios en RPCs operativas, proteger admin client server-side, revisar service role y documentar envs reales.
- PR #118 fue mergeado a `main`.
- Merge commit F2: `9d33fec`.
- La migracion `202606061930_rpc_anon_grants_hardening.sql` fue aplicada en Supabase real del proyecto Intra-app, segun confirmacion de Aldo.
- Production fue validado funcionalmente por Aldo despues de aplicar la migracion F2.
- PR F2 queda cerrado en repo, `main`, Supabase real y Production.
- Aldo autorizo iniciar PR F3 en la rama `fix/f3-refunds-payouts-manual-ops`.
- Decision MVP: refunds y payouts seran manuales; no se integra todavia payout bancario automatico ni refund automatico Wompi.
- Alcance F3: SOP operativo, guards minimos anti doble operacion, y hardening transaccional de payout manual.
- No avanzar a F4, no tocar UI/UX final, no integrar bancos, no integrar refund automatico, no tocar pricing, matching ni chat.

## Cambios implementados

- Nueva migracion Supabase: `supabase/migrations/202606061830_profiles_rls_schema_hardening.sql`.
- `profiles` queda con RLS self-only para lectura, insercion y update.
- Se eliminan policies legacy/amplias sobre `profiles`, incluyendo lectura total para usuarios autenticados.
- Nueva RPC `get_public_profiles(uuid[])` devuelve solo `id` y `full_name` para contextos publicos/relacionados.
- Nueva funcion `can_view_public_profile(uuid)` valida contexto publico minimo:
  - perfil propio,
  - contraparte de match,
  - viajero con trip `open`/`full`,
  - owner de shipment `open` payment-ready.
- `schema.sql` fue reconciliado para `profiles`/RLS y ya no contiene lectura global de perfiles.
- Queries de dashboard, matches y chat que solo necesitan nombres de terceros usan la RPC minima.
- `DB_NOTES.md` documenta la migracion y verificaciones SQL/manuales recomendadas.
- En Supabase real, la policy peligrosa `Authenticated users can read profiles` ya no existe.
- En Supabase real, las policies legacy/duplicadas de `profiles` fueron eliminadas.
- En Supabase real, `profiles` quedo con:
  - `profiles_insert_self`,
  - `profiles_select_self`,
  - `profiles_update_self`.
- En Supabase real, existen:
  - `can_view_profile`,
  - `can_view_public_profile`,
  - `get_public_profiles`.
- En Production, Aldo valido:
  - dashboard carga normal,
  - matches carga normal,
  - detalle de match carga normal,
  - chat carga normal,
  - nombres minimos de contraparte cargan correctamente.
- F2 agrega migracion `202606061930_rpc_anon_grants_hardening.sql` para revocar `anon` en:
  - `mark_match_read(uuid, timestamptz)`,
  - `request_match(uuid, uuid)`,
  - `create_trip(uuid, uuid, date, time, numeric, text, boolean, boolean, boolean)`.
- F2 mantiene `authenticated` para esas RPCs porque requieren usuario real y validan `auth.uid()`.
- F2 deja documentado que `calculate_payment_amount` conserva grant `anon` por ser calculadora publica de tarifa, sin mutacion.
- `lib/supabase/admin.ts` queda marcado con `server-only`.
- `.env.example` documenta que los envs server-side actuales de Wompi usan prefijo `INTRA_` y que los legacy `WOMPI_*` no son leidos por la app.
- En Supabase real, Aldo confirmo post-check F2:
  - `create_trip` ya no tiene `anon`; conserva `authenticated`, `postgres` y `service_role`.
  - `mark_match_read` ya no tiene `anon`; conserva `authenticated`, `postgres` y `service_role`.
  - `request_match` ya no tiene `anon`; conserva `authenticated`, `postgres` y `service_role`.
  - `calculate_payment_amount` queda publico/`anon` como funcion de cotizacion no mutante.
- En Production, Aldo valido:
  - publicar viaje OK,
  - solicitar match OK,
  - chat/read OK,
  - sin novedad.
- F3 agrega SOP operativo en `docs/ops/manual-refunds-payouts-mvp.md`.
- F3 agrega migracion `202606070020_manual_refunds_payouts_ops.sql` para endurecer `admin_update_payout_status`.
- F3 exige referencia externa para marcar payout `paid`.
- F3 evita que payout quede `paid` antes de validar wallet y registrar ledger `payout_paid_debit`.
- F3 exige nota operativa al cerrar disputa con resolucion final.

## Archivos tocados

- `supabase/migrations/202606061830_profiles_rls_schema_hardening.sql`
- `supabase/schema.sql`
- `app/app/_lib/dashboard-queries.ts`
- `app/app/matches/page.tsx`
- `app/app/matches/[id]/page.tsx`
- `app/app/matches/[id]/chat/page.tsx`
- `docs/agent/CURRENT_SESSION.md`
- `docs/agent/TASKS.md`
- `docs/agent/DB_NOTES.md`
- `supabase/migrations/202606061930_rpc_anon_grants_hardening.sql`
- `lib/supabase/admin.ts`
- `.env.example`
- `docs/agent/RELEASE_CHECKLIST.md`
- `docs/ops/manual-refunds-payouts-mvp.md`
- `supabase/migrations/202606070020_manual_refunds_payouts_ops.sql`
- `app/app/wallet/actions.ts`
- `app/app/admin/actions.ts`
- `docs/agent/DECISIONS.md`

## Verificacion realizada

- `git diff --check`: PASS.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 42/42.
- `npm run build`: PASS, con warning no bloqueante de lockfiles multiples.
- PR #117 remoto: CI, detect-impact y Vercel Preview PASS.
- Post-merge en `main`: CI, detect-impact y Vercel deploy automatico PASS.
- Supabase real: migracion F1 aplicada y policies/functions esperadas confirmadas por Aldo.
- Production: dashboard, matches, detalle de match, chat y nombres minimos de contraparte validados por Aldo.
- F2 validado localmente:
  - `git diff --check`: PASS.
  - `npm run lint`: PASS.
  - `npx tsc --noEmit`: PASS.
  - `npm run test:unit`: PASS, 42/42.
  - `npm run build`: PASS, con warning no bloqueante de lockfiles multiples.
- PR #118 remoto: CI, detect-impact y Vercel Preview PASS.
- Post-merge en `main`: merge commit `9d33fec`.
- Supabase real: migracion F2 aplicada y grants finales confirmados por Aldo.
- Production: publicar viaje, solicitar match y chat/read validados por Aldo.
- F3 validado localmente:
  - `git diff --check`: PASS.
  - `npm run lint`: PASS.
  - `npx tsc --noEmit`: PASS.
  - `npm run test:unit`: PASS, 42/42.
  - `npm run build`: PASS, con warning no bloqueante de lockfiles multiples.

## Riesgos activos

- `schema.sql` sigue siendo un snapshot historicamente desalineado en otras areas; este PR solo reconcilia `profiles`/RLS segun alcance aprobado.
- Los archivos `.env.runtime` y `.env*.tmp` pueden contener nombres Wompi legacy por origen runtime/tmp; no son fuente de verdad del codigo y no se exponen valores en el diff.
- La operacion externa de refunds/payouts sigue siendo manual; requiere disciplina SOP y comprobante externo.
- F3 requiere aplicar la nueva migracion en Supabase real despues de merge si PR queda aprobado.

## Proximo paso recomendado

Crear commit, hacer push de `fix/f3-refunds-payouts-manual-ops` y abrir PR F3 para revision. No avanzar a F4.
