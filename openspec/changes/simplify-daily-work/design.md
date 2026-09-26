# Design

## Context
Ver proposal.md. La UI actual usa componentes React de recursos y el backend conserva versiones de prompts. Las conexiones automáticas son funcionalidad existente. No hay que reinterpretar las herramientas como código editable.

## Goals / Non-Goals
**Goals:** reducir navegación y formularios, conservar relaciones y controles operativos reales.
**Non-Goals:** nuevos proveedores, mensajes de QA a terceros, herramientas arbitrarias, RAG o pruebas guardadas con historial.

## Decisions
- Editor de instrucciones por prompt asociado, con un único guardado atómico y versiones optimistas. Una ruta GET/PUT de instrucciones del agente conserva orden/activos e informa agentes afectados; si no tiene prompts crea uno y lo asocia en una transacción. Evita secuencias cliente que dejen prompts huérfanos. Bearer requiere lectura o ambos permisos agents:write y prompts:write para mutar.
- Mantener API de agentes, documentos y herramientas existentes. Herramientas mediante checkboxes explícitos; biblioteca secundaria para asociaciones avanzadas, sin nuevo constructor.
- Probar usa instrucciones guardadas y muestra borrador pendiente; mismo componente montado al cambiar vista móvil. Reutilizar hash de contexto para invalidación del chat.
- GET /setup devuelve estado local, sin llamadas externas. Una prueba exitosa sin candidato registra solo fecha/ID en integration_settings. La guía requiere un agente activo con instrucciones activas asociado a canal conectado y probado; no almacena conversaciones de prueba ni consume al consultar.
- Ajustes como página índice con enlaces directos y conexiones en rutas propias. Seguimiento agrupa las rutas existentes. Formularios de conexión se muestran solo donde corresponde.
- Filtro attention=needed en listado de conversaciones con SQL parametrizado y existencia de outbox fallido/incierto, más modo manual. No inferir mensajes no leídos que el modelo no guarda.

## Risks / Trade-offs
- Edición compartida → mostrar otros agentes antes de guardar; conflicto atómico en servidor.
- Borradores simultáneos → agregación de dirty por sección y prueba, sin desmontar al abrir chat móvil.
- Disponibilidad cloud → resolver facturación desde resumen autenticado; self-hosted no depende de ese endpoint.
- Guía sin prueba histórica → invita a ejecutar una prueba nueva; no inventa éxito previo.

## Migration Plan
Sin migraciones ni dependencias. Verificar con SQLite temporal, mocks de proveedores, build, specs y navegador móvil/escritorio en ambos temas. Publicación no es necesaria para comprobar la implementación local; conservar acciones productivas explícitas.
