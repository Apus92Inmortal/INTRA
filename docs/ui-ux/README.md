# UI/UX INTRA

## Manual vigente

El manual oficial y vigente de UI/UX para INTRA es:

`docs/ui-ux/Manual_UIUX_INTRA_v2_2.pdf`

Este documento es la fuente unica de verdad para decisiones visuales, componentes, tokens, navegacion, Core Mobile, Core PC, CTAs, cards, inputs, badges, iconografia, tablas, ventanas emergentes, estados de carga, errores, mensajes, microcopy y QA visual.

Los manuales anteriores y anexos tecnicos relacionados con UI/UX quedan derogados.

Antes de implementar cualquier cambio UI/UX, se debe revisar si el cambio cumple el Manual UI/UX INTRA v2.2.

Si una pantalla o componente contradice el manual:

1. Reportar la contradiccion.
2. Explicar que regla contradice.
3. Proponer si debe corregirse o si amerita crear una excepcion, anexo o nueva regla.
4. No improvisar estilos por criterio personal.

Si la contradiccion responde a una necesidad real del producto, debe proponerse como excepcion, anexo o nueva regla antes de implementarse.

Si no existe justificacion funcional fuerte, la pantalla debe corregirse para alinearse al manual.

Regla clave:

El manual manda, pero puede evolucionar. Lo que no se permite es improvisar.

## Documentos derogados

No se encontraron manuales UI/UX anteriores ni anexos tecnicos UI/UX versionados en el arbol actual del repo al momento de adoptar v2.2.

Si aparece una version anterior o anexo historico, debe moverse a:

`docs/archive/ui-ux-derogados/`

El archivo archivado debe quedar claramente marcado como derogado y no debe usarse como fuente de verdad.

## Navegacion oficial

Market no debe tratarse como modulo activo ni aparecer como item oficial de navegacion mientras no este implementado formalmente.

El redirect tecnico `/app/market` puede existir solo como compatibilidad heredada hacia `/app`. La experiencia de oportunidades y matches vive integrada en `/app`.
