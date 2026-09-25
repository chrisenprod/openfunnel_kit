# Proposal

## Why

Permitir que un agente externo lea recursos y corrija instrucciones, y que el administrador pruebe cambios sin enviar mensajes. Acotar la cuarta etapa a cuatro capacidades pequeñas sobre el stack existente.

## What Changes

- API keys con permisos independientes `resources:read`, `prompts:write` y `agents:test`, creación/revocación por sesión y secreto mostrado una vez.
- Conocimiento por agente: documentos TXT, MD, DOC, DOCX y PDF con original BLOB y texto extraído en SQLite, carga, vista, descarga, reemplazo y eliminación; inyección directa sin RAG.
- Historial y restauración de prompts; edición con versión de partida y autor. **BREAKING**: PATCH de prompts exige `expected_version`.
- Chat de prueba con historial temporal, reinicio e instrucciones candidatas opcionales; herramientas simuladas, sin persistir mensajes ni ejecuciones operativas.
- UI en Instrucciones/Herramientas/Contexto/Probar, modelo y proveedor exclusivamente desde .env. Web pública de documentación estática, enlazada desde app/landing, publicable junto a la app o independiente. Se posponen webhooks, OpenAPI, diagnóstico ampliado y casos de prueba persistidos.

## Capabilities

### New Capabilities
- `agent-workbench`: claves, contexto textual, versiones y pruebas aisladas.

### Modified Capabilities
- `admin-auth`: permitir Bearer con lista de rutas/permisos sin debilitar sesiones ni protección de origen.
- `manual-platform`: contexto del agente y control de versión en edición de prompts.

## Impact

Migraciones aditivas 005/006, recursos compartidos, servidor/autenticación de claves, runtime de IA y vistas de agentes/prompts. Dependencias de extracción Word/PDF y compilación de Markdown justificadas por el alcance. Sin despliegue ni activación de canales. La rama activa es `dev/local-development`. El usuario solicita preparar e implementar el cambio en esta sesión.
