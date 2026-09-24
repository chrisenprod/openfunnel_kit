# Design

## Context

Ver la motivación en `proposal.md`. La API arranca con `npm start`, escucha en
127.0.0.1 y ya cierra worker/SQLite al recibir SIGTERM. Vite compila el frontend en
`frontend/dist`; su proxy de desarrollo no existe en esa salida. El frontend importa
`landing/brand.css` y el símbolo WebP, por lo que la construcción debe incluir esos
recursos concretos sin empaquetar toda la landing. `GET /api/health` consulta SQLite.
No existen Dockerfile ni Compose de la app; Nginx y Actions actuales son de la landing.

## Goals / Non-Goals

**Goals:** ejecución local equivalente al empaquetado de producción, verificable
con datos sintéticos, con una sola instancia de la API y sin alterar desarrollo.

**Non-Goals:** TLS público, operación del VPS, automatizar despliegues, auditoría
completa, traslado de datos ni resolver los pendientes reales de Instagram/WhatsApp.

## Decisions

### Dos servicios con un único origen

Un Dockerfile con etapas de dependencias/construcción y targets finales `api` y
`web`. API sobre Node 24 compatible con el mínimo del proyecto, con versión exacta
y digest fijados al implementar; dependencias de ejecución mediante `npm ci --omit=dev`.
Web con Nginx versionado, configurado para usuario no root y puerto interno 8080;
solo contendrá frontend compilado, configuración y avisos aplicables. API ejecutará
Node directamente, sin watch ni Vite, para recibir señales correctamente.

Compose tendrá `api` y `web`, red privada entre ellos y salida a Internet para las
integraciones cuando se configuren. Solo web publica `127.0.0.1:8080` por defecto,
con puerto del host configurable. Se añadirá `HOST` al backend, con 127.0.0.1 por
defecto y 0.0.0.0 explícito dentro del contenedor. El puerto de API no se publicará.

Alternativas: servir estáticos desde Node añade un manejador y responsabilidades
innecesarias a la API; Node y Nginx en un único contenedor requieren gestionar dos
procesos. Dos servicios con Compose mantienen separados sus ciclos de vida. El
Nginx del VPS podrá terminar TLS más adelante sin modificar la landing ahora.

### Proxy y configuración

Nginx sirve la compilación y reenvía `/api` y `/api/` a la API sin cambiar el path,
Origin, cookies ni cuerpo de webhook; errores de API no usan fallback HTML.
Preservar el límite de webhook de 1 MiB y los límites de aplicación existentes.
Negar archivos ocultos; no montar el repositorio como raíz HTTP. Prever resolución
del servicio API tras recreación y verificarla, no depender de una IP fija.

La receta requiere un archivo de entorno dedicado mediante `--env-file`, separado
del `.env` usado por desarrollo. Compose pasa solo variables enumeradas y exige
credenciales de administrador y APP_ORIGIN explícitos. Para prueba local, origen
http://localhost:8080 (ajustado si cambia el puerto). DATABASE_PATH queda fijado
dentro del volumen; no aceptar por accidente el path de la base del host.
BETTER_AUTH_SECRET puede persistir en SQLite según el contrato existente.
Las variables de Zernio/LLM quedan vacías en la verificación por defecto.

No pasar secretos como argumentos de build, variables VITE_* ni copiar archivos
de entorno. `.dockerignore` usa una lista acotada de entradas necesarias: manifiestos,
backend sin data, shared, frontend sin dist, configuración de build/proxy, CSS y
símbolo compartidos, licencias y avisos. Excluir credenciales, .git, configuraciones
privadas, pruebas locales, bases y respaldos de todas las etapas, no solo del target final.

### SQLite y permisos

Volumen con nombre para todo `/app/data`, incluidos archivos WAL/SHM; propietario
compatible con el UID no root de la API desde el primer arranque. No montar
`backend/data` del host. Migraciones existentes al iniciar, sin seed ni nuevas tablas.
La receta ejecuta una única instancia API/worker y documenta que no se puede escalar
sobre la misma base. No introducir Redis, otro motor de datos ni un worker separado.

Un volumen es persistencia, no respaldo. Esta entrega documenta cómo parar/recrear
sin eliminarlo; `down -v` se reserva a datos de prueba desechables. Automatización de
respaldos y restauración operativa se especifican antes del despliegue en VPS.

### Salud, parada y comprobaciones

Healthcheck API con Node/fetch a `/api/health`, timeout y comprobación de HTTP/cuerpo;
web comprueba su servicio estático. Compose espera la salud inicial de API, y la
prueba funcional consulta también salud a través del proxy. Una marca healthy no
demuestra que Zernio/Azure funcionen ni implica recuperación automática de fallos.

Política de reinicio para salidas inesperadas y tiempo de parada explícito que
permita terminar el trabajo acotado del worker. Verificar SIGTERM con la lógica
existente antes de cambiarla. La recuperación de envíos inciertos continúa siendo
la de integraciones; no reencolar envíos a ciegas para facilitar un reinicio.

Pruebas en un proyecto Compose y volumen de nombre único: credenciales sintéticas,
sin claves operativas. Login/logout, denegación sin sesión/origen incorrecto, CRUD
mínimo, salud, estáticos, rutas inexistentes, webhook firmado/repetido/inválido,
reinicio y recreación conservando IDs. Un evento sintético sin cuenta conectada
permite comprobar transporte/firma sin mensajes externos. Revisar contenido de
imágenes con archivos señuelo inofensivos para detectar inclusiones indebidas.

## Risks / Trade-offs

- Permisos de volumen incompatibles → verificar volumen vacío y reutilizado con
  UID no root; no resolver dando permisos globales a datos reales.
- HOST=0.0.0.0 podría exponer API fuera de Docker → conservar loopback por defecto
  y no publicar el puerto de API en Compose.
- Origen incorrecto → fallo de login/mutaciones; documentar el origen exacto y probar
  cookies a través del proxy. La validación HTTPS real pertenece al despliegue.
- Recrear API cambia su dirección interna → verificar reenvío después de recreación.
- Parada forzada durante envío → conservar tratamiento de resultado incierto; las
  pruebas de proveedor simulado no sustituyen pruebas reales de entrega.
- Datos borrados con el volumen → separar parar/recrear de limpieza destructiva;
  no conectar la base local ni presentar volumen como política de respaldo.

## Migration Plan

No se migra la instalación local en uso. Construir y arrancar un proyecto aislado,
ejecutar verificaciones y conservar evidencia depurada en `docs/qa/`. Actualizar
README, AGENTS, ARCHITECTURE, ejemplo de entorno y crear `docs/deploy/DOCKER.md`.
Retirar la prueba no cambia los comandos ni datos de desarrollo. No hay rollback
de esquema porque este cambio no añade migraciones. La publicación y el traslado
de la base se prepararán como entrega posterior.

## Open Questions

El dominio acordado es `app.openfunnel.mocca.cl`, API bajo `/api`, y su registro A
apunta al VPS indicado por el usuario. Arquitectura/capacidad del VPS, registro de
imágenes, traslado de datos y destino de respaldos/alertas se decidirán antes de
publicar. No cambian el contrato de esta ejecución local. Las pruebas locales usan
el Docker Engine de OrbStack instalado; no modifican el VPS.

## Referencias

Documentación oficial consultada el 2026-09-24:
[construcciones por etapas](https://docs.docker.com/build/building/multi-stage/) y
[volúmenes persistentes](https://docs.docker.com/engine/storage/volumes/).
