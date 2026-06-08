# Roadmap 3.5 — Migración del boceto de dashboard a `/app`

## Estado

Ejecutado / histórico.

Este documento se conserva como referencia del alcance aprobado para la migración 3.5, pero ya no debe tratarse como pendiente activo.

Estado real al 22 may 2026:

- `/app` ya fue migrado a dashboard con datos reales en PR #7.
- El dashboard tuvo refinamientos posteriores en PRs de UI/UX y responsive.
- La documentación de pendientes vigente debe vivir en la lista consolidada de pre-lanzamiento, no en este roadmap histórico.

---

## Regla principal, no negociable

La UI del boceto aprobado es la **fuente única de verdad visual** para 3.5.

Joy **no debe rediseñar**, reinterpretar, simplificar ni inventar una variante nueva del dashboard.
Lo que se debe hacer es una **migración fiel** del boceto hacia el proyecto real:

- misma jerarquía visual
- mismos bloques
- mismos CTAs
- mismo orden de secciones
- misma paleta base INTRA
- misma intención de conversión

Se permiten únicamente estos ajustes:

1. conectar datos reales
2. resolver responsive real
3. resolver estados vacíos / loading / error
4. adaptar acciones para que sean funcionales
5. corregir inconsistencias técnicas necesarias para producción

Si una decisión afecta el layout, copy principal o estructura del boceto, Joy debe **preguntar antes de improvisar**.

---

## Objetivo de 3.5

Convertir `/app` en un dashboard funcional de alta conversión, basado en el boceto aprobado, con:

- datos reales del usuario autenticado
- acciones reales sobre matches
- actividad reciente real
- métricas reales
- ingresos reales calculados desde pagos
- UX consistente en desktop y mobile

Resultado esperado:

- `/app` deja de ser una home básica con cards genéricas
- `/app` pasa a ser la **home operativa real del producto**
- la experiencia visual del boceto queda integrada en el código del repo
- todo debe quedar listo para seguir luego con 3.6 y 3.7

---

## Fuera de alcance de este roadmap

No entra en 3.5:

- rediseñar `/`
- rehacer landing pública
- cambiar el branding aprobado
- reescribir market completo
- reescribir matches completo
- reescribir chat completo
- meter pasarela de pagos real
- agregar features nuevos fuera del boceto

3.5 solo toca la **homepage interna autenticada**: `/app`.

---

## Estado actual del proyecto

### Ruta actual `/app`

Hoy `/app` tiene:

- saludo + datos básicos de perfil
- 4 tarjetas estáticas
- links rápidos a crear envío, publicar viaje, market y matches
- sin jerarquía de actividad real
- sin métricas de negocio
- sin ingresos
- sin feed operativo

### Funcionalidad ya existente y reutilizable

Joy debe reutilizar, no duplicar, lo que ya existe:

- `components/app-navbar.tsx`
- `components/notifications-bell.tsx`
- `app/app/matches/[id]/actions.ts`
  - `acceptMatchAction`
  - `rejectMatchAction`
  - `cancelMatchAction`
  - `markInTransitAction`
  - `confirmDeliveryAction`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/labels.ts` cuando sirva para status labels

### Tablas reales disponibles

- `profiles`
- `shipments`
- `trips`
- `matches`
- `messages`
- `payments`
- `notifications`
- `cities`

### RPCs reales disponibles

- `accept_match`
- `reject_match`
- `cancel_match`
- `mark_shipment_in_transit`
- `confirm_shipment_delivery`
- `mark_notification_as_read`
- `mark_all_notifications_as_read`

---

## Fuente visual a migrar

El boceto aprobado contiene, al menos, esta estructura visual:

1. saludo personalizado (`Hola, {nombre}`)
2. subtítulo / resumen de actividad
3. indicador corto tipo `+2 hoy`
4. bloque de métricas
   - envíos activos
   - viajes publicados
   - matches pendientes
   - entregas completadas
5. CTAs principales muy visibles
   - crear envío
   - publicar viaje
6. tarjetas operativas de envíos / matches / viajes
7. bloque `Actividad reciente`
8. bloque `Ganancias este mes`
9. estilo con predominio de verde INTRA (`#2ECC71`) y azul INTRA (`#0B2C4A`)

La migración debe conservar esa estructura.

---

## Arquitectura recomendada

### Principio de implementación

- `/app/page.tsx` debe seguir siendo **Server Component**
- las queries principales deben ejecutarse server-side
- las acciones inline deben vivir en Server Actions o reutilizar acciones existentes
- los componentes UI pueden dividirse en componentes de presentación
- los componentes con interacción puntual pueden ser client components mínimos

### División recomendada de archivos

#### Modificar

- `app/app/page.tsx`

#### Crear

- `app/app/_components/dashboard/DashboardGreeting.tsx`
- `app/app/_components/dashboard/DashboardMetrics.tsx`
- `app/app/_components/dashboard/DashboardPrimaryActions.tsx`
- `app/app/_components/dashboard/DashboardShipmentsPanel.tsx`
- `app/app/_components/dashboard/DashboardTripsPanel.tsx`
- `app/app/_components/dashboard/DashboardPendingMatchesPanel.tsx`
- `app/app/_components/dashboard/DashboardActivityPanel.tsx`
- `app/app/_components/dashboard/DashboardRevenuePanel.tsx`
- `app/app/_components/dashboard/DashboardEmptyState.tsx`
- `app/app/_components/dashboard/DashboardSkeleton.tsx`
- `app/app/_lib/dashboard-queries.ts`
- `app/app/_lib/dashboard-types.ts`
- `app/app/_actions/dashboard-actions.ts` (solo si hace falta wrapper; si no, reutilizar las acciones actuales de matches)

> Si Joy puede mantenerlo más simple sin perder claridad, puede reducir archivos. Pero la separación lógica debe mantenerse.

---

## Macro-subtareas oficiales de 3.5

Además del detalle técnico de este documento, el trabajo de 3.5 debe leerse con este desglose ejecutivo aprobado por Atlas.
Estas son las **subtareas oficiales y secuenciales** dentro de 3.5:

### 3.5.1 — Base: Layout + Navbar + tokens de diseño

- migrar la estructura base del boceto a la app real
- preservar la navbar actual salvo que exista conflicto funcional real
- definir tokens y utilidades visuales mínimas para que la UI se vea igual al mockup

### 3.5.2 — Queries de datos (Supabase server-side)

- resolver todas las consultas del dashboard desde server components / utilidades server-side
- no usar datos ficticios
- dejar la agregación lista para métricas, actividad, revenue, envíos, viajes y matches

### 3.5.3 — Componentes UI (métricas, envíos, viajes, actividad, ganancias)

- construir los bloques visuales del boceto exactamente igual
- separar presentación de agregación de datos
- conservar jerarquía visual y predominio de verde INTRA

### 3.5.4 — Integración: nueva `/app` como server component

- reemplazar la home autenticada actual por la nueva composición del dashboard
- mantener el auth gate actual y el flujo de navegación existente

### 3.5.5 — Acciones inline (Accept/Reject matches sin recargar)

- aceptar y rechazar desde `/app`
- reusar Server Actions / RPCs existentes
- revalidar rutas sin hard refresh innecesario

### 3.5.6 — Estados UX (loading skeletons, empty states, errores)

- skeleton real del layout
- estados vacíos por bloque
- errores locales por bloque sin romper toda la home

### 3.5.7 — Tests unit + e2e / smoke

- tests de helpers y agregaciones
- smoke de render del dashboard autenticado
- validación de acciones críticas donde aplique

### 3.5.8 — Deploy preview + aprobación

- publicar preview de la migración
- revisar visualmente contra el boceto
- ajustar solo diferencias necesarias antes del merge

## Lo que cubre 3.5

- datos reales de Supabase, no ficticios
- Server Components para queries (Next.js App Router)
- Server Actions para Accept/Reject sin recarga completa
- responsive mobile-first
- ganancias reales calculadas desde `payments`
- feed de actividad desde `notifications`
- empty states cuando no hay datos

## Lo que Joy debe evaluar explícitamente

> Nota historica: esta seccion pertenece al roadmap 3.5 y no es fuente UI/UX vigente. Desde la adopcion del Manual UI/UX INTRA v2.2, `Market` no debe tratarse como modulo activo ni aparecer como item oficial de navegacion mientras no este implementado formalmente.

1. si mantener un hamburger menu en mobile para `Market`, `Matches`, `Chat` y `Perfil`, porque el boceto no lo muestra pero la app real sí necesita navegación
2. si el sidebar del boceto se mantiene tal cual o se simplifica para convivir con la navbar actual sin romper el producto

> Si cualquiera de estos dos puntos obliga a alterar la estructura del mockup, Joy debe preguntar antes de implementar una variante.

---

## Contrato funcional de datos

## 3.5.1 — Tipos y contrato de dashboard

### Objetivo

Definir primero el shape exacto de datos que el dashboard necesita, para evitar que la UI se implemente con datos improvisados.

### Tipo raíz sugerido

```ts
type DashboardData = {
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    role: string | null;
    phone: string | null;
  };
  summary: {
    activityTodayCount: number;
    activeShipmentsCount: number;
    publishedTripsCount: number;
    pendingActionMatchesCount: number;
    completedDeliveriesCount: number;
  };
  activeShipments: DashboardShipmentCard[];
  publishedTrips: DashboardTripCard[];
  pendingActionMatches: DashboardPendingMatchCard[];
  recentActivity: DashboardActivityItem[];
  monthlyRevenue: DashboardRevenueSummary;
};
```

### Tipos mínimos por bloque

```ts
type DashboardShipmentCard = {
  id: string;
  code: string;
  title: string;
  routeLabel: string;
  weightKg: number | null;
  amountLabel: string;
  status: "open" | "matched" | "accepted" | "in_transit" | "delivered" | "cancelled";
  progressPercent: number;
  progressLabel: string;
};

type DashboardTripCard = {
  id: string;
  code: string;
  routeShortLabel: string;
  routeLabel: string;
  departureDateLabel: string;
  usedCapacityKg: number;
  totalCapacityKg: number;
  availabilityLabel: string;
  status: "open" | "full" | "completed" | "cancelled";
};

type DashboardPendingMatchCard = {
  id: string;
  shipmentId: string;
  shipmentCode: string;
  shipmentTitle: string;
  routeLabel: string;
  amountLabel: string;
  travelerName: string;
  travelerRatingLabel: string | null;
  travelerDepartureLabel: string;
  actionRequired: true;
};

type DashboardActivityItem = {
  id: string;
  icon: "match" | "shipment" | "message" | "trip" | "payment";
  title: string;
  relativeTimeLabel: string;
  href: string | null;
};

type DashboardRevenueSummary = {
  monthLabel: string;
  releasedAmount: number;
  releasedAmountLabel: string;
  deliveriesCount: number;
  averageTicketLabel: string;
  bestRouteLabel: string;
  deltaVsPreviousMonthLabel: string | null;
};
```

### Regla

No hardcodear datos ficticios en el dashboard final.
Todo label derivado debe salir de datos reales o de una función determinística.

---

## 3.5.2 — Queries server-side exactas

### Objetivo

Implementar `app/app/_lib/dashboard-queries.ts` con queries separadas, testeables y sin lógica mezclada con JSX.

### 1. Usuario / perfil

Fuente:

- `supabase.auth.getUser()`
- `profiles`

Query:

```ts
const { data: profile } = await supabase
  .from("profiles")
  .select("full_name, role, phone")
  .eq("id", user.id)
  .single();
```

### 2. Envíos activos del usuario

Fuente:

- `shipments`
- joins a `cities`

Criterio:

- `owner_id = user.id`
- status activos = `open`, `matched`, `accepted`, `in_transit`
- ordenar por `created_at desc`
- traer también los más recientes para las tarjetas

Query base:

```ts
const { data: shipments } = await supabase
  .from("shipments")
  .select(`
    id,
    kind,
    description,
    weight_kg,
    declared_value_cop,
    status,
    created_at,
    origin_city:cities!shipments_origin_city_id_fkey(name),
    destination_city:cities!shipments_destination_city_id_fkey(name)
  `)
  .eq("owner_id", user.id)
  .order("created_at", { ascending: false });
```

### 3. Viajes publicados del usuario

Fuente:

- `trips`
- joins a `cities`

Criterio:

- `traveler_id = user.id`
- contar publicados activos: `open`, `full`
- ordenar por `departure_date asc`

Query base:

```ts
const { data: trips } = await supabase
  .from("trips")
  .select(`
    id,
    departure_date,
    capacity_kg,
    status,
    created_at,
    origin_city:cities!trips_origin_city_id_fkey(name),
    destination_city:cities!trips_destination_city_id_fkey(name)
  `)
  .eq("traveler_id", user.id)
  .order("departure_date", { ascending: true });
```

### 4. Matches pendientes que requieren acción

Este bloque debe representar **solo los pending matches donde el usuario es dueño del shipment**, porque ahí sí hay acción real de aceptar/rechazar.

Fuente:

- `matches`
- join a `shipments`
- join a `trips`
- lookup de nombre del viajero en `profiles`

Query base:

```ts
const { data: pendingMatches } = await supabase
  .from("matches")
  .select(`
    id,
    status,
    created_at,
    shipment:shipments!matches_shipment_id_fkey(
      id,
      owner_id,
      kind,
      description,
      weight_kg,
      declared_value_cop,
      origin_city:cities!shipments_origin_city_id_fkey(name),
      destination_city:cities!shipments_destination_city_id_fkey(name)
    ),
    trip:trips!matches_trip_id_fkey(
      id,
      traveler_id,
      departure_date,
      capacity_kg
    )
  `)
  .eq("status", "pending")
  .order("created_at", { ascending: false });
```

Luego filtrar en servidor:

- shipment.owner_id === user.id

Luego consultar `profiles` con los `traveler_id` únicos para resolver nombre.

### 5. Entregas completadas

Criterio recomendado:

- shipments del usuario con `status = 'delivered'`

### 6. Actividad reciente

Fuente primaria:

- `notifications`

Criterio:

- `user_id = user.id`
- ordenar `created_at desc`
- limitar a 4 o 5

Query base:

```ts
const { data: notifications } = await supabase
  .from("notifications")
  .select("id, type, title, message, related_match_id, created_at")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
  .limit(5);
```

Mapeo mínimo:

- `match_accepted` → icon `match`
- `match_rejected` → icon `match`
- `match_cancelled` → icon `match`
- `new_message` → icon `message`
- si no hay tipo conocido, fallback por `title`

### 7. Indicador `+N hoy`

Criterio:

- contar notificaciones del día actual del usuario
- si el count es 0, mostrar `0 hoy`, no inventar crecimiento

### 8. Ganancias del mes

Fuente:

- `payments`
- `matches`
- `trips`
- `shipments`

Semántica recomendada para la UI actual:

- `Ganancias este mes` = pagos `released` de matches donde el usuario fue el **traveler**
- solo contar pagos del mes actual

Query sugerida en dos pasos:

1. traer matches del usuario como traveler
2. traer payments released por shipment_id

Si el modelo actual no permite un join limpio en una sola query por RLS, Joy debe hacerlo en memoria con dos consultas separadas.

Campos a derivar:

- total del mes
- cantidad de entregas pagadas
- ticket promedio
- mejor ruta
- delta vs mes anterior (si el cálculo es estable)

### Regla de robustez

Cada query debe tener manejo independiente de error.
Si una query falla, el dashboard no debe explotar completo.
Debe renderizar el resto y mostrar estado degradado solo en el bloque afectado.

---

## 3.5.3 — Mapeo exacto de UI por bloque

### Objetivo

Traducir el boceto a componentes reales, manteniendo la estructura exacta.

### Bloque A — Greeting / Hero superior

Debe incluir:

- saludo: `Hola, {nombre}`
- subtítulo: resumen de actividad
- badge corto tipo `+N hoy`

Reglas:

- si `full_name` no existe, usar email corto o `Hola` a secas
- no mostrar caracteres raros ni emojis rotos
- el badge `+N hoy` debe usar dato real, no placeholder

### Bloque B — Métricas rápidas

Debe mostrar exactamente cuatro métricas:

1. envíos activos
2. viajes publicados
3. matches pendientes
4. entregas completadas

Reglas:

- el diseño visual debe replicar el boceto
- el card destacado debe conservar el mismo énfasis que el mockup aprobado
- no reemplazar por cards genéricas de otra estética

### Bloque C — CTAs principales

Deben quedar arriba y con fuerte jerarquía visual:

- `Crear envío` → `/app/shipments/new`
- `Publicar viaje` → `/app/trips/new`

Reglas:

- estos CTAs no se reducen a botones secundarios
- deben quedar visualmente coherentes con la versión aprobada por Atlas/Aldo

### Bloque D — Tarjetas operativas

Debe existir una zona central con:

- envíos activos del usuario
- pending matches con acción inmediata
- viajes próximos / publicados

#### Tarjetas de envíos

Cada tarjeta debe resolver:

- código visible (`#ENV-xxxx`)
- título corto
- ruta
- peso
- monto visible en COP
- estado visible
- progress bar / estado traducido

Si no existe código real en DB:

- usar un código derivado y estable del UUID, por ejemplo:
  - `ENV-` + últimos 4-5 chars del id en upper

#### Tarjetas de pending matches

Cada tarjeta debe incluir:

- shipment relacionado
- copy de acción requerida
- nombre del viajero
- fecha estimada del viaje
- botón aceptar
- botón rechazar

Reglas:

- aceptar/rechazar debe usar las acciones reales ya existentes
- no duplicar lógica de negocio
- tras la acción debe haber revalidación de `/app`

#### Tarjetas de viajes

Cada tarjeta debe incluir:

- ruta corta (`BOG → CTG`) si puede derivarse
- fecha
- capacidad usada / total
- estado del viaje

Si no existe un cálculo limpio de capacidad usada en esta iteración:

- mostrar capacidad total real
- y dejar documentado `usedCapacityKg = 0` temporal como deuda técnica interna solo si de verdad no puede calcularse con los datos actuales
- pero **no inventar un número falso**

### Bloque E — Actividad reciente

Debe salir de `notifications`.

Cada ítem debe mostrar:

- título corto
- tiempo relativo (`Hace 15 min`, `Hace 2 horas`, etc.)
- icono consistente con el tipo
- link si aplica

### Bloque F — Ganancias este mes

Debe mostrar:

- monto total
- delta vs mes anterior si existe cálculo fiable
- número de entregas
- promedio por entrega
- mejor ruta

Si no hay revenue real:

- mostrar `0`
- mantener el bloque
- no ocultarlo

---

## 3.5.4 — Integración en `/app/page.tsx`

### Objetivo

Reemplazar la implementación actual de `/app` por la nueva home funcional.

### Qué debe hacer Joy

1. mantener auth gate actual
2. si no hay usuario, seguir mostrando `AuthGateway`
3. si hay usuario, cargar el dashboard nuevo
4. mantener `AppNavbar`
5. mantener `WelcomeModal` si todavía aplica al flujo actual
6. reemplazar el contenido central viejo por el dashboard nuevo

### Regla

No romper:

- login/register redirect flow
- middleware
- navbar actual
- notificaciones

---

## 3.5.5 — Acciones inline funcionales

### Objetivo

Hacer que la parte accionable del mockup funcione de verdad.

### Acciones mínimas

- aceptar match
- rechazar match
- navegar al detalle cuando aplique
- navegar al chat cuando aplique

### Implementación

Reutilizar las acciones existentes desde:

- `app/app/matches/[id]/actions.ts`

Si hace falta wrapper nuevo para `/app`, Joy puede crear:

- `app/app/_actions/dashboard-actions.ts`

Pero debe ser solo un adaptador, no una reimplementación de la lógica.

### Revalidaciones obligatorias

Después de aceptar o rechazar:

- `revalidatePath("/app")`
- `revalidatePath("/app/matches")`
- `revalidatePath(`/app/matches/${matchId}`)` si aplica

### UX mínima obligatoria

- estado loading en botones
- disabled mientras corre acción
- feedback de error si falla
- no recargar la página completa a lo bruto

---

## 3.5.6 — Estados UX reales

### Objetivo

Que la página no dependa de que siempre haya datos.

### Joy debe implementar

#### Loading

- `app/app/loading.tsx` o `DashboardSkeleton`
- skeleton que imite el layout real del boceto
- no spinner genérico solo en el centro

#### Empty states

Bloques mínimos con empty state:

- envíos
- viajes
- matches pendientes
- actividad reciente
- ganancias

Cada uno con copy claro y consistente.

#### Error states

Si falla un bloque:

- mostrar tarjeta de error local del bloque
- no reventar toda la página

Ejemplo:

- `No pudimos cargar tus envíos ahora mismo.`
- `Intenta nuevamente en un momento.`

---

## 3.5.7 — Responsive real

### Objetivo

Que el boceto migrado funcione en mobile de verdad.

### Reglas

- mobile-first
- sin solapes de badges
- sin botones demasiado pequeños
- sin texto ilegible sobre fondos oscuros
- sin cards cortadas horizontalmente

### Checklist mínimo

- greeting no rompe línea fea
- métricas apilan bien
- CTAs siguen dominando arriba
- pending match mantiene botones cómodos
- activity y revenue no quedan comprimidos
- navbar móvil sigue usable

Si el layout del boceto en desktop no cabe igual en mobile, Joy debe:

- preservar jerarquía
- reordenar verticalmente
- no cambiar el lenguaje visual

---

## 3.5.8 — Testing, preview y validación

### Validación técnica obligatoria

- `npm run test:unit`
- `npx tsc --noEmit`
- `npm run build`

### Tests recomendados

#### Unit

- helpers de mapeo de status → badge / progress
- helpers de formatting (`currency`, `relative time`, `code label`)
- helpers de agregación del dashboard

#### UI / smoke

- `/app` renderiza con usuario autenticado
- muestra métricas reales si hay datos
- acepta fallback vacío si no hay datos
- no rompe si revenue = 0

#### Manual

- usuario con envíos
- usuario con viajes
- usuario con pending matches
- usuario con cero actividad

### Preview obligatorio

Antes de pedir merge de 3.5, Joy debe dejar una preview desplegada para revisión del equipo.

Checklist mínimo en preview:

- `/app` se parece al boceto aprobado
- mobile no se rompe
- los CTAs navegan bien
- aceptar / rechazar funciona si hay matches pendientes
- métricas y revenue no muestran datos inventados

---

## 3.5.9 — Secuencia de ejecución recomendada

### PR 1 — 3.5.1 + 3.5.2 + 3.5.3 + 3.5.4

Incluye:

- base de layout
- navbar / convivencia con navegación actual
- tokens mínimos de diseño
- queries server-side
- componentes UI
- integración completa en `/app`

### PR 2 — 3.5.5 + 3.5.6

Incluye:

- accept / reject inline
- loading / empty / error states
- pulido de UX y responsive

### PR 3 — 3.5.7 + 3.5.8

Incluye:

- tests unit / smoke / e2e según aplique
- preview final
- revisión del equipo
- cierre de 3.5

> Recomendación oficial: **2 a 3 PRs máximo**, no fragmentar en 8 PRs individuales.
> Si Joy logra dejarlo estable en 2 PRs sin aumentar riesgo, mejor.

---

## Criterios de aceptación de 3.5

3.5 se considera lista solo si se cumplen todos:

- `/app` replica fielmente la UI del boceto aprobado
- no hay rediseño inventado por fuera del mockup
- todos los bloques usan datos reales o derivados determinísticos
- aceptar/rechazar pending matches funciona desde `/app`
- actividad reciente sale de `notifications`
- revenue sale de `payments` reales o muestra `0` de forma honesta
- loading / empty / error states existen
- mobile no rompe la jerarquía visual
- tests, typecheck y build pasan
- queda preview lista para revisión del equipo

---

## Puntos donde Joy debe preguntar antes de seguir

Joy debe pausar y preguntar si aparece cualquiera de estos casos:

1. el boceto requiere un dato que hoy no existe de forma fiable en DB
2. hay conflicto entre la UI exacta del mockup y la navegación actual
3. revenue mensual no puede calcularse con semántica clara
4. el sidebar / navbar del boceto contradice la navbar actual del producto
5. la capacidad usada del viaje no puede derivarse sin inventar lógica de negocio nueva
6. mantener la navbar actual entra en conflicto con un hamburger menu o sidebar del boceto
7. el sidebar del boceto obliga a alterar navegación, espacio o responsive más allá de una migración fiel

---

## Resumen ejecutivo para Joy

Tu trabajo en 3.5 no es diseñar otra home.
Tu trabajo es **migrar exactamente el boceto aprobado a `/app`**, conectarlo a Supabase real, mantenerlo usable en mobile y dejarlo productizable.

Traducción operativa:

- copia fiel del boceto
- queries reales
- acciones reales
- estados reales
- sin inventar UI nueva
- sin inventar datos falsos
- sin romper la app actual
