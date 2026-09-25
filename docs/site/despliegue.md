# Despliegue y respaldos

La app necesita una API/worker, SQLite persistente y un servidor para los estáticos. La documentación es un sitio estático independiente: puede publicarse sin API, credenciales ni base de datos.

## Publicar la app

La opción incluida usa los targets `web` y `api` de `Dockerfile` y `compose.yaml`. Prepara `.env.docker` según [Instalación](./instalacion.html). Para una instalación pública:

1. Apunta tu dominio al servidor y configura HTTPS en un proxy del host.
2. Configura `DOCKER_APP_ORIGIN=https://TU_DOMINIO`. Para canales conectados, configura también `DOCKER_PUBLIC_BASE_URL` y secretos de integración.
3. Haz que el proxy reenvíe la app y `/api` al puerto web de Compose, publicado solo en loopback. No publiques la API directamente.
4. Permite cuerpos de **5 MiB** en todos los proxies de la ruta. El Nginx incluido utiliza `client_max_body_size 5m`; un proxy externo con límite de 1 MiB impediría cargar archivos mayores.
5. Construye, arranca y comprueba salud, login, documentación y carga/descarga de un documento sintético.

```sh
docker compose --env-file .env.docker -p openfunnel up -d --build --wait
docker compose --env-file .env.docker -p openfunnel ps
curl --fail https://TU_DOMINIO/api/health
```

Configura tiempos de espera del proxy de al menos 120 segundos para las pruebas del agente. La API conserva sus límites propios: JSON de 128 KiB, webhook de 1 MiB y documentos de 5 MiB. Los originales se almacenan en SQLite, por lo que no hay que añadir un volumen de archivos.

Mantén **una sola API/worker por SQLite**. No conectes simultáneamente una instancia local y otra de producción a la misma base o cuentas operativas. No utilices `vite preview` en producción ni publiques el repositorio completo por HTTP.

## SQLite y respaldos

El volumen de Compose contiene `/app/data/app.sqlite` y sus archivos WAL/SHM. No uses `down --volumes` con datos que quieras conservar. Un volumen persistente no sustituye un respaldo.

Antes de actualizar, detén la API y realiza una copia coherente del volumen completo; conserva sus permisos. Alternativamente, usa una herramienta de respaldo de SQLite que soporte bases activas. **No copies solo `app.sqlite` mientras hay escrituras**, porque puedes perder datos que siguen en WAL.

Guarda las copias fuera del servidor, con acceso restringido: incluyen conversaciones, documentos originales, texto extraído y secreto de sesión generado. Conserva el entorno por separado y no lo publiques en Git. Prueba la restauración en una instancia aislada con las integraciones deshabilitadas antes de confiar en el respaldo. Define frecuencia, retención y alertas según tu operación; la app no incluye exportación externa automática de respaldos.

## Actualizar y recuperar

1. Lee los cambios y las nuevas migraciones antes de actualizar.
2. Respalda datos y entorno; anota la versión anterior.
3. Detén la instancia anterior y construye la nueva versión con el mismo proyecto y volumen.
4. Arranca una sola API. Las migraciones SQL pendientes se aplican automáticamente.
5. Comprueba salud, acceso, registros existentes, descarga de originales y funcionamiento de la interfaz.

Una migración aplicada no se edita ni se revierte borrando tablas. Restaurar código anterior no revierte el esquema: verifica su compatibilidad o recupera la copia completa correspondiente. La restauración de datos puede perder cambios posteriores al respaldo.

## Publicar solo la documentación

```sh
npm ci
npm run build:docs
```

Publica **el contenido de `dist/docs/`** en cualquier hosting estático. Usa `index.html` como índice. Los enlaces y recursos son relativos, por lo que funciona en una raíz o subruta como `/proyecto/docs/`. No hace falta una regla SPA ni reescribir rutas a `index.html`.

`npm run build` incluye estas páginas en `frontend/dist/docs/`; `npm run build:landing` las incluye en `dist/landing/docs/`. La app y la landing enlazan a `./docs/`. Los comandos de desarrollo también preparan las páginas.

Solo se publican los archivos enumerados en `scripts/build-docs.js`: nunca se copia todo `docs/`, los informes privados ni documentos subidos por usuarios. Las fuentes editables están en `docs/site/` y `docs/api/AGENTES.md`.

## Verificación y problemas frecuentes

- **403 al guardar:** comprueba el origen exacto en `APP_ORIGIN` y que el proxy conserve el host.
- **413 al subir:** revisa tamaño y límite de todos los proxies, no solo el de la app.
- **Archivo visible con error:** abre el aviso, descarga el original si lo necesitas y reemplázalo por una versión legible.
- **Prueba IA falla:** verifica endpoint, clave y modelo en el servidor; la salud de SQLite no verifica proveedores.
- **Docs devuelve 404:** reconstruye con `npm run build` y sirve la carpeta completa, incluido `docs/`.

La [guía Docker del repositorio](https://github.com/chrisenprod/openfunnel_kit/blob/main/docs/deploy/DOCKER.md) amplía el aislamiento, red y prueba reproducible. La configuración específica de la instalación del mantenedor no es un requisito para autohospedar tu clon.
