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

## PR F1 - Profiles RLS hardening

- Migracion nueva: `202606061830_profiles_rls_schema_hardening.sql`.
- Estado remoto: aplicada en Supabase real del proyecto Intra-app, segun confirmacion de Aldo el 2026-06-06.
- Objetivo: cerrar lectura amplia de `profiles` y evitar exposicion de PII entre usuarios autenticados.
- `profiles` queda con RLS habilitado y policies self-only:
  - `profiles_select_self`: solo `id = auth.uid()`.
  - `profiles_insert_self`: solo `id = auth.uid()`.
  - `profiles_update_self`: solo `id = auth.uid()`.
- Se eliminan policies legacy/amplias:
  - `Authenticated users can read profiles`.
  - `profiles_select_related_or_self`.
  - policies publicas duplicadas de owner/self.
- Datos sensibles que ya no deben leerse desde cliente para terceros:
  - `phone`.
  - `document_number`.
  - `city_id` y cualquier dato privado del perfil.
- La lectura minima de contraparte se hace mediante RPC:
  - `get_public_profiles(uuid[])` devuelve solo `id` y `full_name`.
  - Usa `can_view_public_profile(uuid)` para permitir nombre propio, contraparte de match, viajero con trip abierto/full u owner de shipment open payment-ready.
- Admin conserva acceso usando cliente server-side protegido con service role.
- `supabase/schema.sql` fue reconciliado para `profiles`/RLS y ya no contiene lectura total de perfiles.

Confirmacion Supabase real:

- La policy peligrosa `Authenticated users can read profiles` ya no existe.
- Las policies legacy/duplicadas de `profiles` fueron eliminadas.
- `profiles` quedo con:
  - `profiles_insert_self`,
  - `profiles_select_self`,
  - `profiles_update_self`.
- Existen las funciones:
  - `can_view_profile`,
  - `can_view_public_profile`,
  - `get_public_profiles`.
- Production validado por Aldo despues de aplicar la migracion:
  - dashboard carga normal,
  - matches carga normal,
  - detalle de match carga normal,
  - chat carga normal,
  - nombres minimos de contraparte cargan correctamente.
- El P0 de lectura amplia de `profiles` / exposicion potencial de PII queda cerrado en repo, `main`, Supabase real y Production.

Verificacion SQL/manual recomendada en Supabase:

```sql
-- Como usuario A autenticado:
select id, full_name, phone, document_number
from public.profiles
where id = auth.uid();

-- Debe devolver 0 filas para usuario B sin relacion:
select id, full_name, phone, document_number
from public.profiles
where id = '<USER_B_ID>';

-- Debe devolver solo id/full_name cuando exista contexto publico valido:
select *
from public.get_public_profiles(array['<USER_B_ID>'::uuid]);

-- Debe fallar o devolver 0 filas para PII de B aun si existe match/contexto:
select phone, document_number
from public.profiles
where id = '<USER_B_ID>';
```
