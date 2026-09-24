# Proposal

## Why

La app se ejecuta actualmente con Vite y un proceso Node local; el despliegue
existente solo sirve la landing. La tercera etapa del PRD necesita una base
reproducible para probar y después publicar la app conservando SQLite y sus datos.

## What Changes

- Añadir construcción de imágenes separando compilación y ejecución, con frontend
  estático servido por Nginx y API Node sin herramientas de desarrollo.
- Añadir Docker Compose con un único backend/worker, volumen persistente para SQLite,
  comprobaciones de salud y una entrada HTTP vinculada solo a localhost del host.
- Permitir configurar la dirección de escucha del backend para la red del contenedor,
  conservando loopback por defecto fuera de Docker.
- Excluir secretos, datos y archivos privados del contexto y de las imágenes;
  configuración sensible solo al arrancar y procesos de aplicación sin root.
- Documentar y verificar login, API, persistencia, permisos, reinicios y parada
  con datos sintéticos aislados, sin reutilizar la base ni credenciales operativas.

No incluye publicar imágenes o la app, modificar VPS/DNS/landing, configurar CI/CD,
completar la auditoría de seguridad ni activar canales reales. Dominio, traslado de
datos, registro de imágenes y respaldos externos se resuelven en entregas posteriores;
no bloquean la ejecución local. El cambio está propuesto, no implementado.

## Capabilities

### New Capabilities

- `container-runtime`: construcción y ejecución aislada de la app en contenedores,
  enrutamiento de UI/API, configuración, persistencia y ciclo de vida.

### Modified Capabilities

Ninguna. Se conserva el contrato de `platform-health` y la autenticación existente.

## Impact

Dockerfile, `.dockerignore`, Compose y configuración Nginx específicos de la app;
dirección de escucha en `backend/server.js`, ejemplo de entorno, pruebas y guías.
Se mantienen stack, esquema SQLite y contrato HTTP, sin dependencias npm nuevas.
Docker Engine/Compose será necesario para esta forma de ejecución; los comandos
de desarrollo actuales seguirán funcionando.
