# INTRA - Current Session

## Fecha

2026-06-16

## Objetivo de la sesion

TASK-024: agregar menu discreto de cancelacion en la card de "Mis envios activos" del Dashboard `/app` cuando el envio ya esta pagado y sigue en estado visual "Esperando viajero", sin match activo.

## Estado actual

- Rama activa: `uiux/task-024-active-shipment-cancel-menu`.
- Base: `main` sincronizado con `origin/main` antes de crear la rama.
- Ultimo merge funcional en `main`: PR #156, commit `73592d2`.
- No hubo deploy manual.

## Cambio en curso

- Se agrega un menu de tres puntos en la card de envio activo pagado solo cuando el envio sigue esperando viajero.
- Se crea `DashboardActiveShipmentCancelMenu` para separar este flujo del menu de pendientes de pago.
- La confirmacion usa `IntraConfirmDialog` con `visualVariant="dashboard-critical"`, sin icono y sin X, siguiendo el patron aprobado de `DashboardTripCloseButton`.
- Copy del modal:
  - Titulo: `¿Cancelar este envío?`
  - Descripcion: `El envío dejará de estar disponible para viajeros. Se devolverá a tu Wallet el valor reembolsable, descontando el costo de pasarela.`
  - Botones: `Volver` y `Cancelar envío`.
- Se agrega `canCancelWaitingTraveler` a `DashboardShipmentCard`.
- La condicion se calcula en `dashboard-queries`, no solo en UI.
- La card mantiene visibles:
  - estado `Esperando viajero`.
  - `TrackingCodeBadge`.
  - valor del envio.
  - ruta/peso.
  - progreso vacio y tiempo publicado.

## Logica server-side

- Nueva action: `cancelActiveWaitingTravelerShipmentAction`.
- Validaciones:
  - usuario autenticado.
  - ownership del envio.
  - envio en estado `open`.
  - pago latest en estado `held`, con `gateway_status = approved`.
  - `refund_status = none`.
  - `dispute_status = none`.
  - sin `metadata.manual_refund_required`.
  - sin match `pending`, `accepted` o `completed`.
  - sin reportes operativos `open` o `reviewing`.
  - sin ledger `release_available_credit`.
  - update final de `payments` y `shipments` debe retornar fila actualizada.
- El envio se marca `cancelled`; no se borra fisicamente.
- La devolucion a Wallet reutiliza el patron existente, acreditando solo el neto reembolsable:
  - `wallet_ledger.entry_type = refund_available_credit`.
  - `balance_type = available`.
  - `direction = credit`.
  - `wallet_ledger.amount = payments.amount - coalesce(gateway_fee_actual, gateway_fee_estimated, 0)`.
  - `payments.status = refunded`.
  - `payments.refund_status = refunded`.
  - `sync_wallet_balance` para el owner.
- La pasarela no se devuelve al Wallet; queda trazada en metadata como `gateway_fee_amount`.
- Si existiera un hold historico de viajero, se registra `refund_pending_debit` antes de sincronizar Wallet del viajero.
- No se crea refund externo Wompi automatico.

## Confirmaciones de alcance

- No se toco checkout.
- No se toco creacion de envios.
- No se toco creacion de viajes.
- No se toco la logica general de Matches.
- No se toco la pantalla general de Envios salvo revalidacion de ruta.
- No se tocaron migrations, RLS, tablas ni RPCs.
- No se tocaron wallet UI, admin, payouts, refunds externos ni auth routes.
- No hubo deploy manual.

## Verificacion registrada

- `git diff --check`: PASS.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 13 archivos / 42 tests.
- `npm run build`: PASS. Warning no bloqueante de Next por lockfiles multiples.
- Auditoria v3.0:
  - `confirm()` en `app components lib`: 0.
  - `alert()` en `app components lib`: 0.
  - SVG inline en `app components lib`: 0.
  - clases tipograficas prohibidas en `app components lib`: 0.
  - hex hardcoded solo en tokens oficiales:
    - `app/globals.css`.
    - `lib/ui/intra-theme.ts`.

## Pendiente

- Commit, push y PR Draft de `uiux/task-024-active-shipment-cancel-menu`.
- Revision de preview autenticada en PC/mobile antes de marcar Ready o mergear.
