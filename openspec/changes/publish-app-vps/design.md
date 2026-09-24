# Design

## Context

VPS compartido con Nginx, Docker 26 y Ubuntu 20.04 sin ESM. El usuario aplaza el
upgrade del sistema y autoriza mitigación y publicación. Entorno ya provisionado
en /etc/openfunnel/app.env. La instalación local recibe el webhook de ngrok.

## Goals / Non-Goals

Publicar conservando los datos y servicios existentes, sin duplicar workers.
No convertir la auditoría acotada en certificación ni declarar completo el
recorrido de mensajes reales sin evidencia. No activar automatizaciones apagadas.

## Decisions

Red externa Docker llamada openfunnel con bridge br-openfunnel; Compose de
producción usa esa red y etiquetas de imagen por release. Solo web publica
127.0.0.1:8180. Reglas idempotentes filtran tráfico entrante antes de Docker:
DOCKER-USER bloquea nuevas conexiones desde fuera del bridge a sus contenedores;
INPUT bloquea el puerto interno desde interfaces no loopback; raw PREROUTING
bloquea paquetes externos destinados a 127.0.0.1:8180. IPv6 no se habilita en la red.
Un servicio oneshot requerido antes de Docker restaura estas reglas al arrancar;
no se reinicia Docker durante la instalación. Rollback retira solo reglas propias.

Nginx del host termina TLS, reenvía al puerto loopback, omite queries/cookies de
logs y limita login por IP además del límite global existente. Certbot utiliza
webroot y renovación ya instalada. La landing y otros vhosts se conservan.

Release separada de /srv/openfunnel_kit; fuentes públicas por archivo Git, entorno
fuera de la release. Construir antes del corte. Detener el backend local y su
watcher antes del respaldo final, verificar colas sin envíos pendientes y crear
snapshot consistente con node:sqlite. Transferencia cifrada y permisos privados.
Restaurar en volumen propio con UID 1000, comparar conteos e integridad y revocar
sesiones del entorno anterior. Conservar estados IA existentes. Registrar el
webhook existente en la nueva URL después de comprobar HTTPS y login.

Respaldos diarios con SQLite online backup, retención de siete días en el VPS,
restauración probada en un volumen temporal y copia inicial en este equipo.
La exportación automática externa requiere destino: no inventar credenciales ni
confundir una copia local inicial con una política externa continua.

## Risks / Trade-offs

Ubuntu sin soporte estándar/ESM sigue siendo un riesgo aceptado temporalmente por
el usuario. La mitigación de red no lo elimina. El arranque de Docker depende del
firewall: fallar cerrado protege los puertos; documentar diagnóstico y reversión.
Durante el corte pueden llegar eventos: conservar reintentos del proveedor y
sincronizar el historial tras actualizar el webhook, sin repetir envíos inciertos.

## Migration Plan

Construcción y aislamiento primero; comprobar reglas desde namespace de prueba.
Preparar TLS, detener worker anterior, respaldar/importar, arrancar/verificar y
actualizar webhook. Ante fallo, detener producción antes de reactivar local y
restaurar el webhook anterior; no mezclar dos bases activas. Después de recibir
datos productivos, regresar requiere un snapshot nuevo, no reutilizar el anterior.
