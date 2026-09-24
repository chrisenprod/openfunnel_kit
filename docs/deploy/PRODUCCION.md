# App en el VPS

Publicada el 2026-09-24 en **https://app.openfunnel.mocca.cl**, API bajo `/api`.
La landing conserva https://openfunnel.mocca.cl. CI está integrado en main;
el despliegue automático se configura en [CI-Y-ENTORNO.md](CI-Y-ENTORNO.md). El usuario aplazó expresamente el mantenimiento
de Ubuntu: es un riesgo pendiente, no corregido por el aislamiento de Docker.

## Instalación

- Fuentes y metadatos: `/srv/openfunnel-app/releases/<commit>`, con enlace `current`.
  El archivo `RELEASE` identifica el commit usado para etiquetar ambas imágenes.
  El antiguo checkout de la landing no se sobrescribe.
- Entorno: `/etc/openfunnel/app.env`, root:root 0600 dentro de directorio 0700.
  Orígenes HTTPS de producción, Luna por defecto y secreto de sesión independiente.
- Compose: `compose.yaml` + `compose.production.yaml`, proyecto `openfunnel`.
- Red externa `openfunnel`, bridge `br-openfunnel`, IPv6 deshabilitado.
- Volumen externo `openfunnel_app-data`, preservado incluso al retirar Compose.
  Una sola API/worker; procesos de aplicación sin root y raíz de solo lectura.
- Nginx del host termina TLS y conecta a `127.0.0.1:8180`. API sin puerto publicado.
  El puerto 8180 está coordinado con las reglas de firewall: no cambiarlo por separado.

Desde la raíz de la release en el VPS:

```sh
export OPENFUNNEL_RELEASE=$(cat RELEASE)
docker compose --env-file /etc/openfunnel/app.env -f compose.yaml -f compose.production.yaml -p openfunnel config --quiet
docker compose --env-file /etc/openfunnel/app.env -f compose.yaml -f compose.production.yaml -p openfunnel ps
```

No imprimir `config` sin `--quiet`, entornos o `inspect` completos: contienen secretos.

## Aislamiento

`deploy/openfunnel-firewall.sh` instala reglas idempotentes específicas. Bloquea
conexiones nuevas desde fuera del bridge a los contenedores, entradas al puerto
interno desde interfaces no loopback y paquetes externos destinados al puerto de
loopback antes de NAT. No vacía cadenas compartidas ni cambia reglas de otros servicios.

`openfunnel-firewall.service` se requiere antes de Docker al arrancar. Se instaló
sin reiniciar Docker. Si falla en un futuro arranque, Docker queda esperando su
reparación: revisar `journalctl -u openfunnel-firewall` y aplicar el script; no
desactivar la protección como solución. Revalidar después de cambios de UFW/Docker.

Se probó con un contenedor sintético y una red de prueba: acceso local permitido,
puerto interno/directo bloqueados y contador de DROP incrementado ante un paquete
L2 destinado a loopback. Los recursos de prueba se eliminaron. El puerto interno
también resultó inaccesible desde fuera del VPS.

Para retirar únicamente estas reglas, primero detener OpenFunnel, deshabilitar su
unidad de firewall y ejecutar `/usr/local/sbin/openfunnel-firewall remove`.
El script rechaza retirar la protección con contenedores de esa red activos.
No restablecer un dump completo de iptables: afectaría otros servicios del host.

Fundamento: [Docker e iptables](https://docs.docker.com/engine/network/firewall-iptables/)
y [publicación de puertos](https://docs.docker.com/engine/network/port-publishing/).

## HTTPS e integraciones

Configuración Nginx en `deploy/openfunnel-app.nginx.conf` y su snippet de proxy.
Certbot usa webroot, `certbot.timer` y un hook de recarga específico. Los logs
omiten queries, cookies y cuerpos; el login añade límite por IP en el proxy,
conservando el límite global de la API. Esto no elimina todo riesgo de denegación
de servicio del login distribuido.

La migración detuvo backend y watcher locales, creó un snapshot consistente,
comparó integridad y conteos y revocó sesiones anteriores. Se conservaron los IDs,
datos y estados IA existentes. El webhook de OpenFunnel se actualizó al dominio
productivo; no se creó un receptor duplicado. Tras comprobarlo se retiraron ngrok
y el reenvío temporal. No arrancar la base local original como otro worker operativo.
Para desarrollo, utilizar base y entorno de QA sin claves de proveedores.

Zernio y Azure se validaron desde producción; las pruebas de conexión de modelo
no enviaron mensajes a personas. Un recorrido real nuevo de Instagram/WhatsApp
requiere mensajes de una cuenta de prueba autorizada y evidencia independiente.

## Respaldos y recuperación

`openfunnel-backup.timer` ejecuta una copia diaria a las 03:20 UTC, con hasta diez
minutos de dispersión. El script usa SQLite online backup, verifica integridad y
FK, impide ejecuciones simultáneas y guarda archivos 0600 bajo
`/var/backups/openfunnel` (0700), con retención de siete días. La copia previa al
corte permanece separada en `migration/`.

```sh
systemctl start openfunnel-backup.service
systemctl show openfunnel-backup.service -p Result
systemctl list-timers openfunnel-backup.timer
```

Una restauración real del respaldo se comprobó en un volumen temporal sin red ni
worker. Se guardaron copias privadas iniciales fuera del VPS, en este equipo,
bajo `.codex/backups/`, ignorado por Git. **La exportación externa automática sigue
pendiente de definir un destino.** No confundir el respaldo diario en el mismo
disco ni una copia inicial externa con esa política continua.

Antes de actualizar, crear y verificar un respaldo; construir una release separada
con CI aprobado, conservar la anterior y comprobar compatibilidad de migraciones.
Cambiar `current` y ejecutar Compose con el mismo proyecto/red/volumen, nunca dos
workers. Para volver de código, usar la release compatible anterior con esos mismos
datos. Restaurar una base anterior descarta cambios posteriores y requiere un
procedimiento explícito de conciliación: no es un rollback automático.

Para volver a la instalación local después de recibir datos en producción, detener
primero producción, crear un snapshot nuevo y actualizar el webhook. No reactivar
sin más la base local anterior al corte.

## Comprobaciones operativas y pendientes

`/api/health` consulta SQLite; Docker registra salud y rota sus logs. Consultar
también `journalctl -u openfunnel-backup` y espacio disponible. Los destinos de
alertas externas y respaldo externo automático quedan pendientes. La evidencia
detallada de infraestructura y el inventario privado están en `docs/qa/private/`.
No se reinició el VPS compartido durante esta entrega; se comprueban dependencias
de arranque y reinicio de la app, no un reinicio completo del host.
