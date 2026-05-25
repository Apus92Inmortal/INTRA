# INTRA - Shipment Evidence System

## Regla oficial

Evidencia prueba. Paquete sospechoso alerta. Disputa decide.

## Objetivo

Disenar el sistema de evidencias de INTRA antes de implementar codigo, cambios de base de datos, Storage o RLS. Este documento gobierna el Frente A de seguridad operativa del envio.

## Separacion conceptual

### Evidencias

Las evidencias son pruebas visuales o notas operativas sobre el estado del paquete. Sirven como trazabilidad para cliente, viajero y admin.

Las evidencias:

- Prueban estado o contexto del paquete.
- Pueden soportar un reporte de paquete sospechoso.
- Pueden alimentar una disputa formal.
- No liberan pagos por si solas.
- No reemplazan la confirmacion del cliente.
- No cambian reglas de Wompi, wallet, payouts, refunds o auto-release.

### Paquete sospechoso

Paquete sospechoso es una alerta operativa cuando el viajero detecta que algo no cuadra.

El reporte:

- Es independiente de la evidencia.
- Puede vincular una o varias evidencias como soporte.
- Debe incluir motivo.
- Debe ser visible para cliente y admin segun permisos.
- No debe tomar decisiones automaticas peligrosas sobre pagos.
- Puede escalar a disputa si admin lo determina.

### Disputa

La disputa es el caso formal de revision y decision cuando hay conflicto.

Una disputa puede usar como soporte:

- Evidencia inicial del cliente.
- Evidencia de recogida.
- Evidencia de paquete sospechoso.
- Evidencia de entrega.
- Reporte sospechoso.
- Chat.
- Match.
- Pago.
- Historial operativo.

## Flujo funcional

### 1. Creacion de envio

Actor: cliente.

El cliente debe subir una foto inicial obligatoria del paquete cerrado o empaque antes de publicar el envio.

Copy base:

> Sube una foto clara del paquete cerrado para que el viajero pueda verificar su estado antes de aceptar transportarlo.

Visibilidad:

- Cliente: puede verla como evidencia inicial de su envio.
- Viajero: debe verla desde `/app` antes de solicitar match.
- Admin: debe verla dentro del expediente operativo.

Estados:

- Cambia: se registra evidencia inicial del envio.
- No cambia: pago, wallet, match, disputa, auto-release.

Riesgo cubierto:

- Reduce diferencias entre descripcion textual y estado real inicial.
- Permite que el viajero decida con mas contexto antes de solicitar match.

### 2. Vista del viajero antes del match

Actor: viajero.

El viajero debe ver desde `/app`:

- Foto inicial del paquete.
- Ruta.
- Peso.
- Tipo.
- Descripcion.
- Ganancia estimada cuando aplique.

Estados:

- Cambia: nada.
- No cambia: match, pago, envio, disputa.

Nota futura:

Si la foto inicial no es suficiente, puede evaluarse una accion de solicitar correccion o mas informacion. No forma parte del primer alcance funcional.

### 3. Evidencia de recogida

Actor: viajero.

Cuando el viajero recibe el paquete, debe subir evidencia de recogida o estado recibido.

La evidencia debe permitir nota corta o estado operativo, por ejemplo:

- cerrado
- golpeado
- abierto
- mojado
- no coincide
- sospechoso

Estados:

- Cambia: se registra evidencia de recogida.
- No cambia: liberacion de pago ni confirmacion de cliente.

Riesgo cubierto:

- Permite comparar contra la foto inicial del cliente.

### 4. Paquete sospechoso

Actor: viajero.

Si el viajero detecta algo raro, puede reportar paquete sospechoso.

El reporte debe:

- Ser independiente de evidencia.
- Permitir vincular evidencia como soporte.
- Incluir motivo.
- Dejar visible el caso para cliente y admin segun permisos.
- Evitar decisiones automaticas sobre pagos.
- Poder alimentar una disputa si escala.

Estados:

- Cambia: se registra o actualiza alerta operativa.
- No cambia: Wompi, wallet, payouts, refunds, auto-release.

### 5. Evidencia de entrega

Actor: viajero.

Antes de reportar entrega, el viajero debe poder subir evidencia de entrega.

Estados:

- Cambia: se registra evidencia de entrega.
- No cambia: confirmacion del cliente.

Regla:

La evidencia de entrega no reemplaza la confirmacion del cliente.

### 6. Disputa

Actores: cliente y admin.

La disputa es el caso formal. Admin debe poder revisar:

- Evidencia inicial del cliente.
- Evidencia de recogida.
- Evidencia de paquete sospechoso si existe.
- Evidencia de entrega.
- Reporte sospechoso.
- Chat.
- Match.
- Pago.
- Historial operativo.

Estados:

- Cambia: estado formal de disputa segun flujo existente.
- No cambia: integracion Wompi ni reglas de wallet sin analisis especifico.

## Auditoria del repo

### Existe

- `app/app/matches/[id]/EvidenceUploader.tsx`
- `app/app/matches/[id]/SuspiciousReportForm.tsx`
- `app/app/matches/[id]/page.tsx`
- `app/app/matches/[id]/actions.ts`
- `app/app/matches/[id]/chat/page.tsx`
- `app/app/matches/[id]/chat/MatchChatClient.tsx`
- `app/app/admin/disputes/page.tsx`
- `app/app/admin/disputes/DisputesReviewClient.tsx`
- `app/app/admin/actions.ts`
- `app/app/shipments/new/NewShipmentForm.tsx`
- `app/app/payments/checkout/CheckoutClient.tsx`
- `app/app/page.tsx`
- `app/app/_lib/dashboard-queries.ts`
- `app/app/market/MatchButton.tsx`
- Tabla `shipment_evidence`
- Tabla `shipment_report_events`
- Bucket privado `shipment-evidence`
- Policies de Storage para evidencia de envio
- RPC `open_dispute`
- RPC `create_shipment_with_payment_draft`

### Reutilizable

- `lib/uploads.ts` para comprimir imagenes.
- `EvidenceUploader.tsx` como base para recogida y entrega.
- `SuspiciousReportForm.tsx` como base para alerta de paquete sospechoso.
- Admin disputes/alerts como base para expediente operativo.
- `/app` como experiencia integrada de oportunidades y matches.

### Incompleto

- No hay evidencia inicial obligatoria en creacion de envio.
- `EvidenceUploader.tsx` no esta integrado en match detail.
- No hay listado o visor de evidencias.
- `/app` no consulta ni renderiza foto inicial del paquete para el viajero.
- Admin no carga evidencias dentro de disputas/alertas.
- Chat no muestra acceso contextual a evidencias o disputa.
- Realtime no escucha `shipment_evidence` ni `shipment_report_events` en match detail.

## Modelo de datos recomendado

Campos recomendados para evidencia:

- `shipment_id`: obligatorio.
- `match_id`: opcional antes del match, requerido cuando ya existe match.
- `uploaded_by`: obligatorio.
- `evidence_type`: obligatorio.
- `file_path` o `storage_path`: obligatorio para fotos.
- `note`: opcional.
- `created_at`: obligatorio.

Tipos recomendados:

- `customer_initial_photo`
- `pickup_photo`
- `pickup_condition_note`
- `suspicious_photo`
- `suspicious_report_note`
- `delivery_photo`
- `delivery_note`
- `admin_resolution_note`

## Salvedad tecnica actual

La tabla `shipment_evidence` existe, pero el constraint actual de `evidence_type` solo acepta:

- `pickup`
- `delivery`
- `package_state`

Para no ensuciar semantica, se recomienda una migracion futura que amplie `shipment_evidence.evidence_type` antes de implementar `customer_initial_photo` como tipo real.

Alternativa temporal no recomendada:

- Guardar la evidencia inicial como `package_state`.

Motivo para no recomendarla:

- Mezcla evidencia inicial del cliente con estado operativo posterior del paquete.
- Dificulta filtros, UI y expediente admin.

## UI/UX propuesta

### Creacion de envio

Agregar bloque de foto inicial del paquete.

Requisitos:

- Mobile-first.
- Preview antes de continuar.
- Error claro si falta foto.
- Copy de confianza y trazabilidad.

Nota tecnica:

`NewShipmentForm` hoy envia datos al checkout por query params. Como el archivo no puede viajar por URL y el `shipment_id` nace en checkout, la integracion funcional debe resolverse en `CheckoutClient` despues de crear el shipment y antes de redirigir a Wompi.

### `/app` oportunidades y matches

Mostrar miniatura de la evidencia inicial en cada envio compatible.

No reconstruir `/app/market`; Market vive integrado en `/app`.

### Match detail

Agregar panel de evidencias:

- Inicial del cliente.
- Recogida.
- Paquete sospechoso.
- Entrega.

### Chat de match

Agregar acceso rapido al detalle/evidencias, sin convertir el chat en expediente completo en el primer alcance.

### Admin disputes

Agregar expediente de evidencias en disputas y alertas.

Admin debe poder revisar evidencias junto con match, pago, reporte y chat.

## Seguridad y privacidad

Las fotos pueden contener:

- Rostros.
- Direcciones.
- Etiquetas.
- Documentos.
- Datos personales.

Reglas:

- Mantener bucket privado.
- Usar signed URLs de corta duracion para mostrar imagenes.
- Evitar exponer evidencias a usuarios no relacionados.
- No publicar paths como URLs publicas.
- Mantener acceso por roles contextuales: cliente, viajero relacionado y admin.
- Definir retencion o borrado de evidencias en una decision posterior.
- No liberar pagos solo por evidencia.

Consideracion antes del match:

El viajero que ve oportunidades en `/app` todavia no es participante del shipment. Para mostrar la foto inicial sin ampliar RLS de forma riesgosa, se recomienda generar signed URLs server-side solo para viajeros con viaje compatible y envio payment-ready.

## Propuesta de PRs

### PR A: Diseno tecnico y memoria

Documentar este diseno y actualizar memoria operativa.

No toca app, DB, Storage, RLS ni pagos.

### PR B: Migracion minima de tipos de evidencia

Ampliar `shipment_evidence.evidence_type` para incluir tipos semanticos reales, empezando por `customer_initial_photo`, `pickup_photo`, `suspicious_photo` y `delivery_photo`.

### PR C: Evidencia inicial obligatoria

Integrar foto inicial en el flujo de checkout antes de redirigir a Wompi.

### PR D: Foto inicial visible al viajero en `/app`

Mostrar evidencia inicial en oportunidades/matches con signed URLs server-side.

### PR E: Evidencia de recogida y entrega

Integrar carga/listado de evidencias en match detail.

### PR F: Paquete sospechoso con evidencias

Conectar reporte sospechoso con evidencias de soporte.

### PR G: Expediente admin

Mostrar evidencias en disputas/alertas admin.

### PR H: Realtime operativo

Actualizar match detail/admin para escuchar `shipment_evidence` y `shipment_report_events` cuando aplique.

## Primer PR funcional recomendado despues de este documento

Rama sugerida:

- `feat/shipment-evidence-types`

Titulo:

- `Add shipment evidence types`

Objetivo:

- Preparar la base semantica para evidencia inicial y evidencias operativas sin mezclar tipos.

Archivos candidatos:

- Nueva migracion en `supabase/migrations/`.
- `docs/agent/DB_NOTES.md`.
- `docs/agent/CURRENT_SESSION.md`.

No tocar:

- Wompi.
- Wallet.
- Payouts.
- Refunds.
- Auto-release.
- UI de pagos.

Validaciones:

- Revisar constraint previo.
- Validar que tipos existentes sigan funcionando.
- `git diff --check`.
- Validacion tecnica aplicable del repo.

Riesgos:

- Romper inserts actuales de `EvidenceUploader.tsx` si se cambia el constraint de forma incorrecta.
- Mezclar cambios de DB con UI obligatoria en el mismo PR.

## Criterios de aceptacion del sistema completo

- Cliente sube evidencia inicial obligatoria.
- Viajero ve foto inicial antes de solicitar match desde `/app`.
- Viajero sube evidencia de recogida y entrega.
- Viajero reporta paquete sospechoso con evidencia si aplica.
- Admin revisa expediente con evidencias, alerta, disputa, chat, match y pago.
- Evidencia no libera pagos por si sola.
- Evidencia no reemplaza confirmacion del cliente.
- Disputa sigue siendo el mecanismo formal de decision.
