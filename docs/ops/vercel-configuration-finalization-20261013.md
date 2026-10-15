# Lote ejecutado de configuracion Vercel — 2026-10-13

Proyecto `intra`, equipo `aldo-antonio-altamar-cervantes-projects`.
El titular confirmo expresamente este lote y se ejecuto por UI el 13-oct.
No incluye merge, migraciones, deployment Production, compras, rotacion de
claves ni cobros. Preview del producto `d7ded3d` READY despues de todo el lote;
HEAD del cierre documental debe comprobarse con sus checks antes de publicar.

## Estado ya comprobado

Diez registros se limitaron a Production por UI sin cambiar sus valores:
service-role general (Secret), secretos generales de cron/admin/Wompi legacy
y URL/anon Supabase. Ver [detalle](launch-external-gates-20261013.md).
Las asignaciones originales Production se conservaron. Los deployments
existentes conservan sus copias; restringir scopes no revoca esas claves.

## Cambio admin guardado

Se fijo `ADMIN_USER_IDS` **Secret de Production** a un unico UUID: el de la
cuenta existente que el titular indico durante esta sesion. El dato se conservo
privadamente y se escribio exclusivamente en Vercel para autorizar esa cuenta.
La consulta protegida encontro una coincidencia, confirmada y no bloqueada.
El correo y UUID no van en Git, capturas, logs ni descripciones del PR.

El valor Secret guardado no se puede leer: este cambio reemplazo su allowlist,
sin afirmar que conserva otros administradores desconocidos. El titular
confirmo la designacion de esa cuenta como unico admin antes de guardar. Autoconfirm
de Supabase no prueba propiedad del correo; el titular debe probar acceso
autenticado antes del deploy. La nueva app ignora `ADMIN_EMAILS` para privilegios.

## Cinco registros borrados y verificados

Cada fila identifica un registro completo eliminado, no una eliminacion por
nombre global. Las variables generales de Production se conservaron.

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

## Ejecucion y comprobacion realizadas

1. Metadata y modal de confirmacion revisados para cada registro: nombre,
   tipo, entorno y rama; ninguno compartia Production.
2. UUID seleccionado guardado en el Secret admin de Production; valor
   privado comprobado en el campo antes de enviar, scope y exito comprobados
   sin revelar valor. El archivo temporal de transferencia se elimino.
3. Cinco filas borradas y ausencia verificada por UI. Inventario final del
   proyecto: 16 variables, todas con scope Production. Valores ajenos al
   Secret admin conservados. Capturas privadas con valores ocultos fuera de Git.

## Verificacion operativa que sigue pendiente

1. Probar acceso admin del titular despues de publicar el codigo aprobado.
   Cambiar una variable no actualiza los deployments existentes; no se
   considera aplicado a Production ni comprobado el acceso por este guardado.
2. Crear/verificar solamente un nuevo Preview del SHA revisado. Sin base
   Supabase aislada, los flujos con datos deben permanecer inactivos; no
   reponer claves Production para conseguir que funcione el Preview.
   El Preview de producto `d7ded3d` (`dpl_22DMCDkWTJZcVdRWY4sTWmw9u6Ri`) ya
   paso HTTP publico/login/robots y rechazo de callback sintetico, posterior al
   lote completo. No certifica Auth real ni retiro de copias anteriores.
3. Inventariar deployments antiguos y acordar retiro/rotacion compatible con
   Production como lote separado. Los secretos de copias antiguas no se
   consideran revocados por este cambio.

## Gates que siguen despues del lote

A09 no queda cerrado sin aislamiento real y tratamiento de copias antiguas.
Tambien persisten plan Hobby/uso comercial, SMTP/MFA/DNS, respaldo y restore
DB+Storage, alertas, ciclo Auth/Wompi sandbox, A05/pagos antiguos, limites y
soporte del piloto, revision legal/contable y aprobacion de publicacion.
Ver [gates externos](launch-external-gates-20261013.md) y
[rollout de las cinco migraciones](launch-corrections-rollout-20261013.md).
