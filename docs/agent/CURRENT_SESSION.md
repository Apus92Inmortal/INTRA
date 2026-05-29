# INTRA - Current Session

## Fecha

2026-05-29

## Objetivo de la sesion

PR E: integrar evidencias operativas de recogida y entrega en `/app/matches/[id]`.

## Estado actual

- Rama local: `feat/match-detail-operational-evidence`
- Estado: PR abierto contra `main`, pendiente de QA autenticado/visual antes de merge
- PR: #112 - https://github.com/Apus92Inmortal/INTRA/pull/112
- Preview Vercel: https://intra-j17yvdpxs-aldo-antonio-altamar-cervantes-projects.vercel.app
- Main: no tocado
- Produccion: no tocada

## Archivos tocados

- `app/app/matches/[id]/page.tsx`
- `app/app/page.tsx`
- `app/app/matches/[id]/EvidenceUploader.tsx`
- `app/app/matches/[id]/ShipmentEvidencePanel.tsx`
- `components/evidence-image-preview.tsx`
- `docs/agent/TASKS.md`
- `docs/agent/CURRENT_SESSION.md`

## Cambios realizados

- Se agrego panel compacto `Evidencias del envio` en el detalle del match.
- El panel ahora muestra una sola evidencia principal progresiva:
  - `customer_initial_photo` antes de recogida.
  - `pickup_photo` despues de recoger.
  - `delivery_photo` despues de entregar.
- Las evidencias anteriores quedan en historial compacto para no competir visualmente.
- Las imagenes se muestran con signed URLs server-side de 600 segundos desde el bucket privado `shipment-evidence`.
- El viajero ya no puede marcar recogida sin subir `pickup_photo`: el boton abre modal, exige foto y descripcion, guarda evidencia y luego cambia estado.
- El viajero ya no puede reportar entrega sin subir `delivery_photo`: el boton abre modal, exige foto y descripcion, guarda evidencia y luego cambia estado.
- Se agrego modal para ver imagen grande desde miniaturas del match detail y desde la foto inicial visible en `/app`.
- En estados `completed` / `delivered`, el panel queda en modo lectura para este PR.
- `EvidenceUploader` quedo acotado a `pickup_photo` y `delivery_photo`, con validacion de imagen y limpieza best-effort si el upload pasa pero el insert falla.
- No se implemento realtime de evidencias.
- No se implemento paquete sospechoso adicional.
- No se implemento expediente admin.

## Validacion corrida

- `git diff --check`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:unit`
- `npm run build`
- `npm run test:e2e`
- GitHub check `detect-impact`
- GitHub check `validate`
- Vercel Preview deployment actualizado

## Validacion pendiente

- Smoke manual autenticado `/app/matches/[id]` como cliente y viajero: bloqueado en runtime local por falta de sesiones autenticadas/datos de prueba aprobados.
- Validacion visual autenticada 1440x800 y 1366x650: bloqueada por la misma razon.

## No tocado

- Wompi
- Checkout
- Wallet
- Payouts
- Refunds
- Auto-release
- Supabase migrations
- RLS
- Storage policies
- Admin disputes
- Realtime

## Riesgos abiertos

- La restriccion de viajero para upload queda aplicada en UI/client y por rol contextual del match detail. Las policies existentes de Storage/DB siguen siendo de participante del shipment porque PR E no toca RLS ni Storage policies.
- Las signed URLs vencen a los 10 minutos; si el usuario deja la pagina abierta mucho tiempo, puede requerir refresh.
- La otra parte puede no ver evidencia nueva en vivo hasta refrescar porque realtime de `shipment_evidence` queda fuera de PR E.

## Proximo paso recomendado

Completar validaciones, hacer commit local y reportar estado pre-PR para aprobacion de push/PR.

## Debe leer el proximo agente

1. `AGENTS.md`
2. `docs/agent/START_HERE.md`
3. `docs/agent/TASKS.md`
4. `docs/agent/CURRENT_SESSION.md`
5. `docs/agent/DECISIONS.md`
6. `docs/agent/KNOWN_ISSUES.md`
7. `docs/agent/DB_NOTES.md`
8. `docs/shipment-evidence-system.md`
