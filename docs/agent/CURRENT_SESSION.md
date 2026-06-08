# INTRA - Current Session

## Fecha

2026-06-07

## Objetivo de la sesion

Adoptar el Manual Oficial UI/UX INTRA v2.2 como fuente unica vigente para gobierno documental UI/UX del repo.

## Estado actual

- Rama de trabajo creada: `docs/adopt-uiux-manual-v2-2`.
- No se trabajo sobre `main`.
- No se hizo push a `main`.
- No se hizo deploy.
- El PDF adjunto por Aldo fue incorporado en:
  - `docs/ui-ux/Manual_UIUX_INTRA_v2_2.pdf`.
- Se creo la referencia rectora:
  - `docs/ui-ux/README.md`.
- Se actualizo memoria/instrucciones para declarar el Manual UI/UX INTRA v2.2 como fuente unica vigente:
  - `AGENTS.md`.
  - `README.md`.
  - `docs/agent/PROJECT_STATE.md`.
  - `docs/agent/DECISIONS.md`.
  - `docs/agent/TASKS.md`.
- Se reviso navegacion oficial:
  - `components/app-navbar-client.tsx` no contiene item oficial `Market`.
  - `/app/market` existe como redirect tecnico heredado hacia `/app`.
  - `MarketRealtime` y `MatchButton` viven integrados en `/app`, no como modulo oficial independiente.
- Se marco la mencion historica de Market en `docs/roadmap-3.5-dashboard-homepage.md` como referencia historica no vigente.

## Manual UI/UX vigente

El manual oficial y vigente de UI/UX para INTRA es:

`docs/ui-ux/Manual_UIUX_INTRA_v2_2.pdf`

El README rector esta en:

`docs/ui-ux/README.md`

Este manual reemplaza y deroga manuales anteriores, anexos tecnicos de viewport, anexos de QA visual, anexos de iconografia proporcional y documentos previos relacionados con reglas visuales de INTRA.

## Documentos antiguos encontrados

- No se encontraron manuales UI/UX anteriores ni anexos tecnicos UI/UX versionados en el arbol actual del repo.
- Referencia historica encontrada:
  - `docs/roadmap-3.5-dashboard-homepage.md`, menciona evaluar `Market` en navegacion mobile dentro de un roadmap historico.

## Archivos archivados o eliminados

- No se eliminaron ni archivaron documentos antiguos porque no habia manuales/anexos UI/UX antiguos versionados en el arbol actual.
- Se creo `docs/archive/ui-ux-derogados/` como ruta prevista para cualquier documento UI/UX derogado que aparezca posteriormente.

## Verificacion realizada

- `file docs/ui-ux/Manual_UIUX_INTRA_v2_2.pdf`: PDF valido, version 1.4, 21 paginas.
- Busqueda de manuales/anexos UI/UX antiguos en el repo excluyendo `node_modules`, `.next` y `.vercel`.
- Busqueda de referencias a:
  - `Manual UI/UX INTRA`.
  - `Manual Oficial UI/UX INTRA`.
  - `Anexo Tecnico`.
  - `Anexo Técnico`.
  - `QA Visual`.
  - `Iconografia`.
  - `Iconografía`.
  - `Design System anterior`.
  - `Market`.
- Revision de navegacion real:
  - `components/app-navbar-client.tsx`.
  - `components/app-navbar.tsx`.
  - `app/app/market/page.tsx`.

## Pendiente

- Ejecutar validaciones finales:
  - `git diff --check`.
  - validacion Markdown/grep final.
- Queda pendiente decision de Aldo antes de commit.

## Riesgos activos

- No se pudo extraer texto del PDF con la herramienta PDF del runtime, pero el archivo fue validado como PDF local de 21 paginas.
- `docs/roadmap-3.5-dashboard-homepage.md` sigue existiendo como documento historico; ya no debe usarse como fuente UI/UX vigente.

## Proximo paso recomendado

Si Aldo aprueba el diff documental, crear commit en la rama `docs/adopt-uiux-manual-v2-2` y luego, solo con aprobacion explicita, push/PR. No hacer deploy para este cambio documental.
