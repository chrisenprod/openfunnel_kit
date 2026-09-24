# Design

## Context
Board/BoardColumn en records.jsx ya consultan tickets paginados por etapa. El detalle de pipelines muestra metadatos, etapas y una tabla relacionada. PATCH de tickets ya valida pipeline/stage. PRD previamente consideraba suficiente el selector; este pedido añade arrastre.

## Goals / Non-Goals
**Goals:** tablero en el detalle del pipeline, movimiento persistente y accesible reutilizado en Tickets.
**Non-Goals:** orden manual dentro de etapa, drag entre pipelines, cierre automático por etapa, proveedores externos.

## Decisions
- Extraer el tablero a kanban.jsx para mantener el componente y su interacción juntos. Conservar paginación de 25 por columna.
- Pointer Events en un asa de arrastre con captura de puntero y touch-action none; resto de tarjeta permite scroll táctil normal. Detectar columna bajo puntero y desplazar horizontalmente al acercarse al borde. Escape/pointercancel abortan.
- Selector por tarjeta como alternativa para teclado y móvil, sin depender de gestos. Anunciar movimiento/guardado/error; devolver foco al tablero al guardar si desaparece el control de origen.
- PATCH /api/tickets/:id con stage_id; no cambiar status. Esperar confirmación antes de refrescar columnas, bloquear movimientos mientras guarda. En fallos refrescar para reconciliar respuestas perdidas y permitir reintento manual. Enviar el mismo stage_id es idempotente en cuanto a ubicación. La política existente sigue siendo último guardado válido.
- Columnas vacías siguen siendo destinos; sin nueva dependencia ni cambio de esquema. Mantener componentes y tokens actuales.

## Risks / Trade-offs
- Arrastre táctil necesita un asa para no impedir scroll; se explica en el tablero y se conserva selector.
- API inaccesible o cambio concurrente puede rechazar movimiento: mostrar fallo y recuperar datos del servidor.
- Columnas paginadas mantienen el orden estable del servidor; no ofrecen posicionar una tarjeta entre otras.
