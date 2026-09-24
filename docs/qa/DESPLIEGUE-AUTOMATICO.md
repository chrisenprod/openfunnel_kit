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

Acceso restringido instalado. Pendiente ejecutar el workflow desde main.
No dar por terminado el cambio hasta registrar resultado y SHA publicado.

## Pendientes ajenos al cambio

Ubuntu aplazado, respaldo externo automático, destinos de alertas y recorrido real
nuevo de mensajería con cuenta autorizada. No enviar mensajes de prueba a terceros.
