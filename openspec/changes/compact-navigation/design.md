# Design

## Context
El shell tiene sidebar fijo de 232 px y menú modal bajo 1200 px. Las tarjetas reutilizan botones globales con padding/altura generosos y espaciado de 10 px.

## Goals / Non-Goals
**Goals:** iconos, variante de 88 px persistida, tarjetas más densas y legibles.
**Non-Goals:** nuevos módulos, cambio de rutas, cambios de esquema o interacción de arrastre.

## Decisions
- Iconos SVG locales de 20 px, trazo consistente y currentColor. SVG decorativo; aria-label en cada botón, title y ayuda visible en modo compacto.
- Estado React y localStorage con try/catch. Etiquetas visibles de 10/12 px debajo de los iconos en modo compacto. CSS de escritorio controla ancho del sidebar y margen de workspace; no afecta al panel móvil.
- Colapso no navega ni altera formularios. Control de expansión mantiene foco. Al pasar a escritorio cerrar un menú móvil abierto para no dejar contenido inert.
- Columnas con 10 px de padding y 12 px de separación; tarjetas con 10 px y gap 6 px. Título sin padding heredado. Ratón: asa 28 px y selector 32 px. Puntero grueso: controles de 44 px.
- Reducir decoración del asa y metadatos, mantener mensajes, contraste y foco por tema.

## Risks / Trade-offs
Iconos solos necesitan nombres: conservar aria-label, title y tooltip al enfocar. No usar tooltips como única etiqueta. El modo compacto se limita al layout de escritorio; móviles siguen usando el panel modal.
