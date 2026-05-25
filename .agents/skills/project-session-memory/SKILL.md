---
name: project-session-memory
description: Use when starting, resuming, or closing work on a project that keeps operational memory in AGENTS.md and docs/agent/*. Reads project state at session start and updates CURRENT_SESSION.md, TASKS.md, DECISIONS.md, KNOWN_ISSUES.md, or DB_NOTES.md at session close.
---

# Project Session Memory

Use this skill when the user asks to:

- iniciar una sesion de trabajo en un proyecto
- retomar un proyecto
- cerrar sesion
- dejar memoria actualizada
- preparar handoff para el siguiente agente
- actualizar `docs/agent/` after technical work

## Project detection

If the user names a project, use that repo.

If the user does not name a project and the current repo has `docs/agent/START_HERE.md`, ask one short question before reading files:

> Quieres retomar este proyecto o iniciar otro?

For INTRA, if the chat or repo context clearly points to INTRA, proceed without asking.

## Session start workflow

1. Read `AGENTS.md` if present.
2. Read `docs/agent/START_HERE.md`.
3. Read the files listed there, usually:
   - `docs/agent/PROJECT_STATE.md`
   - `docs/agent/TASKS.md`
   - `docs/agent/CURRENT_SESSION.md`
   - `docs/agent/KNOWN_ISSUES.md`
   - `docs/agent/DECISIONS.md`
   - `docs/agent/DB_NOTES.md`
4. Reply with:
   - estado actual
   - tareas pendientes
   - riesgos activos
   - recomendacion de siguiente tarea
5. Do not modify code until the user confirms the task or gives a concrete instruction.

## During the session

Before code edits, identify:

- objective
- files likely to change
- validation command(s)
- risks

Keep work scoped to the selected task.

## Session close workflow

When the user says to close, pause, hand off, finish the session, or leave memory ready:

1. Inspect real repo state:
   - git status
   - touched files
   - validation results
   - commit id if one exists
2. Update `docs/agent/CURRENT_SESSION.md` with:
   - date
   - objective
   - files touched
   - changes made
   - decisions
   - pending items
   - risks
   - recommended next step
   - what the next agent must read
3. Update `docs/agent/TASKS.md`:
   - move completed tasks to Done Log only when actually completed
   - keep unfinished tasks with accurate state
   - add blockers if any
4. Update `docs/agent/DECISIONS.md` only when a durable technical/product decision was made.
5. Update `docs/agent/KNOWN_ISSUES.md` only when a real bug/risk remains open.
6. Update `docs/agent/DB_NOTES.md` if database, RLS, migrations, storage, payments, wallet, refunds, or payouts changed.
7. Report:
   - what changed
   - what was validated
   - commit short hash if created
   - whether it is local, branch, main, or production
   - pending push/deploy if applicable

## Rules

- Repo memory is the source of truth, not chat memory.
- Do not invent completed work.
- Do not delete completed tasks immediately; move them to Done Log.
- Keep `AGENTS.md` short. Put operational detail in `docs/agent/`.
- Keep `CURRENT_SESSION.md` concise and replaceable per session.
- Ask before push to `main` or production deploy unless the project rules explicitly authorize it.
