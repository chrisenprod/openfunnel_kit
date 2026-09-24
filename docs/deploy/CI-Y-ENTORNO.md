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
No publica imágenes ni despliega al pasar CI. El flujo manual de la landing sigue
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

## Puerta de entrada al despliegue manual

La primera publicación resolvió aislamiento, TLS y traslado/restauración. El usuario
aplazó expresamente Ubuntu; el respaldo externo automático sigue pendiente.
Para futuras publicaciones, seleccionar un commit con CI exitoso y verificar los
riesgos operativos. No usar `git pull` sobre un checkout remoto con cambios
locales; preparar una release separada identificada por commit.

Definir el traslado de SQLite y detener el receptor/worker anterior antes de
activar el nuevo webhook. Registrar las cuentas de prueba autorizadas. La reversión
debe contemplar compatibilidad del esquema y respaldo, no solo imágenes anteriores.

El despliegue inicial será manual. Un futuro job de despliegue deberá usar un
environment protegido, autorización explícita, concurrencia sin cancelación del
despliegue activo y acceso SSH restringido. Esta entrega no guarda una clave root
en Actions ni automatiza cambios sobre el VPS compartido.
