# App local con Docker

Un `Dockerfile` construye dos imágenes: target `web` (Nginx y frontend compilado) y
target `api` (Node y dependencias de producción). `compose.yaml` ejecuta ambos con
un volumen SQLite independiente. No necesita Node en el host para operar; sí Docker
Engine con Compose v2. `npm run test:docker` requiere además Node >=24.13.0.

## Configuración y arranque

Ejecutar desde la raíz del repositorio:

```sh
cp .env.docker.example .env.docker
chmod 600 .env.docker
```

Editar `.env.docker`: completar `DOCKER_ADMIN_USER` y `DOCKER_ADMIN_PASS` (12–128
caracteres). No usar las credenciales de una cuenta externa. Valores que contienen
`$` o `#` pueden escribirse entre comillas simples. No imprimir `docker compose config`
en registros compartidos: su salida sin `--quiet` incluye variables resueltas.

Por defecto la app abre en **http://localhost:8080**. Si se cambia
`DOCKER_HTTP_PORT`, ajustar también `DOCKER_APP_ORIGIN` al mismo origen exacto.
Usar siempre el archivo dedicado; los nombres `DOCKER_*` evitan tomar las variables
de la app de desarrollo. No copiar `.env` ni la base local a una imagen.

```sh
docker compose --env-file .env.docker -p openfunnel config --quiet
docker compose --env-file .env.docker -p openfunnel up -d --build --wait
docker compose --env-file .env.docker -p openfunnel ps
curl --fail http://localhost:8080/api/health
docker compose --env-file .env.docker -p openfunnel logs --tail=100
```

Las bases oficiales de Node y Nginx están fijadas por versión y digest en Dockerfile;
al actualizarlas, verificar ambos targets y registrar la nueva versión. El lockfile
se instala con `npm ci`. `.dockerignore` permite únicamente las fuentes necesarias,
licencias, fuentes públicas de docs y recursos compartidos con la landing. Las imágenes no contienen
las herramientas de desarrollo ni datos locales de negocio.

## Red, procesos y datos

- Web publica solo `127.0.0.1:8080` del host; API no publica puerto propio. UI y `/api`
  comparten origen. No se usa Vite como servidor de producción.
- Ambos servicios ejecutan procesos sin root, con sistema raíz de solo lectura,
  directorios temporales acotados, sin capabilities y sin elevar privilegios.
- SQLite vive en `/app/data/app.sqlite` dentro del volumen `openfunnel_app-data`.
  Este incluye WAL/SHM, documentos originales BLOB/texto, configuración y secreto de sesión generado por la app.
  El nombre depende del proyecto `-p`; usar siempre el mismo para conservar datos.
- Mantener **una única API/worker por base**. No usar `--scale api=2`, compartir este
  volumen entre proyectos ni ejecutar otro proceso Node contra él.
- Las migraciones existentes se aplican al iniciar. No se importan datos de desarrollo
  ni se crean registros demo. Los permisos del volumen se preparan para el usuario
  del contenedor; no resolver problemas con permisos globales de escritura.
- Los logs rotan (tres archivos de 10 MB por servicio). El access log del proxy no
  registra query strings, cookies ni cuerpos. Esto no sustituye una auditoría completa.
- API comprueba SQLite; web comprueba el servidor estático. Ver ambos healthy y
  `/api/health` por el proxy. Una web visible no demuestra que la API esté disponible.
  La política de reinicio actúa al salir el proceso; un healthcheck fallido por sí
  solo no lo reinicia ni confirma disponibilidad de Azure/Zernio.

Parar y recrear conservando datos:

```sh
docker compose --env-file .env.docker -p openfunnel stop
docker compose --env-file .env.docker -p openfunnel up -d --wait
docker compose --env-file .env.docker -p openfunnel down
docker compose --env-file .env.docker -p openfunnel up -d --build --wait
```

`down` conserva el volumen; **`down --volumes` lo elimina**. No usarlo sobre datos
que se quieran conservar. Un volumen no es respaldo. Antes de migrar datos reales
o actualizar producción se debe definir y probar respaldo, restauración y reversión.
Copiar solo el archivo SQLite mientras escribe no garantiza una copia coherente.

## Integraciones y futuro VPS

Las variables opcionales `DOCKER_ZERNIO_*`, `DOCKER_LLM_*` y
`DOCKER_PUBLIC_BASE_URL` se pasan únicamente a la API. Dejarlas vacías permite
probar la base manual sin llamar a proveedores. Para habilitarlas, seguir
[INTEGRACIONES.md](INTEGRACIONES.md), con cuentas de prueba y activación explícita.

Dominio elegido: **https://app.openfunnel.mocca.cl**, con API en `/api` y webhook en
`/api/integrations/zernio/webhook`. Su registro A fue comprobado el 2026-09-24 y apunta
a `164.92.74.160`. La landing permanece en `https://openfunnel.mocca.cl`.
La publicación posterior está verificada y documentada en [PRODUCCION.md](PRODUCCION.md).
Nginx del host termina HTTPS y reenvía a web en loopback; producción utiliza un
override Compose, entorno y volumen externos propios. Esta guía conserva la prueba
local aislada: no ejecutarla contra el proyecto o volumen de producción.

## Prueba reproducible

```sh
npm run test:docker
```

El script genera un proyecto Compose, puerto libre, credenciales y volumen de prueba.
No carga `.env` ni claves de proveedores. Comprueba configuración, construcción,
exclusión de archivos señuelo, usuario/permisos, estáticos/proxy, login/logout,
Origin, webhook firmado/duplicado/inválido, límites de cuerpo, caída/recreación de API,
parada, persistencia e integridad. Al finalizar elimina solo su proyecto y volumen
generados, incluidos los fallos. No ejecutar dos copias del script simultáneamente.

Para revisar visualmente la instalación sintética después de una prueba exitosa:

```sh
npm run test:docker -- --keep
```

La salida indica URL, nombre de proyecto y archivo temporal. Las credenciales están
en ese archivo con permisos 0600; no se imprimen. Usar esos datos para entrar y
limpiar al terminar con `docker compose --env-file <archivo> -p <proyecto> down --volumes`,
eliminando después la carpeta temporal indicada. `--keep` no conserva una prueba fallida.

La evidencia de esta entrega está en [QA de Docker](../qa/DOCKER.md). Estas pruebas
no demuestran entrega de mensajes reales ni equivalen a una auditoría de producción.

Referencias oficiales: [Docker multi-stage](https://docs.docker.com/build/building/multi-stage/),
[volúmenes](https://docs.docker.com/engine/storage/volumes/) y
[proxy Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

## Documentación y archivos de agentes

El target web incluye `/docs/` estático, público y sin API/sesión. El builder copia
solo fuentes enumeradas en scripts/build-docs.js; no se incluyen informes privados.
Nginx admite cargas de hasta 5 MiB; cualquier proxy externo debe permitir el mismo
límite (`client_max_body_size 5m`). La API conserva sus cuotas independientes.
`test:docker` verifica DOC/DOCX/PDF, original descargado, carga superior a 1 MiB,
persistencia tras recrear y recursos CSS/docs presentes.
