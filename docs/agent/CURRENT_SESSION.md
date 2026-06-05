# INTRA - Current Session

## Fecha

2026-06-05

## Objetivo de la sesion

Actualizar PR #116 / PR H con fallback polling visible-aware y logs gated para QA en pantallas operativas.

## Estado actual

- Rama local: `feat/operational-realtime-pr-h`.
- PR #116 sigue bloqueado para merge hasta que QA confirme actualizacion automatica sin F5.
- Diagnostico aceptado: los datos cambian en DB, pero Realtime puede no llegar o no disparar `router.refresh()`.
- Realtime se mantiene best-effort.
- Fallback polling visible-aware queda agregado en `/app`, `/app/matches`, `/app/matches/[id]` y `/app/admin/disputes`.
- Logs temporales de QA quedan gated por `localStorage.setItem("intraRealtimeDebug", "1")`.
- Sin cambios de DB, RLS, Storage, migraciones, pagos, Wompi, wallet, payouts, refunds, auto-release, RPCs financieras ni chat internals.

## Cambios en curso

- `MarketRealtime` mantiene listeners Realtime y agrega fallback visible-aware:
  - intervalo: 12s.
  - debounce: 700ms.
  - min gap: 1500ms.
  - logs de subscribe, evento recibido y `router.refresh()`.
- `MatchesRealtime` mantiene listeners Realtime y agrega fallback visible-aware:
  - intervalo: 10s.
  - debounce: 700ms.
  - min gap: 1500ms.
  - mantiene filtro para no refrescar por mensajes propios.
  - logs de subscribe, evento recibido y `router.refresh()`.
- `MatchDetailRealtime` mantiene listeners filtrados por `matchId` y `shipmentId` y agrega fallback visible-aware:
  - intervalo: 8s.
  - debounce: 700ms.
  - min gap: 1500ms.
  - logs de subscribe, evento recibido y `router.refresh()`.
- `AdminDisputesRealtime` mantiene fallback moderado visible-aware:
  - intervalo: 25s.
  - debounce: 800ms.
  - min gap: 1500ms.
  - logs de subscribe, evento recibido y `router.refresh()`.
- Cleanup incluido en los cuatro componentes:
  - clear timeout.
  - clear interval.
  - remove event listener de visibilidad.
  - `supabase.removeChannel(channel)`.
- Tablas escuchadas en detalle de match:
  - `matches`
  - `shipments`
  - `payments`
  - `shipment_evidence`
  - `shipment_report_events`
- Tablas escuchadas en lista de matches:
  - `messages`
  - `matches`
  - `shipments`
  - `payments`
  - `shipment_report_events`
- Tablas escuchadas en `/app`:
  - `matches`
  - `shipments`
  - `payments` del usuario actual.
  - `notifications` del usuario actual.
- Tablas escuchadas en admin disputes:
  - `shipment_report_events`
  - `shipment_evidence`
  - `payments`
  - `matches`
  - `shipments`

## Archivos tocados

- `app/app/market/MarketRealtime.tsx`
- `app/app/matches/MatchesRealtime.tsx`
- `app/app/matches/[id]/MatchDetailRealtime.tsx`
- `app/app/admin/disputes/AdminDisputesRealtime.tsx`
- `docs/agent/CURRENT_SESSION.md`
- `docs/agent/TASKS.md`

## No tocado

- Pagos/Wompi/checkout.
- Wallet.
- Payouts.
- Refunds.
- Auto-release.
- Supabase migrations.
- RLS.
- Storage policies.
- RPCs financieras.
- Logica financiera.
- Reglas de disputa.
- Chat internals.

## Validacion

- `git diff --check`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run test:unit`: PASS, 42/42 tests.
- `npm run build`: PASS, con warning no bloqueante de root por lockfiles multiples.

## QA pendiente

- Si una sesion marca recogida/en transito, otra sesion en `/app` debe actualizarse sola sin F5 en maximo 15s.
- Si admin resuelve una alerta, una sesion en `/app/matches/[id]` debe actualizarse sola sin F5 en maximo 10s.
- Si se crea o resuelve alerta, `/app/matches` debe reflejarlo sin F5 en maximo 12s.
- Admin disputes debe actualizar por realtime o fallback moderado sin F5.
- Confirmar que no hay refresh infinito.
- Confirmar que no hay errores de consola por subscriptions.
- Confirmar que no se siente pesado.

## Riesgos abiertos

- Realtime remoto puede no estar habilitado para todas las tablas.
- Admin realtime puede estar limitado por RLS del cliente; por eso se mantiene fallback moderado.
- El refresh automatico por polling es resiliencia, no prueba de que Realtime remoto este completo.
- Realtime puede producir eventos duplicados; se mitiga con debounce.

## Proximo paso recomendado

- Esperar QA funcional de Aldo en PR #116.
- Mantener PR #116 bloqueado para merge hasta confirmar actualizacion automatica sin F5.
- Si QA confirma, proceder con aprobacion explicita de merge/deploy segun flujo.

## Debe leer el proximo agente

1. `AGENTS.md`
2. `docs/agent/START_HERE.md`
3. `docs/agent/TASKS.md`
4. `docs/agent/CURRENT_SESSION.md`
5. `docs/agent/DECISIONS.md`
6. `docs/agent/KNOWN_ISSUES.md`
7. `docs/agent/DB_NOTES.md`
8. `docs/shipment-evidence-system.md`
