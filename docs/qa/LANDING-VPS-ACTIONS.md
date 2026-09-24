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

Pendiente registrar primer workflow real y comparación de IDs de todos los
contenedores, entorno de la app y proceso de Nginx antes/después.

## Alcance de portabilidad

Nueva publicación de landing parametrizada y direcciones SSH/URLs en variables.
La migración completa de parámetros de la app no forma parte de esta entrega
prioritaria: inventario en [LANDING-VPS-ACTIONS.md](../deploy/LANDING-VPS-ACTIONS.md).
