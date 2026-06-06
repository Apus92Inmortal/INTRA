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
10. Se registran evidencias de recogida y entrega.
11. Cliente confirma entrega o abre disputa.
12. Si no hay disputa, se habilita liberacion del saldo al wallet del viajero segun reglas operativas.
13. Viajero solicita retiro.
14. Admin gestiona verificaciones, retiros, disputas y operaciones criticas.
15. Al completar el proceso, ambas partes pueden calificarse.

## Areas existentes

- App autenticada: `/app`
- Market integrado: `/app`
- Redirect tecnico heredado: `/app/market` redirige a `/app`; no debe reconstruirse como pantalla independiente.
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
- Market fue fusionado con `/app` como decision de producto; cualquier mejora debe mantener la experiencia integrada de dashboard, oportunidades y matches.
- PR #116 quedo mergeado y produccion contiene realtime/fallback visible-aware para `/app`, `/app/matches`, `/app/matches/[id]` y `/app/admin/disputes`.

## Secuencia oficial vigente

1. Auditoria funcional full del repo.
2. Cierre de flujos faltantes por PRs pequenos.
3. Hardening tecnico final.
4. Pruebas end-to-end.
5. QA de pagos, wallet, disputas y seguridad.
6. UI/UX final.
7. QA visual responsive.
8. Pruebas finales antes de lanzamiento.
9. Lanzamiento MVP controlado.

## Fase inmediata

La siguiente fase no es UI/UX. La prioridad inmediata es una auditoria funcional full del repo para identificar el estado real de flujos de negocio, seguridad, pagos, wallet, retiros, evidencias, disputas, reviews, admin, RLS, RPCs, webhooks, variables de entorno y pruebas.

La auditoria debe ignorar por completo diseno visual, tokens, colores, tipografia, responsive, mockups, conversion visual, layout visual y QA visual. La UI/UX queda reservada para una etapa posterior, antes de las pruebas finales y el lanzamiento.
