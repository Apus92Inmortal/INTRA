# INTRA - Database Notes

## Reglas

- Toda modificacion de DB debe ir por migracion.
- No tocar RLS sin documentar la razon y el alcance.
- No cambiar estados de pagos sin revisar flujo Wompi.
- No crear columnas usadas por frontend sin migracion aplicada.
- No modificar funciones `security definer` sin validar permisos.
- No cambiar wallet, ledger, refunds o payouts sin revisar impacto operativo.

## Tablas criticas

- `profiles`
- `shipments`
- `trips`
- `matches`
- `messages`
- `payments`
- `wallets`
- `wallet_ledger`
- `payouts`
- `notifications`
- `cities`
- `user_policy_acceptances`
- `shipment_declarations`

## RPCs criticas

- `accept_match`
- `reject_match`
- `cancel_match`
- `mark_shipment_in_transit`
- `confirm_shipment_delivery`
- `mark_notification_as_read`
- `mark_all_notifications_as_read`

## Storage

- Usar buckets privados para evidencia o documentos sensibles.
- Las policies deben limitar acceso a usuarios relacionados y admins.
- No asociar liberacion de pagos solo a carga de evidencia sin regla operativa aprobada.

## Evidencias de envio

- Tabla existente: `shipment_evidence`.
- Bucket existente: `shipment-evidence`.
- Tipos legacy permitidos por constraint: `pickup`, `delivery`, `package_state`.
- La evidencia inicial obligatoria del cliente requiere un tipo semantico propio como `customer_initial_photo`.
- Para no ensuciar semantica, no se recomienda guardar evidencia inicial como `package_state`.
- PR #108 agrego una migracion pequena y aditiva para ampliar `shipment_evidence.evidence_type` con `customer_initial_photo`, `pickup_photo`, `delivery_photo` y `suspicious_photo`, manteniendo compatibilidad con los tipos legacy.
- Migracion remota aplicada y verificada en Supabase real: `202605252230_extend_shipment_evidence_types.sql`.
- Constraint remota verificada: `shipment_evidence_evidence_type_check`.
- Si se muestra evidencia inicial al viajero antes del match desde `/app`, preferir signed URLs generadas server-side para viajeros con viaje compatible y envio payment-ready antes de ampliar RLS.

## Pagos y wallet

- Wompi checkout procesa el pago del cliente.
- La liberacion al viajero depende de reglas operativas, entrega, disputa y bloqueos administrativos.
- No exponer porcentajes internos de tarifa en UI publica; usar copy aprobado de la matriz legal operativa.
