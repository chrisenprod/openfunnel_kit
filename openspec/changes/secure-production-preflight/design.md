# Design

## Context

Un administrador, una API/worker y SQLite. Docker funciona localmente; el VPS
compartido sirve la landing y otros proyectos. La app aún no tiene HTTPS publicado.

## Goals / Non-Goals

Preparar controles y secretos para producción y producir evidencia reproducible.
No desplegar durante la auditoría ni modificar servicios ajenos a OpenFunnel.

## Decisions

CI usa runners alojados, permisos contents:read, acciones fijadas por SHA y
persist-credentials:false. Push a main y PR ejecutan npm ci, audit, test, specs,
build de app/landing y test:docker. Los contenedores usan exclusivamente datos
sintéticos; no hay secretos de proveedores ni credenciales SSH en Actions.
La versión se identifica por github.sha; publicar imágenes y el despliegue manual
con aprobación y serialización se completarán al preparar la entrega VPS.

Nginx permite scripts/conexiones del mismo origen y estilos inline porque la UI
usa estilos dinámicos. Deniega framing, objetos y capacidades del navegador que
la app no necesita. La API rechaza secretos de firma menores a 32 caracteres.

Las variables se transfieren por stdin de SSH, host key verificada, sin argumentos
con secretos ni logs. La validación Compose usa un temporal 0600 en directorio
privado que se elimina inmediatamente. El destino es
/etc/openfunnel/app.env, directorio 0700 y archivo root:root 0600 creado sin
sobrescribir. Reutilizar claves de proveedores y acceso admin autorizados; generar
un secreto Better Auth distinto y conservar el secreto Zernio durante el traslado.
APP_ORIGIN y PUBLIC_BASE_URL apuntan al origen HTTPS acordado; puerto loopback
8180 libre en la revisión. No arrancar una segunda instalación con canales reales.

## Risks / Trade-offs

El VPS compartido requiere una intervención separada para actualizaciones de OS
y Docker; reportar evidencia sin confundir versiones con explotación confirmada.
La auditoría no cubre vulnerabilidades desconocidas ni pruebas destructivas. CI
local preparado no equivale a una ejecución de GitHub. Los secretos son legibles
por root y por administradores del daemon Docker cuando se inyecten al runtime.

## Migration Plan

Provisionar solo configuración, verificar permisos y coincidencia sin imprimir
valores. Ante destino existente abortar. Conservar desarrollo y webhook actuales.
Antes de desplegar: resolver hallazgos altos, respaldos/restauración, TLS, datos,
usuario de operación y un único worker. No hay migraciones de esquema en esta entrega.
