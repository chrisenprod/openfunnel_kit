# Verificación del despliegue automático

Cambio: `automate-vps-deploy`, 2026-09-24.

## Alcance

Pruebas del flujo shell con Docker, GitHub y systemd simulados en un directorio
temporal; no escriben en producción ni contactan proveedores. Cubren procedencia
de CI, PR/forks/ramas, SHA obsoleto, lock, migraciones, fallos de build/respaldo,
fallos de arranque/salud, rollback fallido y camino correcto. El wrapper real
rechaza shell, scp e inyección. La evidencia sintética no demuestra un rollback
real de producción.

Pasaron 46 pruebas (17 de despliegue), 14 validaciones OpenSpec y el build de app.
Environment production configurado para main; clave nueva en secreto de GitHub,
host key fijada y usuario sin grupo Docker. El comando SSH `id` fue rechazado.

## Ejecución real

Primera ejecución real completada desde Actions, sin publicación manual del commit:

- [PR #4](https://github.com/chrisenprod/openfunnel_kit/pull/4), integrado a main.
- SHA publicado: `34010a4fc8c9367d21c2c3d9c15dd4aafbe3a94d`.
- [CI de main](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36047673183): success.
- [Publicar app](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36047847361): success; el journal confirma Deployed and healthy.
- `current/RELEASE` coincide con ese SHA. API y web healthy; únicamente la API usa
  el volumen operativo. El respaldo previo terminó con Result=success.
- Login, cookie segura, salud, consulta de datos, canales y configuración del agente
  comprobados por HTTPS. Historial conservado y webhook Zernio registrado; Luna
  permanece configurado. No se enviaron mensajes de prueba a terceros.
- Comparación privada antes/después: contenido del entorno sin cambios y los diez
  contenedores de otras apps mantienen exactamente sus identificadores. No hubo
  reinicio del host, Docker, Nginx ni servicios ajenos a OpenFunnel.
- Se comprobó además el rechazo real del dispatcher ante un CI de PR que no
  corresponde al SHA solicitado, antes de cambiar la release.

La clave privada temporal de aprovisionamiento se retira tras verificar el flujo;
Actions conserva su copia como secreto del environment. La recuperación ante fallos
se probó de forma sintética, sin provocar deliberadamente una caída productiva.

## Pendientes ajenos al cambio

Ubuntu aplazado, respaldo externo automático, destinos de alertas y recorrido real
nuevo de mensajería con cuenta autorizada. No enviar mensajes de prueba a terceros.
