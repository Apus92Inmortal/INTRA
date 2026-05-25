# INTRA - Project State

## Resumen

INTRA es una plataforma peer-to-peer de envios aprovechando viajeros. Un usuario puede crear envios como cliente y tambien publicar viajes como viajero.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Database
- Supabase Realtime
- Supabase Storage cuando aplique
- Wompi checkout
- Vitest
- Playwright

## Flujos principales

1. Usuario se registra o inicia sesion.
2. Cliente crea un envio.
3. Viajero crea un viaje.
4. Sistema habilita oportunidades de match.
5. Match se acepta, rechaza o cancela.
6. Se habilita comunicacion operativa segun el estado del match.
7. Cliente paga por checkout.
8. Pago queda retenido operativamente.
9. Viajero transporta.
10. Cliente confirma entrega.
11. Se habilita liberacion o retiro segun reglas operativas.

## Areas existentes

- App autenticada: `/app`
- Market: `/app/market`
- Envios: `/app/shipments/new`
- Viajes: `/app/trips/new`
- Matches: `/app/matches`
- Pagos: `/app/payments/*`
- Wallet: `/app/wallet`
- Admin: `/app/admin/*`
- Legal operativo: `/app/legal/pagos`

## Referencias vigentes en `docs/`

- `docs/legal-operational-matrix-v1.md`
- `docs/phase-2-security-status.md`
- `docs/roadmap-3.5-dashboard-homepage.md`
- `docs/trip-publish-theme.md`

## Estado estable conocido

- La matriz legal operativa v1 ya quedo documentada.
- Fase 2 de seguridad quedo cerrada con salvedades.
- La migracion 3.5 del dashboard interno figura como historica, no como pendiente activo.
- El theme base aprobado para publicar viaje sirve como referencia visual para futuras pantallas.
