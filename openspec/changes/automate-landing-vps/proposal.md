# Proposal

## Why

La landing del VPS todavía se actualiza manualmente. El usuario autorizó automatizarla con Actions, conservar Pages/Vercel para el curso y priorizar esta entrega antes de completar la portabilidad de toda la infraestructura.

## What Changes

- Paso opcional de landing en el workflow VPS, tras CI exitoso de main, con SSH restringido y comprobación independiente del run.
- Configuración externa para repositorio, rama, dominio, rutas y recursos de construcción de la landing; ejemplo SSH versionado sin datos privados.
- Publicación atómica de estáticos por commit, detección de cambios, salud y reversión, sin recargar Nginx ni recrear contenedores de app por cambios exclusivos de landing.
- Conservar intactos Pages, Vercel y sus instrucciones. Registrar inventario pendiente para migrar el resto de configuración del VPS.

## Capabilities

### New Capabilities

- `landing-vps-deployment`: publicación parametrizada de la landing en el VPS.

### Modified Capabilities

Ninguna spec principal. Complementa automatic-deployment aún en changes.

## Impact

Actions, wrapper/dispatcher SSH, worker de landing, selección de entradas de build de app y documentación. No cambia contenido visual ni servicios ajenos. No migra todavía todos los parámetros de app/firewall/TLS; quedan inventariados. No hay cambios de Ubuntu ni mensajes a terceros.
