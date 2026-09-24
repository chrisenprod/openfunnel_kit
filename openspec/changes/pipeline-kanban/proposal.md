# Proposal

## Why
Pipelines muestra actualmente su configuración y una lista de tickets. El usuario necesita trabajar directamente con columnas por etapa y mover tarjetas arrastrándolas.

## What Changes
- Abrir cada pipeline como tablero Kanban, conservando edición del pipeline y sus etapas.
- Mover tickets entre etapas con arrastre de ratón/táctil y selector accesible; mostrar guardado y fallos.
- Reutilizar la interacción en la vista por etapas de Tickets.
- Mantener schemas e identificadores en inglés. La UI conserva «Pipelines» y «Etapas».
- Actualizar la decisión previa del PRD que no requería drag and drop.
- No incluye ordenar tarjetas dentro de una etapa, mover entre pipelines mediante arrastre ni integraciones. No hay decisiones bloqueantes.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `platform-ui`: añadir operación Kanban desde el pipeline y arrastre persistente con alternativa accesible.

## Impact
Frontend React/CSS y documentación. Reutiliza PATCH /api/tickets/:id y validación de etapa existente; sin migraciones ni dependencias nuevas.
