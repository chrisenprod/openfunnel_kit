# Design

## Context

Producción usa releases por SHA, un API/worker, Nginx y volumen/red externos. Las variables viven en /etc/openfunnel/app.env. CI actual no despliega. La raíz de trabajo tiene cambios previos: la publicación usa una rama limpia aislada.

## Goals / Non-Goals

**Goals:** publicar main verificado, serializar, conservar SQLite/variables y recuperar el código anterior ante fallo de arranque o salud.

**Non-Goals:** CI con credenciales de negocio, shell root desde Actions, despliegues de PR, cambios del host/landing, restauración automática de SQLite o migraciones automáticas nuevas.

## Decisions

- workflow_run de Verificar app, solo success/push o workflow_dispatch de main del repositorio propio. No descargar artefactos ni ejecutar código del evento en el runner con secretos. Environment production permite main, sin revisión humana obligatoria por autorización de automatización.
- SSH con clave nueva, host key fijada desde el acceso ya verificado y usuario openfunnel-deploy. authorized_keys root-owned fuerza wrapper que solo acepta deploy SHA RUN_ID. sudo autoriza únicamente el dispatcher root-owned; no shell ni Docker directo.
- Dispatcher inicia unidad transitoria systemd y espera resultado. El trabajo continúa en el servidor si se corta SSH. Timeout acotado y lock del servidor complementan concurrencia Actions sin cancelación.
- Worker obtiene fuente exclusivamente del repositorio público fijo, verifica en API GitHub que run pertenece al CI esperado, main, SHA y conclusión exitosa, y que SHA sigue en punta de main. La indisponibilidad de GitHub bloquea antes de modificar producción.
- Construir ambas imágenes, rechazar diferencias en migraciones/migrador respecto de release anterior, respaldar con el servicio existente y recrear mismo proyecto sin duplicar worker. Cambiar current de forma atómica y comprobar salud HTTP interna y HTTPS.
- Ante fallo tras empezar la sustitución, levantar release anterior y comprobar salud; informar fallo original aunque recupere. Nunca restaurar datos automáticamente. Si falla recuperación, reportar intervención requerida. No eliminar imágenes/volúmenes previos.
- Los scripts root instalados se actualizan por administración explícita; el despliegue no se autoactualiza ni toca firewall/TLS/backup/usuarios.

## Risks / Trade-offs

- Código aceptado en main y administradores del repo son confiables: Docker puede ejecutar instrucciones privilegiadas de build/Compose. La clave restringe comandos, no convierte main malicioso en código seguro.
- El build ocurre también en VPS y consume recursos; está acotado. Pausa breve del servicio al recrear la API.
- El guard de migraciones es conservador; cambios indirectos de escritura también requieren revisión de compatibilidad. El rollback de código no deshace escrituras.
- API pública GitHub tiene límite de consultas; falla cerrada. No requiere almacenar token GitHub en VPS.
- Ubuntu sigue aplazado; respaldo externo y alertas siguen pendientes. No se reinicia host ni daemon Docker.
