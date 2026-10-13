# Correcciones de lanzamiento INTRA — 2026-10-13

Destino solicitado: piloto controlado con usuarios conocidos. Rama preparada:
`codex/launch-corrections`, desde `main`/Production `5574036` (PR #182).
Este informe reemplaza el estado operativo del informe de septiembre; conserva
sus IDs y no declara cerrado un cambio remoto por una prueba local.

## Cobertura de la auditoria

| ID | Correccion preparada o comprobada | Pendiente para cerrar |
|---|---|---|
| A01 | ACL ya mitigado en Production; nuevos guards NULL probados, cron y delivery conservados | Aplicar guard y smoke remoto |
| A02 | ACL Production 14/14 PASS; suite aislada comprueba que no regresa con las nuevas migraciones | Smoke de retry/payout con sesiones reales |
| A03 | Refund Wallet y revisiones admin atomicas, credito unico, audit, locks e idempotencia; cancelacion pendiente atomica y orden de resoluciones coherente | Aplicar migracion y smoke de flujos; estados parciales historicos requieren conciliacion |
| A04 | Ingesta atomica, fallos sin processed, eventos persistidos antes de lookup, cotejo con Wompi, monotonicidad y retry admin auditado | Aplicar/publicar; probar entrega real de webhook sandbox y cola de conciliacion |
| A05 | Pago antiguo no localizado; no se hizo otro cobro | Conciliar historial del proveedor, payment, ledger y ciclo completo antes de dinero real |
| A06 | Comparacion DDL remoto; policies contextuales, chat sender/estado, RPCs privados y race request_match corregidos | Aplicar/postflight; repair completo de historial separado, sin replay antiguo |
| A07 | Next 16.3.8 y transitivas actualizadas; audit produccion 0 | Publicar; advisory sin parche en braces de herramientas dev permanece (5 high derivados) |
| A08 | Navegador autenticado confirma equipo Hobby; condiciones documentadas | Resolver aptitud comercial/costes con el titular sin compra automatica |
| A09 | Browser/SSR/proxy/admin bloquean DB Production en Preview; Wompi hosted nonprod exige test; herramienta de scopes revisable | Retirar credenciales/overrides remotos y crear entorno aislado; guard no revoca secretos antiguos |
| A10 | CI Node24 reproducible, audit prod, E2E y PostgreSQL17 con DDL exacto y fixtures; politica main preparada | PR/checks remotos y aplicar/verificar proteccion; smoke Auth aislado |
| A11 | Monitoreo agregado y rollout/rollback/reconciliacion operativos preparados | Restore DB+Storage real aislado, prueba de alertas recibidas, limites/responsables y legal/contable |
| A12 | npm ci, lock e instalacion alineados; instrucciones locales actualizadas | Mantener Node24/npm11 en CI/Vercel |
| A13 | Headers, limites/MIME privados, validacion cliente; admin por UUID exclusivamente, evita suplantacion por email autoconfirm | Aplicar/publicar; SMTP/confirm/reset, MFA, leaked-password, SPF/DMARC/DKIM, validacion bytes/retencion y restore |
| A14 | Focus/Tab/Escape/restore/portals en modales, confirm oficial de retiro, robots/sitemap, manual README y estados historicos evidencias aclarados | QA autenticado mobile/PC y prueba remota; no certifica WCAG completo |
| A15 | Limites/medicion del piloto incluidos como gate operativo | Fijar aforo real y medir carga/archivos/costes antes de escalar; no crear indices sin evidencia |

## Evidencia y limites

Lint PASS (una advertencia de redirect existente), unit 114/114 PASS,
TypeScript/build webpack PASS y audit Production 0. E2E publico/seguridad
8/8 PASS; URL vacia normalizada. SQL: A03 18 checks, A04 15 y A06
permisos/roles/guards/concurrencia PASS. CI remoto aun pendiente del PR.

Las suites SQL crean y eliminan bases desechables sobre PostgreSQL17 en
loopback. El fixture contiene solo DDL remoto inspeccionado: 22 tablas,
55 funciones, 113 constraints y 62 policies; no filas ni secretos Production.
Auth/Storage son interfaces sinteticas. Se aplican las cinco migraciones
nuevas en orden y se prueban roles, errores tardios y carreras con conexiones
separadas. No sustituyen Supabase Auth/REST/Storage HTTP ni una restauracion
de usuarios/evidencias reales.

La cuenta admin elegida por el titular se encontro (una coincidencia,
confirmada, no bloqueada), sin versionar email/UUID. Falta Vercel
`ADMIN_USER_IDS` efectivo. El navegador confirma que la variable existe como
Secret (valor no revelable) en Production/Preview; no se presume que contiene
el UUID seleccionado. La lectura actual encontro seis payments pendientes
antiguos; no se atribuyen a un cobro efectivo sin consultar el proveedor.

Referencias: [revision financiera](2026-10-13-financial-corrections-review.md),
[comparacion DDL](../../supabase/tests/a06-ddl-comparison-20261013.md),
[gates externos](../ops/launch-external-gates-20261013.md),
[secuencia de publicacion](../ops/launch-corrections-rollout-20261013.md).

La publicacion de este paquete requiere aprobacion explicita para migraciones,
merge y Production. Abrir el piloto con dinero requiere ademas los gates
anteriores; un deployment READY no los certifica.
