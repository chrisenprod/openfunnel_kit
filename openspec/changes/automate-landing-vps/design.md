# Design

## Context

La landing se sirve desde un enlace current de Nginx. La app tiene su propio Compose, base y release. Existe clave restringida y environment production. Pages y Vercel se mantienen disponibles.

## Goals / Non-Goals

**Goals:** automatización VPS activable por variables, migrable sin editar código nuevo, publicación/reversión atómica y conservación de otras apps.

**Non-Goals:** reconfigurar Nginx activo, DNS, firewall, Ubuntu o automatizar migraciones de infraestructura completa. No retirar otros destinos del curso.

## Decisions

- Extender el workflow Publicar VPS con un paso opcional de landing después de app, vía workflow_run del CI con conclusión success, main y repositorio propio; requiere VPS_LANDING_ENABLED=true. Sin checkout ni artefactos ejecutados con secretos en runner.
- Extender comando forzado con deploy-landing SHA RUN, dispatcher de destinos enumerados, mismo lock de app y pasos secuenciales dentro de una sola concurrencia de workflow, evitando colisiones y publicaciones paralelas. Estado y logs en systemd sobreviven cortes SSH.
- /etc/openfunnel/landing-deploy.env root-owned proporciona repositorio/rama, origen público, raíz pública, directorio privado e imagen Node fijada por digest. SSH host/port/host key permanecen variables de GitHub. El ejemplo no contiene IP/dominio de este VPS.
- Validar run por API y punta de rama antes y después del build. Comparar entradas landing/, package*.json y script de publicación con el último SHA publicado; omitir si no cambian. La app compara sus propias entradas de build y Compose para no reiniciar por cambios exclusivos de landing/docs.
- Build en contenedor temporal sin secretos, root filesystem de solo lectura, sin capacidades, usuario node, límites de CPU/memoria/PIDs. Copiar únicamente dist/landing sin enlaces simbólicos o archivos especiales, preservar assets anteriores y permisos públicos de lectura.
- Comparar el HTML servido por HTTPS con el archivo publicado; si falla, restaurar enlace anterior y comprobarlo. No reiniciar/reload de Nginx, Docker o servicios. No borrar releases anteriores.
- El despliegue no actualiza sus scripts privilegiados; instalación administrativa explícita. Registrar inventario restante: dominios Nginx/renew, puerto firewall/proxy, ruta/repositorio app y backups.

## Risks / Trade-offs

Build en VPS limitado a una CPU y 1 GiB por defecto; requiere Docker y salida a registro/npm/GitHub. Código integrado en main es confiable. Retención manual de releases/assets requiere vigilar disco. La reversión se prueba con simulaciones sin provocar caídas reales. Portabilidad de toda la app permanece como siguiente etapa explícita.
