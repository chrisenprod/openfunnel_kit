# Proposal

## Why
La navegación necesita iconos y una variante colapsada para liberar espacio. El Kanban actual tiene demasiado espacio interno para operar con varias tarjetas.

## What Changes
- Iconos SVG consistentes por sección, sin dependencias.
- Sidebar de escritorio expandido/compacto con preferencia persistida; nombres accesibles y ayudas al pasar el cursor.
- Mantener menú móvil con etiquetas completas y teclado.
- Reducir espaciado de columnas y tarjetas, con controles compactos para ratón y áreas táctiles de 44 px.
- Sin cambios de datos, API o comportamiento de movimientos. No hay decisiones bloqueantes.

## Capabilities
### New Capabilities
Ninguna.
### Modified Capabilities
- `platform-ui`: navegación colapsable y densidad de Kanban.

## Impact
React/CSS, iconos locales y sistema de diseño. Conserva el esquema y las dependencias actuales.
