# Correcciones de lanzamiento INTRA — 2026-10-13

**Actualizacion Production 2026-10-14:** Aldo identifico los 7 payments
`pending/created` como intentos QA no pagados y autorizo vaciar las tablas
operativas. Postflight: 14/14 tablas objetivo en 0; identidad aprobada,
usuarios y maestros intactos. Storage no se limpio. El conteo de siete filas
abajo corresponde al preflight historico, no al estado actual. El primer pago
real Wompi + Wallet/Ledger fue confirmado PASS por Aldo el 2026-06-27 y
reiterado el 2026-10-14; no se debe repetir. El ciclo financiero integral de
la version corregida permanece pendiente; el PR #183 no cambio.

**Actualizacion local 2026-10-14 (sin push):** A03 rechaza refunds Wallet
parciales antes de mover saldo; A13 detecta y permite descartar solo factores
TOTP no verificados abandonados. Suites locales A03/A04/A06 y 168 unitarias
PASS. El veredicto del PR remoto no cambia hasta publicar el nuevo SHA,
obtener CI y verificar los gates externos. La politica parcial definitiva,
Auth real y Production siguen pendientes.

**Revision final Joy del PR #183 (`48bbf13`): NO APTO para publicar aun.**
CI/Preview y gate local pasan, pero A03 permite refund parcial revirtiendo
todo el saldo del viajero, sin asignacion del remanente; A13 puede bloquear el
alta MFA Admin tras factores no verificados abandonados. Preflight remoto
read-only: las cinco migraciones no aplicadas, 0 creditos refund duplicados,
0 referencias ambiguas y 7 pagos Wompi pending/created >30m (eran 6 en la
nota anterior). No se aplicaron migraciones ni se hicieron cobros o deploy.

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
| A05 | Primer pago Wompi + Wallet/Ledger confirmado PASS operativo por Aldo el 27-jun; siete intentos QA sin pago limpiados el 14-oct | Probar ciclo financiero integral de la version corregida antes del piloto; no repetir el primer pago por ausencia de filas historicas |
| A06 | Comparacion DDL remoto; policies contextuales, chat sender/estado, RPCs privados y race request_match corregidos | Aplicar/postflight; repair completo de historial separado, sin replay antiguo |
| A07 | Next 16.3.8 y transitivas actualizadas; audit produccion 0 | Publicar; advisory sin parche en braces de herramientas dev permanece (5 high derivados) |
| A08 | Navegador autenticado confirma equipo Hobby; condiciones documentadas | Resolver aptitud comercial/costes con el titular sin compra automatica |
| A09 | Guards browser/SSR/proxy/admin/callback; callback mantiene cookies SDK y no cache; Wompi hosted nonprod exige test; diez scopes Production y cinco Config legacy nonprod borrados con confirmacion; inventario final 16 variables Production | Publicar/verificar callback directo; retirar/rotar copias de deployments antiguos y crear entorno aislado. Intento de crear segundo proyecto Free devolvio 403 por permiso operativo insuficiente; guard no revoca secretos antiguos |
| A10 | CI Node24, audit prod, E2E y PostgreSQL17; PR #183, validate/database/detect-impact PASS del producto d7ded3d; main protegido con tres checks strict y admins | SHA/checks del cierre documental en PR #183, CI postmerge y smoke Auth aislado |
| A11 | Monitoreo agregado y rollout/rollback/reconciliacion operativos preparados; API Production lista 0 backups gestionados y PITR desactivado | Dump manual de DB y export separado de objetos Storage con checksum, restore real aislado, prueba de alertas recibidas, limites/responsables y legal/contable |
| A12 | npm ci, lock e instalacion alineados; instrucciones locales actualizadas | Mantener Node24/npm11 en CI/Vercel |
| A13 | Headers, limites/MIME privados, validacion cliente; admin por UUID y JWT verificado `sub`/`aal2`, bootstrap TOTP y QA sintetico; correo Google elegido/formulario SMTP borrador | Aplicar/publicar; 2-step Google/credencial/SMTP/confirm/reset, MFA real y recuperacion del titular, leaked-password, SPF/DMARC/DKIM, validacion bytes/retencion y restore |
| A14 | Focus/Tab/Escape/restore/portals en modales, confirm oficial de retiro, robots/sitemap, manual README y estados historicos evidencias aclarados | QA autenticado mobile/PC y prueba remota; no certifica WCAG completo |
| A15 | Limites/medicion del piloto incluidos como gate operativo | Fijar aforo real y medir carga/archivos/costes antes de escalar; no crear indices sin evidencia |

## Evidencia y limites

Lint PASS (una advertencia de redirect existente), unit 165/165 en 26 archivos PASS,
TypeScript/build webpack PASS y audit Production 0. E2E publico/seguridad
8/8 PASS; URL vacia normalizada. SQL: A03 18 checks, A04 15 y A06
permisos/roles/guards/concurrencia PASS. PR #183 abierto: los tres checks
validate/database/detect-impact PASS del producto `d7ded3d` (CI 38480193586 e impacto
38480194052; CI push 38480189646). El fallo inicial por SITE_URL heredado en tests se corrigio
y verifico remotamente. Preview del mismo SHA READY; el cierre documental
se contrasta con el SHA y los checks actuales del PR. No es un fallo del callback runtime.

Los commits posteriores `4341dfc`/`88819c8` protegen callback y MFA. Callback
tiene 20 casos y MFA 25 casos focales (guards/pantalla). Safe-next tambien
bloquea redireccion externa con controles ASCII y verifica origen/fallback;
14 regresiones adicionales tras revision independiente. Visual sintetico inicial,
challenge/error revisado en mobile/PC con CSS/fuentes reales, sin QR, credenciales
ni requests Auth. No equivale a enrollment o challenge remoto.
Preview de producto `d7ded3d` READY tras el lote Vercel completo; HTTP protegido
portada/login/robots 200, nosniff/DENY, Disallow:/ y callback con codigo sintetico
rechazado con error y no-store. No hubo enlace ni sesion Auth real.

Las suites SQL crean y eliminan bases desechables sobre PostgreSQL17 en
loopback. El fixture contiene solo DDL remoto inspeccionado: 22 tablas,
55 funciones, 113 constraints y 62 policies; no filas ni secretos Production.
Auth/Storage son interfaces sinteticas. Se aplican las cinco migraciones
nuevas en orden y se prueban roles, errores tardios y carreras con conexiones
separadas. No sustituyen Supabase Auth/REST/Storage HTTP ni una restauracion
de usuarios/evidencias reales.

La cuenta admin elegida por el titular se encontro (una coincidencia,
confirmada, no bloqueada), sin versionar email/UUID. Con confirmacion expresa,
se guardo el unico UUID en `ADMIN_USER_IDS` Secret Production; falta efecto
tras redeploy aprobado y smoke admin. El valor guardado es no revelable.
Titular eligio Google Workspace y `soporte@intra.com.co`; formulario SMTP en
Supabase preparado sin password ni guardado. 2-step Google desactivada, SIM
no disponible varios dias; queda pendiente el paso humano y envio/recepcion real.
La lectura actual encontro seis payments pendientes
antiguos; no se atribuyen a un cobro efectivo sin consultar el proveedor.

Referencias: [revision financiera](2026-10-13-financial-corrections-review.md),
[comparacion DDL](../../supabase/tests/a06-ddl-comparison-20261013.md),
[gates externos](../ops/launch-external-gates-20261013.md),
[lote de configuracion Vercel](../ops/vercel-configuration-finalization-20261013.md),
[secuencia de publicacion](../ops/launch-corrections-rollout-20261013.md).

La publicacion de este paquete requiere aprobacion explicita para migraciones,
merge y Production. Abrir el piloto con dinero requiere ademas los gates
anteriores; un deployment READY no los certifica.
