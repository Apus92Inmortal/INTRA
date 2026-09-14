# Auditoría de preparación para lanzamiento — INTRA

Fecha: 4 de septiembre de 2026, America/Bogota. Las consultas remotas corresponden también al 5 de septiembre en UTC.

**Dictamen: NO LISTA para lanzamiento abierto ni para iniciar nuevos cobros en un piloto.** La interfaz pública funciona y el código de producción coincide con GitHub, pero hay permisos peligrosos en la base de datos de producción, riesgos de integridad del dinero y una conciliación financiera sin demostrar. Corregir estos puntos antes de repetir una operación real.

Este informe diferencia defectos confirmados, riesgos derivados de código/configuración y validaciones pendientes. No demuestra que alguien haya explotado las vulnerabilidades ni que se haya perdido dinero. No se ejecutaron RPC que modifican datos, pagos, retiros, migraciones, cambios de variables, push, merge ni despliegues.

## 1. Qué se auditó

| Superficie | Identidad y resultado |
|---|---|
| Carpeta del PC | `C:\Users\ALDO ALTAMAR\intra-app-web`, inicialmente limpia en `main`, commit `b220f7d038c849efae76f27b075a82a22bbc2214` |
| GitHub | [Apus92Inmortal/INTRA](https://github.com/Apus92Inmortal/INTRA), mismo SHA, repositorio público, sin PR/issues abiertos al consultar |
| Vercel Production | Proyecto `intra`, deployment `dpl_BCxpJYJn1gv9n8LYuMJAFLXWPJub`, target `production`, estado `READY`, mismo SHA |
| Dominio real | [www.intra.com.co](https://www.intra.com.co), vinculado al deployment anterior |
| Supabase real | Proyecto `okajyhkdyapbsornjeeb`; coincide con la URL del bundle público de producción y con la configuración local |
| Reglas del proyecto | AGENTS, memoria operativa, matriz legal, runbooks, sistema de evidencias y Manual UI/UX v3.0 |
| Pruebas | Lint, unitarias, TypeScript, build, E2E públicos locales y remotos, revisión responsive, npm audit, SQL de metadatos/agregados y APIs de GitHub/Vercel |

El deployment más reciente listado por Vercel es un preview distinto; para esta auditoría se resolvió el dominio de producción expresamente. No se confundió “último deployment” con “producción”.

## 2. Lo que sí está funcionando o tiene evidencia positiva

- Local, GitHub y deployment de producción tienen el mismo código base. No hay cambios de producto locales sin subir ni una versión de producción atrasada respecto de `main`.
- GitHub CI del commit actual pasó lint, unitarias, TypeScript y build: [run 28303949524](https://github.com/Apus92Inmortal/INTRA/actions/runs/28303949524). El análisis de workflows también pasó: [run 28303949514](https://github.com/Apus92Inmortal/INTRA/actions/runs/28303949514).
- Vercel compiló Next `16.2.4`, generó 38/38 páginas y tiene producción `READY`, Node `24.x`, región `iad1` y aliases sin error. [Deployment](https://vercel.com/aldo-antonio-altamar-cervantes-projects/intra/BCxpJYJn1gv9n8LYuMJAFLXWPJub).
- HTTP redirige a HTTPS; `intra.com.co` redirige con 308 a `www.intra.com.co`. HTTPS responde correctamente y presenta HSTS.
- Landing, acceso/registro y documentos legales cargan. Las rutas admin, wallet y checkout redirigen a login cuando no hay sesión.
- Los cuatro E2E públicos pasan tanto en local como contra producción. La revisión adicional de landing/login/registro a 1440×800, 1366×650, 390×844 y 320×740 no detectó overflow horizontal, imágenes rotas ni excepciones JavaScript. No certifica las pantallas autenticadas.
- RLS está habilitado en todas las tablas ordinarias de `public` consultadas. `profiles` conserva acceso propio y `user_verifications` permite al usuario consultar su verificación. Esto no compensa las policies peligrosas de otras tablas.
- Los buckets `identity-verification` y `shipment-evidence` son privados.
- Existe firma de integridad para checkout Wompi y comprobación de firma de eventos. La RPC `process_wompi_payment_event` no es ejecutable por `anon` ni `authenticated`.
- Existen índices de idempotencia para hold, release, débitos de refund y payout pagado. Falta uno específico para el crédito de devolución al cliente.
- El cron SQL `auto-release-payments` está activo cada cinco minutos: 2.016 ejecuciones con estado `succeeded` en los siete días consultados. Hay además cron diario en `vercel.json`. El éxito del scheduler no prueba que se haya liberado un pago real.
- Hay operación manual documentada para refunds/payouts, disputas, evidencias, soporte e incidentes. Automatizar pagos bancarios o refunds Wompi no es requisito del MVP según DEC-006.

## 3. Bloqueos prioritarios

Prioridades: **P0** exige resolver antes de nuevos cobros; **P1** debe cerrarse antes de lanzar el alcance afectado; **P2** es preparación o mejora adicional. La columna “evidencia” distingue una falla verificada de un gate aún sin demostrar.

| ID | Prioridad | Hallazgo | Evidencia |
|---|---|---|---|
| A01 | P0 | RPC de liberación/reembolso accesibles anónimamente | Grants y definición remota confirmados |
| A02 | P0 | Escritura directa de pagos y creación de retiros fuera de RPC controladas | Policies, grants y triggers remotos confirmados |
| A03 | P1 | Devolución a wallet no atómica y sin unicidad para crédito al cliente | Código y ausencia del índice remoto; concurrencia no ejecutada |
| A04 | P1 | Webhook reconoce como procesado un fallo funcional de conciliación | Código del handler y contrato RPC remoto confirmados |
| A05 | P0, gate | Cadena real Wompi → wallet → retiro sin evidencia actual | Memoria pendiente y agregados remotos incompatibles con darla por cerrada |
| A06 | P1 | Base remota desalineada de las migraciones y privacidad demasiado amplia | 40 archivos/4 registros; policies legacy activas |
| A07 | P1 | Dependencias de producción con alertas altas | npm audit y advisory oficial de Next |
| A08 | P1 | Vercel Hobby para un producto comercial | Plan observado y condiciones oficiales |
| A09 | P1 | Preview comparte acceso a base y credencial administrativa de producción | Configuración observada en Vercel |
| A10 | P1 | `main` sin protección y sin gate suficiente de pruebas | API GitHub y workflows |
| A11 | P1, gate | Recuperación, alertas y revisión legal final sin cierre | Ausencia de evidencia operativa y pendientes explícitos |

### A01. Liberación y reembolso sin autorización suficiente

En producción, `release_payment(uuid,text)` y `refund_payment(uuid,text)` son `SECURITY DEFINER`, propiedad de `postgres`, con `EXECUTE` concedido a `PUBLIC`, `anon` y `authenticated`. La consulta `has_function_privilege` devolvió `true` para ambos roles.

La guarda de liberación solo rechaza cuando `auth.uid()` no es NULL y es distinto del dueño. La de refund tiene el mismo problema con dueño/viajero. Una llamada anónima no queda rechazada por esa condición. `release_payment` exige un pago held/aprobado y sin bloqueos, pero no comprueba por sí misma entrega completada ni vencimiento de plazo; modifica ledger y saldo disponible. `refund_payment` puede marcar reembolso y revertir saldos internos; esto no representa un refund bancario ejecutado en Wompi.

Referencias locales: [definición y guardas](../../supabase/migrations/202605212245_phase0_refund_cancel_ledger.sql), líneas 202, 235, 316 y 349. La definición fue contrastada con `pg_get_functiondef` en producción; no se invocaron estas operaciones.

También `create_operational_notification` es ejecutable por `anon`, admite usuario destinatario y contenido, y carece de una guarda de autorización. Permite fabricar notificaciones operativas. [Helper](../../supabase/migrations/202606071450_operational_notifications_f4.sql), línea 75.

**Cierre:** migración nueva que revise todas las firmas y permisos heredados de PUBLIC, restrinja helpers internos y valide actor/estado/plazos en la ruta autorizada. Preservar RPC legítimas de usuario y la calculadora pública aprobada. Probar en entorno aislado que un anónimo y un tercero no pueden liberar, reembolsar ni crear notificaciones ajenas; probar también los caminos legítimos admin/cliente/cron.

### A02. Usuarios pueden modificar datos de pago directamente

La base real conserva `payments_insert_own`, `payments_update_related_users` y `payouts_insert_own`. `authenticated` tiene INSERT/UPDATE sobre la tabla de pagos completa. Existe policy SELECT compatible. La policy UPDATE autoriza dueño/usuario del pago o viajeros relacionados por un match del envío, sin limitar columnas a campos inocuos.

Esto permite eludir el handler y las RPC controladas para modificar estado, estado de pasarela, importes o metadatos del pago relacionado. El único trigger no interno de `payments` observado es una notificación AFTER UPDATE, no un bloqueo de esos cambios. El INSERT propio de `payouts` evita las validaciones de entrada de `request_payout`; no implica por sí solo una transferencia bancaria.

La migración local de hardening ordena borrar esas policies: [202605212300](../../supabase/migrations/202605212300_phase0_rls_rpc_hardening.sql), líneas 497–498 y 560. Su permanencia remota es una discrepancia real. Se observaron además policies legacy amplias de INSERT/UPDATE en `matches`, que deben entrar en la revisión de permisos de flujo.

**Cierre:** impedir escrituras cliente sobre campos financieros y transiciones operativas privilegiadas; conservar lecturas autorizadas y operaciones explícitas. Verificar permisos efectivos y políticas combinadas, no solamente que RLS esté “enabled”. Añadir pruebas de acceso directo por cliente, viajero, tercero y anónimo.

### A03. Riesgo de doble devolución o cancelación parcial

`cancelActiveWaitingTravelerShipmentAction` consulta si existe `refund_available_credit`, inserta el crédito, sincroniza wallet y después cambia pago/envío mediante solicitudes separadas. Dos solicitudes pueden leer “no existe” y acreditar ambas antes del cambio de estado. Una falla posterior puede dejar crédito aplicado con cancelación fallida.

La resolución admin a favor del cliente tiene un patrón equivalente. El índice remoto `wallet_ledger_refund_available_once_idx` protege **refund_available_debit**, no **refund_available_credit**. No hay otro índice de unicidad para este crédito.

Referencias: [cancelación](../../app/app/_actions/shipment-actions.ts), líneas 436–531; [refund admin](../../app/app/admin/actions.ts), líneas 671–737. Riesgo derivado de código más metadatos remotos; no se provocaron carreras con dinero real.

**Cierre:** consolidar devolución, ledger, balance y transición de estados en una transacción SQL con bloqueo e idempotencia respaldada por índice. Revisar datos previos antes de añadir unicidad. Probar doble solicitud simultánea y fallo intermedio: debe existir exactamente un crédito o ninguno, con estado consistente.

### A04. Webhook puede perder el reintento de un fallo funcional

La RPC `process_wompi_payment_event` retorna `{success:false,error:'payment_not_found'}` cuando no encuentra el pago. Esto no es un error de transporte de Supabase. El handler solo comprueba `rpcError` y, aun con ese resultado funcional, marca el evento `processed:true` y responde HTTP 200. Una repetición encuentra `processed` y se descarta como duplicado.

Referencias: [handler](../../app/api/webhooks/wompi/route.ts), líneas 83, 141 y 153–161; [contrato SQL](../../supabase/migrations/202605212245_phase0_refund_cancel_ledger.sql), líneas 57–88. La definición remota conserva ese contrato.

Además, el procesador actual no coteja explícitamente importe/moneda recibidos contra el pago esperado ni establece una estrategia completa para eventos fuera de orden. La firma ya existente es positiva, pero se necesita validar la conciliación de negocio.

**Cierre:** separar errores funcionales, eventos inválidos y éxitos; registrar fallos recuperables sin marcarlos procesados, con reintento/reconciliación definidos. Probar evento sin pago aún visible, firma inválida, duplicado, importe/moneda discrepantes y eventos fuera de orden. No afirmar que este defecto causó la ausencia de datos reales: no hay evidencia suficiente para atribuirla.

### A05. Pago real histórico sin conciliación verificable

TASK-047 recoge que Aldo reportó un cobro real exitoso en junio. La misma memoria deja pendiente la conciliación interna. En la base que utiliza producción, la auditoría encontró:

| Registro | Conteo actual |
|---|---:|
| `payments` | 5, todos `pending` / `created` |
| `wompi_webhook_events` | 0 |
| `wallets` | 0 |
| `wallet_ledger` | 0 |
| `payouts` | 0 |

Estos conteos no niegan el cobro reportado: pudo existir limpieza, otra referencia o un entorno anterior. Tampoco permiten certificar webhook, retención, liberación ni retiro. No se identificó la transacción real en el dashboard Wompi durante esta auditoría.

**Cierre:** localizar la referencia del cobro histórico en Wompi, contrastarla con su payment/envío y explicar cualquier dato borrado o diferencia de ambiente. Tras corregir A01–A04 y preparar infraestructura, ejecutar un caso controlado con evidencia del recorrido completo: cobro, webhook, pago held, match, evidencias, entrega, liberación, wallet y payout manual con referencia externa. Añadir caso de disputa y cancelación/reembolso. Registrar importes bruto, pasarela, tarifa operativa y neto sin diferencias.

### A06. Migraciones y privacidad no coinciden con el estado declarado

Hay 40 archivos locales de migración. El historial remoto registra cuatro: `20260424`, `20260426`, `202604260105` y `202605252230`. Hay funciones y triggers posteriores presentes, por lo que **no se deduce que falten 36 migraciones completas**. Sí existe una aplicación parcial o historial sin reconciliar y diferencias efectivas como A02.

La policy de `shipments` llamada “Authenticated users can view open shipments” tiene `USING (true)`. No limita a envíos abiertos y se combina de forma permisiva con las policies más restrictivas. Todos los autenticados pueden superar el alcance de visibilidad descrito para market. No se extrajeron filas personales para demostrarlo.

**Cierre:** comparar schema, funciones, constraints, índices, grants y policies efectivos; crear una migración correctiva según el diff real y reparar el historial con respaldo. No reproducir todas las migraciones a ciegas. Quitar policies redundantes/amplias y volver a probar aislamiento entre cuentas, estados cerrados y acceso a evidencia/PII.

### A07. Dependencias vulnerables

`npm audit --omit=dev --json` terminó con código 1: **cinco paquetes de producción con severidad alta**, `next`, `nanoid`, `postcss`, `sharp` y `ws`; cero paquetes clasificados críticos. Son paquetes afectados, no cinco incidentes ni cinco vulnerabilidades necesariamente explotables en todos los despliegues.

El lockfile y producción usan Next `16.2.4`. INTRA usa App Router y Server Actions, condiciones del advisory de denegación de servicio [GHSA-m99w-x7hq-7vfj](https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj), corregido en la rama 16 a partir de `16.2.11`. Hay también [advisory de bypass de Proxy](https://github.com/vercel/next.js/security/advisories/GHSA-26hh-7cqf-hhc6). No se ejecutaron payloads de explotación.

**Cierre:** actualizar a una versión soportada y corregida, revisar el conjunto de dependencias transitivas, regenerar lockfile y repetir auditoría y pruebas. `16.2.11` es el mínimo del advisory citado, no una afirmación de que cierre todo el reporte npm actual. No usar `npm audit fix --force` sin revisión.

### A08. Plan Vercel para uso comercial

El equipo/proyecto observado usa Hobby. La documentación oficial reserva [Hobby](https://vercel.com/docs/plans/hobby) a uso personal no comercial; INTRA intermedia pagos y cobra tarifa operativa. Debe pasar a un plan que autorice esa operación antes de lanzar comercialmente. La limitación también importa si el piloto ya tiene actividad comercial.

**Cierre:** contratar/configurar el plan adecuado, límites de gasto y alertas. No se realizó ninguna compra ni cambio de plan.

### A09. Preview y producción comparten acceso a datos

La configuración visible de Vercel asigna la URL Supabase de producción a todos los ambientes y un mismo registro `SUPABASE_SERVICE_ROLE_KEY` a Production y Preview. También quedan configuraciones de Development y un override de una rama antigua. Se consultaron nombres, targets y URL pública, sin mostrar credenciales.

Un preview con esa credencial puede usar privilegios administrativos sobre datos reales. El riesgo aumenta con cambios de servidor aún no aprobados.

**Cierre:** ambiente Supabase aislado y Wompi sandbox para Preview/Development, secretos separados y política de protección de previews. Revisar overrides obsoletos. Verificar que ninguna prueba cree usuarios/datos de negocio ni mueva dinero en producción por defecto.

Los nombres críticos de Production y `ADMIN_EMAILS` existen actualmente. No se volvió a declarar el fallo histórico de “variables faltantes” como si siguiera confirmado. Quedan por validar valores efectivos no vacíos, coherencia live/sandbox, allowlist admin, secretos de cron y configuración del webhook en Wompi. La presencia de un nombre no cierra ese gate.

### A10. GitHub no obliga a validar antes de publicar

La [API de main](https://api.github.com/repos/Apus92Inmortal/INTRA/branches/main) reportó `protected:false`, protección desactivada y enforcement de checks `off`; [rulesets](https://api.github.com/repos/Apus92Inmortal/INTRA/rulesets) devolvió `[]`. No hay tags ni releases.

CI no ejecuta E2E. El smoke autenticado es manual (`workflow_dispatch`) y cubre acceso/navegación/logout de cliente y viajero, no un envío con dinero. Su último PASS registrado es del 7 de junio sobre `d4f4392`: [run 27101191801](https://github.com/Apus92Inmortal/INTRA/actions/runs/27101191801). La memoria indica que se retiraron los secrets temporales; su reposición actual no pudo verificarse.

En el HEAD actual Vercel reportó éxito a 22:38:36 UTC y CI terminó a 22:38:58 UTC. Eso muestra ejecución paralela; no prueba por sí solo una configuración concreta de promoción.

**Cierre:** PR obligatorio, checks requeridos, control de force push/borrado y revisión adecuada; E2E públicos en CI y smoke autenticado reciente en ambiente controlado; promoción de la versión validada, tag y checklist de release. Referencias: [CI](../../.github/workflows/ci.yml), [smoke](../../.github/workflows/smoke.yml), [alcance documentado](../ops/authenticated-smoke.md).

### A11. Gates operativos y legales por cerrar

El runbook contiene procedimientos útiles, pero no encontré evidencia versionada de restauración de DB/Storage, RTO/RPO, rollback probado ni alertas con prueba de recepción. Esto **no equivale a afirmar que Supabase no tenga backups**. Los logs de Vercel consultados no devolvieron grupos de errores de runtime en siete días; la retención, poco tráfico y cobertura del proveedor limitan esa observación. No sustituye alertas ni monitoreo financiero.

TASK-048 y los textos legales mantienen pendiente una validación especializada antes de publicación definitiva. Ejemplo: [documentos legales](../../lib/legal/documents.ts), líneas 562, 777 y 963. El estado legal se reporta como pendiente del proyecto, no como dictamen jurídico.

**Cierre operativo:** respaldo verificable de DB y archivos, restauración en entorno aislado, rollback app/migraciones, responsables y alertas de 5xx, webhook fallido, pagos sin conciliar, cron, saldo anómalo y soporte. Definir aforo, rutas, importes y horarios del piloto.

**Cierre para apertura:** revisión legal/comercial de políticas, responsable de tratamiento, datos/evidencias, límites de responsabilidad, flujo financiero, términos de viajeros/clientes y canal de reclamaciones; validación contable de comisiones/pasarela/retiros. Conservar evidencia de la aprobación.

## 4. Carpeta local y preparación adicional

### A12. El PC no reproduce exactamente el lockfile

Se inspeccionaron 520 manifests instalados y se encontraron 11 diferencias de versión. Destacan Next, `@next/env` y SWC Windows `16.1.6` instalados frente a `16.2.4` en lockfile. También difieren ajv, flatted, brace-expansion, minimatch y picomatch en distintos niveles. Los 119 paquetes ausentes son opcionales; no se consideran un fallo por ese motivo.

El build local pasó con **Next 16.1.6**, mientras GitHub/Vercel construyeron **16.2.4**. No se hizo reinstalación de `node_modules` ni se modificó el lockfile durante la auditoría. Una validación local verde no certifica equivalencia entre esos entornos.

`.env.local` contiene únicamente URL y clave pública de Supabase, con formato publishable. No contiene la configuración servidor necesaria para reproducir admin/Wompi/cron completos. Debe prepararse un ambiente local seguro y separado; no copiar indiscriminadamente secretos de producción.

Faltaba el Chrome Headless Shell requerido por Playwright. Se ejecutó el script del repo `npm run playwright:install`, se instaló Chromium en su caché local y ambos E2E se repitieron con éxito.

**Cierre:** después de resolver la actualización de dependencias, instalar desde lockfile y repetir checks con versión Node definida. Añadir onboarding local preciso al README.

### A13. Auth, Storage, seguridad HTTP y correo

- Supabase Advisor reporta protección de contraseñas filtradas desactivada. Revisar configuración real de contraseña, MFA para accesos privilegiados, recuperación y revocación. No se probó registro real ni entrega de correos transaccionales durante esta auditoría. [Referencia](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Ambos buckets privados tienen `file_size_limit` y `allowed_mime_types` en NULL: no tienen límites específicos por bucket; pueden existir límites globales. Revisar límites y validación de contenido en servidor/Storage, retención, borrado y recuperación de evidencias/documentos.
- En respuestas públicas/protegidas comprobadas no se observaron CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy ni Permissions-Policy. HSTS sí existe. Definir cabeceras compatibles con Next/Wompi y probarlas, especialmente protección frente a framing.
- El dominio tiene MX hacia Google. La consulta TXT directa y DNS público no halló SPF; `_dmarc.intra.com.co` devolvió NXDOMAIN. No se verificó DKIM, existencia/entrega del buzón `soporte@intra.com.co` ni el proveedor SMTP de Supabase. Preparar autenticación del correo y probar soporte, confirmación y recuperación sin asumir que MX significa entrega correcta.

### A14. Accesibilidad, SEO y documentación

- `IntraModal`/`IntraConfirmDialog` declaran `aria-modal`, pero no implementan foco inicial, retención/restauración de foco ni Escape. Los modales de documentos y evidencia tienen carencias equivalentes. `WelcomeModal` carece además de semántica de diálogo. [Foundation](../../components/ui/intra-foundation.tsx), líneas 242/324; [legal](../../components/legal-document-modal.tsx), línea 64; [welcome](../../components/WelcomeModal.tsx), línea 69. Completar el comportamiento central y probar teclado; no se afirma una certificación WCAG completa.
- El escaneo estático de app interna/componentes no encontró confirm/alert nativos, SVG inline, hex directos ni los tamaños Tailwind prohibidos buscados. Los aliases `intra-h*` están permitidos temporalmente. No hace falta rediseñar pantallas para cerrar los fallos financieros.
- `robots.txt` y `sitemap.xml` devuelven 404. Es una mejora de indexación previa a adquisición pública, no un bloqueo del piloto. Definir páginas indexables, excluir áreas privadas y revisar canonical/social sharing.
- README aún presenta v2.2 como manual vigente, contradiciendo AGENTS y el manual v3.0. TASKS contiene REVIEW/TODO antiguos pese a cierres posteriores; el documento de evidencias también incluye un diagnóstico histórico ya superado. Reconciliar esos estados; no interpretarlos automáticamente como funciones faltantes.
- Los assets estáticos de producto examinados existen y están versionados. Los dos scripts actuales están tracked pese a la regla general `scripts/` en `.gitignore`. No hay hueco de assets/scripts demostrado.
- El escaneo acotado de secretos en archivos textuales tracked no encontró patrones buscados; no abarcó todo el historial Git. Dependabot/code scanning/secret scanning remotos no pudieron verificarse por permisos/lista de endpoints del conector. No concluir “sin secretos” ni “sin alertas” a partir de esto.

### A15. Rendimiento y capacidad todavía sin certificar

Supabase Performance Advisor encontró 17 claves foráneas sin índice de cobertura, 55 avisos de evaluación RLS, 18 casos de policies permisivas múltiples y 6 índices sin uso observado. Son avisos a priorizar por consultas reales; no son 96 incidentes ni justifican crear/borrar índices a ciegas. [Guía del advisor](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

No hubo pruebas de carga, volumen de archivos, costes bajo concurrencia, Core Web Vitals de usuarios reales ni dispositivos físicos. Revisar especialmente chat, dashboard/realtime, búsquedas de oportunidades y admin antes de escalar tráfico. Para piloto pequeño, definir límites operativos y medirlos.

## 5. Resultados de validación

| Validación | Resultado | Alcance y límite |
|---|---|---|
| `npm run lint` | PASS | Dependencias locales actuales |
| `npm run test:unit` | PASS, 60 tests / 15 archivos | Helpers/componentes; no certifica SQL financiero |
| `npx tsc --noEmit` | PASS | Árbol local instalado |
| `npm run build` | PASS, 38 rutas/páginas generadas | Next instalado 16.1.6; distinto del lock |
| `npm run test:e2e -- --reporter=line --output=test-results/audit-local` | PASS, 4 tests | Páginas públicas locales |
| Mismo E2E con `PLAYWRIGHT_BASE_URL=https://www.intra.com.co` | PASS, 4 tests | Páginas públicas de producción |
| Capturas/DOM públicos en cuatro viewports | PASS dentro del alcance | Sin overflow, imágenes rotas o pageerror |
| `npm audit --omit=dev --json` | FAIL, 5 paquetes high | Lockfile; requiere corregir y repetir |
| GitHub CI del HEAD | PASS | 27-jun-2026, no ejecución nueva; [evidencia](https://github.com/Apus92Inmortal/INTRA/actions/runs/28303949524) |
| Vercel producción | READY, mismo SHA | No implica cierre de seguridad/negocio |
| Auditoría SQL de grants/policies/índices | FAIL de preparación | Defectos A01/A02/A03/A06 verificados por lectura |
| Smoke autenticado reciente | NO EJECUTADO | Sin cuentas aisladas preparadas; último PASS histórico 07-jun |
| Wompi real / entrega / disputa / payout | NO EJECUTADO | Auditoría sin movimientos reales; gate abierto |
| Restauración / carga / revisión legal | NO CERTIFICADO | Requiere pruebas o validación específica |

Los primeros intentos de E2E fallaron por falta de Chromium, no por un fallo de INTRA; la dependencia se instaló y el resultado final fue PASS. No se añadieron tests que modifiquen datos de producción.

## 6. Orden recomendado para llegar al lanzamiento

| Orden | Trabajo concreto | Evidencia exigida para cerrarlo |
|---|---|---|
| 1 | Contener permisos RPC/RLS de dinero y datos; reconciliar esquema real | Migración revisada/aplicada y pruebas negativas anónimo/tercero, más flujos legítimos |
| 2 | Devoluciones transaccionales y webhook con tratamiento correcto de fallos | Pruebas de carrera, reintento, duplicados y estados fuera de orden en DB aislada |
| 3 | Actualizar dependencias; separar Preview/Development; Vercel comercial | Build con lockfile reproducible, audit revisado y ambientes/plan verificados |
| 4 | Proteger GitHub y configurar release verificable | PR/checks requeridos, E2E en CI, versión candidata/tag y rollback definido |
| 5 | Cerrar recuperación, alertas, correo y operación de soporte | Restauración probada y alertas/correos recibidos; responsables y límites del piloto |
| 6 | Conciliar pago histórico y ejecutar caso completo controlado | Importes reconciliados, ledger/hold/release/wallet/payout, entrega y disputa verificadas |
| 7 | Lanzar piloto con usuarios conocidos | Sin P0 ni P1 que afecten el piloto, bitácora, monitoreo y criterio de suspensión |
| 8 | Preparar apertura comercial amplia | Legal final, capacidad medida, correcciones de privacidad/accesibilidad y soporte operativo |

El primer cambio recomendado es el hardening de permisos de producción respaldado por migración y pruebas. No basta actualizar la landing, dar por bueno el build ni repetir otro cobro antes de cerrar los accesos peligrosos. No se asigna porcentaje de “terminado”: la preparación depende de gates críticos, no de cantidad de pantallas.

## 7. Entregables y límites de esta auditoría

El informe y la memoria quedan únicamente en la rama local `codex/audit-launch-2026-09-04`. Se actualizan CURRENT_SESSION, TASKS, KNOWN_ISSUES y DB_NOTES para registrar el estado observado, sin aplicar cambios de base de datos. Se conserva la historia; las confirmaciones antiguas no se usan como garantía del estado actual.

Las [consultas de verificación](2026-09-04-readonly-checks.sql) solo leen metadatos y agregados, y permiten repetir los puntos principales sin mover dinero. No contienen credenciales ni identificadores de usuarios/transacciones.

La auditoría no es una certificación exhaustiva de seguridad, legal o capacidad. No incluyó explotación activa, movimientos financieros, revisión del dashboard Wompi, prueba completa autenticada con varios usuarios, acceso a todos los controles administrativos de proveedores, restauración de backups ni carga. Esas limitaciones están reflejadas como pendientes, no como PASS.
