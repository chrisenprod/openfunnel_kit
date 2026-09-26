# Proposal

## Why
La configuración está fragmentada entre catálogos, pestañas y formularios. El recorrido diario debe permitir preparar, probar y supervisar agentes sin conocer el modelo de datos.

## What Changes
- Instrucciones editables en el agente, chat contiguo, contexto y selección de herramientas nativas en secciones visibles. Mantener prompts compartidos, orden, versiones y protección de borradores.
- Navegación principal Conversaciones/Agentes/Canales/Contactos, Seguimiento para tickets/pipelines y Ajustes para cuenta, conexiones, API y facturación.
- Guía inicial basada en conexiones, canal, agente y prueba real exitosa; desaparece al completarse.
- Canal con estado integrado y acciones directas para resolver bloqueos; bandeja con acceso Necesitan atención y controles humanos visibles.
- Actualizar PRD y documentación. La preparación automática ya implementada se conserva.
- Sin creación/edición de herramientas en UI, nuevos proveedores, cambios de precios ni ejecución de mensajes reales durante QA.

## Capabilities

### New Capabilities
Ninguna.

### Modified Capabilities
- `platform-ui`: navegación por tareas, editor directo de agente, guía inicial y estados operativos accionables.

## Impact
React/CSS, rutas acotadas para edición atómica de instrucciones y progreso inicial; filtro de atención en lectura. SQLite existente sin migraciones ni dependencias. API previa y enlaces directos conservados. Verificación sintética de autorización, conflictos, UI y preparación automática.
