# Publicar la landing: tres ejercicios

La landing es un sitio estático: Vite transforma `landing/` en `dist/landing/`.
El navegador recibe HTML, CSS, JavaScript e imágenes. Node solo hace falta para
compilar; la API y SQLite no participan en estos despliegues.

| Destino | Quién compila | Qué sirve la web | Requisitos pendientes |
|---|---|---|---|
| GitHub Pages | GitHub Actions | `dist/landing/` como artefacto Pages | Subir los cambios y seleccionar Source: GitHub Actions |
| Vercel | Vercel | `dist/landing/` | Conectar el repositorio e importar el proyecto desde la raíz |
| VPS | Tu equipo | Copia de `dist/landing/` | Acceso SSH, servidor web, dominio y DNS para HTTPS |

La preparación del repositorio no publica el sitio. El workflow de Pages se
ejecuta manualmente; importar el proyecto en Vercel y pulsar Deploy sí lo publica.
El ejemplo del VPS asume Linux con systemd y Caddy. Adaptarlo al servidor real
antes de ejecutar los comandos, especialmente si ya aloja otros sitios.

## 1. Comprobar la compilación

Desde la raíz del repositorio, con Node 24.13 o superior (rama 24):

```sh
nvm use
node --version
npm ci
npm run build:landing
npm run preview:landing
```

`nvm use` requiere tener nvm instalado; también sirve otra instalación de Node 24.
Abrir http://127.0.0.1:4174 y revisar escritorio, móvil, Tab, enlaces internos y
selector de tema. `npm run build` comprueba por separado que la aplicación React
sigue compilando. Los comandos de npm siempre se ejecutan desde la raíz.

`base: './'` en `landing/vite.config.js` genera rutas relativas. Esta landing de una
sola página usa anclas (`#concepto`, etc.), así que el mismo resultado funciona en
`https://dominio/` y `https://chrisenprod.github.io/openfunnel_kit/`. En subrutas,
conservar la barra final. Si se añaden páginas o rutas cliente habrá que revisar
esta decisión y el comportamiento 404.

No subir `node_modules`, `.env`, bases de datos ni el repositorio completo al
directorio servido. La carpeta pública es exclusivamente `dist/landing/`.
`vite preview` y `npm run dev:landing` son herramientas locales, no servidores
de producción. No se necesitan secretos ni variables `VITE_*` para esta landing.

## 2. GitHub Pages

El repositorio oficial es público y su rama predeterminada es `main`. Pages estaba
desactivado al preparar esta guía. La cuenta utilizada debe ser `chrisenprod`.

1. Revisar y subir a `main` los cambios de la landing, su configuración y
   `.github/workflows/deploy-landing.yml`. El workflow debe estar en la rama
   predeterminada para poder iniciarlo manualmente.
2. En **Settings → Pages → Build and deployment → Source**, seleccionar
   **GitHub Actions**. No seleccionar una rama para servir código fuente.
3. En **Actions → Publicar landing en GitHub Pages → Run workflow**, elegir `main`
   y ejecutar. El workflow limita la publicación a la rama predeterminada.
4. Esperar a que terminen `build` y `deploy`; abrir la URL del entorno
   `github-pages`. Sin dominio personalizado se espera
   `https://chrisenprod.github.io/openfunnel_kit/`.

El workflow instala Node según `.nvmrc`, ejecuta `npm ci` y `npm run build:landing`,
y sube solo `dist/landing/`. El job de despliegue tiene permisos `pages: write` e
`id-token: write`; utiliza el token automático de Actions, sin PAT guardado como
secreto. No hace falta una rama `gh-pages` ni generar el sitio con Jekyll.

Para consultar o ejecutar desde la terminal, usar GitHub CLI:

```sh
gh auth status
# Solo si la cuenta activa no es chrisenprod:
gh auth switch --hostname github.com --user chrisenprod
gh api user --jq .login
# Continuar solo si devuelve chrisenprod.
gh auth setup-git --hostname github.com
gh workflow run deploy-landing.yml --ref main
gh run list --workflow deploy-landing.yml --limit 5
```

Si falta sesión, usar `gh auth login --hostname github.com --git-protocol https`
con `chrisenprod` y verificar de nuevo la identidad. Si el push del workflow pide
el scope `workflow` para una sesión OAuth, usar
`gh auth refresh --hostname github.com --scopes workflow`; no copiar tokens.

Para actualizar, subir los cambios y repetir Run workflow. Para volver atrás,
revertir el commit correspondiente en `main` y ejecutar otra vez. Si falla el
despliegue, comprobar Source, permisos de Actions y las reglas del entorno
`github-pages` antes de volver a intentarlo.

## 3. Vercel

Importar el repositorio `chrisenprod/openfunnel_kit` como un proyecto de Vercel.
Autorizar acceso a ese repositorio y conservar **Root Directory: raíz del
repositorio** (dejar el campo predeterminado; no seleccionar `landing/`).

`vercel.json` define los valores:

| Ajuste | Valor |
|---|---|
| Framework Preset | Other (`framework: null`) |
| Install Command | `npm ci` |
| Build Command | `npm run build:landing` |
| Output Directory | `dist/landing` |
| Node.js Version | Seleccionar 24.x y revisar la versión en el log |
| Production Branch | `main` |
| Environment Variables | Ninguna para la landing |

El preset Other deja explícito que se sirven archivos estáticos; Vite sigue siendo
la herramienta de compilación. Evita publicar la aplicación React con el comando
genérico `npm run build`. `package.json` declara `>=24.13.0`; Vercel resuelve rangos
abiertos a la mayor versión compatible disponible, así que revisar esto si en el
futuro incorpora una nueva rama de Node.

Pulsar **Deploy** y comprobar la URL que Vercel asigne. Con la integración Git,
los siguientes pushes a `main` generan despliegues de producción y los de otras
ramas generan previews, según los ajustes del proyecto. Para una práctica
controlada, tener presente esta diferencia con el workflow manual de Pages.
Para volver atrás, usar un despliegue anterior desde el panel y revertir el cambio
en Git para que la siguiente publicación no vuelva a introducirlo.

La configuración no crea funciones ni requiere conectar el backend. No se añade
una regla que redirija todas las rutas a `index.html`: una ruta inexistente debe
devolver 404. Si se usa la CLI de Vercel, `.vercel/` queda fuera de Git.

## 4. VPS

### Despliegue activo: Nginx en MOCCA-CLOUD

Publicado el 23 de septiembre de 2026 en **https://openfunnel.mocca.cl**.
El DNS apunta a `164.92.74.160`. El acceso local usa
`ssh -F .codex/ssh-config mocca-cloud` (puerto 2222); ese archivo es privado y
no se copia al VPS ni se versiona.

- Repositorio completo: `/srv/openfunnel_kit`, con historial Git y copia del
  estado local, incluidos los cambios sin commit. Solo root puede acceder.
- Landing pública: `/var/www/openfunnel/current`, enlace a
  `releases/20260923-a56e27f`. Contiene exclusivamente `dist/landing/`.
- Sitio Nginx: `/etc/nginx/sites-available/openfunnel.mocca.cl`, enlazado desde
  `sites-enabled`; copia en [`deploy/openfunnel.nginx.conf`](../../deploy/openfunnel.nginx.conf).
- TLS: Let's Encrypt, con desafío webroot en `/var/www/letsencrypt`.
  `certbot.timer` gestiona la renovación; el hook valida y recarga Nginx.
- HTTP redirige a HTTPS. Las rutas inexistentes y los archivos ocultos devuelven
  404. No se inicia la aplicación React ni la API.

Para actualizar la landing, compilar localmente y crear una nueva release. Estos
comandos se ejecutan desde la raíz del proyecto; requieren la configuración SSH
local. Conservan los assets de la release anterior para visitantes con HTML viejo:

```sh
npm run build:landing
release="$(date -u +%Y%m%d-%H%M%S)"
ssh -F .codex/ssh-config mocca-cloud "mkdir /var/www/openfunnel/releases/$release && cp -a /var/www/openfunnel/current/assets /var/www/openfunnel/releases/$release/"
rsync -av --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r \
  -e 'ssh -F .codex/ssh-config' dist/landing/ \
  "mocca-cloud:/var/www/openfunnel/releases/$release/"
ssh -F .codex/ssh-config mocca-cloud "ln -s releases/$release /var/www/openfunnel/current.next && mv -Tf /var/www/openfunnel/current.next /var/www/openfunnel/current"
curl -I https://openfunnel.mocca.cl/
```

El cambio de enlace es atómico y no requiere recargar Nginx. Para volver atrás,
repetir el último comando SSH con el identificador de una release anterior.
La copia del código fuente se mantiene por separado; no ejecutar `git pull`
sobre cambios sin commit sin revisarlos. No hay despliegue automático desde GitHub.

### Alternativa para otro VPS: Caddy

Antes de adaptar este ejemplo, identificar el sistema operativo, el usuario SSH,
la IP, el dominio y el servidor o panel existente. Si Nginx, Apache u otro servicio
ya ocupa los puertos 80/443, configurar el sitio allí o planificar su integración
en lugar de instalar un segundo servidor sobre los mismos puertos.

Para un VPS con Caddy y systemd:

1. Instalar Caddy siguiendo las instrucciones oficiales para su distribución.
2. Apuntar el registro A de `landing.tu-dominio.cl` a la IPv4 del VPS. Añadir AAAA
   solo si IPv6 funciona en ese servidor.
3. Permitir tráfico entrante TCP 80/443 en el firewall del proveedor y del sistema,
   conservando el acceso SSH. Caddy gestiona certificados y redirección a HTTPS.
4. Preparar `/srv/openfunnel-landing` con lectura para Caddy y escritura para el
   usuario de despliegue. No servir desde el home privado ni cambiar permisos de
   otros sitios.

Los siguientes ejemplos se ejecutan **desde la raíz del proyecto en tu equipo**;
los comandos dentro de `ssh` actúan en el VPS. Sustituir `deploy`, `IP_DEL_VPS` y el
dominio por los valores reales. El usuario `deploy` debe existir y tener sudo
para la preparación inicial. La carpeta debe estar dedicada a esta landing.

```sh
ssh deploy@IP_DEL_VPS 'sudo install -d -m 755 -o deploy -g deploy /srv/openfunnel-landing'
npm run build:landing
rsync -av --chmod=D755,F644 dist/landing/ deploy@IP_DEL_VPS:/srv/openfunnel-landing/
```

La barra final en `dist/landing/` copia su contenido. Este ejemplo conserva los
assets antiguos para que visitantes con HTML anterior puedan seguir cargándolos;
no utiliza `--delete`. Para este sitio pequeño es una transferencia sencilla,
sin garantía de actualización atómica. Conservar una copia local de la última
compilación publicada permite restaurarla con el mismo `rsync`; la limpieza de
assets antiguos puede hacerse después, fuera de la práctica inicial.

Adaptar el bloque de `deploy/Caddyfile.example` con el dominio real e incorporarlo
a `/etc/caddy/Caddyfile` en el VPS, conservando los bloques de sitios existentes:

```caddyfile
landing.tu-dominio.cl {
    root * /srv/openfunnel-landing
    encode zstd gzip
    file_server
}
```

Validar antes de recargar:

```sh
ssh deploy@IP_DEL_VPS 'sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile'
ssh deploy@IP_DEL_VPS 'sudo systemctl reload caddy'
curl -I https://landing.tu-dominio.cl/
```

Después de la configuración inicial, actualizar solo requiere compilar y repetir
`rsync`. No hace falta reiniciar Caddy por cambios en archivos estáticos. El VPS
no necesita Node, npm, PM2, Docker ni SQLite para servir esta landing.

## 5. Comprobación en cada destino

- La portada devuelve 200 por HTTPS; imágenes, CSS y JavaScript cargan sin 404.
- El título es «OpenFunnel — De conversación a resultado»; el favicon y el fondo
  de acuarela aparecen.
- Los enlaces de secciones funcionan, los enlaces a GitHub apuntan al repositorio
  correcto y el selector de tema conserva la elección al recargar.
- No hay desbordamiento horizontal en móvil; Tab permite llegar a navegación,
  selector y botones con foco visible.
- Una URL inexistente devuelve 404; la landing no realiza peticiones a `/api`.
- Revisar la consola del navegador y probar una recarga completa en cada URL.

Antes de usar un dominio definitivo, elegir cuál de los tres será el sitio
principal. Añadir entonces URL canónica, metadatos Open Graph e imagen social con
las URLs reales. No bloquear esto inventando un dominio durante el ejercicio.
La landing ya tiene título, descripción y favicon; los metadatos sociales quedan
pendientes de esa decisión. Los tres destinos pueden tener URLs distintas para
comparar el resultado educativo.

Esta guía no cambia los permisos de la landing ni de la marca; consultar
`LICENSING.md` para el alcance por archivo.

## Referencias oficiales

- [Vite: base relativa](https://vite.dev/guide/build.html#relative-base).
- [Vite: despliegue estático y límites de preview](https://vite.dev/guide/static-deploy.html).
- [GitHub Pages: workflows propios](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- [Vercel: vercel.json](https://vercel.com/docs/project-configuration/vercel-json).
- [Vercel: versiones de Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
- [Caddy: instalación](https://caddyserver.com/docs/install).
- [Caddy: archivos estáticos](https://caddyserver.com/docs/quick-starts/static-files).
- [Caddy: HTTPS automático](https://caddyserver.com/docs/automatic-https).
