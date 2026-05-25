# INTRA - Current Session

## Fecha

2026-05-25

## Objetivo de la sesion

Documentar el diseno funcional/tecnico del sistema de evidencias de INTRA antes de tocar codigo, DB, Storage o RLS.

## Archivos tocados hoy

- `docs/agent/TASKS.md`
- `docs/agent/CURRENT_SESSION.md`
- `docs/agent/DB_NOTES.md`
- `docs/shipment-evidence-system.md`

## Cambios realizados

- Se creo `docs/shipment-evidence-system.md` con el diseno del sistema de evidencias.
- Se dejo documentada la regla oficial: evidencia prueba, paquete sospechoso alerta, disputa decide.
- Se documento que la evidencia inicial del cliente sera obligatoria.
- Se documento que el viajero debe ver la foto inicial desde `/app` antes de solicitar match.
- Se documento que la evidencia no libera pagos por si sola y no reemplaza confirmacion del cliente.
- Se documento que paquete sospechoso es una alerta independiente que puede usar evidencias.
- Se documento que disputa es un caso formal que puede usar evidencias, reporte sospechoso, chat, match, pago e historial.
- Se actualizo `TASKS.md` con criterios mas precisos para `TASK-004`.
- Se agrego nota en `DB_NOTES.md` sobre la migracion futura requerida para `customer_initial_photo`.

## Decisiones tomadas

- La memoria operativa oficial del proyecto queda dentro del repo.
- `AGENTS.md` queda como entrada corta y permanente.
- `docs/agent/` queda como memoria operativa extendida.
- `CURRENT_SESSION.md` se puede reescribir por sesion.
- `TASKS.md`, `DECISIONS.md`, `KNOWN_ISSUES.md` y `DB_NOTES.md` conservan historia util del proyecto.
- La skill de sesion debe servir para INTRA y para otros proyectos con estructura similar.
- `/app/market` no debe reconstruirse como pantalla independiente porque Market fue fusionado con `/app` como decision de producto.
- El siguiente frente real recomendado es seguridad operativa del envio: paquete sospechoso, evidencias y disputa.
- La evidencia inicial debe tener tipo semantico propio; no se recomienda guardarla como `package_state`.

## Pendiente para la proxima sesion

- Crear PR funcional pequeno para migracion de tipos de evidencia.
- Ampliar `shipment_evidence.evidence_type` antes de implementar `customer_initial_photo`.
- Luego implementar evidencia inicial obligatoria en checkout sin tocar reglas de Wompi, wallet, payouts, refunds o auto-release.
- Despues mostrar foto inicial en `/app` sin reconstruir `/app/market`.

## Riesgos detectados

- Si la memoria no se actualiza al cierre, el repo volvera a depender del chat.
- Si `TASKS.md` se convierte en backlog libre sin estados, perdera valor operativo.
- Si un PR documental incluye secretos por accidente, no debe mergearse hasta limpiar el historial afectado.
- `supabase/schema.sql` puede no reflejar exactamente todas las migraciones aplicadas.
- Cambios en RLS, RPCs, pagos, wallet, refunds o payouts requieren revision previa de `DECISIONS.md` y `DB_NOTES.md`.
- Cambios en UI deben respetar documentos visuales aprobados y validar mobile/viewports.
- Realtime incompleto puede producir estados viejos hasta que el usuario refresque, especialmente en pagos, evidencias, alertas y estados operativos de match/envio.
- Evidencias usan Storage y deben mantener policies seguras antes de ampliar lectura/visor.
- Disputas y alertas pueden afectar pagos/wallet, por lo que no deben mezclarse con cambios visuales sin analisis.
- El enum actual de `shipment_evidence.evidence_type` solo acepta `pickup`, `delivery` y `package_state`; usar `package_state` para evidencia inicial ensuciaria semantica.
- El viajero antes del match no es participante del shipment; mostrar evidencia inicial en `/app` requiere signed URLs server-side o una decision explicita de RLS.

## Proximo paso recomendado

Abrir PR pequeno de migracion para ampliar tipos de evidencia sin tocar UI ni pagos. Despues implementar evidencia inicial obligatoria en checkout.

## Debe leer el proximo agente

1. `AGENTS.md`
2. `docs/agent/START_HERE.md`
3. `docs/agent/TASKS.md`
4. `docs/agent/CURRENT_SESSION.md`
5. `docs/agent/DECISIONS.md`
6. `docs/agent/KNOWN_ISSUES.md`
