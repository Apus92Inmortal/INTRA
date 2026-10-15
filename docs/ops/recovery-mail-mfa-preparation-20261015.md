# Recuperacion, correo y MFA — evidencia del 15-oct-2026

## Alcance y resultado

Continuacion local autorizada por Aldo. Lectura de Production para copia
privada; sin DDL/DML remoto, cambios Auth/DNS/SMTP, correo enviado, cobros,
factores MFA nuevos, push o deployment. No se repitio la prueba integral.

**Recuperacion parcialmente ensayada; gate A11 no cerrado.** No confundir
este ensayo con recuperar todos los servicios en un proyecto operativo.

## Copia privada cifrada

- Captura entre 15:34:06 y 15:34:22 UTC del 15-oct-2026.
- Snapshot logico de filas de 58 tablas en `public`, `auth`, `storage` e
  historial de migraciones: 384 filas. Esquema publico leido del catalogo
  actual, no reconstruido desde el historial antiguo con drift.
- 23 objetos privados descargados con acceso autorizado: 16.044.408 bytes.
  El inventario/metadatos antes y despues coincidio; se verificaron tamanos.
- AES-256-GCM con nonce independiente por archivo; clave solo en `.env`
  privado, fuera del repositorio. Directorio 0700 y archivos de datos 0600.
  No se versionaron filas, identidades, documentos, claves ni inventarios
  de rutas de objetos. Clave y copia siguen en el mismo servidor.
- Datos/esquema y objetos forman 25 payloads con SHA-256 en un manifiesto
  tambien cifrado. Lectura, autenticacion y hashes verificados. Una copia
  alterada deliberadamente en memoria fue rechazada por autenticacion GCM.
- No es un `pg_dump`, backup gestionado, copia externa ni prueba de RPO/RTO.
  Los datos SQL se capturaron en una consulta de lectura; no se suspendieron
  escrituras y SQL/objetos no comparten una transaccion de plataforma.

## Ensayo local realizado

PostgreSQL 17 desechable, sin red ni puertos publicados, eliminado al terminar.
Datos privados solo por stdin, sin SQL/filas en logs. El esquema publico se
cargo con el helper de snapshot existente; Auth/Storage son interfaces
sinteticas de ese helper, no servicios reales restaurados.

- 22/22 tablas publicas y 147 filas recuperadas; conteos y SHA-256 de filas
  canonicalizadas coincidentes para cada tabla.
- 48 relaciones FK comprobadas sin referencias huerfanas. Se restauraron
  los campos de usuario necesarios para esas relaciones en el stub Auth;
  no se demostro recuperacion de contrasenas, sesiones, OAuth ni MFA.
- Conteos reconstruidos: 22 tablas con RLS, 55 funciones, 62 policies y
  7 triggers. Estos conteos no sustituyen pruebas HTTP/roles ni comparacion
  exhaustiva de opciones de grants, extensiones y servicios gestionados.
- 23/23 archivos descifrados, escritos temporalmente en directorio privado,
  releidos con hash coincidente y retirados. No se subieron a buckets de
  ensayo ni se probaron URLs firmadas/expiracion/permisos de descarga.
- Fase de base local: 11 segundos. No representa RTO de plataforma.

## Comprobaciones de correo y MFA

Lectura actual de configuracion: SMTP sin host/puerto/remitente/credencial;
autoconfirm sigue habilitado. Auth lista 1 usuario y 0 factores MFA. El
conteo de usuarios difiere de la nota del 14-oct (3); no se cambio ni se
dedujo la causa. No usar el conteo antiguo como estado actual.

DNS publico conserva MX Google (`SMTP.GOOGLE.COM`, comprobacion insensible
a mayusculas). No se encontro SPF en la raiz ni DMARC; el selector comun
`google._domainkey` devuelve NXDOMAIN. Esto no descarta otro selector DKIM:
obtener el selector real desde la cuenta del titular antes de concluir.
No se comprobo el estado comercial actual del servicio de correo.

## Pendientes concretos, en orden

1. Completar exportacion/restauracion nativa con acceso privado de base o
   backup de plataforma, en destino aislado aprobado. Verificar Auth y
   Storage reales, extensiones/roles/grants, relaciones y acceso privado.
   No crear proyectos pagos, resetear passwords ni tocar Production para
   conseguir el acceso. No reintentar la creacion antes rechazada sin cambio
   de permisos; este ensayo local no depende de crear otro proyecto.
2. Titular define destino privado externo y custodia separada de la clave;
   copiar/recuperar desde alli y acordar RPO/RTO. No subir datos de usuarios
   a un destino no autorizado ni publicar la clave con los backups.
3. Correo: titular habilita acceso de su cuenta y proporciona credencial
   por via privada, nunca por el grupo. Conservar la eleccion de correo
   existente; no reactivar/pagar/cambiar proveedor automaticamente. Preparar
   DNS exacto a partir de su cuenta, guardar SMTP solo con credencial valida
   y probar confirmacion/reset/recepcion en cuentas controladas autorizadas.
   No desactivar autoconfirm antes de comprobar entrega para evitar bloqueos.
4. MFA: tras disponer de entorno aislado con la version corregida, titular
   escanea QR privado, confirma TOTP, reingresa y prueba challenge. Verificar
   aal1 denegado/aal2 permitido para el unico Admin y recuperacion de factor
   pendiente. QR, semilla y codigos no se envian al grupo ni se guardan.
   Recuperacion de factor verificado requiere verificar identidad y aprobar
   explicitamente el reset; nunca introducir un bypass de permisos.
5. Reservar el ciclo financiero integral para el final. Preparacion actual
   no implica publicar el paquete ni repetir el pago historico exitoso.

## Reproduccion y limites

Scripts de captura/verificacion y resumen de evidencia conservados junto a
la copia privada fuera de Git. No adjuntar esa carpeta a PRs o chats. La
captura usa exclusivamente SQL de lectura, API privada de lectura de objetos
y cifrado local. Verificacion: sintaxis Node, GCM/SHA-256, comparacion de filas,
relaciones, conteos de esquema, limpieza de temporales y contenedor.
No hubo cambios de producto: lint/build/unit no se repitieron para estas notas.
