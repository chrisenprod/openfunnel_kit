# CI y entorno de producción

Actualizado: 2026-09-24. La app está publicada; operación en [PRODUCCION.md](PRODUCCION.md).
CI verificado en el [PR #2](https://github.com/chrisenprod/openfunnel_kit/pull/2),
integrado a main. Ver [evidencia](../qa/SEGURIDAD-Y-CI.md).

## Verificación en GitHub

`.github/workflows/ci.yml` ejecuta `npm ci`, `npm audit --audit-level=high`,
`npm test`, `npm run spec:validate`, builds de app/landing y `npm run test:docker`.
Se dispara en push a `main`, pull requests hacia `main` y ejecución manual. Usa
Node 24, acciones fijadas por SHA, token de solo lectura y credenciales Git no
persistidas. Las ejecuciones obsoletas de la misma referencia se cancelan.

El test Docker construye ambas imágenes y verifica auth, proxy, cabeceras, límites,
webhooks, persistencia, ausencia de secretos en el contexto, usuario no root y
recuperación con datos sintéticos. El resumen identifica el commit comprobado.
No requiere secretos de GitHub, credenciales SSH ni claves de proveedores.
Este workflow no publica imágenes ni despliega; Publicar app consume su resultado
exitoso para main. El flujo manual de la landing sigue
siendo independiente. Una vulnerabilidad alta o crítica informada por npm bloquea CI.

Desde un checkout en la raíz, con Docker y Compose disponibles:

```sh
npm ci
npm audit --audit-level=high
npm test
npm run spec:validate
npm run build
npm run build:landing
npm run test:docker
```

## Entorno privado del VPS

La configuración preparada vive en `/etc/openfunnel/app.env`, propiedad de root
y modo `0600`; su directorio tiene modo `0700`. Queda fuera del checkout, del
directorio público y de las imágenes. Solo se usa al arrancar los contenedores.

- `DOCKER_APP_ORIGIN` y `DOCKER_PUBLIC_BASE_URL`: origen HTTPS de la app acordado.
- `DOCKER_HTTP_PORT`: puerto libre elegido en el VPS, publicado solo en loopback.
- Credenciales de administrador y claves Zernio/LLM: transferidas por SSH desde el
  entorno autorizado, sin valores en argumentos, Git, documentación ni logs.
- `DOCKER_LLM_MODEL`: Luna por defecto.
- `DOCKER_BETTER_AUTH_SECRET`: generado específicamente para producción.
- `DOCKER_ZERNIO_WEBHOOK_SECRET`: se conserva durante el traslado; no se modifica
  el webhook remoto hasta tener HTTPS, datos y un único receptor operativo.

Se verificaron la interpretación exacta de valores por Compose, integridad de la
transferencia y permisos. La creación inicial rechaza un destino existente; las
rotaciones deben ser explícitas y coordinadas. El temporal local usado para validar
Compose se creó privado y se eliminó. El transporte SSH verificó la clave del host.

Cuando exista un checkout de la versión aprobada en el servidor, validar sin
imprimir las variables:

```sh
sudo docker compose --env-file /etc/openfunnel/app.env -p openfunnel config --quiet
```

No ejecutar `config` sin `--quiet`, ni registrar `docker inspect` completo de la
API: ambos pueden mostrar secretos. Root y administradores de Docker pueden leer
el entorno de ejecución; los permisos del archivo no los aíslan.

## Despliegue automático de la app

La primera publicación resolvió aislamiento, TLS y traslado/restauración. El usuario
aplazó expresamente Ubuntu; el respaldo externo automático sigue pendiente.
Para futuras publicaciones, seleccionar un commit con CI exitoso y verificar los
riesgos operativos. No usar `git pull` sobre un checkout remoto con cambios
locales; preparar una release separada identificada por commit.

Definir el traslado de SQLite y detener el receptor/worker anterior antes de
activar el nuevo webhook. Registrar las cuentas de prueba autorizadas. La reversión
debe contemplar compatibilidad del esquema y respaldo, no solo imágenes anteriores.

El usuario autorizó automatizar las actualizaciones mediante
`.github/workflows/deploy-app.yml` (**Publicar app**). Se activa al terminar
**Verificar app** con éxito sobre main del repositorio propio (push o ejecución
manual de CI). Un PR nunca accede al environment de producción. Los workflows
permanecen separados: las pruebas no reciben claves de producción.

El environment `production` permite únicamente la rama `main`. Contiene el secreto
`VPS_DEPLOY_KEY` y las variables `VPS_HOST`, `VPS_PORT`, `VPS_KNOWN_HOSTS`; esta última
fija la clave pública del host obtenida mediante el acceso SSH previamente verificado.
No usar `ssh-keyscan` sin verificación ni desactivar StrictHostKeyChecking. Las claves
de negocio y SQLite permanecen exclusivamente en el VPS. El job no usa checkout,
artefactos ni cachés del workflow origen. No requiere revisión manual en cada
publicación porque se autorizó la automatización.

La cuenta `openfunnel-deploy` tiene una clave exclusiva con `restrict` y comando
forzado. Su home y authorized_keys son propiedad de root. No pertenece al grupo
Docker y sudo solo permite `/usr/local/sbin/openfunnel-deploy`. El wrapper admite
`deploy <SHA de 40 caracteres> <ID numérico de CI>` y rechaza shell, scp y forwarding.
El dispatcher y el worker se instalan root-owned desde:

- `deploy/openfunnel-deploy-ssh.sh` → `/usr/local/sbin/openfunnel-deploy-ssh`.
- `deploy/openfunnel-deploy.sh` → `/usr/local/sbin/openfunnel-deploy`.
- `deploy/openfunnel-release.sh` → `/usr/local/libexec/openfunnel-release`.

El worker valida de forma independiente el resultado, workflow, repositorio, rama y
SHA mediante la API pública de GitHub, descarga solo main del remoto fijo y vuelve
a comprobar su punta después de construir. Una versión obsoleta o un fallo de GitHub
bloquean la publicación. No se guarda un token GitHub en el servidor.

El workflow serializa publicaciones sin cancelar la activa. El VPS añade un lock y
una unidad transitoria systemd `openfunnel-deploy-<SHA>`: una desconexión SSH no
interrumpe la ejecución supervisada. Los logs quedan en el journal. La publicación
construye imágenes por SHA, rechaza cambios de migraciones/migrador, crea un respaldo
verificado, sustituye la misma API/web y comprueba salud por loopback y HTTPS.
Ante fallo tras comenzar el corte intenta recuperar el código anterior sobre la
misma base; la ejecución sigue marcada como fallida. Nunca restaura SQLite sola.

### Operación y límites

- Para publicar: integrar un PR a main y esperar **Verificar app → Publicar app**.
- Para reintentar: volver a ejecutar el job fallido de Publicar app, siempre que su
  commit siga en punta de main. También se puede ejecutar Verificar app manualmente
  sobre main. No se aceptan SHAs históricos para retroceder silenciosamente.
- Consultar `journalctl -u openfunnel-deploy-<SHA>` por acceso administrativo.
  Si falló recuperación, intervenir siguiendo [PRODUCCION.md](PRODUCCION.md).
- Cambios de migraciones requieren revisión/publicación manual de compatibilidad;
  cambios indirectos de escritura también deben revisarse antes de integrar.
- Los scripts instalados, firewall, TLS, usuarios y respaldo no se autoactualizan.
  Sus cambios requieren instalación administrativa explícita. Las releases e imágenes
  se conservan para recuperación; vigilar disco y limpiar solo versiones descartadas.
- Una clave restringida no hace seguro código malicioso aceptado en main: los
  mantenedores con permiso de integración son una frontera de confianza, y Docker
  tiene privilegios sobre el host. El job se limita a este repositorio/instalación.
- La reversión tiene pruebas sintéticas de fallo; la publicación real se registra en
  [QA de despliegue](../qa/DESPLIEGUE-AUTOMATICO.md), sin provocar caídas productivas.

Referencia: [eventos workflow_run de GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
y [environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
