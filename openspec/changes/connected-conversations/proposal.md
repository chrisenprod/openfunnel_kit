# Proposal

## Why

La base manual necesita atender conversaciones reales desde OpenFunnel. El PRD §10
define Zernio para Instagram/WhatsApp y agentes con SDK OpenAI sobre Azure.

## What Changes

- Mapear cuentas, conversaciones, identidades y mensajes externos al esquema propio.
- Conectar/reconectar desde la app, importar historial y recibir webhooks firmados.
- Enviar respuestas humanas y de IA con cola persistida, deduplicación y control humano.
- Validar deployments compatibles con Chat Completions/tools; ejecutar funciones internas permitidas.
- Mantener manuales los registros existentes. Excluir comentarios, grupos, adjuntos interpretados,
  campañas, MCP, plantillas, Responses API y cambios automáticos de pipeline.
- La verificación real requiere credenciales, endpoint HTTPS y cuentas de prueba; no se
  activan canales ni se envían mensajes operativos automáticamente durante desarrollo.

## Capabilities

### New Capabilities
- `connected-conversations`: conexión Zernio, traducción, bandeja, entrega, IA y tools.

### Modified Capabilities
- `manual-platform`: limitar la edición de mensajes remotos y permitir ejecución explícita en canales conectados.
- `platform-ui`: estados reales, conexiones, validación de agentes y controles de atención.

## Impact

Backend HTTP, SQLite con migración aditiva, recursos compartidos, UI React, pruebas
Node y documentación. Única dependencia adicional: SDK oficial `openai`. Sin ORM,
servicios de colas, frameworks adicionales ni cambios de autenticación single user.
