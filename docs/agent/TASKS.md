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

### TASK-001: Mantener memoria operativa del repo

Estado: REVIEW
Prioridad: Alta
Area: Documentacion operativa / continuidad de agentes

Archivos relacionados:

- `AGENTS.md`
- `docs/agent/*`
- `.agents/skills/project-session-memory/SKILL.md`

Criterios de aceptacion:

- Existe estructura `docs/agent/`.
- Existe archivo de entrada `START_HERE.md`.
- Existen archivos para estado, tareas, decisiones, issues, DB y checklist de release.
- Existe skill reutilizable para inicio/cierre de sesion.
- La memoria queda versionada en el repo.

Notas:

- La estructura ya fue creada. Queda pendiente aprobacion humana y push/PR si corresponde.

## P2 - Medio

### TASK-002: Revisar proximo frente funcional con Atlas/Aldo

Estado: TODO
Prioridad: Media
Area: Planificacion tecnica

Criterios de aceptacion:

- El siguiente bloque queda definido con objetivo, alcance, riesgos y criterios de aceptacion.
- `CURRENT_SESSION.md` queda actualizado con el foco de trabajo.

---

## Done Log

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
