# INTRA - Current Session

## Fecha

2026-06-16

## Objetivo de la sesion

Cerrar documentalmente la sesion tecnica de los menus de cancelacion discreta en Dashboard para envios pendientes de pago y envios activos esperando viajero.

## Estado final

- Rama actual: `main`.
- `main` sincronizado con `origin/main`.
- Ultimo merge funcional en `main`: PR #157, commit `bed21e1`.
- `git status`: limpio.
- No hubo deploy manual.
- Ramas de trabajo locales/remotas eliminadas.

## PRs cerrados

### PR #156 - TASK-023

- Estado: MERGED.
- Merge commit: `73592d2`.
- Titulo: `TASK-023 — Add dashboard pending shipment cancel menu`.
- Alcance: Dashboard `/app`, seccion "Pendientes de pago".
- Implemento menu de tres puntos en la card pendiente de pago.
- CTA visible conservado: `Ir al checkout`.
- Accion destructiva oculta en menu: `Cancelar envio`.
- Modal critico con `IntraConfirmDialog` y `visualVariant="dashboard-critical"`.
- Action server-side: `cancelPendingPaymentShipmentAction`.
- Aplica solo a envios creados pero no pagados.
- No borra fisicamente el envio.
- Sin `confirm()`, sin `alert()` y sin SVG inline.

### PR #157 - TASK-024

- Estado: MERGED.
- Merge commit: `bed21e1`.
- Titulo: `TASK-024 — Add dashboard waiting traveler cancel menu`.
- Alcance: Dashboard `/app`, seccion "Mis envios activos".
- Implemento menu de tres puntos solo cuando el envio ya esta pagado y visualmente esta "Esperando viajero".
- Componente creado: `app/app/_components/dashboard/DashboardActiveShipmentCancelMenu.tsx`.
- Action server-side creada: `cancelActiveWaitingTravelerShipmentAction`.
- Booleano agregado: `canCancelWaitingTraveler`.
- Condicion funcional:
  - shipment del usuario autenticado.
  - `shipments.status = open`.
  - latest payment `held`.
  - `gateway_status = approved`.
  - `refund_status = none`.
  - `dispute_status = none`.
  - sin `metadata.manual_refund_required`.
  - sin matches `pending`, `accepted` o `completed`.
  - sin reportes operativos `open` o `reviewing`.
- Modal critico:
  - `IntraConfirmDialog`.
  - `visualVariant="dashboard-critical"`.
  - sin X.
  - sin icono.
  - titulo y descripcion alineados a la izquierda.
  - botones: `Volver` y `Cancelar envio`.
- Copy vigente:
  - `El envío dejará de estar disponible para viajeros. Se devolverá a tu Wallet el valor reembolsable, descontando el costo de pasarela.`
- Devolucion a Wallet:
  - usa `wallet_ledger.entry_type = refund_available_credit`.
  - acredita solo neto reembolsable.
  - formula: `payment.amount - coalesce(gateway_fee_actual, gateway_fee_estimated, 0)`.
  - no devuelve costo de pasarela al Wallet.
  - no hace refund externo automatico Wompi.
  - metadata registra `gross_payment_amount`, `gateway_fee_amount`, `wallet_refund_amount` y `gateway_fee_excluded_from_wallet_refund: true`.
  - `payments.status = refunded`.
  - `payments.refund_status = refunded`.
  - mantiene el patron existente porque no hay constraint vigente para `partially_refunded`.
  - ejecuta `sync_wallet_balance`.
  - si existiera hold historico de viajero, registra `refund_pending_debit` antes de sincronizar.

## Reglas UX consolidadas

1. En Dashboard / Pendientes de pago, el CTA visible debe ser `Ir al checkout`; la cancelacion debe vivir en menu de tres puntos.
2. En Dashboard / Mis envios activos, solo se permite cancelar desde tres puntos cuando el envio esta pagado, activo y `Esperando viajero`, sin matches activos.
3. Si ya existe match pendiente, aceptado o completado, la gestion/cancelacion debe hacerse desde Matches, no desde la card del Dashboard.
4. Las acciones criticas deben usar `IntraConfirmDialog` con estandar visual `dashboard-critical`.
5. No usar `window.confirm()`, `confirm()`, `window.alert()`, `alert()` ni SVG inline.
6. En cancelacion temprana de envio pagado sin viajero, Wallet recibe solo el valor neto reembolsable descontando pasarela. INTRA no debe devolver a Wallet el costo de pasarela.

## Archivos relevantes

- `app/app/page.tsx`.
- `app/app/_components/dashboard/DashboardShipmentCancelMenu.tsx`.
- `app/app/_components/dashboard/DashboardActiveShipmentCancelMenu.tsx`.
- `app/app/_actions/shipment-actions.ts`.
- `app/app/_lib/dashboard-queries.ts`.
- `app/app/_lib/dashboard-types.ts`.
- `components/ui/intra-foundation.tsx`.
- `app/app/_components/dashboard/DashboardTripCloseButton.tsx`.
- `docs/agent/CURRENT_SESSION.md`.
- `docs/agent/TASKS.md`.
- `docs/agent/DB_NOTES.md`.
- `docs/agent/DECISIONS.md`.

## Validaciones registradas

- PR #157:
  - `git diff --check`: PASS.
  - `npm run lint`: PASS.
  - `npx tsc --noEmit`: PASS.
  - `npm run test:unit`: PASS, 13 archivos / 42 tests.
  - `npm run build`: PASS.
  - Auditoria Manual UI/UX v3.0:
    - `confirm()` = 0.
    - `alert()` = 0.
    - SVG inline = 0.
    - clases tipograficas prohibidas = 0.
    - hex hardcoded solo en tokens oficiales.
  - Checks remotos:
    - validate: PASS.
    - detect-impact: PASS.
    - Vercel: PASS.
    - Vercel Preview Comments: PASS.

## Confirmaciones de alcance

- No se toco checkout.
- No se toco creacion de envios.
- No se toco creacion de viajes.
- No se toco el flujo general de Matches.
- No se toco wallet UI.
- No se tocaron pagos externos Wompi.
- No se tocaron migrations.
- No se toco RLS.
- No se tocaron tablas.
- No se tocaron RPCs.
- No hubo deploy manual.

## Pendiente

- Ninguno para TASK-023/TASK-024.
- Siguiente trabajo debe abrirse como nueva task/chat.
