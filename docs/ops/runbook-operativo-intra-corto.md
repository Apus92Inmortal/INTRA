# Runbook Operativo INTRA - Version Corta

![Logo INTRA](../../public/assets/cropped-Logo2sinfondo-1.png)

| Campo | Detalle |
| --- | --- |
| Version | 1.0 |
| Fecha | 2026-06-22 |
| Estado | Borrador operativo / produccion controlada |
| Responsable | Owner/Admin INTRA |
| Audiencia | Owner, admin, soporte y operacion financiera |
| Alcance | Operacion diaria de usuarios, pagos, wallet, retiros, disputas, soporte e incidentes |

## Control de cambios

| Version | Fecha | Responsable | Cambio |
| --- | --- | --- | --- |
| 1.0 | 2026-06-22 | Owner/Admin INTRA | Creacion inicial del runbook operativo corto. |

## 1. Objetivo

Dar una guia diaria, practica y segura para operar INTRA durante produccion controlada y operacion real con usuarios y dinero. Este documento indica que revisar, que hacer, que no hacer y cuando escalar.

## 2. Alcance

Incluye:

- Revision diaria y semanal de operacion.
- Pagos Wompi y webhooks.
- Wallet, ledger y saldos retenidos/disponibles.
- Retiros manuales de viajeros.
- Disputas, alertas y evidencias.
- Soporte operativo.
- Incidentes criticos y escalamiento.

Fuera de alcance:

- Cambios de codigo.
- Cambios directos en Supabase, RLS, migraciones o variables.
- Deploy manual.
- Automatizacion bancaria o refunds automaticos.

## 3. Responsables

- Owner/Admin INTRA: decide casos operativos, revisa dinero, aprueba retiros y resuelve disputas.
- Soporte: recibe casos, recopila informacion, registra bitacora y escala.
- Tecnico/desarrollador: atiende incidentes de app, Wompi, webhook, Supabase, Vercel, permisos o bugs.
- Responsable financiero/operativo: ejecuta movimientos externos manuales cuando aplique y conserva comprobantes.

## 4. Checklist diario

- [ ] Revisar estado de la app y disponibilidad general.
- [ ] Revisar Vercel: ultimo deploy automatico, errores y estado de funciones.
- [ ] Revisar Supabase: auth, base de datos, realtime y storage.
- [ ] Revisar Wompi: pagos recientes, rechazos y transacciones pendientes.
- [ ] Revisar webhooks: eventos Wompi recibidos/procesados y errores.
- [ ] Revisar pagos recientes en INTRA: `pending`, `processing`, `held`, `released`, `refunded`, `failed` o `cancelled`.
- [ ] Revisar wallet/ledger: saldos retenidos, disponibles y movimientos recientes.
- [ ] Revisar retiros en `/app/admin/payouts`.
- [ ] Revisar cuentas de retiro en `/app/admin/payout-accounts`.
- [ ] Revisar disputas y alertas en `/app/admin/disputes` y `/app/admin/alerts`.
- [ ] Revisar verificaciones en `/app/admin/verifications`.
- [ ] Revisar quejas, usuarios reportados y errores de soporte.
- [ ] Registrar casos relevantes en bitacora operativa.

## 5. Checklist semanal

- [ ] Conciliar saldos de Wompi contra `payments`.
- [ ] Conciliar wallet disponible/retenida contra `wallet_ledger`.
- [ ] Revisar retiros `pending`, `approved`, `paid` y `rejected`.
- [ ] Revisar disputas cerradas y evidencia usada para cada decision.
- [ ] Revisar casos de soporte recurrentes.
- [ ] Revisar logs de Vercel y Supabase de eventos criticos.
- [ ] Revisar accesos admin y cuentas con privilegios.
- [ ] Revisar documentos operativos y actualizar runbook si hubo cambios reales.
- [ ] Confirmar que Production env critico sigue corregido antes de operar con dinero real.
- [ ] Confirmar que Wompi production y webhook production siguen configurados.

## 6. Revision de pagos Wompi

Si un pago esta aprobado en Wompi y reflejado en INTRA:

- Verificar que el pago en INTRA este `held` o en estado final esperado.
- Verificar `gateway_status = approved` cuando aplique.
- Verificar que exista movimiento de retencion en ledger si corresponde.
- No intervenir si todo esta consistente.

Si un pago esta aprobado en Wompi pero no reflejado en INTRA:

- Revisar webhook Wompi.
- Revisar si existe evento en `wompi_webhook_events`.
- Revisar retorno de checkout si el usuario volvio desde Wompi.
- No crear ni editar pagos manualmente en base de datos.
- Escalar a tecnico con transaction id, payment id, usuario, hora y evidencia.

Si un pago fue rechazado:

- Verificar estado en Wompi.
- Verificar que INTRA no muestre saldo retenido ni saldo disponible por ese pago.
- Orientar al usuario a reintentar si el flujo lo permite.

Si el webhook no fue recibido o fallo:

- No marcar pago como aprobado manualmente.
- Escalar a tecnico para revisar endpoint, firma, env vars y logs.

## 7. Revision de wallet/ledger

- `wallet_ledger` es la trazabilidad de movimientos.
- Saldo retenido: dinero asociado a pagos en proceso operativo.
- Saldo disponible: dinero que puede soportar retiro si no tiene reservas abiertas.
- Antes de cualquier retiro o liberacion, validar payment + match + wallet + ledger.

Si hay diferencia entre Wompi y ledger:

- Congelar el caso.
- No liberar dinero.
- No marcar retiro como pagado.
- Registrar bitacora.
- Escalar a tecnico/finanzas.

## 8. Retiros pendientes

Para cada retiro:

- Verificar identidad del viajero.
- Verificar cuenta de retiro aprobada.
- Verificar wallet disponible.
- Verificar que no existan retiros abiertos que comprometan el mismo saldo.
- Aprobar solo si todo es consistente.
- Marcar como `paid` solo despues de ejecutar el pago externo y registrar referencia.

Si falta referencia externa:

- No marcar como pagado.
- Mantener el caso pendiente/aprobado segun corresponda.

## 9. Disputas y evidencias

Si el cliente dice que no recibio:

- Revisar match, shipment, payment y chat.
- Revisar evidencias de recogida, entrega y reportes.
- Mantener dinero retenido mientras se decide.
- Solicitar informacion faltante si la evidencia es insuficiente.

Si el viajero dice que entrego:

- Revisar evidencia de entrega, chat y confirmaciones.
- Revisar si el cliente abrio disputa dentro de la ventana.
- Resolver solo con evidencia suficiente y nota operativa.

Regla base:

- Evidencia prueba.
- Paquete sospechoso alerta.
- Disputa decide.
- Ninguna evidencia libera dinero por si sola.

## 10. Soporte a usuarios

Para cada caso:

- Identificar usuario afectado.
- Registrar tipo de caso.
- Pedir ID de envio, match, pago o retiro si aplica.
- Revisar estado visible en app.
- No pedir ni compartir secretos, documentos completos, llaves, tokens ni datos bancarios sensibles por chat.
- Escalar si involucra dinero, evidencia, permisos, login masivo o inconsistencia de datos.

## 11. Incidentes criticos

Si la app esta caida:

- Revisar Vercel.
- Revisar ultimo deploy automatico.
- Revisar si Supabase tiene incidente.
- Escalar a tecnico de inmediato.

Si Wompi no responde:

- No forzar pagos manuales.
- Informar al usuario que el pago esta en validacion.
- Escalar con hora, referencia y captura operativa.

Si webhook falla:

- No editar estado de pago manualmente.
- Escalar a tecnico.

Si hay error de permisos/RLS:

- No cambiar policies manualmente.
- Escalar con usuario, ruta, accion y hora.

## 12. Que nunca hacer manualmente

- No liberar dinero sin validar Wompi + payment + wallet + ledger.
- No marcar retiro como pagado sin referencia externa.
- No modificar saldos directo en base de datos.
- No crear, borrar o editar registros de `payments`, `wallets`, `wallet_ledger` o `payouts` por fuera del flujo admin aprobado.
- No resolver disputa sin revisar evidencias, chat y soporte.
- No borrar evidencia.
- No exponer datos personales, documentos, cuentas, tokens o llaves en chat.
- No cambiar variables de produccion sin registro y autorizacion.
- No hacer deploy manual salvo orden explicita.

## 13. Escalamiento

| Severidad | Significa | Respuesta | Responsable | Accion inmediata |
| --- | --- | --- | --- | --- |
| Baja | Duda operativa o caso aislado sin dinero | Mismo dia habil | Soporte/Admin | Registrar y responder con guia |
| Media | Usuario bloqueado, retiro demorado o pago no claro sin perdida confirmada | 4 horas habiles | Admin/Soporte | Revisar expediente y bitacora |
| Alta | Dinero retenido inconsistente, disputa sensible, webhook fallando o varios usuarios afectados | 1 hora | Owner/Admin + tecnico | Congelar acciones manuales y diagnosticar |
| Critica | App caida, pagos duplicados, riesgo de perdida de dinero o exposicion de datos | Inmediato | Owner/Admin + tecnico | Pausar operaciones sensibles y escalar |

Escalar a tecnico cuando exista:

- Error 500.
- Webhook fallando.
- Diferencia Wompi vs INTRA.
- Ledger incompleto o duplicado.
- Problema de RLS/permisos.
- Login masivo fallando.
- Variables o produccion involucradas.

## 14. Bitacora minima

Registrar cada caso sensible con:

- Fecha y hora.
- Responsable.
- Tipo de caso.
- Usuario afectado.
- ID de envio, match, pago o retiro si aplica.
- Que paso.
- Que se reviso.
- Decision tomada.
- Evidencia o referencia.
- Estado final.
- Pendiente.

## Bloque final

Estado actual de gates:

- Production env critico: corregido; requiere revalidacion final antes de operacion real.
- Wompi production: configurado.
- Webhook Wompi production: configurado en `https://www.intra.com.co/api/webhooks/wompi`.
- Gate principal pendiente: primer pago real Wompi + Wallet de punta a punta.
- Legal final: pendiente antes de produccion abierta.

Este runbook debe revisarse antes de produccion controlada y despues de cualquier cambio en pagos, wallet, Wompi, retiros, disputas, admin, Supabase o variables. La operacion con dinero requiere evidencia, trazabilidad y escalamiento temprano.
