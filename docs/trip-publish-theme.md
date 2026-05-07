# INTRA — Theme base desde la pantalla "Publicar viaje"

## Objetivo del estilo
Construir una UI premium, limpia y confiable que mezcle:
- sensación de producto moderno
- lenguaje visual de viaje / aviación
- claridad operativa para completar formularios rápido
- confianza visual sin verse rígida o corporativa en exceso

Esta pantalla funciona como referencia para llevar el mismo lenguaje al resto de módulos de INTRA.

---

## Idea central del theme
El theme de esta pantalla combina 4 cosas:

1. **Base clara y aireada**
   - fondos muy suaves azul-gris
   - cards blancas con borde sutil
   - bastante respiración visual

2. **Marca fuerte en azul oscuro**
   - el azul profundo carga la identidad, headings, iconos principales y jerarquía
   - transmite confianza, orden y producto serio

3. **Acento verde de acción/éxito**
   - usado para estados listos, CTA principal y señales positivas
   - da sensación de avance, validación y movimiento

4. **Micro-lenguaje de aviación/logística premium**
   - ruta visual
   - códigos de ciudad
   - resumen operativo en vivo
   - secciones tipo flujo de preparación de viaje

---

## Personalidad visual
La personalidad de este estilo es:
- **premium pero no lujoso exagerado**
- **moderno pero fácil de usar**
- **ligero visualmente**
- **confiable**
- **amigable con tareas reales**
- **más dashboard limpio que landing publicitaria**

En una frase:

> "Una interfaz de operación elegante para viajar, coordinar y confiar."

---

## Estructura base de pantalla
La estructura aprobada en esta vista es:

### 1. Hero superior compacto
- título principal arriba
- subtítulo corto de contexto
- no roba demasiada altura
- sirve para dar orientación emocional sin estorbar la tarea

### 2. Layout principal en 2 columnas
- **izquierda:** formulario principal
- **derecha:** resumen en vivo + estados + confianza

Este patrón funciona muy bien para INTRA porque:
- el usuario llena a la izquierda
- valida mentalmente a la derecha
- reduce error sin meter modales o pasos extra

### 3. Formulario agrupado por bloques
Cada bloque tiene:
- número de paso
- título corto
- subtítulo breve
- contenido del paso

Esto hace que formularios largos se sientan cortos.

### 4. Resumen lateral vivo
El resumen no es decorativo.
Debe:
- reflejar el estado real del formulario
- marcar si está listo o pendiente
- resumir datos clave
- reforzar confianza y claridad

---

## Componentes clave del theme

### A. Card principal
Uso:
- formulario
- resumen
- módulos agrupados

Características:
- fondo blanco
- borde suave azul-gris
- radio amplio
- sombra muy ligera

Sensación:
- limpia
- premium
- estable

### B. Section Header numerado
Uso:
- dividir formularios por etapas

Características:
- cápsula o badge de número
- color verde suave o fondo claro
- título corto
- texto de apoyo pequeño

Beneficio:
- baja la carga cognitiva
- da sensación de progreso aunque no sea wizard

### C. Route Graphic
Uso:
- representar origen → destino

Características:
- línea punteada
- icono central de avión
- nodos laterales con iconos
- nombre de ciudad + código IATA o fallback

Regla:
- si no hay data, mostrar placeholder real (`N/A`), nunca datos fake

### D. Summary Rows
Uso:
- ruta
- fecha/hora
- capacidad
- vuelo

Características:
- fila compacta
- icono minimalista a la izquierda
- label pequeño
- value fuerte alineado a la derecha
- truncado elegante si hace falta

### E. Status Badge
Uso:
- estado del resumen o flujo

Reglas:
- `Pendiente` = ámbar
- `Listo` = verde
- evitar labels ambiguos tipo `Borrador` cuando en realidad faltan obligatorios

### F. Toggle Chips / Preference Toggles
Uso:
- frágiles
- múltiples paquetes
- paradas

Características:
- compactos
- claros
- sin texto largo innecesario
- fácil lectura horizontal

### G. CTA Buttons
Dos niveles:
- **Primario**: verde, sólido, con icono
- **Secundario**: blanco con borde, texto azul oscuro, con icono

Regla:
- iconos minimalistas a la izquierda
- labels directos
- no meter demasiados botones

---

## Paleta de colores

## 1. Colores de marca principales
- **Azul principal:** `#0B2C4A`
  - headings
  - iconografía principal
  - texto importante
  - acentos de estructura

- **Verde principal:** `#2ECC71`
  - CTA primario
  - confirmaciones
  - progreso listo

- **Verde oscuro de soporte:** `#1E8C4E`
  - texto sobre badges verdes
  - énfasis de éxito

## 2. Fondos base
- **Fondo general página:** `#EEF4F8`
- **Cards y superficies altas:** `#FFFFFF`
- **Fondos suaves secundarios:**
  - `#FBFDFF`
  - `#F8FBFD`
  - `#FCFEFF`
  - `#F4F8FB`

## 3. Bordes y separadores
- **Borde principal suave:** `#D7E5F1`
- **Borde secundario:** `#E3EDF5`
- **Separadores internos:** `#E9F0F6`

## 4. Estados positivos
- **Background listo:** `#EAFBF1`
- **Surface positiva suave:** `#EFFBF4`
- **Border positiva:** `#BEE8CD`

## 5. Soporte visual ruta / travel
- **Línea/acento travel:** `#8EC6AE`
- **Gradientes suaves de route card:**
  - `#F9FCFE`
  - `#F3F8FC`

## 6. Texto complementario
- **Texto apoyo oscuro suave:** `#3B5B4B`
- además se usan grises/slate para texto secundario y placeholders

## 7. Estado pendiente / warning
Para pendientes se está usando familia **ámbar**:
- fondo ámbar suave
- texto ámbar medio/oscuro
- ideal para “faltan datos”, “en revisión”, “pendiente”

Recomendación:
- formalizar estos tokens como:
  - `status.pending.bg`
  - `status.pending.text`
  - `status.pending.border`

---

## Jerarquía tipográfica

### Títulos
- peso alto
- color azul principal
- tracking limpio
- compactos, sin demasiado interlineado

### Labels
- mayúscula pequeña
- tracking amplio
- tamaño chico
- color slate/gris

### Valores/resumen
- más peso
- alineación limpia
- una sola línea si es posible

### Subtextos
- tamaño pequeño
- tono gris/verde suave según contexto
- deben ayudar, no competir

---

## Espaciado y densidad
Este theme no es minimalismo vacío.
Es **compactación premium**.

Eso significa:
- menos altura desperdiciada
- cards más cerradas
- buena alineación
- suficiente aire para no sentirse apretado

Regla práctica:
- compactar verticalmente primero
- solo permitir scroll cuando de verdad la altura no alcanza
- nunca usar escalado artificial (`scale`)

---

## Responsive behavior aprobado

### Desktop / laptop
- idealmente ver casi todo sin scroll excesivo
- dos columnas
- resumen lateral siempre visible dentro del flujo

### Desktop de poca altura
- reducir spacing real
- reducir subtítulos o esconder algunos secundarios si hace falta
- mantener integridad del layout
- si no cabe, permitir scroll antes que clipping

### Mobile
- puede hacer scroll normal
- priorizar legibilidad y secuencia vertical

---

## Reglas UX de este estilo

1. **Nunca mostrar data fake por defecto**
   - usar `N/A`, `Por definir` o vacío útil

2. **No castigar antes de tiempo**
   - los errores obligatorios aparecen después del intento de submit
   - mientras el usuario llena, no inundar de rojo

3. **El resumen debe hablar el idioma del estado real**
   - `Pendiente` si faltan obligatorios
   - `Listo` cuando ya está completo

4. **Los subtítulos sí importan si generan confianza**
   - especialmente en resumen y privacidad
   - pero deben ser cortos y discretos

5. **La columna derecha no es adorno**
   - debe ser útil, viva y validadora

6. **Menos CTAs, mejor**
   - uno principal
   - uno secundario
   - nada más salvo necesidad real

---

## Qué define realmente este theme
Si esto se quiere replicar en otras pantallas, lo que hay que conservar no es solo “los mismos colores”.
Hay que conservar estas 6 reglas:

1. **Base clara + cards blancas premium**
2. **Azul oscuro como columna vertebral**
3. **Verde como señal de acción/logro**
4. **Estados muy claros y útiles**
5. **Layout operativo con resumen o contexto vivo**
6. **Compactación elegante, no pantalla gigante vacía**

---

## Recomendaciones para convertir esto en sistema reutilizable

## Fase 1 — Extraer tokens
Crear tokens base para:
- colores
- radios
- sombras
- spacing
- tamaños de badge
- tamaños de botones

Ejemplo:
- `brand.navy`
- `brand.green`
- `surface.page`
- `surface.card`
- `border.soft`
- `status.success.*`
- `status.pending.*`

## Fase 2 — Crear componentes reutilizables
Conviene convertir esto en componentes compartidos:

- `PageHeroCompact`
- `FormSectionCard`
- `SectionStepHeader`
- `StatusBadge`
- `RouteGraphic`
- `SummaryPanel`
- `SummaryRow`
- `PreferenceToggle`
- `PrimaryActionButton`
- `SecondaryActionButton`

## Fase 3 — Definir patrones por tipo de pantalla
Aplicar este mismo lenguaje a:
- publicar envío
- perfil/verificación
- wallet/retiros
- admin/revisiones
- matches/chat operativo

No todo debe verse idéntico, pero sí debe sentirse de la misma familia.

---

## Recomendación visual para replicarlo en otras pantallas

### Para formularios
Usar este patrón exacto:
- hero compacto
- card principal por bloques
- resumen/contexto lateral
- CTA primario + secundario

### Para pantallas de revisión/admin
Usar:
- cards blancas
- badges consistentes
- filtros compactos
- jerarquía por estado
- color ámbar para pendiente, verde para aprobado/listo, rojo/rose para rechazo

### Para wallet o movimientos
Usar:
- azul más dominante
- verde solo en acciones o estados positivos
- grises suaves para estructura
- evitar saturar con colores intensos en todo

---

## Riesgos al replicarlo mal
- meter demasiada decoración y perder claridad
- usar demasiado verde y dañar jerarquía
- usar placeholders falsos que confunden
- mezclar estilos de badge distintos por pantalla
- volver a inputs nativos sin tratamiento visual
- dejar columnas sin equilibrio y perder el efecto premium

---

## Definición corta del theme para el equipo

> INTRA usa un theme claro, premium y operativo: fondos azul-gris suaves, cards blancas con bordes sutiles, azul oscuro como identidad principal, verde como señal de acción/éxito, badges de estado muy claros, layouts compactos de dos columnas con resumen vivo y microdetalles visuales inspirados en viaje/aviación para transmitir confianza y orden.

---

## Siguiente paso recomendado
Formalizar esto en un mini design system interno y luego aplicar el patrón pantalla por pantalla empezando por:
1. Publicar envío
2. Perfil
3. Wallet
4. Admin
5. Matches / detalle operativo
