# INTRA - Current Session

## Continuacion local A05 y SOP financiero - 2026-10-14 (Joy)

- Preflight Production de solo lectura (agregados, sin referencias/PII):
  7 payments Wompi pendientes de mas de 30 minutos; los 7 tienen referencia,
  0 ID de transaccion, 0 gateway aprobado internamente, 0 ledger, 0 webhook
  relacionado y 0 referencia duplicada. No demuestra que el proveedor no
  haya cobrado. La credencial Wompi disponible aqui es de pruebas, no apta
  para cotejo de Production. A05/TASK-047 sigue bloqueada por evidencia del
  proveedor; no se creo un cobro nuevo ni se modifico estado alguno.
- Se agrego consulta repetible `a05_payment_reconciliation_readonly.sql`.
  El SOP de refunds externos tenia una instruccion contradictoria: despues
  del movimiento externo sugeria resolver `customer_refund`, que acredita
  tambien Wallet. Se corrigio el texto para prohibir doble restitucion y
  dejar abierto el cierre interno hasta una ruta tecnica/contable validada.
- No se exportaron referencias, datos personales, tokens o bytes de Storage.
  No hubo SQL de escritura, push, migraciones, merge ni deployment.

## Correccion local de bloqueos PR #183 - 2026-10-14 (Joy)

- Rama `codex/launch-corrections`, sin push. Se adopto bloqueo temporal de
  refunds Wallet parciales: A03 exige neto completo antes de mutar; la vista
  Admin explica el importe neto y la ausencia de parciales.
- MFA Admin: `listFactors().all` identifica TOTP no verificados; no crea
  otro factor con activacion pendiente. El titular puede descartar de forma
  explicita uno no verificado, previa comprobacion de identidad y estado,
  para iniciar de nuevo. No se borra un factor verificado; no hay bypass aal2.
- TDD observado: A03 y tres casos MFA fallaron antes del fix y pasaron tras
  el cambio. PG17 desechable: A03 18, A04 15 y A06 PASS; unit 168/168,
  lint 0 errores/1 advertencia previa, TypeScript y build webpack PASS.
  No hubo Auth real, cobros, migraciones remotas, push, merge ni deploy.
- Siguiente: solicitar checkpoint remoto cuando se quiera probar el nuevo
  SHA en Preview y CI. Antes de dinero real:
  conciliar 7 pagos, restore DB+Storage, SMTP/MFA real y gates operativos.

## Revision final PR #183 - 2026-10-13 (Joy, solo lectura remota)

- SHA remoto revisado `48bbf1376c457058c4e103ce446b00d0e6696af8` contra
  `main` `5574036`: PR abierto, mergeable, checks validate/database/
  detect-impact y Preview PASS. Esta nota local no cambia el PR remoto.
- Verificacion fresca en worktree separado: 165/165 unitarias (26 archivos),
  lint sin errores (un aviso), TypeScript, build y audit Production (0) PASS.
  Se revisaron cinco migraciones, rutas financieras, Auth/Admin y rollout.
- Preflight Production de solo lectura: ninguna de las cinco versiones nuevas
  aplicada; 0 grupos de creditos refund duplicados, 0 creditos de refund
  inconsistentes, 0 referencias de payment duplicadas, 0 eventos Wompi sin
  procesar. Hay **7** payments Wompi pending/created con mas de 30 minutos,
  no 6 como constaba en la auditoria; no se infiere que sean cobros efectivos.
  API de backups: 0 copias gestionadas y PITR desactivado; restore no probado.
- **NO APTO para publicar aun:** A03 admite refund parcial `p_amount < neto`,
  pero revierte toda la retencion/liberacion del viajero y marca payment
  `refunded`, sin asignacion/ledger del neto restante. Definir regla contable
  y probarla; alternativa segura: rechazar parciales hasta definirla.
- MFA: al recargar se descartan factores TOTP no verificados y un nuevo CTA
  crea otro factor. Reintentos abandonados pueden agotar el limite y bloquear
  el alta del unico Admin; probar recuperacion real y corregir/reanudar el
  factor pendiente antes de publicar. No se detecto bypass de autenticacion.
- No se aplicaron migraciones, cobros, push, merge ni deploy; Production sigue
  con A01/A02 y sin el paquete del PR #183. No se creo otro proyecto.

## Continuidad 2026-10-13 - aislamiento y recuperacion (Joy)

- La rama del PR #183 se reviso en un worktree separado; el `main` local y sus
  cinco cambios documentales sin commit se conservaron intactos.
- Management API: el unico proyecto INTRA existente (`Intra-app`, Production)
  ya esta configurado; no se detecto un problema nuevo de configuracion alli.
  El segundo proyecto se considero exclusivamente para ensayar restauracion y
  pruebas sin tocar Production, como indica el handoff. Intento de crear
  `INTRA Pilot Isolated`: HTTP 403
  por falta de privilegio `organization_projects_create`; **no se creo**.
  El navegador administrado solicita login y la sesion de usuario no esta
  disponible. Se solicito al titular crear el segundo proyecto gratuito o
  habilitar el permiso operativo; no se pidieron credenciales por chat.
- API de backups del proyecto Production: HTTP 200, `backups=[]` y
  `pitr_enabled=false`. Esto no acredita un respaldo recuperable. En Free,
  Supabase recomienda `db dump` manual; el dump de DB no incluye bytes de
  Storage. No se exportaron datos ni objetos, ni se hizo restore.
- Proxima accion: disponer de proyecto aislado y acceso privado de backup,
  definir RPO/RTO, hacer inventario DB+Storage, exportar con checksums y
  restaurar/verificar en el destino separado. No conectar Preview a Production.
- No se aplicaron migraciones, no hubo cobros, push, merge ni deploy. Las
  cinco migraciones del PR siguen pendientes de autorizacion de publicacion.

Ver [gates externos](../ops/launch-external-gates-20261013.md#recuperacion-alertas-y-piloto)
y TASK-052/053. Esta nota no reemplaza las verificaciones autenticas.

## Estado vigente - 2026-10-13

Objetivo autorizado: corregir la auditoria A01-A15 y preparar un piloto
controlado con usuarios conocidos. Rama `codex/launch-corrections`, desde
`main` `5574036` (PR #182). PR de correcciones [#183](https://github.com/Apus92Inmortal/INTRA/pull/183),
commits de producto `8c01a2e`, pruebas `aa5acf2`, callback `4341dfc` y MFA
`88819c8` y retorno seguro `d7ded3d`; las correcciones nuevas no estan en Production.
CI remoto completo del producto `d7ded3d` PASS. El HEAD documental y cualquier
SHA a publicar deben coincidir con los checks actuales del PR #183.
El cierre previo A01/A02 si esta publicado; permisos remotos A02 14/14 PASS.

## Cambios preparados

- Cinco migraciones `20261013*`: refunds/revision/cancelacion atomicos A03,
  privacidad contextual y permisos A06, ingesta/retry Wompi A04, guards de
  actores internos A01 y limites privados de Storage A13.
- Acciones Dashboard/admin, webhook, retorno de checkout y endpoint admin
  de conciliacion consumen las RPC revisadas. Credito unico e idempotencia,
  rollback de fallos tardios, eventos no procesados ante errores y cotejo
  canonico del proveedor. No crean un cobro ni una devolucion externa.
- Admin exclusivamente por UUID; browser/SSR/proxy/service client bloquean
  Production en hosted nonprod. Wompi nonprod exige sandbox/claves test.
- Callback Auth bloquea Production antes de crear el cliente en hosted nonprod;
  mantiene cookies de sesion del SDK y respuestas privadas sin cache.
  El destino de retorno rechaza controles ASCII y comprueba el origen parseado;
  evita redireccion externa tras PKCE/OTP, incluido un fallback mal formado.
- Admin requiere JWT verificado, `sub` del usuario autorizado y `aal2` en cada
  guard privilegiado. `/app/profile/security` permite preparar/verificar TOTP
  sin acceso a operaciones admin. QR/codigo solo en memoria y se borran ante
  signOut/cambio de cuenta; respuestas asincronas stale se descartan.
- Dependencias/lock, Node24, CI con PostgreSQL17/audit/E2E, headers,
  uploads, foco/teclado/portals/confirmaciones y robots/sitemap corregidos.
  Manual UI/UX v3.0 revisado; Next genero su bloque de instrucciones AGENTS.
- Informes, pre/postflight, fixture de DDL sin filas, gates externos y
  secuencia de rollout preparados. Evidencias B-H ya integradas: se aclaro
  el historial documental sin tratarlas como funcionalidades ausentes.

Archivos: `supabase/migrations/20261013*`, `supabase/tests/`, acciones/rutas
financieras, `lib/auth`, `lib/supabase`, `lib/wompi.ts`, `proxy.ts`,
`next.config.ts`, componentes de modales, workflows, package/lock,
tests y memoria. El diff de la rama es la lista exacta.

## Validacion local

- Lint PASS: una advertencia en redireccion de password existente
  (`window.location.assign`); no error. Se conserva la recarga tras signOut.
- Unit PASS: 165 pruebas / 26 archivos, tambien con SITE_URL localhost de CI;
  TypeScript PASS; build webpack PASS. Se aislo el entorno de tests Auth,
  que originalmente dependian del dominio configurado en la maquina.
  Callback tiene 20 casos; los guards/pantalla MFA tienen 25 casos focales.
  La revision independiente detecto redireccion externa con TAB/LF/CR ocultos
  en next: corregida en safe-next y probada con 14 regresiones adicionales.
- Audit dependencias Production: 0 vulnerabilidades. Audit completo mantiene
  5 high derivados de un advisory sin parche de braces en herramientas dev;
  no se forzo downgrade de Next.
- `npm run test:db` PASS sobre PostgreSQL17 loopback: A03 18 checks, A04 15,
  A06 roles/privacidad/concurrencia/guards, 16 postflight y grants A01/A02.
  Las cinco migraciones se aplican al DDL remoto exacto en bases desechables.
  Limites de conexion/SQL y cleanup concurrente evitan esperas indefinidas
  ante un fallo; limpieza con bloqueo inyectado verificada en 128 ms.
- E2E publico/seguridad: 8/8 PASS tras normalizar URL vacia en Windows;
  navegacion, legal, overflow mobile, headers, indexing y teclado de modal.
- QA visual sintetico MFA con componente/CSS/fuentes reales: inicial,
  challenge y error revisados en mobile/PC, sin QR, claves ni requests Auth.
  No prueba enrollment ni sesion real; capturas fuera de Git.
- No se probo Auth/Storage HTTP real, restore de datos/objetos ni ciclo de
  dinero. Los fixtures son sinteticos; no se copiaron filas Production.

## Riesgos y pendientes

- Publicar solo con preflight, CI del SHA y aprobacion final explicita.
  No ejecutar `supabase db push` sobre el historial antiguo desalineado.
- Cuenta admin seleccionada por el titular localizada (una coincidencia,
  confirmada/no bloqueada); email/UUID privados. Con confirmacion explicita
  se guardo ese unico ID en ADMIN_USER_IDS Secret Production. Falta deployment
  aprobado y prueba de acceso. Env metadata API Vercel 403; CLI sin sesion propia.
  Fallback navegador autentico confirma Hobby. Diez variables restringidas
  a Production sin cambiar valores, incluidas URL/anon Supabase y secretos
  generales de service-role, cron, admin y Wompi legacy. Cinco registros legacy
  Preview/Development borrados tras autorizacion; quedan 16 variables del
  proyecto, todas Production. Copias de deployments antiguos no revocadas.
- Aislar entornos y retirar/rotar copias de deployments antiguos,
  resolver aptitud comercial del plan Hobby,
  SMTP/confirm/reset, MFA real del titular y proteccion de password; revisar DNS.
  El enforcement MFA esta implementado en rama, aun sin publicar ni probar
  enrollment/challenge del titular o recuperacion por consola.
- A05/TASK-047: titular no recuerda referencia. Seis payments pendientes
  antiguos requieren consulta del proveedor; no asumir cobro ni crear otro.
- `shipment_cancelled_before_approval` permanece pendiente: operador debe
  conciliar y resolver devolucion externa con registro sin duplicar Wallet.
- Restore DB+Storage aislado, alertas recibidas, QA autenticado mobile/PC,
  aforo/limites/soporte y validacion legal/contable aun son gates del piloto.

## Siguiente paso y lecturas

PR #183 abierto; validate/database/detect-impact remotos PASS de `d7ded3d`
(CI 38480193586, impacto 38480194052 y CI push 38480189646).
El fallo inicial de tests Auth por SITE_URL se corrigio y verifico remotamente.
Preview del producto `d7ded3d` READY (`dpl_22DMCDkWTJZcVdRWY4sTWmw9u6Ri`),
posterior a todo el lote Vercel: portada/login/robots 200, nosniff/DENY,
Disallow:/ y callback con codigo sintetico rechazado mediante error de entorno
con no-store. No se usaron tokens reales ni se probo Auth real.
Main ya protegido por API:
strict validate/database/detect-impact, admins, sin force-push/borrado y PR.
Lote admin/limpieza ejecutado con confirmacion del titular; ver
[registro](../ops/vercel-configuration-finalization-20261013.md).
Titular eligio conservar Google Workspace y usar `soporte@intra.com.co`.
Reporta suspension por impago y acceso a buzones; no certifica envio SMTP ni
recepcion efectiva. MX sigue Google y NS ns1/ns2.dns-parking.com; sin cambios DNS.
Formulario Supabase SMTP preparado como borrador: sender INTRA, smtp.gmail.com,
SSL 465 y usuario indicado. Password vacio, sin Save changes. Google no permite
App Password y el titular confirma verificacion en dos pasos desactivada;
no dispone de la SIM durante varios dias. Correo pendiente de paso humano,
credencial privada y prueba. No se reactivo/pago ni se eligio proveedor alterno.
No registrar credenciales ni enviar correo sin autorizar destinatario.
Completar los gates antes de solicitar la ventana Production. No abrir cobros.

Leer AGENTS/START_HERE, esta memoria, TASKS/DB_NOTES/DECISIONS/KNOWN_ISSUES,
[matriz A01-A15](../audits/2026-10-13-launch-corrections-status.md),
[revision financiera](../audits/2026-10-13-financial-corrections-review.md),
[gates externos](../ops/launch-external-gates-20261013.md) y
[rollout](../ops/launch-corrections-rollout-20261013.md).
El historial de sesiones anteriores se conserva en Git y las otras memorias.
