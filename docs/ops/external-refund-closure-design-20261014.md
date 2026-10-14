# Cierre de devoluciones externas — diseño pendiente de regla contable

## Alcance

Registrar en INTRA una devolución **ya completada** fuera de la app (por
ejemplo, en Wompi) sin acreditar también la Wallet del cliente. No se
automatiza el movimiento externo. La ruta `customer_refund` existente solo
abona a Wallet y no sirve para este cierre.

## Decisión faltante antes de implementar el cierre

Definir el importe permitido para el MVP. Propuesta conservadora: aceptar
solo devolución externa del importe total efectivamente cobrado en COP y
rechazar parciales. Confirmar también el tratamiento contable de la comisión
de pasarela, que no debe confundirse con el abono neto a Wallet. Si se
requieren parciales, especificar el destino del remanente y su ledger antes
de codificar esa variante.

## Contrato técnico propuesto

1. El operador confirma la devolución finalizada en el proveedor y registra
   referencia única, importe, fecha, nota y comprobante en el expediente.
   Una referencia o captura por sí sola **no prueba** el movimiento: se coteja
   el estado final del proveedor antes de cerrar.
2. Un RPC transaccional exclusivo para service role valida actor Admin,
   payment, shipment, match, moneda, estado del proveedor y ausencia de
   devolución previa o de crédito `refund_available_credit` en Wallet.
3. Serializa con las rutas A03/A04 bloqueando shipment, payments, match y
   ledger en orden consistente. Si el saldo del viajero está retenido,
   revierte esa retención; si se liberó, exige saldo disponible no reservado
   y lo revierte. Si ya se retiró o faltan asientos, falla sin mutar.
4. En una sola transacción marca el pago como devuelto externamente,
   registra referencia e importe, resuelve disputa/match cuando aplique y
   añade auditoría. **No** inserta crédito Wallet al cliente. Reintentar la
   misma referencia devuelve resultado idempotente; una referencia distinta
   o estados incongruentes exigen conciliación humana.
5. El Admin presenta dos acciones inequívocas: `Abonar a Wallet` y
   `Registrar devolución externa`. La segunda nunca ejecuta un movimiento
   en Wompi y solo se habilita con los datos y comprobación anteriores.

## Casos que deben probarse antes de publicar

- Registro externo correcto: Wallet cliente sin crédito, saldo viajero
  reversado, payment/disputa/match/auditoría coherentes.
- Doble solicitud y carreras contra `customer_refund`, release y webhook:
  exactamente un resultado financiero, sin doble crédito ni deadlock.
- Referencia repetida, importe parcial/no coincidente, moneda errónea,
  movimiento no completado, pago no aprobado, crédito Wallet preexistente,
  retiro reservado/pagado y fallo tardío: rechazo o rollback sin mutaciones.
- Aprobación tardía tras cancelación: conciliar por una ruta específica; no
  suponer que existe un hold que revertir.

Hasta aprobar la regla y pasar esos casos, mantener el expediente abierto y
no marcar `refunded` por SQL ni pulsar `customer_refund` tras mover dinero
externamente. Este diseño **no** autoriza nuevos cobros ni es una migración.
