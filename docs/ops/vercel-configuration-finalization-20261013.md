# Lote pendiente de configuracion Vercel — 2026-10-13

Proyecto `intra`, equipo `aldo-antonio-altamar-cervantes-projects`.
Este lote esta preparado para revision; **no se ejecuto**. No incluye merge,
migraciones, deployment Production, compras, rotacion de claves ni cobros.

## Estado ya comprobado

Diez registros se limitaron a Production por UI sin cambiar sus valores:
service-role general (Secret), secretos generales de cron/admin/Wompi legacy
y URL/anon Supabase. Ver [detalle](launch-external-gates-20261013.md).
Las asignaciones originales Production se conservaron. Los deployments
existentes conservan sus copias; restringir scopes no revoca esas claves.

## Cambio admin propuesto

Fijar `ADMIN_USER_IDS` **Secret de Production** a un unico UUID: el de la
cuenta existente que el titular indico durante esta sesion. El dato se conserva
privadamente y se escribira exclusivamente en Vercel para autorizar esa cuenta.
La consulta protegida encontro una coincidencia, confirmada y no bloqueada.
El correo y UUID no van en Git, capturas, logs ni descripciones del PR.

El valor Secret actual no se puede leer: este cambio reemplaza su allowlist,
no puede afirmar que conserva otros administradores desconocidos. Confirmar
la designacion de esa cuenta como unico admin antes de guardar. Autoconfirm
de Supabase no prueba propiedad del correo; el titular debe probar acceso
autenticado antes del deploy. La nueva app ignora `ADMIN_EMAILS` para privilegios.

## Cinco registros a borrar

Cada fila identifica un registro completo, no una eliminacion por nombre
global. Las variables generales de Production se conservan.

| Nombre | Tipo | Entorno | Override de rama |
|---|---|---|---|
| SUPABASE_SERVICE_ROLE_KEY | Config | Preview | joy/wompi-migration |
| NEXT_PUBLIC_WOMPI_PUBLIC_KEY | Config | Preview | joy/wompi-migration |
| NEXT_PUBLIC_WOMPI_SANDBOX | Config | Preview | joy/wompi-migration |
| SUPABASE_SERVICE_ROLE_KEY | Config | Development | Ninguno |
| ADMIN_USER_IDS | Config | Development | Ninguno |

El borrado no tiene recuperacion normal en Vercel. La configuracion antigua
de esa rama y el acceso local que dependiera de esos registros dejaran de
estar disponibles. No revelar ni copiar sus valores para preparar el lote.
La politica de uso del navegador requiere confirmacion al momento de borrar
y al autorizar acceso admin; la autorizacion general de correcciones no
sustituye esa confirmacion especifica.

## Ejecucion y comprobacion tras confirmar

1. Revisar metadata actual por registro: nombre, tipo, entorno y rama.
   Cancelar si no coincide exactamente con la tabla o comparte Production.
2. Guardar el UUID seleccionado en el Secret admin de Production. Verificar
   scope y resultado sin revelar valor; probar acceso con el titular despues
   de publicar el codigo aprobado. No cambiar contrasenas ni iniciar sesion
   como otro usuario.
3. Borrar exclusivamente las cinco filas indicadas. Verificar su ausencia
   y la permanencia de los registros generales Production, con valores ocultos.
4. Crear/verificar solamente un nuevo Preview del SHA revisado. Sin base
   Supabase aislada, los flujos con datos deben permanecer inactivos; no
   reponer claves Production para conseguir que funcione el Preview.
5. Inventariar deployments antiguos y acordar retiro/rotacion compatible con
   Production como lote separado. Los secretos de copias antiguas no se
   consideran revocados por este cambio.

## Gates que siguen despues del lote

A09 no queda cerrado sin aislamiento real y tratamiento de copias antiguas.
Tambien persisten plan Hobby/uso comercial, SMTP/MFA/DNS, respaldo y restore
DB+Storage, alertas, ciclo Auth/Wompi sandbox, A05/pagos antiguos, limites y
soporte del piloto, revision legal/contable y aprobacion de publicacion.
Ver [gates externos](launch-external-gates-20261013.md) y
[rollout de las cinco migraciones](launch-corrections-rollout-20261013.md).
