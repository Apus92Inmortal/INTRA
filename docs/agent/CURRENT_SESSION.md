# INTRA - Current Session

## Fecha

2026-06-20

## Objetivo de la sesion

Auditar el gate `Vercel production env review` antes de produccion controlada, sin exponer valores secretos y sin hacer deploy manual.

## Alcance ejecutado

- Auditoria global de variables `process.env` usadas realmente por el repo.
- Cruce contra `.env.example`.
- Revision de `vercel.json`, workflow de smoke autenticado, endpoints criticos de Wompi webhook y cron interno.
- Revision remota de nombres/ambientes efectivos de Vercel usando archivos temporales eliminados al finalizar.
- Revision de Supabase Auth por API de gestion, filtrando solo checks de URLs.
- Revision de GitHub Actions secrets por nombre.

## Resultado historico de la auditoria 2026-06-20

- Gate en ese momento: FAIL de configuracion.
- No se modifico logica de pagos, wallet, RLS, Supabase ni Wompi.
- No se hizo deploy.
- No se imprimieron valores secretos en reportes finales.

## Hallazgos principales

- Production efectivo en Vercel tiene vacias variables criticas: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_USER_IDS`, `NEXT_PUBLIC_WOMPI_SANDBOX`, `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `CRON_SECRET`, `INTERNAL_CRON_SECRET`.
- `ADMIN_EMAILS` no existe en Vercel.
- `INTRA_WOMPI_PRIVATE_KEY`, `INTRA_WOMPI_EVENTS_KEY` e `INTRA_WOMPI_INTEGRITY_KEY` existen en Production/Preview, pero clasifican como sandbox-like en el ambiente efectivo.
- `NEXT_PUBLIC_SITE_URL` existe en Production, pero no coincide exactamente con `https://www.intra.com.co`; falta en Preview/Development.
- Los nombres legacy `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_KEY`, `WOMPI_INTEGRITY_KEY` existen como registros en Production/Preview pero estan vacios en el ambiente efectivo y no son leidos por la app.
- Supabase Auth: Site URL y redirects criticos para `www.intra.com.co`, `/auth/callback` y `/login/update-password` pasan.
- GitHub Actions secrets: lista vacia; el workflow `Authenticated Smoke` no puede ejecutarse hasta reponer sus secrets temporales.
- Wompi Dashboard webhook endpoint queda pendiente de confirmacion manual externa.

## Archivos tocados

- `docs/agent/CURRENT_SESSION.md`
- `docs/agent/TASKS.md`
- `docs/agent/KNOWN_ISSUES.md`

## Validaciones ejecutadas

- `git status --short --branch`: `main...origin/main` antes de cambios documentales.
- `git grep process.env`: PASS para inventario.
- `.env.example` cruzado contra variables runtime reales.
- `vercel env ls`: PASS, sin valores secretos.
- `vercel env pull` Production/Preview/Development: PASS con archivos temporales eliminados.
- Supabase Auth config API: PASS para checks de URLs requeridas.
- `gh secret list`: PASS, sin secrets activos.

## Estado actualizado 2026-06-22

- Production env critico: corregido segun contexto operativo reciente.
- Wompi production: configurado.
- Webhook Wompi production: `https://www.intra.com.co/api/webhooks/wompi`.
- Redeploy production requerido: READY / ejecutado segun contexto operativo reciente.
- Smoke publico/login/admin/checkout: sin fallos segun contexto operativo reciente.
- Smoke autenticado cliente/viajero/admin y RLS remoto: ejecutados segun contexto operativo reciente.
- Gate critico pendiente: primer pago real Wompi + Wallet de punta a punta.

## Actualizacion 2026-06-22 - PR #176 review tweak

- Solicitud de Aldo: reemplazar el titulo textual `INTRA` del footer por el logo sin fondo usado en header y remover CTA/boton de TikTok.
- Archivos de producto tocados: `app/page.tsx`, `tests/unit/app/home-page.test.tsx`.
- Validacion: `git diff --check`, `npm run lint`, `npm run test:unit`, `npx tsc --noEmit`, `npm run build`, `npm run test:e2e -- tests/e2e/home.spec.ts`.
- No se tocaron pagos, wallet, Wompi, Supabase, RLS, migraciones, admin, checkout, env vars ni logica autenticada.
- No se hizo deploy manual ni produccion.

## Actualizacion 2026-06-22 - PR #176 metadata URL

- Solicitud de Aldo: cambiar la metadata publica OpenGraph de la landing para usar el dominio oficial `https://www.intra.com.co`.
- Archivo de producto tocado: `app/page.tsx`.
- Cambio real: `openGraph.url` paso de `https://intra-chi.vercel.app` a `https://www.intra.com.co`.
- Revision de referencias: las demas apariciones del dominio viejo en `app/page.tsx` son placeholders de CTAs que se reemplazan durante render por rutas internas; no se detecto otra metadata/canonical/social sharing publica con ese dominio.
- Validacion local: `git diff --check`, `npm run lint`, `npm run test:unit`, `npx tsc --noEmit`, `npm run build`, `npm run test:e2e -- tests/e2e/home.spec.ts`.
- Validacion remota PR: `validate` PASS, `detect-impact` PASS.
- Commit en rama del PR: `fe86045` (`update landing opengraph url`).
- No se tocaron pagos, wallet, Wompi, webhook, checkout, Supabase, RLS, migraciones, admin, logica autenticada ni variables de entorno.
- No se hizo deploy manual ni produccion.

## Actualizacion 2026-06-22 - PR #176 ajustes visuales menores

- Solicitud de Aldo: revisar ajustes visuales menores antes de merge sin redisenar ni ampliar PR.
- Archivo de producto tocado: `app/page.tsx`.
- Cambios reales:
  - Hero mantiene headline actual.
  - Hero desktop compactado: `min-height` 600 -> 560, padding vertical menor, h1 52px -> 48px y `letter-spacing` 0.
  - Subcopy del hero simplificado a `Publica tu envío, acepta un match, coordina por chat y paga dentro de la app.`
  - Bloque de confianza mobile compactado; en <=360px pasa a una columna para evitar columnas estrechas.
  - Seccion `Por qué confiar`: titulo `Confianza en cada envío` y subtitulo solicitado por Aldo.
- Verificacion visual local con Playwright:
  - 1366x650: sin scroll horizontal, hero h1 48px.
  - 390x844: bloque de confianza 2x2, sin scroll horizontal.
  - 320x740: bloque de confianza 1 columna de 248px, sin scroll horizontal.
- Boton flotante negro: confirmado como Vercel Live Feedback/preview por comentario automatico del PR; no existe como codigo propio en `app/`, `components/`, `lib/`, `public` ni tests.
- Validacion local: `git diff --check`, `npm run lint`, `npm run test:unit`, `npx tsc --noEmit`, `npm run build`, `npm run test:e2e -- tests/e2e/home.spec.ts`.
- Validacion remota PR: `validate` PASS, `detect-impact` PASS, `Vercel` PASS, `Vercel Preview Comments` PASS.
- Commit en rama del PR: `5f6bd77` (`tune landing hero copy`).
- No se tocaron pagos, wallet, Wompi, webhook, checkout, Supabase, RLS, migraciones, admin, logica autenticada ni variables de entorno.
- No se hizo deploy manual ni produccion.

## Actualizacion 2026-06-22 - PR #176 iconos precios

- Solicitud de Aldo: reemplazar emojis de la seccion `Precios claros por ruta` por iconos minimalistas inline, sin contenedor ni redisenar la seccion.
- Archivo de producto tocado: `app/page.tsx`.
- Cambios reales:
  - `Corta distancia`, `Media distancia` y `Larga distancia` usan SVGs outline inline de 16px.
  - `Más popular` quedo solo texto, sin emoji.
  - Se agrego CSS minimo `.price-badge`/`.price-icon` para alinear icono y texto.
  - No se cambiaron precios, ejemplos, estructura comercial ni CTAs.
- Verificacion visual local con Playwright:
  - 1366x650, 390x844 y 320x740 sin overflow horizontal.
  - Seccion precios sin emojis.
  - Iconos medidos en 16x16.
  - Cards de precios mantienen altura pareja.
- Validacion local: `git diff --check`, `npm run lint`, `npm run test:unit`, `npx tsc --noEmit`, `npm run build`, `npm run test:e2e -- tests/e2e/home.spec.ts`.
- Validacion remota PR: `validate` PASS, `detect-impact` PASS, `Vercel` PASS, `Vercel Preview Comments` PASS.
- Commit en rama del PR: `b5caac5` (`replace pricing emojis with icons`).
- No se tocaron pagos, wallet, Wompi, webhook, checkout, Supabase, RLS, migraciones, admin, logica autenticada ni variables de entorno.
- No se hizo deploy manual ni produccion.

## Actualizacion 2026-06-22 - PR #176 remover iconos precios

- Solicitud de Aldo: quitar los iconos minimalistas de `Precios claros por ruta` porque no convencen visualmente y dejar labels solo texto.
- Archivo de producto tocado: `app/page.tsx`.
- Cambios reales:
  - `Corta distancia`, `Media distancia` y `Larga distancia` quedan como texto simple.
  - `Más popular` queda solo texto.
  - Se removieron SVGs inline y CSS `.price-icon`.
  - No se cambiaron precios, ejemplos de rutas, estructura comercial ni CTAs.
- Verificacion visual local con Playwright:
  - 1366x650, 390x844 y 320x740 sin overflow horizontal.
  - Seccion precios sin emojis.
  - Seccion precios con `svgCount = 0`.
  - Cards de precios mantienen altura pareja.
- Validacion local: `git diff --check`, `npm run lint`, `npm run test:unit`, `npx tsc --noEmit`, `npm run build`, `npm run test:e2e -- tests/e2e/home.spec.ts`.
- Validacion remota PR: `validate` PASS, `detect-impact` PASS, `Vercel` PASS, `Vercel Preview Comments` PASS.
- Commit en rama del PR: `bc26709` (`remove pricing icons`).
- No se tocaron pagos, wallet, Wompi, webhook, checkout, Supabase, RLS, migraciones, admin, logica autenticada ni variables de entorno.
- No se hizo deploy manual ni produccion.

## Actualizacion 2026-06-22 - PR #176 merge y limpieza de rama

- Solicitud de Aldo: merge normal del PR #176 a `main`, sin deploy manual ni produccion manual.
- PR #176 mergeado con merge commit `cc319c3`.
- `main` local y `origin/main` verificados en `cc319c3`.
- Checks post-merge en `main`: `CI / validate` PASS, `Workflows Impact Analysis / detect-impact` PASS.
- Vercel automatico por merge a `main`: PASS.
- Solicitud posterior de Aldo: borrar la rama ya no usada y guardar regla durable en memoria del repo.
- Rama `landing/task-031-conversion-copy-polish` eliminada localmente.
- Rama `origin/landing/task-031-conversion-copy-polish` eliminada remotamente.
- Decision nueva documentada: `DEC-011: Limpieza obligatoria de ramas cerradas`.
- Checklist actualizado para borrar local/remotamente ramas que ya no se usaran despues de merge/cierre.
- No se tocaron pagos, wallet, Wompi, webhook, checkout, Supabase, RLS, migraciones, admin, logica autenticada ni variables de entorno.
- No se hizo deploy manual ni produccion manual.

## Actualizacion 2026-06-22 - Runbook Operativo INTRA

- Solicitud de Aldo/Cristhian: crear documentacion profesional de operacion para INTRA antes de produccion controlada y operacion real con usuarios y dinero.
- Rama documental: `docs/ops-runbook-intra`.
- Archivos nuevos:
  - `docs/ops/runbook-operativo-intra-corto.md`
  - `docs/ops/runbook-operativo-intra-completo.md`
- Contenido cubierto:
  - Checklists diario/semanal.
  - Procedimientos Wompi, webhook, pagos, wallet/ledger, retiros manuales, disputas/evidencias, soporte, incidentes, seguridad operativa, escalamiento y bitacora.
  - Production env critico como corregido y pendiente de revalidacion final antes de operacion real.
  - Wompi production y webhook production como configurados.
  - Primer pago real Wompi + Wallet como validacion critica pendiente.
  - Legal final como pendiente antes de produccion abierta.
- Validaciones documentales: `git diff --check` PASS, revision de secretos PASS, enlaces locales PASS y cobertura de secciones obligatorias PASS.
- No se corrio build/lint/test porque solo se tocaron archivos Markdown.
- No se tocaron codigo de producto, pagos, wallet, Wompi, webhook, checkout, Supabase, RLS, migraciones, admin, logica autenticada ni variables de entorno.
- No se hizo deploy manual ni produccion.

## Actualizacion 2026-06-22 - PR #177 estado Production env

- Solicitud de Aldo: corregir estado desactualizado del runbook para no presentar `ISSUE-005` como impedimento actual.
- Production env critico queda documentado como corregido / pendiente de revalidacion final antes de operacion real.
- Wompi production y webhook production quedan documentados como configurados.
- Gate principal pendiente queda como primer pago real Wompi + Wallet.
- Runbook queda pendiente de merge.
- Legal final queda pendiente antes de produccion abierta.

😎
