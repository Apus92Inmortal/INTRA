# Operacion manual de refunds y payouts - MVP INTRA

## Principios

- INTRA no automatiza todavia reembolsos ni retiros bancarios.
- Toda operacion manual debe tener evidencia operativa.
- No se debe marcar un retiro como pagado ni un reembolso como completado antes de ejecutar realmente el movimiento externo.
- Admin debe revisar estado del payment, payout, wallet y ledger antes de actuar.
- Todo cambio critico debe hacerse desde el admin para mantener trazabilidad.

## Estado F3 validado

- PR #119 quedo mergeado en `main` con commit `b0f8090`.
- Migracion F3 aplicada en Supabase real: `202606070020_manual_refunds_payouts_ops.sql`.
- PR #120 quedo mergeado en `main` con commit `ed0b498`.
- Migracion hotfix F3 aplicada en Supabase real: `202606070140_suspicious_dispute_traveler_resolution.sql`.
- Production validado por Aldo:
  - paquete sospechoso -> escalar a disputa -> resolver a favor del viajero: OK.
  - no reaparece `match_in_dispute`.
  - resolver disputa a favor del cliente sigue funcionando.
  - flujo admin de disputa/release queda operativo.

## Refunds manuales

### Cuando aplica

- Disputa resuelta a favor del cliente.
- Match cancelado antes de recogida con pago retenido.
- Alerta administrativa que requiere rechazar envio o cancelar match con pago retenido.
- Cualquier caso donde `refund_status` quede en `manual_required`, `pending`, `processing` o `failed`.

### Quien puede iniciarlo

- Cliente puede abrir disputa desde el flujo de match cuando aplica.
- Admin puede escalar alerta a disputa o marcar reembolso manual requerido al resolver casos operativos.
- El movimiento externo real lo ejecuta el equipo INTRA fuera de la app, por Wompi Dashboard u otro proceso aprobado.

### Estados

- `none`: sin reembolso requerido.
- `manual_required`: requiere gestion manual.
- `pending`: reembolso pendiente.
- `processing`: reembolso en proceso.
- `failed`: intento fallido o bloqueado.
- `refunded`: reembolso completado y registrado.

### Pasos admin

1. Abrir `/app/admin/disputes`.
2. Revisar expediente, evidencias, payment, match, shipment y alerta relacionada.
3. Confirmar que el pago no este `released` y que no exista reembolso previo.
4. Ejecutar el reembolso externo antes de cerrar como reembolsado.
5. Registrar nota operativa con referencia/comprobante externo.
6. Resolver a favor del cliente solo despues de completar el movimiento externo.
7. Confirmar que `payment.status` y `refund_status` quedan en `refunded`.
8. Confirmar que ledger reversa retencion/saldo del viajero si corresponde.

### Que revisar antes de reembolsar

- `payment.id`.
- `payment.status`.
- `payment.refund_status`.
- `payment.dispute_status`.
- `payment.released_at`.
- Entradas `wallet_ledger` del payment.
- Evidencias del expediente.
- Monto a reembolsar.

### Que hacer despues de reembolsar

- Guardar comprobante o referencia externa.
- Verificar que el caso admin queda resuelto.
- Verificar que el viajero no conserva saldo liberable por ese payment.
- Verificar que cliente y viajero recibieron estado/notificacion cuando aplique.

### Que no hacer

- No marcar `refunded` antes del movimiento externo.
- No liberar pago si existe disputa abierta, `refund_status` distinto de `none` o `manual_refund_required = true`.
- No resolver dos veces el mismo payment.
- No procesar fuera del admin sin registrar resultado.

### Riesgos

- El refund externo sigue siendo manual y depende de disciplina operativa.
- Si el movimiento externo falla, no se debe cerrar el caso como `refunded`.
- Si hay inconsistencia entre payment y ledger, congelar el caso y revisar manualmente.

## Payouts manuales

### Cuando aplica

- Viajero tiene saldo disponible.
- Viajero tiene identidad y cuenta de retiro verificadas.
- Viajero acepta la politica de pagos vigente.
- Solicita retiro por monto igual o superior al minimo configurado.

### Requisitos de cuenta

- Cuenta en `traveler_payout_accounts`.
- `verification_status = verified`.
- Verificacion de usuario con nivel `payout_verified`.
- Datos de cuenta revisados por admin.

### Estados

- `pending`: solicitud creada por viajero.
- `approved`: admin aprobo y queda lista para transferencia manual.
- `rejected`: admin rechazo la solicitud.
- `paid`: transferencia manual ejecutada y registrada.

### Pasos admin

1. Abrir `/app/admin/payouts`.
2. Revisar identidad, cuenta, monto, wallet y solicitudes abiertas.
3. Aprobar solo si la cuenta esta verificada y el saldo disponible cubre el retiro.
4. Ejecutar transferencia externa manual.
5. Registrar referencia externa obligatoria.
6. Marcar como `paid` solo despues de transferir.
7. Confirmar que aparece una sola entrada `payout_paid_debit` en `wallet_ledger`.
8. Confirmar que `available_balance` y `total_withdrawn` quedan consistentes.

### Que revisar antes de transferir

- `payout.id` y `payout_code`.
- `wallet.available_balance`.
- Otros payouts `pending` o `approved` del mismo viajero.
- Cuenta de retiro asociada.
- Referencia o soporte de transferencia a registrar.

### Que hacer despues de transferir

- Guardar comprobante externo.
- Registrar `paid_reference`.
- Confirmar estado `paid`.
- Confirmar ledger `payout_paid_debit`.
- Confirmar que el viajero ve el retiro pagado en wallet/historial.

### Que no hacer

- No marcar `paid` sin referencia externa.
- No pagar payout ya `paid`.
- No aprobar payout sin cuenta verificada.
- No pagar si el saldo disponible no cubre el monto.
- No procesar fuera del admin sin registrar resultado.

### Riesgos

- La transferencia externa no esta integrada; depende del operador.
- Si aparece `payout_already_has_paid_ledger`, congelar el caso y revisar ledger antes de tocar saldo.
- Si el saldo no alcanza, no pagar y revisar payouts abiertos/ledger.

## Checklist diario admin

- Revisar disputas abiertas.
- Revisar refunds pendientes o manuales.
- Revisar payouts pendientes.
- Revisar payouts aprobados no pagados.
- Revisar casos congelados.
- Revisar ledger inconsistente o alertas de doble operacion.

## Reglas anti doble operacion

- No reembolsar si ya esta `refunded`.
- No liberar si hay disputa abierta, refund pendiente o `manual_refund_required`.
- No pagar payout si ya esta `paid`.
- No aprobar payout sin cuenta verificada.
- No procesar fuera del admin sin registrar resultado.
- No editar saldos manualmente sin reconciliacion.

## Evidencias minimas

- ID payment.
- ID match.
- ID payout.
- Captura o comprobante externo.
- Fecha/hora.
- Admin responsable.
- Nota operativa.
