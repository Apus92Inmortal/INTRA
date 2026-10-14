# Publicacion de correcciones para piloto — 2026-10-13

Actualizacion local 2026-10-14: A03 rechaza refunds Wallet parciales hasta
definir su contabilidad; la vista Admin muestra el neto completo esperado.
MFA permite descartar explicitamente factores TOTP pendientes no verificados
antes de reactivar. Estas correcciones aun no estan en el PR remoto ni en
Production; requieren nuevo SHA, CI y prueba Auth real del titular.

Alcance elegido por Aldo: piloto controlado con usuarios conocidos.
Este documento prepara la publicacion; no autoriza cobros ni certifica el piloto.

Estado local final: `4341dfc` agrega guard/cookies al callback y `88819c8`
MFA admin con claims verificados, sub coincidente y aal2. Safe-next ademas
bloquea controles/destinos externos y valida origen/fallback. Unit 165/26 archivos,
lint, TypeScript, build y E2E publico/seguridad 8/8 PASS. El CI completo
del producto `d7ded3d` PASS y su Preview READY tras el lote Vercel completo.
Comprobar HEAD/checks del cierre documental en PR #183 antes de publicar.
Las cinco migraciones y estas correcciones siguen sin publicar en Production.

## Precondiciones

1. Revisar PR y exigir CI `validate`, `database` y `detect-impact` PASS para su SHA.
2. El unico UUID autorizado ya se guardo en `ADMIN_USER_IDS` Secret Production,
   sin versionar su identidad. Comprobar efecto tras el redeploy aprobado y
   acceso del titular: la nueva version exige sesion vigente y MFA aal2
   verificada, ademas del ID; `ADMIN_EMAILS` se ignora. Preparar acceso seguro
   del titular a consola Supabase para recuperacion si pierde el dispositivo:
   verificar identidad y aprobar cualquier reset de factor antes de ejecutarlo.
   No habilitar bypass aal1/email para operaciones admin como recuperacion.
3. Aislar Preview/Development de Production: URL, anon y service-role de otro
   proyecto; Wompi Sandbox y secretos test. Ya se restringieron diez variables
   y borraron cinco Config legacy nonprod; quedan 16 variables solo Production.
   Los cambios afectan deployments futuros. Inventariar/retirar o rotar copias
   de deployments antiguos mediante lote compatible revisado: no fueron
   revocadas y el guard no protege codigo antiguo. A09 permanece abierto.
4. Verificar plan Vercel apto para actividad comercial, configuracion efectiva
   Wompi Production/webhook y secretos de cron. No comprar ni rotar a ciegas.
5. Respaldo DB y Storage con restauracion aislada verificada y responsables.
   Las pruebas con DDL/fixtures sinteticos no certifican recuperacion de usuarios.
6. Aprobacion explicita de Aldo para las cinco migraciones nuevas, merge y deploy.

SMTP elegido: Google con el buzon publico `soporte@intra.com.co`. El formulario
Supabase contiene solo un borrador no guardado (`smtp.gmail.com:465`, remitente
INTRA, usuario/remitente de ese buzon y password vacio). Workspace suspendido
por impago y acceso al inbox son reportes del titular; no hubo reactivacion.
2-Step esta desactivada y App Password no disponible; sin SIM durante varios
dias, el paso humano 2FA queda pendiente. No se verifico otro metodo disponible
ni una causa especifica por suspension. No guardar sin credencial valida ni
dar por cerrados SMTP/confirmacion/recovery sin prueba de entrega autorizada.

## Secuencia

Aplicar solo estas correcciones, respetando orden; el historial antiguo tiene
drift y no permite ejecutar `supabase db push` indiscriminadamente:

1. `20261013201539_a03_atomic_customer_wallet_refunds.sql`
2. `20261013201622_a06_contextual_privacy_and_rpc_permissions.sql`
3. `20261013201714_a04_atomic_wompi_webhook.sql`
4. `20261013201744_a01_internal_financial_actor_guards.sql`
5. `20261013201827_a13_private_storage_upload_limits.sql`

Antes de aplicar, consultar duplicados/estados parciales de creditos A03 y
referencias ambiguas A04. No borrar entradas para superar el preflight. Las
migraciones agregan RPC compatibles con la version publicada; durante la
ventana mantener operaciones financieras suspendidas hasta publicar y comprobar
los nuevos consumidores. Preferir ventana sin usuarios activos.

Tras aplicar: grants A01/A02/A03/A04, 16 checks A06, privacidad por roles,
RPC legitimas, triggers y cron. Registrar cada version realmente aplicada.
Despues, mergear el SHA aprobado, esperar CI postmerge y Vercel READY del mismo
SHA, comprobar cabeceras, publico, login, admin, uploads y checkout sandbox
en entorno aislado. No usar E2E publico como prueba de devolucion/ledger.
Probar enrollment/challenge real del titular, aal1 denegado en Admin/acciones,
aal2 permitido solo al UUID autorizado y logout/revocacion. Las pruebas
unitarias y vistas sinteticas sin QR/codigos no acreditan Auth/TOTP operativo.

## Eventos Wompi pendientes

El webhook responde 503 ante fallo recuperable y conserva el evento firmado
antes de consultar al proveedor. Wompi realiza un numero limitado de reintentos;
revisar pendientes diariamente y despues de incidentes. Referencia:
[eventos Wompi](https://docs.wompi.co/docs/colombia/eventos/).

Un admin autenticado por ID y sesion aal2 verificada puede reintentar **un evento existente**, desde
la consola del navegador en el mismo origen de INTRA:

```js
await fetch('/api/internal/wompi-reconcile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventId: 'UUID_DEL_EVENTO' }),
}).then(response => response.json())
```

No pegar credenciales ni payloads de usuarios. La accion deja audit antes de
procesar, consulta el estado actual de una transaccion existente y reutiliza
la ingesta atomica. No crea otro cobro. `terminal_state_conflict`, importe,
moneda, referencia o credito inconsistente requieren revisar el expediente;
no cambiar JSON/estado por SQL para forzar exito.

Si una aprobacion llega despues de cancelar el envio, el evento permanece
pendiente con `shipment_cancelled_before_approval`. Reintentar la ingesta no
resuelve ese conflicto. El operador debe verificar el cobro en Wompi, acordar
y registrar la devolucion externa segun el SOP, y cerrar la conciliacion con
evidencia. No forzar `held`, insertar ledger ni acreditar Wallet ademas de una
devolucion externa: eso duplicaria la restitucion. Este procedimiento externo
y su registro deben estar definidos/probados antes de abrir dinero real.

El SOP de [refunds externos](manual-refunds-payouts-mvp.md) ya no indica
ejecutar `customer_refund` despues de devolver por el proveedor: esa accion
acredita Wallet. Falta una ruta interna validada para registrar el cierre
externo sin duplicar el credito; no interpretar un comprobante externo como
`refund_status=refunded` hasta implementarla y probarla.

## Rollback y parada

- Si falla preflight o migracion: conservar transaccion revertida, detener
  ventana y registrar error. No continuar con una migracion parcialmente asumida.
- Si falla app: detener operaciones y revertir deployment a una version
  compatible verificada. El webhook antiguo reconoce fallos incorrectamente;
  volver a el no es una recuperacion financiera completa.
- No restaurar grants abiertos ni quitar la unicidad para volver atras.
  Reparaciones DB van por migracion nueva revisada.
- Si hubo eventos/pagos durante incidente, conciliar cada referencia antes
  de reabrir. Restaurar una DB sin eventos externos posteriores puede duplicar
  saldos; incluir el corte temporal y la conciliacion en la restauracion.

## Apertura del piloto

Completar primero smoke Auth cliente/viajero/tercero/admin, confirmacion y
recuperacion de correo con SMTP efectivo, MFA real del titular,
carga/descarga privada de evidencia, y ciclo Wompi
sandbox entrega/disputa/devolucion/payout en ambiente aislado. El pago antiguo
no fue localizado; sigue pendiente A05/TASK-047 sin ejecutar un cobro nuevo.

Propuesta operativa pendiente de fijar por el titular: lista de participantes,
rutas, maximo de envios simultaneos e importes, horario y responsable de soporte,
criterio de suspension, evidencia de alertas recibidas y bitacora diaria.
La seleccion de piloto no certifica capacidad ni aprobacion legal/contable.
