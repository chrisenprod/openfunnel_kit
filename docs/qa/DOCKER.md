# Verificación de dockerización

Fecha: 2026-09-24. Cambio: `containerize-app`. Alcance: ejecución local con Docker,
sin despliegue al VPS, traslado de datos ni activación de canales reales.

## Entorno y resultados

- Docker Engine 27.1.2 y Compose 2.29.2 de OrbStack en macOS/ARM64.
- Imágenes oficiales Node 24.21.0 Bookworm slim y Nginx 1.30.5 Alpine, fijadas por
  digest de manifiesto en Dockerfile. Ambos targets construidos con lockfile.
- `npm test`: 28 pruebas correctas, incluidas dos pruebas de arranque real de proceso
  con HOST predeterminado/explícito y salida ordenada por SIGTERM. Incluye las
  pruebas existentes de reintentos, control humano y envíos inciertos con simulación.
- `npm run build`: correcto. `npm run spec:validate`: 11 elementos válidos.
- `npm run test:docker`: prueba sobre proyecto, puerto, volumen y credenciales
  generados, sin claves de proveedores. Se conserva solo evidencia depurada.

## Comprobaciones de contenedores

- Configuración exige credenciales; variables de desarrollo no se usan como claves
  operativas. Solo web publica un puerto, vinculado a 127.0.0.1.
- API y web healthy, sin root, raíz de solo lectura y capabilities eliminadas.
- Contexto exportado mediante Docker y revisado: archivos señuelo `.env.*` y SQLite
  excluidos, además de datos locales, configuración privada, node_modules y dist.
  Fuentes necesarias, CSS y símbolo compartidos presentes.
- La primera construcción detectó una exclusión demasiado amplia de directorios.
  Se corrigió antes de ejecutar la app, se reconstruyó y se retiraron la imagen
  inicial y sus capas de datos identificadas de la caché local. No se publicaron imágenes.
- Frontend y assets servidos; rutas internas/archivos inexistentes no se entregan.
  Rutas API desconocidas conservan error JSON.
- Login/logout y cookie HttpOnly/SameSite por el proxy; recursos protegidos sin
  sesión devuelven 401 y mutaciones desde otro origen devuelven 403.
- Webhook sintético de más de 128 KiB conserva cuerpo y firma, acepta duplicados
  sin crear otro evento y rechaza firma inválida. Evento de tipo ignorado, sin envío.
  Se verificaron límites de 1 MiB para webhook y 128 KiB para administración.
- SIGTERM termina API con código 0. API detenida produce error de proxy 502/504,
  mientras los estáticos siguen disponibles. Al recrearla, el proxy recupera salud.
  Tokens señuelo en query no aparecen en logs, incluso con API caída.
- Parada y recreación completa mantienen el registro sintético y su ID.
  `PRAGMA integrity_check` devuelve `ok`; `foreign_key_check` no devuelve filas.
  La prueba de volumen de solo lectura se ejecuta con el worker previamente detenido;
  debe fallar sin usar otra base y recuperar salud al restaurar el montaje escribible.

## Interfaz compilada

Chromium contra el servidor Nginx del contenedor: login y lista de contactos en
1440, 768 y 390 px, temas claro/oscuro, sin desbordamiento de página ni errores JS.
Acceso por Enter, contacto persistido visible y logout efectivo. Capturas revisadas
localmente, con datos sintéticos; no se agregan al repositorio.

## Límites y operación pendiente

- Solo se ejecutó linux/arm64 localmente. No se probó runtime amd64 ni reinicio del
  VPS, HTTPS público, backup/restauración externa o despliegue por GitHub Actions.
- El DNS de `app.openfunnel.mocca.cl` resuelve a la IP indicada por el usuario;
  no se modificaron el servidor, certificados ni la landing.
- No se verificó aquí el recorrido real Instagram/WhatsApp/Azure. El webhook probado
  usa firma y cuerpo sintéticos y no constituye evidencia de mensajería operativa.
- No es una auditoría de seguridad completa. Versiones fijadas no garantizan
  ausencia de vulnerabilidades; la auditoría previa sigue siendo otra entrega.
- El equipo tenía enlaces antiguos de las herramientas OrbStack. Se usaron sus
  binarios instalados en `/Applications/OrbStack.app/Contents/MacOS/xbin` y un
  directorio temporal de configuración CLI con esa ruta de plugins, sin modificar
  configuración global. En equipos con `docker compose` disponible no hace falta
  ese ajuste. Los comandos de la guía requieren que Docker/Compose estén en PATH.
