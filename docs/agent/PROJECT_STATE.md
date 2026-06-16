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

- `docs/ui-ux/Manual_UIUX_INTRA_v3_0_Oficial.pdf`
- `docs/ui-ux/README.md`
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
- Manual Oficial UI/UX INTRA v3.0 queda adoptado como fuente unica vigente para decisiones visuales. Manual UI/UX INTRA v2.2 y manuales anteriores quedan derogados.
- TASK-022 adopto foundation tecnica del Manual UI/UX INTRA v3.0 y quedo mergeada a `main` en PR #155, commit `20ef164`.
- Barrida UI/UX v2.2 con frentes iniciales cerrados:
  - Foundation components: PR #129 mergeado a `main`.
  - Auth Gateway: PR #130 mergeado a `main`.
  - Dashboard Home `/app`: PR #131 mergeado a `main`, QA visual aprobado por Aldo, QA data `QA_DASHBOARD_20260608` limpiada y verificada en `0`.
  - Landing publica `/`: PR #132 mergeado a `main`, CTA navbar `Registrarse gratis` -> `Registrarse`.
- TASK-021 quedo cerrada como barrida UI/UX final v2.2.

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

La auditoria funcional full ya fue cerrada y la etapa funcional minima quedo validada. La barrida UI/UX v2.2 quedo cerrada y el Manual UI/UX INTRA v3.0 queda adoptado para la siguiente etapa UI/UX.

Los frentes iniciales y cierre final de UI/UX v2.2 ya quedaron cerrados e integrados en `main`.

Siguiente pendiente recomendado, solo cuando Aldo lo ordene: barrida UI/UX pantalla por pantalla contra Manual UI/UX INTRA v3.0, empezando por pantallas operativas principales y uso real de componentes foundation.

Cualquier ajuste UI/UX debe validarse contra el Manual UI/UX INTRA v3.0 antes de implementarse. Si una pantalla contradice el manual, primero se reporta la contradiccion y se propone correccion, excepcion, anexo o nueva regla.
