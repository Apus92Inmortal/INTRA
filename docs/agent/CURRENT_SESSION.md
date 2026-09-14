# INTRA - Current Session

## Estado vigente - 2026-09-14 (A02 local)

Objetivo: corregir A02 sin cortar los reintentos de Wompi durante el despliegue.

- Rama: `codex/fix-a02-financial-writes`, basada en el cierre local A01.
- `CheckoutClient.tsx` deja de insertar directamente en `payments` al reintentar
  y llama a `create_payment_retry`. La RPC valida actor, envio abierto propio,
  evidencia inicial, estado de pagos existentes y tarifa activa; calcula el
  importe/referencia en DB y serializa intentos concurrentes.
- Dos migraciones separadas: `20260914151031_a02_create_payment_retry.sql`
  crea la RPC; `20260914151234_a02_restrict_financial_table_writes.sql`
  elimina policies INSERT/UPDATE legacy y revoca DML cliente sobre `payments`
  y `payouts`, conservando SELECT autenticado y service_role.
- Orden requerido para Production: aplicar primera migracion, publicar app con
  checkout nuevo, validar reintento controlado sin cobrar, aplicar segunda
  migracion y ejecutar `supabase/tests/a02_financial_table_access.sql` y pruebas
  negativas/positivas por rol. Aplicar la segunda antes del codigo romperia el
  checkout anterior. No usar `supabase db push` por historial desalineado.
- Validacion local: lint PASS, 60 unitarias PASS, TypeScript PASS, build PASS,
  E2E publico 4/4 PASS (no cubre checkout autenticado).
  No existe DB aislada ni cuentas de prueba activas para ejecutar el flujo
  autenticado de reintento o concurrencia. Consulta remota de solo lectura
  confirmo que los tres precios activos y `calculate_payment_amount` coinciden
  con los importes mostrados (20k/25k/35k COP).
- Estado: **solo rama local**; ninguna migracion A02 aplicada, sin push GitHub,
  sin merge/deploy Vercel y sin movimiento financiero. A02 permanece abierto en
  Production y los nuevos cobros siguen bloqueados.
- Siguiente paso: revisar y autorizar la secuencia de despliegue completa;
  validar permisos cliente/viajero/tercero y ruta legitima en entorno aislado
  o con cuentas controladas antes de cerrar TASK-050.

---

## Estado vigente - 2026-09-14

Objetivo: iniciar TASK-050 por A01 y aplicar la migracion autorizada a
Supabase Production para bloquear ejecucion directa de RPCs internas.

- Rama: `codex/fix-a01-financial-rpc`, creada desde `main` conservando los
  cambios documentales locales de la auditoria anterior.
- Archivos: migracion
  `supabase/migrations/20260914145957_a01_restrict_financial_rpc_execute.sql`
  (renombrada para coincidir con version remota), consulta
  `supabase/tests/a01_financial_rpc_grants.sql` y memoria agent actualizada.
- Se confirmo en Supabase real `okajyhkdyapbsornjeeb` que las tres funciones
  admiten anon y authenticated. Los callers internos relevantes son SECURITY
  DEFINER de `postgres`; la app no llama directamente estas tres RPCs.
- Aldo autorizo prueba reversible y aplicacion a Production. La subtransaccion
  de prueba paso permisos internos/entry points y revirtio los REVOKE. La
  migracion quedo aplicada con version remota `20260914145957`.
- Verificacion posterior: los tres `blocked_*` dieron true; delivery cliente
  y cron siguieron con EXECUTE. HTTP anon real devolvio 401/42501 permission
  denied para las tres RPCs. Cron de 15:00 UTC termino `succeeded`. Agregados
  financieros permanecieron en 5 payments pending, 0 wallets/ledger/payouts.
- Validacion local previa: lint PASS, 60/60 unitarias PASS, TypeScript PASS,
  build PASS. No hubo push GitHub ni deploy Vercel. No se hicieron movimientos
  financieros ni pruebas con cuentas autenticadas/entrega real.
- Riesgo vigente: la exposicion directa A01 quedo contenida, pero los guards
  NULL de funciones internas no se reescribieron; A02/A06, TASK-051 y los
  flujos legitimos con datos reales siguen pendientes. No iniciar cobros.
- Security Advisor aun enumera 22 funciones SECURITY DEFINER ejecutables por
  anon (incluye calculadora publica y funciones con guardas); clasificarlas
  individualmente en la continuacion de TASK-050. Dos funciones conservan
  search_path mutable. No se infiere explotabilidad solo del aviso.
- Siguiente paso: cerrar policies financieras/privacy A02/A06 y verificar
  casos autenticados en ambiente aislado antes de nuevos cobros. No ejecutar
  `supabase db push` sobre el historial remoto desalineado sin reconciliacion.

---

## Estado vigente - 2026-09-04

Objetivo: auditoria de lanzamiento de carpeta local, GitHub, Vercel y Supabase usado por produccion, solicitada por Aldo.

**Resultado: NO LISTA para lanzamiento abierto ni nuevos cobros de piloto.** Las notas de junio conservadas abajo son historicas; sus PASS no sustituyen las verificaciones remotas de esta sesion.

Informe completo: [Auditoria 2026-09-04](../audits/2026-09-04-launch-readiness.md).
Consultas repetibles sin mutaciones: [SQL de lectura](../audits/2026-09-04-readonly-checks.sql).

Estado verificado:

- Carpeta inicialmente limpia en `main`; local y GitHub en `b220f7d038c849efae76f27b075a82a22bbc2214`.
- `www.intra.com.co` usa ese mismo SHA en deployment Production READY `dpl_BCxpJYJn1gv9n8LYuMJAFLXWPJub`.
- El bundle publico de Production apunta a Supabase `okajyhkdyapbsornjeeb`, proyecto auditado.
- RPC `release_payment` y `refund_payment`: SECURITY DEFINER, EXECUTE anon/authenticated, guarda permite actor NULL. Helpers de notificacion tambien expuestos.
- Policies remotas permiten escritura directa sobre pagos y creacion propia de payouts fuera de RPC; policy legacy de shipments usa `USING (true)`.
- Devoluciones a wallet no atomicas; falta unicidad para `refund_available_credit`.
- Webhook puede marcar processed un resultado RPC `success:false`.
- 5 payments pending/created; 0 eventos Wompi, wallets, ledger y payouts. Pago real historico reportado no queda conciliado; no se concluye que el cobro no existio.
- 40 migraciones locales frente a 4 registradas remotamente; existen objetos posteriores, por lo que debe compararse DDL real, no reaplicar todo a ciegas.
- Vercel Hobby y Preview con acceso a Supabase/credencial administrativa de Production; main sin proteccion GitHub.

Validacion:

- Lint, TypeScript y build local PASS; 60 unit tests PASS.
- Build local usa Next 16.1.6; lockfile y Production usan 16.2.4. Se encontraron 11 diferencias de paquetes instalados vs lock.
- E2E publico local: 4 PASS. E2E publico Production: 4 PASS. Chromium faltaba, se instalo con el script del repo y se repitieron las pruebas.
- Landing/login/registro en 1440, 1366, 390 y 320 px: sin overflow, imagen rota o excepcion JS observada.
- npm audit produccion: FAIL, 5 paquetes high (next, nanoid, postcss, sharp, ws).
- Cron SQL activo cada 5 minutos, 2016 ejecuciones succeeded en 7 dias; no demuestra liberacion real.
- No se ejecuto smoke autenticado con cuentas, pagos reales, restauracion ni carga.

Archivos tocados: informe/SQL en `docs/audits/`, `CURRENT_SESSION.md`, `TASKS.md`, `KNOWN_ISSUES.md`, `DB_NOTES.md` y aviso de estado en `PROJECT_STATE.md`.

Alcance: solo documentacion y herramientas de validacion. Sin cambios de producto, DB, RLS, env, infraestructura, push, merge o deploy. No se revelaron valores secretos. No se reinstalaron dependencias del producto; solo se instalo el navegador de pruebas en cache.

Rama de cierre: `codex/audit-launch-2026-09-04`, cambios documentales locales sin commit ni push.

Siguiente paso: TASK-050, hardening de permisos reales con migracion y pruebas negativas en entorno aislado; despues TASK-051 y gates de infraestructura/operacion. No repetir un cobro real antes de cerrar bloqueos. No se adoptaron decisiones nuevas de producto.

El siguiente agente debe leer AGENTS/START_HERE, este estado vigente, el informe completo, KNOWN_ISSUES, DB_NOTES y DECISIONS antes de modificar permisos o dinero.

---

## Contexto historico conservado - junio de 2026

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
- En ese momento el runbook quedaba pendiente de merge; luego fue mergeado en PR #177 con commit `938db99`.
- Legal final queda pendiente antes de produccion abierta.

## Actualizacion 2026-06-22 - PR #177 PDF oficiales

- Solicitud de Aldo: agregar al PR #177 los PDF oficiales generados desde el contenido actualizado de los runbooks.
- Archivos PDF agregados:
  - `docs/ops/Runbook_Operativo_INTRA_Corto_v1_0.pdf`
  - `docs/ops/Runbook_Operativo_INTRA_Completo_v1_0.pdf`
- Se mantienen como fuente editable:
  - `docs/ops/runbook-operativo-intra-corto.md`
  - `docs/ops/runbook-operativo-intra-completo.md`
- Alcance: documental; sin cambios de codigo, pagos, wallet, Wompi, webhook, checkout, Supabase, RLS, migraciones, admin, logica autenticada ni variables.
- No se hizo deploy manual.

## Cierre de sesion 2026-06-22 - Landing + Runbook

Estado real:

- PR #176 `Landing conversion copy polish`: MERGED.
- Merge commit PR #176: `cc319c3`.
- PR #177 `Runbook Operativo INTRA`: MERGED.
- Merge commit PR #177: `938db99`.
- `main` quedo actualizado con landing publica ajustada, runbook operativo en Markdown/PDF y memoria de Production env corregida.

Cambios cerrados:

- Landing publica ajustada para mayor conversion:
  - Hero mas claro y menos pesado.
  - Copy cliente/viajero mejorado.
  - CTA principales claros: publicar envio / publicar viaje.
  - Metadata publica apunta a `https://www.intra.com.co`.
  - Seccion de precios limpia, sin emojis ni SVG inline.
  - Tests publicos actualizados.
- Runbook Operativo INTRA creado y mergeado:
  - `docs/ops/runbook-operativo-intra-corto.md`.
  - `docs/ops/runbook-operativo-intra-completo.md`.
  - `docs/ops/Runbook_Operativo_INTRA_Corto_v1_0.pdf`.
  - `docs/ops/Runbook_Operativo_INTRA_Completo_v1_0.pdf`.
  - `.gitattributes` marca `*.pdf binary`.

Estado operativo actualizado:

- INTRA esta avanzado hacia produccion controlada.
- Production env critico esta corregido segun memoria operativa reciente; debe revalidarse antes de operar con dinero real.
- Wompi production esta configurado.
- Webhook Wompi production configurado: `https://www.intra.com.co/api/webhooks/wompi`.
- RLS remoto y smoke autenticado cliente/viajero/admin se consideran realizados segun memoria operativa reciente.
- E2E publico y smoke publico/login/admin/checkout estan en verde segun memoria operativa reciente.
- Legal final queda pendiente antes de produccion abierta, no como freno de produccion controlada.

Siguiente paso recomendado:

- Ejecutar primer pago real Wompi + Wallet de punta a punta con monto pequeno y caso controlado.
- Despues del pago, validar ledger, saldo retenido, liberacion y retiro/payout manual.
- No se recomienda abrir mas PRs de diseno o documentacion salvo hallazgo real.

Confirmaciones:

- No se tocaron pagos, wallet, Wompi, webhook, checkout, Supabase, RLS, migraciones, admin, logica autenticada ni variables en este cierre documental.
- No se hizo deploy manual.

## Actualizacion 2026-06-22 - Primer pago real Wompi

Estado nuevo reportado por Aldo:

- Primer pago real Wompi: PASS operativo.
- La prueba confirma cobro exitoso en Wompi.
- No hay evidencia documentada en repo, dentro de esta actualizacion, de conciliacion completa wallet/ledger.

Estado del gate:

- Wompi real payment: PASS.
- Wallet/ledger reconciliation: PENDING.
- El gate completo `Wompi + Wallet` no debe marcarse como cerrado hasta confirmar:
  - webhook production recibido y procesado;
  - payment/ledger reflejado correctamente en INTRA;
  - saldo retenido consistente;
  - liberacion operativa;
  - wallet del viajero con saldo disponible correcto;
  - retiro/payout manual registrado con referencia externa y evidencia cuando aplique.

Siguiente paso recomendado:

- Validar conciliacion interna del pago real.
- Preparar primer envio controlado con usuario cliente y viajero conocidos.
- Despues de confirmar conciliacion, avanzar produccion controlada con monitoreo operativo.

Confirmaciones:

- No se tocaron codigo, pagos, wallet, Wompi, webhook, checkout, Supabase, RLS, migraciones, admin, logica autenticada ni variables.
- No se hizo deploy manual.

😎
