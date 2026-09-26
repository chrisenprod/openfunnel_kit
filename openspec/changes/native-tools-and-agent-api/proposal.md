## Why
Una cuenta cloud nueva no muestra herramientas aunque sus implementaciones ya existen en backend. Las API keys tampoco permiten preparar un agente completo: faltan alta de prompts/agentes y asignación de canal. El usuario necesita ese flujo con Bearer, sin reutilizar una sesión de login.

## What Changes
- Catálogo nativo disponible automáticamente en cada espacio: get_contact, get_ticket y handoff_to_human. Selección por agente, sin CRUD público de funciones.
- API keys con agents:write para crear/editar agentes, prompts:write ampliado al alta, y channels:assign para vincular un agente a un canal existente manteniendo su automatización desactivada.
- UI de claves, docs públicas y pruebas del recorrido con Bearer y separación entre clientes.

## Capabilities
### New Capabilities
- `agent-provisioning`: catálogo nativo y preparación completa de agentes mediante API keys.

## Impact
Backend de recursos/autorización/integraciones, UI de herramientas y claves, documentación y tests. Sin migraciones de esquema ni claves en código. No conectar cuentas externas Zernio, activar IA ni enviar mensajes durante las pruebas.
