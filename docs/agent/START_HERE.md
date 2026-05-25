# START HERE - INTRA Agent Context

Este directorio es la memoria operativa versionada de INTRA.

Antes de modificar codigo, lee estos archivos en este orden:

1. `docs/agent/PROJECT_STATE.md`
2. `docs/agent/TASKS.md`
3. `docs/agent/CURRENT_SESSION.md`
4. `docs/agent/KNOWN_ISSUES.md`
5. `docs/agent/DECISIONS.md`
6. `docs/agent/DB_NOTES.md`
7. `docs/agent/RELEASE_CHECKLIST.md`

## Reglas

- No asumir contexto del chat como verdad principal.
- No modificar flujos criticos sin revisar `PROJECT_STATE.md`.
- No cambiar UI sin respetar los documentos visuales aprobados en `docs/`.
- No cambiar base de datos sin registrar la nota correspondiente en `DB_NOTES.md`.
- No tocar pagos, wallet, refunds, payouts o RLS sin revisar `DECISIONS.md` y `DB_NOTES.md`.
- Al iniciar una sesion, resumir estado actual, tareas pendientes y riesgos activos.
- Al cerrar una sesion, actualizar `CURRENT_SESSION.md` y `TASKS.md`.
- Si hubo una decision nueva, actualizar `DECISIONS.md`.

## Comando operativo recomendado al iniciar

Lee `AGENTS.md` y `docs/agent/START_HERE.md`; luego dime:

1. Estado actual del proyecto.
2. Tareas pendientes.
3. Riesgos activos.
4. Que tarea recomiendas trabajar hoy.

No modifiques codigo hasta que exista una tarea concreta.
