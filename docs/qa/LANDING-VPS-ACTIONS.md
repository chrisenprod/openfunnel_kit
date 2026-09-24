# Verificación de landing en VPS por Actions

Cambio automate-landing-vps, 2026-09-24.

## Comprobaciones locales

58 pruebas aprobadas, incluidas once de landing y selección de entradas de app;
15 elementos OpenSpec válidos; compilaciones de app y landing correctas.
Se probaron procedencia de CI, PR/fork, SHA obsoleto, fetch/build fallido, rechazo de
symlinks/archivos ocultos, conservación de assets, límites del builder, salto de
versiones sin cambios y rollback tras fallo HTTPS mediante dependencias simuladas.
No se provocó una caída productiva para probar rollback.

Pages y Vercel conservan sus configuraciones sin cambios. Las imágenes locales
no utilizadas y no versionadas permanecen fuera de esta entrega.

## Instalación y ejecución real

Scripts revisados instalados y configuración externa root-owned. Variables de
GitHub habilitan app/landing; se reutiliza la clave restringida sin extraerla.
No se reiniciaron servicios durante la instalación.

Primera ejecución real completada tras integrar [PR #6](https://github.com/chrisenprod/openfunnel_kit/pull/6):

- [CI main](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36058848838): success.
- [Publicar VPS](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36058997377): success.
- SHA publicado de landing: `50ebd0fa47ce899c1a53556bfcd7f2eae57197c3`; coincide con
  `deployed-sha` y con el destino de current. El worker verificó coincidencia del HTML HTTPS.
- La app informó `App inputs unchanged; existing containers kept.` y conservó
  su release anterior. Landing informó `Landing deployed and healthy`.
- Comparación privada antes/después: los doce contenedores conservan sus IDs,
  el archivo de entorno de app mantiene su contenido y Nginx conserva su proceso principal.
- Portada y cuatro recursos estáticos referenciados devuelven 200. `.env`, `.git/config`
  y `RELEASE` devuelven 404 en la landing. La API de app conserva salud correcta.
- Builder temporal retirado. No se recargó Nginx ni se reinició Docker o servicios;
  no se enviaron mensajes ni se modificó el webhook.

## Alcance de portabilidad

Nueva publicación de landing parametrizada y direcciones SSH/URLs en variables.
La migración completa de parámetros de la app no forma parte de esta entrega
prioritaria: inventario en [LANDING-VPS-ACTIONS.md](../deploy/LANDING-VPS-ACTIONS.md).
