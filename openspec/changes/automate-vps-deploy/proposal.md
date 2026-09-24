# Proposal

## Why

La app ya funciona en el VPS, pero cada versión requiere publicación por SSH. El usuario autorizó desplegar automáticamente cuando pase el CI de main, conservando datos y entorno.

## What Changes

- Workflow separado, activado al concluir exitosamente Verificar app sobre main del repositorio propio.
- Environment production limitado a main y clave SSH exclusiva con comando forzado; sin acceso interactivo, forwarding ni grupo Docker.
- Publicación por commit, respaldo previo, exclusión mutua, salud y reversión de código compatible.
- Rechazo preventivo de cambios de migraciones; su publicación seguirá un procedimiento manual revisado.
- Pruebas de rechazos y fallos, y ejecución real desde Actions.

## Capabilities

### New Capabilities

- `automatic-deployment`: publicación automática y recuperación acotada de la app.

### Modified Capabilities

Ninguna spec principal cambia; complementa los cambios de preflight y publicación pendientes de archivo.

## Impact

GitHub Actions, scripts de deploy, usuario SSH dedicado y configuración de environment/secreto en GitHub. Sin nuevas dependencias de app ni cambios funcionales. Excluye mantenimiento de Ubuntu, landing, cambios de proveedores, respaldo externo automático y restauración automática de datos. No hay decisiones de producto bloqueantes.
