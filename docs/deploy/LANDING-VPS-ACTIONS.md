# Landing en VPS mediante GitHub Actions

Pages (`deploy-landing.yml`) y Vercel (`vercel.json`) siguen disponibles como
alternativas del curso. Cada instalación elige su destino. El despliegue del VPS
es opcional y no se activa al clonar o hacer fork.

## Configuración por instalación

El workflow `deploy-app.yml`, **Publicar VPS**, espera a que termine **Verificar app**
con éxito sobre `main` del repositorio propio. Los PR no acceden a producción.
Configurar con la cuenta GitHub del operador y el CLI `gh`:

| Ubicación | Nombre | Contenido |
|---|---|---|
| Variable del repositorio | `VPS_DEPLOY_ENABLED` | `true` para habilitar este destino |
| Variable de `production` | `VPS_APP_ENABLED` | `true` para publicar la app; `false` para solo landing |
| Variable de `production` | `VPS_LANDING_ENABLED` | `true` para publicar landing |
| Variables de `production` | `VPS_HOST`, `VPS_PORT`, `VPS_USER` | Host/IP, puerto y cuenta SSH restringida del VPS elegido |
| Variable de `production` | `VPS_KNOWN_HOSTS` | Clave pública del host, obtenida mediante un canal confiable |
| Variables del repositorio | `VPS_APP_URL`, `VPS_LANDING_URL` | URLs públicas del operador; omitir app si solo publica landing |
| Secreto de `production` | `VPS_DEPLOY_KEY` | Clave privada dedicada al comando de publicación |

El environment `production` debe permitir únicamente `main`. No pegar claves en
archivos versionados, argumentos de comandos ni documentación. Al migrar a otro
VPS, verificar su host key antes de sustituir `VPS_KNOWN_HOSTS`; no desactivar la
comprobación SSH. [ssh-config.example](../../deploy/ssh-config.example) es el ejemplo
versionado; `.codex/ssh-config` conserva la conexión privada local.

En el servidor, copiar [landing-deploy.env.example](../../deploy/landing-deploy.env.example)
a `/etc/openfunnel/landing-deploy.env`, root:root y modo 0600. Ajustar repositorio,
rama, origen HTTPS, rutas e imagen Node fijada por digest. No contiene credenciales
Zernio/Azure ni depende de la IP del servidor original. Las rutas predeterminadas
son una convención modificable, no una identidad de servidor.

Instalar como root, con modo 0755:

- `deploy/openfunnel-deploy-ssh.sh` → `/usr/local/sbin/openfunnel-deploy-ssh`.
- `deploy/openfunnel-deploy.sh` → `/usr/local/sbin/openfunnel-deploy`.
- `deploy/openfunnel-landing-release.sh` → `/usr/local/libexec/openfunnel-landing-release`.

La cuenta SSH dedicada no pertenece al grupo Docker; su home y authorized_keys son
propiedad de root. La clave usa `restrict,command="/usr/local/sbin/openfunnel-deploy-ssh"`.
Sudo solo permite el dispatcher `/usr/local/sbin/openfunnel-deploy`; el wrapper acepta
`deploy SHA RUN_ID` o `deploy-landing SHA RUN_ID`, sin shell, scp ni forwarding.
La configuración detallada del acceso existente está en [CI-Y-ENTORNO.md](CI-Y-ENTORNO.md).

Requisitos del VPS: Docker, Bash, Git, curl, Python 3, systemd, GNU coreutils/util-linux,
conectividad a GitHub/npm/registro de imágenes y Nginx/Caddy sirviendo `LANDING_ROOT/current`
por HTTPS. Preparar una primera release estática y el enlace `current` siguiendo
[DESPLIEGUE-LANDING.md](DESPLIEGUE-LANDING.md). El worker no instala servidores web,
no modifica DNS, firewall ni certificados, y requiere una versión previa para revertir.

## Qué ocurre al integrar cambios

1. CI verifica pruebas, specs y builds.
2. Actions solicita el SHA exacto por SSH. El VPS confirma CI, repositorio, rama y
   que el commit continúa en punta. Los destinos habilitados se ejecutan en serie.
3. Cada destino compara sus entradas con su última release. La app considera
   frontend/backend, dependencias, Docker/Compose y los recursos de marca compartidos.
   Landing considera `landing/`, dependencias, `.nvmrc` y su worker de publicación.
   Si solo cambia HTML/CSS exclusivo de landing, no se recrean API/web de la app.
4. Landing construye en un contenedor temporal sin secretos y con recursos acotados
   (una CPU, 1 GiB y 256 PIDs por defecto). Publica únicamente `dist/landing/`, rechaza
   enlaces/archivos especiales u ocultos y conserva los assets de la release anterior.
5. Cambia el enlace de forma atómica y compara el HTML HTTPS con el archivo esperado.
   Si falla, restaura el enlace anterior y verifica la recuperación. No recarga Nginx
   ni reinicia Docker u otras apps. No elimina releases anteriores.

El SHA de landing se guarda en `LANDING_STATE_ROOT/deployed-sha`, fuera de la carpeta
pública. El SHA de la app permanece en su `current/RELEASE`; pueden ser diferentes
cuando solo cambió uno de los destinos. El resumen de Actions identifica el commit
procesado, no afirma que ambos destinos se hayan recreado.

El dispatcher usa unidades `openfunnel-deploy-app-<SHA>` y
`openfunnel-deploy-landing-<SHA>`; consultar `journalctl -u <unidad>`. Una desconexión
SSH no detiene el worker supervisado. Si falla la app, el paso de landing no comienza;
resolver el fallo antes de reintentar el workflow. No se ejecutan builds simultáneos.
Para reintentar, ejecutar otra vez Publicar VPS mientras el SHA siga en punta de main,
o ejecutar Verificar app manualmente sobre main. Vigilar espacio y retirar solo
releases descartadas mediante una tarea administrativa explícita.

Los scripts privilegiados instalados no se autoactualizan desde Git: sus cambios
requieren instalación administrativa revisada. Esto evita que la actualización de
contenido cambie también el control del servidor sin revisión.

## Portabilidad pendiente del resto del VPS

Este cambio parametriza la nueva publicación de landing y las direcciones del
workflow. La migración completa de la app sigue pendiente y requiere revisar:

| Archivo | Valores que todavía pertenecen a la instalación actual |
|---|---|
| `deploy/openfunnel-release.sh` | Repositorio, rama, origen/health, raíz de releases y entorno de app |
| `deploy/openfunnel*.nginx.conf` y `openfunnel-app-proxy.conf` | Dominios, rutas de certificados y puerto del proxy |
| `deploy/openfunnel-firewall.sh` | Puerto, bridge y nombre de red; coordinarlos con Compose/proxy |
| `deploy/openfunnel-cert-renew.sh` | Dominio del certificado |
| `deploy/openfunnel-backup.sh` | Raíz de releases, entorno, proyecto Compose y destino de respaldos |
| `compose.production.yaml` y unidades systemd | Nombres de recursos/rutas; son convenciones reutilizables que deben coincidir |

No basta con cambiar la IP en SSH. Migrar también SQLite mediante respaldo coherente,
secretos por canal privado, DNS/TLS y webhook; mantener una sola API operativa y
verificar servicios compartidos. No se da por completada esa migración con este cambio.

Referencias: [workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
y [límites de recursos Docker](https://docs.docker.com/engine/containers/resource_constraints/).
