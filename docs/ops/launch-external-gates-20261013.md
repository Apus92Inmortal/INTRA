# Gates externos para el piloto INTRA — 2026-10-13

Inspeccion de GitHub, Vercel, Supabase Auth/Storage y DNS, incluido fallback
de navegador autenticado en Vercel para plan y scopes sin revelar valores.
No se cambiaron variables remotas, planes, DNS, usuarios, correos ni dinero.
Las correcciones de codigo/SQL de esta rama no estan certificadas en Production.
El procedimiento de publicacion esta en [rollout](launch-corrections-rollout-20261013.md).

## Estado comprobado

| Auditoria | Evidencia actual | Condicion para cerrar |
|---|---|---|
| A08 plan Vercel | Navegador autenticado el 13-oct confirma equipo Hobby. API de plan no disponible. | Resolver autorizacion comercial y alertas de coste con el titular; no comprar automaticamente. |
| A09 aislamiento | Solo hay un proyecto Supabase disponible: Production. API env da 403 y CLI sin sesion. Navegador confirma service-role/cron/admin/keys legacy compartidas Production/Preview y override service-role en joy/wompi-migration. | Retirar acceso Production de Preview/Development y usar base aislada y Wompi test; revisar deployments antiguos. |
| A10 GitHub | Repo publico; `main` protected=false; protection HTTP 404; rulesets vacios. Check-runs del HEAD: `validate` y `detect-impact` success. Secrets Actions: 0. | Aplicar proteccion revisada, ejecutar nuevos checks del PR y comprobar enforcement. |
| A11 recuperacion/operacion | No se ejecuto restauracion de datos/objetos, prueba de alertas ni smoke completo con usuarios aislados. | Ensayo de recuperacion, alertas recibidas, aforo/responsables del piloto y aprobacion legal/contable documentados. |
| A13 Auth | Email Auth y signup activos; email autoconfirm=true; anonymous signin=false. Advisor marca leaked-password protection desactivada. 0 factores MFA, 0 verificados. | Confirmacion/recuperacion SMTP probadas; privilegios admin por UUID del titular; plan de MFA con enforcement y proteccion de contrasenas. |
| A13 Storage | Ambos buckets privados sin limites especificos en Production. Objetos existentes agregados: JPEG/PNG/WebP; mayor 2.046.594 bytes. | Aplicar migracion de 5 MiB y 3 MIME; verificar HTTP privado, bytes de imagen, retencion/borrado/restauracion. |
| A13 correo | MX Google; TXT raiz sin SPF; DMARC NXDOMAIN. Selectores DKIM comunes consultados: NXDOMAIN. | Verificar proveedor/selector real, publicar registros correctos y comprobar soporte y Auth. |

Referencias de entorno inspeccionado: Supabase `okajyhkdyapbsornjeeb`;
Vercel equipo `team_Ol4y0BzimnFUPgzQUcEIJ5AX`, proyecto
`prj_vZUXhxgCzrRu7iRt4u4rN1UkzVXn` (`intra`). El deployment Production
observado `dpl_9KxdmML473eBFYGYfsowJXbDHLY8` estaba READY. GitHub `main`
observado: `55740360aa5c1ed6886397bea9804a811fb4dafd`.
No se imprimieron valores de secretos ni identidades/correos de usuarios.

El titular indico su cuenta admin durante la sesion. La consulta protegida por
correo encontro exactamente una cuenta existente, confirmada y no bloqueada.
Su UUID se conserva fuera del repo para preparar `ADMIN_USER_IDS`; la variable
existe como Secret en Production/Preview y su valor no puede revelarse. Falta
comprobar/escribir la allowlist efectiva en Vercel y probar acceso autenticado.
Autoconfirm sigue sin demostrar propiedad de correo por si sola.

## Vercel: plan e inventario de variables

El conector permite ver proyecto, dominios y proteccion de deployments:
SSO `all_except_custom_domains`. Eso no certifica aislamiento de datos.
La consulta de variables con decrypt=false recibio 403. El fallback CLI
64.0.1 no encontro credencial propia; se cancelo su flujo de login, sin
autenticar ni repetir la misma consulta rechazada. No se descargaron envs.
El fallback posterior a Chrome tiene sesion propia: confirma Hobby y metadata
de variables/overrides, con valores ocultos; no se exportaron secretos.

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

**No se ejecuto `--apply`.** El script no borra registros, no crea base ni
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
4. Redeploy y revisar deployments antiguos: las variables se incorporan a
   deployments existentes y un cambio de scopes no elimina sus copias.
5. Verificar que un preview no pueda leer/escribir datos Production, incluidos
   server actions, SSR, browser, proxy y service-role. El guard local no
   protege codigo antiguo ni revoca credenciales existentes.

## GitHub: proteccion de main

[github-main-protection.json](github-main-protection.json) prepara PR obligatorio,
0 aprobaciones para el titular unico, strict checks `validate`, `database` y
`detect-impact`, enforcement para admins, resolucion de conversaciones y
bloqueo de force-push/borrado. No establece bypass ni restricciones de actores.
`database` es el job nuevo de esta correccion; comprobar su check-run PASS
antes de aplicar la politica. Los dos nombres antiguos se verificaron por API.

El titular/orquestador puede aplicar el cuerpo revisado al endpoint
`PUT /repos/Apus92Inmortal/INTRA/branches/main/protection` y verificar por GET.
Este agente no hizo la mutacion. Una politica local no significa proteccion
activa. El repo es publico y la proteccion esta disponible segun
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
registro por correo no demuestra control del buzon. La rama cambia admin
para aceptar exclusivamente `ADMIN_USER_IDS`; `ADMIN_EMAILS` deja de conceder
privilegios. **Antes del deploy**, el titular debe validar los UUID de las
cuentas que realmente administra y su acceso actual. No seleccionar cuentas
por coincidencia de correo ni aceptar user_metadata controlada por el usuario.

Conteo protegido de Auth: 3 cuentas, 3 con email_confirmed_at y ninguna con
role/is_admin en app_metadata. El archivo local no contiene allowlist admin;
eso no identifica al administrador. El comprobador
[a11_admin_uuid_readonly.sql](../../supabase/tests/a11_admin_uuid_readonly.sql)
devuelve solo conteos/booleanos de UUIDs suministrados privadamente. Cuenta
existente/confirmada no equivale a titular autentico; autoconfirm invalida esa
inferencia. No conservar IDs/correos ni credenciales en evidencia publica.

MFA tiene cero factores registrados y no se encontro enrollment/challenge/aal2
en la app inspeccionada. Activar proveedor no impone MFA al panel. Para cerrar,
enrolar al titular, probar challenge/recovery y exigir aal2 en acciones
privilegiadas segun [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).
Hasta implementar/probar ese enforcement, registrar MFA como pendiente.

Configurar SMTP propio, remitente y URLs de confirmacion/recovery permitidas.
El SMTP predeterminado tiene limites y no sirve como validacion de correo
operativo: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
Activar confirmacion de correo y probar registro, confirmacion, recovery,
logout/revocacion y acceso del titular en ambiente aislado. Registrar entrega
recibida y latencia sin guardar enlaces de acceso ni tokens.

DNS observado por Google DoH: TXT raiz solo verificacion Google; SPF ausente;
`_dmarc.intra.com.co` NXDOMAIN; MX `1 SMTP.GOOGLE.COM.`. Los selectores
`google`, `selector1` y `selector2` NXDOMAIN no prueban ausencia total de DKIM:
pedir el selector exacto al proveedor/admin del correo. Inventariar todos los
emisores antes de redactar SPF; publicar DKIM real y DMARC con reportes a un
buzon controlado, vigilar reportes antes de endurecer rechazo. Comprobar
`soporte@intra.com.co` y Auth por recepcion real autorizada; no se envio correo.

## Recuperacion, alertas y piloto

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

El cierre requiere evidencia nueva del entorno publicado. No se certificaron
env values efectivos, plan Vercel actual, SMTP, entrega de correo, DKIM real,
allowlist del titular, MFA enforced, restore, alertas, dinero ni aprobacion
legal. Storage y permisos SQL tienen migraciones/test locales revisables;
cabeceras, SEO y guard de previews tienen cambios de codigo en la rama.
Volver a comprobar Advisor, grants/policies, buckets, headers y smoke luego
de aplicar el paquete aprobado. La reparacion completa del historial Supabase
con drift queda separada: no hacer replay indiscriminado de migraciones antiguas.
