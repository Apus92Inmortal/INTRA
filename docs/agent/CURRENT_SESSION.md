# INTRA - Current Session

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
