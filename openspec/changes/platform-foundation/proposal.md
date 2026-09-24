# Proposal

## Why

La plataforma solo comprueba la conexión con SQLite. Implementar la primera etapa
de `docs/PRD.md` permite administrar el trabajo manualmente antes de integrar canales e IA.

## What Changes

- Acceso con Better Auth para un único administrador definido en `admin_user`/`admin_pass`.
- Migraciones SQLite y CRUD protegido para las entidades del PRD, con stages y tickets.
- Interfaz Campo de tinta con formularios, relaciones, bandeja y tickets por etapas.
- Pruebas de autenticación, integridad, persistencia y recorrido de la UI.
- Se adoptan los supuestos del PRD: users sin login, ticket/conversación opcional 1:1,
  mensajes manuales y configuraciones de IA sin ejecución.
- Se excluyen proveedores, envío real, API keys, MCP, multiusuario y cloud.

Corresponde a la implementación posterior a los pasos 1–4 del checklist reutilizable;
el progreso de este cambio se registra en tasks.md, no en esa plantilla.

## Capabilities

### New Capabilities

- `admin-auth`: acceso, sesiones, cierre y rotación de credenciales de servidor.
- `manual-platform`: persistencia, CRUD y relaciones de los módulos de la primera etapa.
- `platform-ui`: operación desde UI accesible, filtros, detalle y tablero por etapas.

### Modified Capabilities

Ninguna. Se conserva el contrato existente de platform-health.

## Impact

Backend HTTP/SQLite, frontend React/CSS, .env.example, scripts de pruebas y documentación.
Better Auth ya está instalado; no se requiere framework de servidor, ORM ni proveedor externo.
No se publicará ni desplegará el resultado como parte de este cambio.
