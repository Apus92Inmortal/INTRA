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

### TASK-003: Completar flujo de paquete sospechoso

Estado: TODO
Prioridad: Alta
Area: Matches / Shipments / Seguridad operativa

Criterios de aceptacion:

- El flujo queda definido con estados, permisos, copy y acciones permitidas.
- Se valida impacto sobre cliente, viajero, admin y soporte.
- No se cambia RLS, pagos ni estados criticos sin revisar `DB_NOTES.md` y matriz legal.

### TASK-004: Completar flujo de evidencias

Estado: TODO
Prioridad: Alta
Area: Matches / Shipments / Storage

Criterios de aceptacion:

- Queda definido como se suben, ven y protegen evidencias.
- Se aclara si requiere Supabase Storage, tabla nueva o policies.
- No se asocia liberacion de pago solo a carga de evidencia sin regla operativa aprobada.

### TASK-005: Completar flujo de disputa

Estado: TODO
Prioridad: Alta
Area: Disputas / Pagos / Wallet / Admin

Criterios de aceptacion:

- El flujo respeta ventana de disputa y copy aprobado en la matriz legal operativa.
- Queda claro que puede hacer cliente, viajero y admin.
- Se valida impacto en `payments`, `wallets`, `wallet_ledger`, refunds y payouts antes de implementar.

### TASK-006: Corregir eventos que no actualizan en vivo

Estado: TODO
Prioridad: Alta
Area: Realtime / UX operativa

Criterios de aceptacion:

- Identificar pantallas donde los cambios obligan a refrescar.
- Definir estrategia de realtime operativo o invalidacion/refetch.
- Validar matches, notificaciones, pagos, wallet y chat segun aplique.

## P2 - Medio

### TASK-002: Revisar proximo frente funcional con Atlas/Aldo

Estado: TODO
Prioridad: Media
Area: Planificacion tecnica

Criterios de aceptacion:

- El siguiente bloque queda definido con objetivo, alcance, riesgos y criterios de aceptacion.
- `CURRENT_SESSION.md` queda actualizado con el foco de trabajo.

Notas:

- Esta sigue siendo la tarea activa de planeacion: elegir cual de los frentes P1/P2 se implementa primero.

### TASK-007: Mejorar pantalla payment / checkout UI/UX

Estado: TODO
Prioridad: Media
Area: Pagos / UI

Criterios de aceptacion:

- Mejorar claridad visual sin cambiar reglas de pago.
- Respetar copy legal y matriz operativa vigente.
- Validar mobile y viewports base si se toca UI.

### TASK-008: Mejorar pantalla payment / success UI/UX

Estado: TODO
Prioridad: Media
Area: Pagos / UI

Criterios de aceptacion:

- Mejorar confirmacion, siguiente paso y estados post-pago.
- No cambiar estados de pago ni reglas de liberacion.
- Validar mobile y viewports base si se toca UI.

### TASK-009: Mejorar UI/UX del chat de cada match

Estado: TODO
Prioridad: Media
Area: Matches / Chat / UI

Criterios de aceptacion:

- Mejorar lectura, estados y experiencia operativa del chat.
- Respetar roles contextuales del match.
- Revisar realtime si el chat depende de actualizaciones en vivo.

### TASK-010: Evaluar mover verificacion fuera del perfil

Estado: TODO
Prioridad: Media
Area: Onboarding / Perfil / Verificacion

Criterios de aceptacion:

- Evaluar si la verificacion debe pasar del perfil al inicio del registro.
- Definir impacto en conversion, seguridad, friccion y flujos existentes.
- No implementar sin decision de producto aprobada.

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
- PR #104 fue mergeado a `main` actualizando el estado operativo posterior a los merges.

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
