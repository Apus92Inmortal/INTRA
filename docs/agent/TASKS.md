# INTRA - Active Tasks

## Convencion de estados

- TODO: pendiente
- IN_PROGRESS: en trabajo
- BLOCKED: bloqueado
- REVIEW: pendiente revision
- DONE: terminado

---

## P0 - Critico

No hay P0 activo registrado en esta memoria inicial.

## P1 - Alto

No hay P1 activo registrado despues del merge de la memoria operativa.

## P2 - Medio

### TASK-002: Revisar proximo frente funcional con Atlas/Aldo

Estado: TODO
Prioridad: Media
Area: Planificacion tecnica

Criterios de aceptacion:

- El siguiente bloque queda definido con objetivo, alcance, riesgos y criterios de aceptacion.
- `CURRENT_SESSION.md` queda actualizado con el foco de trabajo.

Notas:

- Esta es la siguiente tarea activa despues de cerrar la memoria operativa del repo.

---

## Done Log

### TASK-001: Mantener memoria operativa del repo

Estado: DONE
Fecha: 2026-05-25
Resumen:

- Se creo `AGENTS.md` como entrada operativa del repo.
- Se creo `docs/agent/` con estado, tareas, sesion, decisiones, riesgos, DB notes y checklist de release.
- Se agrego `.agents/skills/project-session-memory/SKILL.md` para inicio/cierre de sesiones.
- PR #102 fue mergeado a `main` con la memoria operativa base.
- PR #103 fue mergeado a `main` con limpieza Markdown y normalizacion de LF.

### TASK-HIST-001: Matriz legal operativa v1

Estado: DONE
Fecha: 2026-05-23
Resumen:

- La matriz legal operativa v1 quedo documentada en `docs/legal-operational-matrix-v1.md`.
- Existe migracion relacionada: `supabase/migrations/202605231700_legal_operational_matrix_v1.sql`.

### TASK-HIST-002: Dashboard interno 3.5

Estado: DONE
Fecha: 2026-05-22
Resumen:

- La migracion 3.5 del dashboard interno quedo marcada como historica en `docs/roadmap-3.5-dashboard-homepage.md`.
