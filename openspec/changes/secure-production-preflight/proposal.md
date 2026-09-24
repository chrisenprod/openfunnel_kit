# Proposal

## Why

La dockerización ya funciona localmente. Antes de publicar necesitamos revisar la
seguridad, automatizar verificaciones en GitHub y provisionar el entorno privado.

## What Changes

- Auditar código, dependencias y configuración del VPS con pruebas acotadas.
- Rechazar secretos cortos en recepción de webhooks y proteger el frontend con
  cabeceras CSP, anti-framing y permisos del navegador.
- Preparar CI para push a main, pull requests y ejecución manual, sin secretos de
  producción; validar API, specs, builds y ejecución aislada de contenedores.
- Transferir por SSH las variables autorizadas a un archivo privado fuera del
  repositorio, con origen HTTPS de producción y verificación sin revelar valores.
- Documentar evidencia, riesgos pendientes y puerta de entrada al despliegue manual.

No incluye actualizar el sistema compartido, cambiar firewall/SSH de otros
servicios, migrar SQLite, activar canales, registrar el webhook productivo ni
publicar la app. Publicar el workflow requiere incorporar también la implementación
acumulada que todavía no existe en main remoto; no dar CI por activo antes de ello.

## Capabilities

### New Capabilities

- `production-preflight`: verificación automatizada y preparación privada del entorno.

### Modified Capabilities

Ninguna; se refuerzan controles existentes sin cambiar el contrato de negocio.

## Impact

Workflow CI, recepción de webhooks, Nginx, pruebas y documentación. Archivo privado
en VPS. Los hallazgos de infraestructura sin resolver quedan en un informe ignorado.
