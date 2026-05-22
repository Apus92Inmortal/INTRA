# Fase 2 — Seguridad (cierre con salvedades)

Estado al 2026-04-23.

## Cierre operativo

La Fase 2 queda cerrada a nivel funcional y de endurecimiento principal, con salvedades explícitas.

## Lo validado

- RLS revisado y endurecido en tablas operativas principales.
- RPCs críticas protegidas:
  - `accept_match`
  - `reject_match`
  - `cancel_match`
  - `mark_shipment_in_transit`
  - `confirm_shipment_delivery`
  - `mark_notification_as_read`
  - `mark_all_notifications_as_read`
- Removido acceso `anon` / `public` de RPCs críticas.
- Guardas de `auth.uid()` y control de rol agregadas en funciones `security definer`.
- Corregida recursión de policies RLS entre `profiles`, `shipments`, `trips` y `matches`.
- Corregido open redirect en flujo de auth para `next` (`//dominio` ya no pasa como ruta válida).

## Smoke tests validados contra Supabase real

### Flujo principal
- crear viaje
- crear envío
- crear match
- aceptar match
- marcar en tránsito
- confirmar entrega

### Flujos secundarios
- rechazo de match
- cancelación de match
- notificaciones read / unread
- acceso cruzado por rol en RPCs críticas

## Salvedades

- `shipments` abiertos siguen visibles para usuarios autenticados no dueños, por diseño actual del market.
- No se rotó la `service_role` porque no se encontró uso activo en el repo ni evidencia de exposición fuera del entorno controlado al momento de la revisión.
- La verificación de secretos en entornos externos quedó validada operativamente por el equipo, no por acceso admin directo desde este runtime.

## Pendiente antes de llamar esto “seguridad perfecta”

- Mantener vigilancia sobre variables privadas externas en Vercel / Supabase.
- Si la `service_role` sale del entorno controlado o aparece uso nuevo, rotarla de inmediato.
- La app ya tiene `proxy.ts`; si se toca auth/routing, validar en build/runtime que la convención activa de Next.js siga protegiendo `/app/*`.

## Decisión de roadmap

- Fase 2 puede considerarse cerrada con salvedades.
- El siguiente frente de trabajo ya puede pasar a Fase 3.
