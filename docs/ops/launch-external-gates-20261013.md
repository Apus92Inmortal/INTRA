# Gates externos para el piloto INTRA — 2026-10-13

Actualizacion 2026-10-14 posterior: Aldo identifico los 7 pagos pendientes
como intentos de QA sin pago y autorizo limpieza operativa. En Production
quedaron 0 payments y 0 shipments, con 14/14 tablas objetivo en cero;
usuarios, maestros y verificacion de identidad aprobada se preservaron.
El preflight de 7 filas descrito abajo es evidencia historica. No se tocaron
23 objetos Storage ni se demostro respaldo/restauracion; el pago historico
reportado y el smoke financiero A05 siguen abiertos.

Actualizacion read-only 2026-10-14: el preflight A05 ahora cuenta **7** pagos
Wompi antiguos pending/processing, no 6. Los 7 tienen referencia interna,
pero ninguno tiene ID de transaccion, webhook o asiento ledger relacionado.
Esto no descarta cobros en el proveedor; falta cotejo Wompi Production.
Ver [consulta reproducible](../../supabase/tests/a05_payment_reconciliation_readonly.sql).

Inspeccion de GitHub, Vercel, Supabase Auth/Storage y DNS, incluido fallback
de navegador autenticado en Vercel para plan y scopes sin revelar valores.
Se protegio main por API y se limitaron diez variables a Production por UI,
inicialmente sin cambiar sus valores. Despues, con confirmacion del titular,
se guardo su unico UUID admin en el Secret Production y se borraron cinco
Config legacy nonprod. No se cambiaron planes, DNS, usuarios ni dinero;
el formulario SMTP Google quedo en borrador sin guardar ni enviar correo.
Las correcciones de codigo/SQL de esta rama no estan certificadas en Production.
El procedimiento de publicacion esta en [rollout](launch-corrections-rollout-20261013.md).

Los commits locales `4341dfc` y `88819c8` agregan guard/cookies del callback
y MFA admin con claims verificados. Validacion local final: 151 unit / 26
archivos, lint, TypeScript y build PASS; E2E publico/seguridad 8/8 PASS.
El CI remoto comprobado de `016a489` no certifica esos commits nuevos: exigir
los tres checks del SHA que se publique. No se aplico DDL remoto ni se
crearon factores MFA; no se publicaron estas correcciones en Production.

## Estado comprobado

| Auditoria | Evidencia actual | Condicion para cerrar |
|---|---|---|
| A08 plan Vercel | Navegador autenticado el 13-oct confirma equipo Hobby. API de plan no disponible. | Resolver autorizacion comercial y alertas de coste con el titular; no comprar automaticamente. |
| A09 aislamiento | Solo hay un proyecto Supabase disponible: Production. API env da 403 y CLI sin sesion. Navegador confirma diez scopes restringidos y cinco Config legacy eliminados; 16 variables del proyecto solo Production. | Retirar/rotar copias en deployments antiguos; usar base aislada y Wompi test. |
| A10 GitHub | Main protected=true: validate/database/detect-impact strict, admins, PR, sin force-push/borrado. PR #183 tres checks PASS del producto d7ded3d y Preview READY del mismo SHA. Secrets Actions: 0. | SHA/checks del cierre documental en PR #183, CI postmerge y smoke autenticado aislado. |
| A11 recuperacion/operacion | No se ejecuto restauracion de datos/objetos, prueba de alertas ni smoke completo con usuarios aislados. | Ensayo de recuperacion, alertas recibidas, aforo/responsables del piloto y aprobacion legal/contable documentados. |
| A13 Auth | Inspeccion remota: autoconfirm=true, anonymous signin=false, leaked-password desactivada y 0 factores MFA. Rama local exige UUID, sesion vigente, claims firmados/sub coincidente y aal2; enrollment/challenge y callback protegidos. | Publicar version aprobada; enrollment/challenge/revocacion reales del titular, confirmacion/recovery SMTP y proteccion de contrasenas probados. |
| A13 Storage | Ambos buckets privados sin limites especificos en Production. Objetos existentes agregados: JPEG/PNG/WebP; mayor 2.046.594 bytes. | Aplicar migracion de 5 MiB y 3 MIME; verificar HTTP privado, bytes de imagen, retencion/borrado/restauracion. |
| A13 correo | Titular elige Google y soporte@intra.com.co; informa Workspace suspendido con acceso al inbox y 2-Step desactivada. SMTP Google solo borrador sin password ni guardar. DNS observado: MX Google, NS dns-parking, sin SPF/DMARC y selectores DKIM comunes NXDOMAIN. | Paso humano 2FA/App Password, servicio SMTP y recepcion reales, DNS correcto y entrega Auth probados; no hay reactivacion autorizada. |

Referencias de entorno inspeccionado: Supabase `okajyhkdyapbsornjeeb`;
Vercel equipo `team_Ol4y0BzimnFUPgzQUcEIJ5AX`, proyecto
`prj_vZUXhxgCzrRu7iRt4u4rN1UkzVXn` (`intra`). El deployment Production
observado `dpl_9KxdmML473eBFYGYfsowJXbDHLY8` estaba READY. GitHub `main`
observado: `55740360aa5c1ed6886397bea9804a811fb4dafd`.
No se imprimieron valores de secretos ni identidades/correos de usuarios.

El titular indico su cuenta admin durante la sesion. La consulta protegida por
correo encontro exactamente una cuenta existente, confirmada y no bloqueada.
Su UUID se conserva fuera del repo. Con confirmacion explicita se guardo como
unico admin en `ADMIN_USER_IDS` Secret Production; su valor no puede revelarse.
El cambio afecta futuros deployments: falta redeploy aprobado y comprobar
el acceso autenticado del titular con MFA; la allowlist guardada no acredita
efecto en el deployment Production existente.
Autoconfirm sigue sin demostrar propiedad de correo por si sola.

## Vercel: plan e inventario de variables

El conector permite ver proyecto, dominios y proteccion de deployments:
SSO `all_except_custom_domains`. Eso no certifica aislamiento de datos.
La consulta de variables con decrypt=false recibio 403. El fallback CLI
64.0.1 no encontro credencial propia; se cancelo su flujo de login, sin
autenticar ni repetir la misma consulta rechazada. No se descargaron envs.
El fallback posterior a Chrome tiene sesion propia: confirma Hobby y metadata
de variables/overrides, con valores ocultos; no se exportaron secretos.

Desde esa UI se restringieron a **Production exclusivamente**, sin cambiar
values: `SUPABASE_SERVICE_ROLE_KEY` general (Secret), `INTERNAL_CRON_SECRET`,
`CRON_SECRET`, `ADMIN_USER_IDS` (Secret), `ADMIN_EMAILS` (Secret),
`WOMPI_EVENTS_KEY`, `WOMPI_INTEGRITY_KEY`, `WOMPI_PRIVATE_KEY`,
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Las dos variables publicas tambien perdieron su scope Development.
Esto afecta deployments futuros; no elimina credenciales de deployments
existentes. No se redeployo Production. Un lote posterior autorizado reemplazo
exclusivamente el valor Secret admin por el UUID seleccionado.

Se eliminaron cinco registros Config no productivos: service-role Preview override
`joy/wompi-migration`, Wompi public/sandbox override de esa misma rama,
service-role Development y ADMIN_USER_IDS Development. El
[lote de finalizacion](vercel-configuration-finalization-20261013.md) registra
su borrado y el cambio admin autorizados; metadata final: 16 variables del
proyecto, todas Production. Los valores restantes se conservaron ocultos.

El titular debe resolver Billing del equipo. Se confirma Hobby; resolver el
uso comercial antes de operar cobros: [condiciones Hobby](https://vercel.com/docs/plans/hobby).
Este documento no compra ni recomienda activar una suscripcion a ciegas.

Una vez disponible acceso propio, hacer el inventario por **nombre, ID, target,
branch override y custom environment**. No pegar resultados completos de la
API: pueden contener values aun con decrypt=false. El script
[vercel-preview-scope.mjs](../../tools/ops/vercel-preview-scope.mjs) filtra
solo metadata y genera un plan local sin modificar Vercel:

```powershell
node tools/ops/vercel-preview-scope.mjs --plan "$env:TEMP/intra-preview-scopes.json"
```

Requiere `VERCEL_TOKEN` cargado de forma privada en el proceso. No pasar el
token como argumento ni guardar un token dentro del JSON. El plan identifica
registros que comparten Production y Preview; debe revisarse antes de cambiar
`reviewed` a true. Permite aprobar un subconjunto de patches sin modificar
sus campos. Despues de la revision, `--apply` cambia exclusivamente `target`
por ID y vuelve a comprobar scopes. Conserva Production/Development y el valor:

```powershell
node tools/ops/vercel-preview-scope.mjs --plan "$env:TEMP/intra-preview-scopes.json" --apply
```

**No se ejecuto `--apply`; los diez cambios anteriores se hicieron por UI.**
El script no borra registros, no crea base ni
reemplaza secretos. Rechaza metadata diferente desde la revision y deja
registros Preview-only, Development y custom environments para inspeccion
manual. No usar `env rm` sobre registros compartidos sin comprobar todas
sus asignaciones. El [PATCH oficial](https://vercel.com/docs/rest-api/projects/edit-an-environment-variable)
permite cambiar target sin enviar value; el [GET de metadata](https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name)
debe tratarse como respuesta sensible.

Para cerrar A09, completar tambien:

1. Preview/Development: URL y claves de base aislada; Wompi `pub_test`, claves
   privadas/eventos/integridad test y sandbox=true. Si no hay base aislada,
   mantener desactivados los flujos con datos de previews.
2. Production: URL y claves correspondientes al mismo proyecto; claves live
   y sandbox=false solo cuando el titular valide la configuracion comercial;
   cron secret efectivo y `ADMIN_USER_IDS` correcto.
3. Revisar overrides antiguos de ramas y todos los custom environments.
4. Crear el deployment aprobado y revisar los antiguos: cada deployment
   incorpora sus variables al crearse; los existentes conservan sus copias.
   Cambiar scopes o borrar registros no revoca claves en su fuente.
5. Verificar que un preview no pueda leer/escribir datos Production, incluidos
   server actions, SSR, browser, proxy y service-role. El guard local no
   protege codigo antiguo ni revoca credenciales existentes.

## GitHub: proteccion de main

[github-main-protection.json](github-main-protection.json) prepara PR obligatorio,
0 aprobaciones para el titular unico, strict checks `validate`, `database` y
`detect-impact`, enforcement para admins, resolucion de conversaciones y
bloqueo de force-push/borrado. No establece bypass ni restricciones de actores.
`database` es el job nuevo y paso en CI del PR #183. El ultimo CI completo
comprobado es `016a489` (CI 38472628754 e impacto 38472628723); callback/MFA
locales posteriores requieren CI del nuevo SHA. La politica se verifico por GET:
main protected=true, strict=true, enforce_admins=true, tres contextos exactos,
force-push/borrado=false y resolucion de conversaciones=true; main no cambio SHA.

El cuerpo revisado se aplico al endpoint
`PUT /repos/Apus92Inmortal/INTRA/branches/main/protection` y verificar por GET.
La mutacion fue realizada por el agente principal como correccion de A10.
El repo es publico y la proteccion esta disponible segun
[GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
Publicar/promover solamente el SHA revisado con los tres checks PASS; no
interpretar Vercel READY como sustituto de CI o del checklist.

## Auth, administrador y correo

La organizacion Supabase consultada devuelve plan **Free**. La proteccion de
contrasenas filtradas requiere Pro o superior segun
[Supabase password security](https://supabase.com/docs/guides/auth/password-security).
El warning actual no puede cerrarse afirmando que basta un toggle en Free;
definir la decision de plan o un control equivalente revisado sin comprar
automaticamente. Configuracion completa de password policy, rate limits y
SMTP no esta disponible en el conector: no fue validada.

El endpoint publico Auth settings confirma `mailer_autoconfirm=true`:
registro por correo no demuestra control del buzon. La rama acepta admin
exclusivamente por `ADMIN_USER_IDS`, sesion vigente y MFA aal2 verificada;
`ADMIN_EMAILS` deja de conceder privilegios. El titular designo un unico admin
y su UUID se guardo privadamente en el Secret Production de Vercel. Confirmar
su acceso actual y, tras el deployment aprobado, su acceso con MFA. No
autorizar por coincidencia de correo ni por user_metadata del usuario.

Conteo protegido de Auth: 3 cuentas, 3 con email_confirmed_at y ninguna con
role/is_admin en app_metadata. El archivo local no contiene allowlist admin;
eso no identifica al administrador. El comprobador
[a11_admin_uuid_readonly.sql](../../supabase/tests/a11_admin_uuid_readonly.sql)
devuelve solo conteos/booleanos de UUIDs suministrados privadamente. Cuenta
existente/confirmada no equivale a titular autentico; autoconfirm invalida esa
inferencia. No conservar IDs/correos ni credenciales en evidencia publica.

La inspeccion remota encontro cero factores MFA; no se genero ninguno durante
esta sesion. En `88819c8`, `/app/profile/security` permite enrollment TOTP por
CTA explicito y challenge; `requireAdminUser` exige sesion vigente, claims
verificados por el SDK, sub coincidente y aal2 para panel/acciones admin.
El componente protege cambios de cuenta y respuestas tardias. El bloque
MFA/admin tiene 25 pruebas unitarias; la revision visual sintetica no usa
QR/codigos y no acredita Auth/TOTP real. Este enforcement sigue en la rama,
sin efecto en Production hasta publicar. Despues, enrolar al titular y probar
challenge, cierre/revocacion de sesion y recuperacion de dispositivo antes de
operar: [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).

El callback `4341dfc` aplica el mismo guard de entorno antes de construir
Supabase y conserva cookies/cabeceras tanto en PKCE/OTP correctos como en
errores. Revision posterior de safe-next bloquea controles/destinos externos
y valida origen/fallback; callback suma 20 casos, helper tiene regresiones
adicionales. Estas pruebas no sustituyen entrega/consumo de enlaces reales.

Configurar SMTP propio, remitente y URLs de confirmacion/recovery permitidas.
El SMTP predeterminado tiene limites y no sirve como validacion de correo
operativo: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
Activar confirmacion de correo y probar registro, confirmacion, recovery,
logout/revocacion y acceso del titular en ambiente aislado. Registrar entrega
recibida y latencia sin guardar enlaces de acceso ni tokens.

El titular eligio **Google** con el buzon publico `soporte@intra.com.co`.
Informa Workspace suspendido por impago, pero acceso al inbox. No autorizo
reactivacion/pago; ese acceso no verifica envio SMTP ni recepcion nueva.
Resend no es el camino elegido: no se creo cuenta, clave ni dominio alli.

En el formulario Supabase SMTP se dejo un **borrador no guardado**: host
`smtp.gmail.com`, puerto `465`, nombre del remitente `INTRA`, remitente y
usuario `soporte@intra.com.co`, password vacio. No es configuracion efectiva
ni prueba de entrega; no se envio correo ni se modifico DNS.

El titular informa App Password no disponible y **2-Step desactivada**.
Google exige verificacion en dos pasos para contrasenas de aplicacion;
despues debe comprobarse si esta cuenta permite esa opcion:
[Google App Passwords](https://support.google.com/accounts/answer/185833?hl=es).
No dispone de SIM durante varios dias; el paso humano queda pendiente hasta
que pueda completarlo con un metodo disponible. No se verifico ningun metodo
alternativo para esta cuenta ni se atribuye un bloqueo especifico a la
suspension de Workspace. No se activaron 2FA ni factores en Google/Supabase.
La credencial, si llega a estar disponible, se introduce directamente en el
servicio; no va en chat, Git, capturas ni logs. SMTP y confirmacion/recovery
seguirán pendientes de guardar configuracion y probar entrega autorizada.

DNS observado por Google DoH: TXT raiz solo verificacion Google; SPF ausente;
`_dmarc.intra.com.co` NXDOMAIN; MX `1 SMTP.GOOGLE.COM.`. Los selectores
`google`, `selector1` y `selector2` NXDOMAIN no prueban ausencia total de DKIM:
pedir el selector exacto al proveedor/admin del correo. Inventariar todos los
emisores antes de redactar SPF; publicar DKIM real y DMARC con reportes a un
buzon controlado, vigilar reportes antes de endurecer rechazo. Comprobar
`soporte@intra.com.co` y Auth por recepcion real autorizada; no se envio correo.

## Recuperacion, alertas y piloto

Preflight adicional del 2026-10-13: el unico proyecto Supabase INTRA visible
es Production y ya esta configurado. El segundo seria solo un destino temporal
para ensayo de restauracion, no una correccion de Production. La credencial
operativa puede inventariar pero
no crear el segundo proyecto (HTTP 403); no se creo entorno aislado. La API de
backups devuelve `backups=[]` y `pitr_enabled=false` (HTTP 200). No hay
evidencia de backup recuperable ni restore probado. Segun la
[documentacion de Supabase](https://supabase.com/docs/guides/platform/backups),
Free requiere exportacion manual; un respaldo de DB no incluye los bytes de
Storage. No se descargaron datos ni objetos durante este preflight.

Los tests locales usan DDL real y datos sinteticos, sin filas de Production.
No prueban recuperacion de datos/objetos. Antes de abrir el piloto:

1. Definir titular de incidentes y RPO/RTO aceptados; exportar respaldo seguro
   de DB y objetos privados con metadatos y checksum. Validar opciones reales
   del plan; no asumir que backup de DB incluye los bytes de Storage.
2. Restaurar en base/buckets aislados. Verificar conteos, relaciones, RLS,
   ledger, acceso de evidencias y expiracion/privacidad de URLs; medir tiempos.
3. Ensayar rollback a deployment compatible. Registrar corte temporal;
   reconciliar eventos Wompi posteriores antes de reabrir, sin borrar eventos
   ni reponer grants vulnerables para conseguir un rollback.
4. Configurar alertas de 5xx, errores webhook, pendientes Wompi, cron y saldos;
   enviar una senal sintetica en entorno de ensayo y probar recepcion por el
   responsable. Consultar [a11_launch_monitoring_readonly.sql](../../supabase/tests/a11_launch_monitoring_readonly.sql)
   como base de agregados sin PII. La consulta del 13-oct encontro 6 pagos
   pending/processing de mas de 30 minutos (el mas antiguo del 27-jun), 0
   eventos webhook pendientes/fallidos, 0 refunds envejecidos y 0 wallets
   negativos. Conciliar esos pagos existentes con el proveedor; no asumir
   que pending representa un cobro completado ni crear un cobro nuevo. Los
   umbrales son propuesta, no una alerta creada ni una certificacion de conciliacion.
5. Cron Vercel versionado: `17 7 * * *` UTC (02:17 Colombia); observar ejecucion
   y resultado despues de cada ventana diaria. Supabase tambien tiene un cron
   SQL de auto-release observado cada cinco minutos en la auditoria; revalidar
   ambos por separado y no confundir sus historiales. Para reintentos Wompi existentes usar el
   [procedimiento del rollout](launch-corrections-rollout-20261013.md#eventos-wompi-pendientes).
   GET al endpoint de release con autenticacion puede mover saldo; no usarlo
   como health check. No pedir/crear otro cobro para resolver una referencia.
6. Ejecutar smoke cliente/viajero/tercero/admin y ciclo completo de envio,
   evidencia, chat, entrega, disputa/devolucion/retiro en ambiente aislado con
   Wompi sandbox. El [smoke de acceso](authenticated-smoke.md) cubre navegacion,
   no ese ciclo financiero.
7. Fijar participantes conocidos, rutas, cupo simultaneo, importes maximos,
   horario y responsable de soporte, y criterio de suspension. Llevar bitacora
   diaria de pendientes y conciliacion. La prueba antigua A05/TASK-047 sigue
   pendiente; no fue sustituida por una prueba nueva ni se hizo un pago real.
8. Obtener revision/aprobacion legal y contable competente de textos, datos,
   responsabilidades y operacion financiera, con evidencia privada del titular.
   Esta auditoria tecnica no emite un dictamen juridico ni acredita ese cierre.

## Limites y postflight

El cierre requiere evidencia nueva del entorno publicado. Hobby, diez scopes,
la allowlist unica guardada y cinco borrados se comprobaron por UI; metadata
final: 16 variables solo Production. No se certificaron efecto de esos valores
en deployments existentes, aislamiento completo, aptitud comercial, SMTP,
entrega de correo, DKIM real, acceso del titular con MFA, restore, alertas,
dinero ni aprobacion legal. No se rotaron/revocaron copias antiguas. Storage
y permisos SQL tienen migraciones/test locales revisables; callback, MFA,
cabeceras, SEO y guards permanecen en la rama, sin publicar en Production.
Volver a comprobar Advisor, grants/policies, buckets, headers y smoke luego
de aplicar el paquete aprobado. La reparacion completa del historial Supabase
con drift queda separada: no hacer replay indiscriminado de migraciones antiguas.
