# Proposal

## Why

El usuario autoriza publicar la app completa tras aislar Docker, y aplaza
expresamente el mantenimiento de Ubuntu. La app y CI ya están verificados en PR #2.

## What Changes

- Crear red Docker dedicada y protección persistente contra entrada directa a sus
  contenedores y puerto interno, conservando las reglas de otros servicios.
- Publicar app/API por HTTPS en app.openfunnel.mocca.cl con Nginx del host.
- Desplegar una release identificada, trasladar SQLite por SSH con respaldo y
  conservar canales, agentes, conversaciones y estados de automatización.
- Cambiar el webhook existente al nuevo origen con un único worker operativo.
- Verificar acceso, red, datos y recuperación; configurar respaldos diarios y
  conservar una copia inicial privada fuera del VPS. Automatizar exportación externa
  solo cuando el usuario indique un destino; ese pendiente no se considera cumplido.

No incluye actualizar Ubuntu, activar canales apagados, enviar mensajes de prueba
a terceros ni desplegar automáticamente con cada push. El riesgo del host antiguo
se conserva documentado como excepción explícita del usuario.

## Capabilities

### New Capabilities
- `vps-runtime`: publicación HTTPS, aislamiento, continuidad de datos y respaldo.

### Modified Capabilities
Ninguna; se preserva la semántica de la app y sus integraciones.

## Impact

Compose de producción, ejemplos de Nginx/firewall/systemd y respaldo; configuración
acotada del VPS. Integración de la app en main y documentación de operación.
