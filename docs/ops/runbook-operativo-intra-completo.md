# Runbook Operativo INTRA - Version Completa

![Logo INTRA](../../public/assets/cropped-Logo2sinfondo-1.png)

| Campo | Detalle |
| --- | --- |
| Documento | Runbook Operativo INTRA - Version Completa |
| Version | 1.0 |
| Fecha | 2026-06-22 |
| Estado | Borrador operativo / produccion controlada |
| Responsable | Owner/Admin INTRA |
| Audiencia | Owner, administradores, soporte, responsable financiero/operativo y tecnico/desarrollador |
| Repositorio | INTRA |

## 1. Control del documento

### 1.1 Historial de versiones

| Version | Fecha | Responsable | Descripcion |
| --- | --- | --- | --- |
| 1.0 | 2026-06-22 | Owner/Admin INTRA | Creacion inicial del runbook operativo completo. |

### 1.2 Alcance

Este runbook define la operacion interna de INTRA para produccion controlada y operacion real con usuarios y dinero. Cubre revision diaria, pagos Wompi, webhooks, wallet/ledger, retiros manuales, disputas, evidencias, soporte, incidentes, seguridad operativa, escalamiento y bitacora.

### 1.3 Audiencia

- Owner/Admin INTRA.
- Equipo de soporte.
- Responsable financiero/operativo.
- Tecnico/desarrollador encargado de incidentes.

### 1.4 Supuestos

- INTRA opera como plataforma peer-to-peer de envios entre clientes y viajeros.
- El usuario puede actuar como cliente o viajero segun contexto.
- Wompi procesa checkout de pagos.
- INTRA mantiene estados internos de `payments`, `wallets`, `wallet_ledger` y `payouts`.
- Refunds y payouts son manuales para el MVP.
- El admin opera desde pantallas existentes como `/app/admin/payouts`, `/app/admin/payout-accounts`, `/app/admin/disputes`, `/app/admin/alerts` y `/app/admin/verifications`.
- La liberacion de pagos depende de reglas operativas, entrega, disputa, bloqueos administrativos y ledger.
- Antes de produccion controlada debe cerrarse el bloqueo vigente de variables Production documentado en `docs/agent/KNOWN_ISSUES.md`.

### 1.5 Fuera de alcance

- Manual de usuario final.
- Guia tecnica de implementacion.
- Cambios de codigo.
- Cambios de Supabase, RLS, migraciones, webhooks o variables.
- Automatizacion bancaria.
- Refund automatico Wompi.
- Deploy manual.

## 2. Roles operativos

### 2.1 Owner

Responsable final de decisiones operativas sensibles, prioridad de incidentes, autorizacion de produccion controlada, criterios de cierre y escalamiento.

### 2.2 Admin

Opera la consola interna. Revisa verificaciones, cuentas de retiro, retiros, disputas, alertas, evidencias y estados de pagos. No debe ejecutar acciones fuera del flujo aprobado ni modificar datos criticos directamente en base de datos.

### 2.3 Soporte

Recibe casos de usuarios, solicita informacion minima, evita pedir datos sensibles, registra bitacora y escala cuando hay dinero, seguridad, evidencia, permisos o incidentes tecnicos.

### 2.4 Tecnico/desarrollador

Atiende errores de aplicacion, Vercel, Supabase, webhook, Wompi, RLS, autenticacion, realtime/chat, logs y bugs. No debe cambiar produccion sin autorizacion y registro.

### 2.5 Responsable financiero/operativo

Ejecuta movimientos externos manuales cuando el caso ya fue aprobado operacionalmente. Debe conservar comprobantes y referencias externas antes de que admin marque un retiro o refund como completado.

## 3. Checklist diario

- [ ] Revisar Vercel: disponibilidad, ultimo deploy automatico, errores y funciones.
- [ ] Revisar Supabase: Auth, Database, Realtime y Storage.
- [ ] Revisar Wompi: pagos aprobados, rechazados, pendientes y eventos.
- [ ] Revisar webhooks Wompi: eventos recibidos, procesados y errores.
- [ ] Revisar pagos recientes en INTRA.
- [ ] Revisar pagos en `pending`, `processing`, `held`, `released`, `refunded`, `failed` y `cancelled`.
- [ ] Revisar wallet y ledger por movimientos inusuales.
- [ ] Revisar retiros en `/app/admin/payouts`.
- [ ] Revisar cuentas de retiro en `/app/admin/payout-accounts`.
- [ ] Revisar disputas en `/app/admin/disputes`.
- [ ] Revisar alertas en `/app/admin/alerts`.
- [ ] Revisar usuarios reportados, verificaciones y quejas.
- [ ] Revisar errores de login o soporte recurrente.
- [ ] Registrar bitacora de casos sensibles.

## 4. Checklist semanal

- [ ] Conciliar Wompi contra pagos internos.
- [ ] Conciliar saldos de wallet contra `wallet_ledger`.
- [ ] Revisar retiros pendientes, aprobados, pagados y rechazados.
- [ ] Revisar disputas cerradas y calidad de evidencia.
- [ ] Revisar soporte y motivos recurrentes.
- [ ] Revisar logs de Vercel y Supabase para errores repetidos.
- [ ] Revisar accesos admin.
- [ ] Revisar documentos operativos vigentes.
- [ ] Revisar que no se hayan registrado secretos, tokens, datos bancarios completos o datos personales innecesarios en bitacoras o chats.
- [ ] Confirmar estado del gate de Production env antes de operar con dinero real.

## 5. Procedimiento Wompi

### 5.1 Pago aprobado en Wompi y reflejado en INTRA

Si pasa:

- Wompi muestra pago aprobado.
- INTRA muestra pago `held` o estado final consistente.

Hacer:

- Verificar payment id, shipment id, match id si aplica y usuario.
- Verificar `gateway_status = approved` cuando aplique.
- Verificar ledger de retencion si el flujo ya asigno viajero.
- Registrar solo si es un caso sensible o primer pago real.

No hacer:

- No editar el pago.
- No liberar dinero si no se cumplio entrega/regla operativa.

### 5.2 Pago aprobado en Wompi pero no reflejado en INTRA

Hacer:

- Revisar si el usuario volvio por retorno de checkout.
- Revisar si existe evento en `wompi_webhook_events`.
- Revisar logs del webhook.
- Revisar si el evento fue procesado o tiene error.
- Congelar cualquier liberacion/retiro relacionado.
- Escalar a tecnico con transaction id, referencia externa, hora, usuario y evidencia.

No hacer:

- No crear pago manual.
- No cambiar `payments.status` manualmente.
- No acreditar wallet manualmente.

### 5.3 Pago rechazado

Hacer:

- Confirmar estado en Wompi.
- Confirmar que INTRA no tenga saldo retenido ni disponible por ese pago.
- Orientar al usuario a reintentar si el flujo lo permite.

### 5.4 Webhook no recibido

Hacer:

- Revisar configuracion del endpoint en Wompi.
- Revisar disponibilidad de la app.
- Revisar logs de Vercel.
- Escalar a tecnico.

No hacer:

- No simular webhook manualmente sin autorizacion tecnica.
- No marcar pago como aprobado manualmente.

### 5.5 Webhook recibido con error

Hacer:

- Revisar error registrado.
- Revisar firma, payload, referencia, transaction id y estado.
- Verificar variables requeridas de Wompi.
- Escalar a tecnico.

### 5.6 Usuario reclama pago

Hacer:

- Pedir correo de cuenta, fecha, monto aproximado y comprobante visible sin datos sensibles.
- Buscar payment por usuario/envio/referencia.
- Comparar con Wompi.
- Si hay diferencia, congelar caso y escalar.

Regla critica:

- No liberar dinero sin validar Wompi + payment + wallet + ledger.

## 6. Procedimiento Wallet / Ledger

### 6.1 Saldo retenido

Saldo retenido representa dinero asociado a proceso operativo no finalizado. Puede estar asociado a pago retenido, entrega pendiente, disputa o bloqueo.

Si el usuario pregunta:

- Explicar que el saldo esta en revision operativa.
- Revisar payment y match.
- No prometer fecha si hay disputa o bloqueo.

### 6.2 Saldo disponible

Saldo disponible puede soportar retiro si:

- Existe wallet.
- Hay ledger de credito disponible.
- No hay retiros abiertos consumiendo el mismo saldo.
- La cuenta de retiro e identidad cumplen requisitos.

### 6.3 Liberacion de pago

Antes de liberar:

- [ ] Pago `held`.
- [ ] Wompi aprobado.
- [ ] Sin disputa abierta.
- [ ] Sin refund requerido.
- [ ] Sin `manual_refund_required`.
- [ ] Entrega reportada/confirmada segun flujo.
- [ ] Ledger sin duplicados para el payment.

No liberar si:

- Hay disputa abierta.
- Hay inconsistencia Wompi vs INTRA.
- Hay ledger incompleto o duplicado.
- Hay bloqueo administrativo.

### 6.4 Diferencia entre Wompi y ledger

Hacer:

- Congelar el caso.
- Registrar bitacora.
- No aprobar retiro ni liberar pago.
- Escalar a tecnico/finanzas.

### 6.5 Ledger incompleto

Hacer:

- No completar manualmente desde base de datos.
- Revisar logs y flujo que debio crear la entrada.
- Escalar a tecnico.

### 6.6 Revision antes de retiro

- [ ] Wallet disponible cubre el monto.
- [ ] Retiros abiertos no consumen el mismo saldo.
- [ ] Cuenta verificada.
- [ ] Identidad verificada.
- [ ] Politica de pagos aceptada si aplica.
- [ ] Sin disputa activa relacionada al dinero.

### 6.7 Que nunca modificar manualmente

- `available_balance`.
- `pending_balance`.
- `total_earned`.
- `total_withdrawn`.
- Entradas de `wallet_ledger`.
- Estados de `payments`.
- Estados de `payouts`.

## 7. Procedimiento de retiros

### 7.1 Retiro solicitado

Hacer:

- Revisar `/app/admin/payouts`.
- Revisar cuenta asociada.
- Revisar identidad y nivel de verificacion.
- Revisar wallet disponible.
- Revisar retiros abiertos.

### 7.2 Retiro pendiente

Hacer:

- Mantener pendiente mientras falte revision.
- No ejecutar transferencia externa sin aprobacion.

### 7.3 Retiro aprobado

Hacer:

- Preparar transferencia externa manual.
- Verificar monto y cuenta.
- Registrar en bitacora.

### 7.4 Retiro pagado manualmente

Hacer:

- Ejecutar transferencia externa primero.
- Guardar referencia/comprobante.
- Marcar `paid` solo con referencia externa.
- Verificar ledger `payout_paid_debit`.
- Verificar wallet actualizada.

### 7.5 Falta referencia externa

No hacer:

- No marcar `paid`.

Hacer:

- Solicitar o recuperar comprobante.
- Mantener caso en estado previo.

### 7.6 Error en retiro

Hacer:

- Congelar el caso.
- No intentar segundo pago sin reconciliacion.
- Revisar ledger, payout y comprobante externo.
- Escalar a tecnico/finanzas.

### 7.7 Reclamo de viajero

Hacer:

- Revisar payout id o payout code.
- Revisar estado.
- Revisar referencia externa si esta pagado.
- Responder con estado operativo sin exponer datos sensibles.

### 7.8 Evidencia del pago del retiro

Conservar:

- Referencia externa.
- Fecha/hora.
- Monto.
- Responsable.
- Comprobante protegido.

## 8. Procedimiento de disputas y evidencias

### 8.1 Cliente dice que no recibio

Hacer:

- Revisar match, shipment y payment.
- Revisar chat.
- Revisar evidencia de recogida/entrega.
- Revisar reportes de paquete sospechoso.
- Mantener dinero retenido mientras se decide.
- Solicitar informacion adicional si falta evidencia.

### 8.2 Viajero dice que entrego

Hacer:

- Revisar evidencia de entrega.
- Revisar chat.
- Revisar si cliente confirmo o abrio disputa.
- Revisar ventana de disputa.

### 8.3 Evidencia suficiente

Hacer:

- Documentar razon.
- Resolver con nota operativa.
- Notificar segun flujo.

### 8.4 Evidencia insuficiente

Hacer:

- Solicitar mas informacion.
- Mantener caso abierto o en revision.
- No liberar ni reembolsar hasta decidir.

### 8.5 Disputa sin respuesta

Hacer:

- Registrar intentos de contacto.
- Aplicar criterio operativo vigente.
- Escalar al Owner si hay dinero o reputacion en riesgo.

### 8.6 Decision a favor del cliente

Hacer:

- Validar monto de devolucion.
- Registrar nota operativa.
- Ejecutar refund externo manual si aplica antes de cerrar como reembolsado.
- Verificar reversos de ledger del viajero cuando corresponda.

### 8.7 Decision a favor del viajero

Hacer:

- Registrar nota operativa.
- Liberar saldo solo por flujo admin aprobado.
- Confirmar ledger disponible para viajero.

### 8.8 Dinero retenido

Mantener retenido cuando:

- Hay disputa abierta.
- Hay alerta activa.
- Falta evidencia.
- Hay inconsistencia de payment/ledger.
- Hay bloqueo administrativo.

### 8.9 Comunicacion con usuarios

- Usar lenguaje claro.
- No prometer resolucion sin revision.
- No compartir datos de la contraparte fuera de lo permitido.
- Registrar resumen de comunicacion.

## 9. Procedimiento de soporte

### 9.1 No puede iniciar sesion

- Verificar correo usado.
- Revisar si hay problema masivo.
- Si afecta a varios usuarios, escalar a tecnico.

### 9.2 No aparece el envio

- Verificar cuenta correcta.
- Revisar estado del envio.
- Revisar pago si el envio depende de checkout.

### 9.3 No aparece el viaje

- Verificar cuenta correcta.
- Revisar estado del viaje.
- Revisar fecha/ruta.

### 9.4 No aparece el match

- Verificar shipment, trip y estado del match.
- Revisar si fue rechazado, cancelado o ya procesado.

### 9.5 No puede pagar

- Revisar error visible.
- Revisar Wompi y variables si es masivo.
- No tomar pago por fuera de INTRA sin decision del Owner.

### 9.6 El viajero no responde

- Revisar chat y estado del match.
- Registrar intento de contacto.
- Orientar segun politica operativa vigente.

### 9.7 El cliente no confirma

- Revisar entrega reportada.
- Revisar ventana de disputa y auto-release.
- No liberar manualmente si hay alerta o disputa.

### 9.8 Quiere cancelar

- Revisar estado del shipment, match y payment.
- Si hay match activo o pago retenido, manejar desde flujo operativo correcto.
- No cancelar manualmente en base de datos.

### 9.9 Reclama retiro

- Revisar payout status.
- Revisar referencia externa si esta pagado.
- Revisar cuenta de retiro.

### 9.10 Reporta paquete perdido o danado

- Abrir o revisar disputa/alerta.
- Solicitar evidencia.
- Mantener dinero retenido.
- Escalar al Owner/Admin.

## 10. Incidentes tecnicos

### 10.1 App caida

- Revisar Vercel.
- Revisar ultimo deploy.
- Revisar Supabase.
- Escalar a tecnico inmediatamente.

### 10.2 Error 500

- Capturar ruta, usuario, hora y accion.
- Revisar si es reproducible.
- Escalar con logs.

### 10.3 Vercel con fallo

- No hacer deploy manual salvo orden explicita.
- Revisar estado del deploy automatico.
- Escalar a tecnico.

### 10.4 Supabase con fallo

- Revisar dashboard de Supabase.
- No cambiar RLS ni datos.
- Escalar a tecnico.

### 10.5 Wompi no responde

- Pausar instrucciones de reintento masivo.
- Revisar Wompi.
- No aprobar pagos manualmente.

### 10.6 Webhook fallando

- Revisar logs.
- Revisar firma y variables.
- No editar pagos manualmente.
- Escalar a tecnico.

### 10.7 Realtime/chat fallando

- Confirmar si el usuario puede refrescar y continuar.
- Registrar modulo afectado.
- Escalar si afecta operacion sensible.

### 10.8 Problemas masivos de login

- Revisar Supabase Auth.
- Revisar errores en app.
- Escalar como severidad alta o critica segun alcance.

### 10.9 Errores de permisos/RLS

- Registrar usuario, ruta, accion y hora.
- No cambiar policies manualmente.
- Escalar a tecnico.

### 10.10 Que revisar primero

1. Estado de app.
2. Vercel logs.
3. Supabase status.
4. Wompi status si hay pagos.
5. Ultimo cambio mergeado.
6. Alcance: uno o varios usuarios.

### 10.11 Cuando escalar

Escalar siempre que haya dinero, datos personales, permisos, pagos, wallet, retiros, disputas, webhook o caida general.

## 11. Seguridad operativa

### 11.1 Accesos

- Mantener accesos admin limitados.
- Revisar administradores periodicamente.
- Retirar accesos que ya no correspondan.

### 11.2 Secretos y variables

- No compartir valores de variables por chat.
- No pegar tokens, llaves ni service role en documentos.
- No cambiar variables de produccion sin autorizacion, registro y validacion.

### 11.3 Admin

- Usar admin solo para acciones operativas necesarias.
- Registrar decisiones sensibles.
- No operar casos propios sin revision cruzada cuando involucre dinero.

### 11.4 Datos personales

- Minimizar informacion compartida.
- No publicar documentos, numeros completos de cuenta o datos privados en chats generales.
- Conservar evidencia en ubicaciones protegidas.

### 11.5 Evidencias

- No borrar evidencia.
- No descargar o reenviar evidencia sin necesidad operativa.
- Registrar que evidencia se reviso, no copiar datos sensibles innecesarios.

### 11.6 Pagos

- No compartir comprobantes completos si contienen datos sensibles.
- No exponer llaves ni referencias internas fuera del equipo autorizado.

### 11.7 Que no registrar en texto plano

- Tokens.
- Llaves Wompi.
- Service role.
- Passwords.
- Documentos completos.
- Numeros completos de cuenta.
- Datos personales no necesarios.

## 12. Que nunca hacer manualmente

- No liberar dinero sin validar Wompi + ledger.
- No marcar retiro como pagado sin referencia.
- No modificar saldos directo en base de datos.
- No cambiar `payments`, `wallets`, `wallet_ledger` o `payouts` por fuera de flujos aprobados.
- No cambiar variables de produccion sin registro y autorizacion.
- No borrar evidencia.
- No resolver disputa sin revisar soporte, chat y evidencias.
- No exponer datos personales.
- No hacer deploy manual salvo orden explicita.
- No automatizar refunds o payouts sin decision nueva.
- No cambiar Supabase, RLS o migraciones desde operacion diaria.

## 13. Escalamiento

| Severidad | Que significa | Tiempo de respuesta | Responsable | Accion inmediata | Cuando escalar a tecnico |
| --- | --- | --- | --- | --- | --- |
| Baja | Consulta operativa, duda de estado, caso aislado sin dinero | Mismo dia habil | Soporte/Admin | Registrar y responder | Si aparece error reproducible |
| Media | Usuario bloqueado, retiro demorado, pago en duda sin perdida confirmada | 4 horas habiles | Admin + soporte | Revisar expediente y bitacora | Si hay inconsistencia de datos o logs |
| Alta | Dinero retenido inconsistente, disputa sensible, webhook fallando, varios usuarios afectados | 1 hora | Owner/Admin + tecnico | Congelar acciones manuales | Siempre |
| Critica | App caida, pagos duplicados, perdida de dinero, exposicion de datos, login masivo caido | Inmediato | Owner/Admin + tecnico | Pausar operaciones sensibles y activar canal de crisis | Siempre |

## 14. Bitacora operativa

Usar esta plantilla para casos con dinero, soporte sensible, disputa, retiro, pago, incidente o decision manual.

```text
Fecha:
Responsable:
Tipo de caso:
Usuario afectado:
ID de envio:
ID de match:
ID de pago:
ID de retiro:
Que paso:
Que se reviso:
Decision tomada:
Evidencia o referencia:
Estado final:
Pendiente:
Escalado a:
```

Reglas:

- No incluir secretos.
- No incluir documentos completos.
- No incluir datos bancarios completos.
- Adjuntar o referenciar evidencia solo en ubicacion protegida.
- Registrar decisiones con monto, estado y responsable cuando haya dinero.

## 15. Recomendaciones antes de produccion controlada

- [ ] Cerrar el bloqueo de Production env documentado en `docs/agent/KNOWN_ISSUES.md`.
- [ ] Confirmar `NEXT_PUBLIC_SITE_URL=https://www.intra.com.co` en Production.
- [ ] Configurar Wompi real en Production.
- [ ] Confirmar webhook Wompi de produccion.
- [ ] Confirmar `SUPABASE_SERVICE_ROLE_KEY`, admins y secretos de cron en Production.
- [ ] Hacer redeploy controlado solo con autorizacion explicita.
- [ ] Ejecutar smoke minimo posterior al redeploy.
- [ ] Validar primer pago real Wompi + Wallet como gate critico.
- [ ] Validar primer retiro manual con referencia externa.
- [ ] Confirmar bitacora operativa activa.

## 16. Pendientes conocidos

- Production env no esta listo para produccion controlada mientras siga abierto `ISSUE-005`.
- Primer pago real Wompi + Wallet debe tratarse como validacion critica.
- Refunds y payouts siguen siendo manuales en MVP.
- Cualquier cambio futuro en dinero requiere decision documentada, validacion y PR propio.

## 17. Cierre del documento

Este runbook debe actualizarse cuando cambien los flujos de pagos, wallet, Wompi, webhooks, retiros, disputas, evidencias, admin, variables, Supabase o procedimientos de soporte. La regla operativa principal es proteger dinero, usuarios y reputacion: si hay duda, congelar el caso, registrar evidencia y escalar.
