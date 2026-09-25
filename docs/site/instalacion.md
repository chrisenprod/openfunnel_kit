# Instalación

Ejecuta los comandos desde la raíz de un clon del repositorio. Para desarrollo necesitas Git y Node.js **24.13.0 o superior**. `.nvmrc` selecciona Node 24. Para Docker necesitas Docker Engine con Compose v2.

## Desarrollo local

```sh
git clone https://github.com/chrisenprod/openfunnel_kit.git
cd openfunnel_kit
npm ci
cp .env.example .env.local
```

Edita `.env.local`: define `admin_user` y una contraseña propia de 12 a 128 caracteres en `admin_pass`. Conserva `APP_ORIGIN=http://localhost:5173` si abrirás esa URL. No sobrescribas un `.env.local` existente.

En una terminal inicia la API:

```sh
npm run dev:backend
```

En otra terminal inicia la interfaz:

```sh
npm run dev
```

Abre **http://localhost:5173**. El frontend redirige `/api` al backend en el puerto 3001. SQLite se crea en `backend/data/app.sqlite` y las migraciones se aplican al arrancar. En Node 24.13 puede aparecer el aviso experimental de `node:sqlite`.

```sh
curl --fail http://127.0.0.1:3001/api/health
```

La respuesta `{"ok":true}` comprueba la conexión a SQLite. No demuestra que la IA o un canal externo estén configurados.

## Datos de ejemplo

`npm run seed:demo` añade registros ficticios a la base configurada en `.env.local`. Úsalo solo en una instalación de desarrollo. No conecta canales ni envía mensajes; repetirlo no sobrescribe ni duplica los registros demo existentes.

## Ejecutar con Docker

```sh
cp .env.docker.example .env.docker
chmod 600 .env.docker
```

Completa `DOCKER_ADMIN_USER` y `DOCKER_ADMIN_PASS`. La URL predeterminada es `http://localhost:8080`; conserva `DOCKER_APP_ORIGIN` igual a esa URL. Este archivo utiliza variables `DOCKER_*` independientes del desarrollo local.

```sh
docker compose --env-file .env.docker -p openfunnel config --quiet
docker compose --env-file .env.docker -p openfunnel up -d --build --wait
curl --fail http://localhost:8080/api/health
```

Web y API se construyen por separado. SQLite persiste en un volumen; ambos contenedores se ejecutan sin root. La API no publica un puerto al host. Consulta [despliegue y respaldos](./despliegue.html) antes de utilizar datos reales.

## Documentación local

`npm run dev` prepara estas páginas en **http://localhost:5173/docs/**. No necesitas iniciar sesión ni tener la API funcionando para consultarlas.

```sh
npm run dev:docs
```

Abre **http://localhost:5175** para ver solo la documentación. Vuelve a ejecutar el comando después de editar su Markdown. `npm run build:docs` produce un sitio independiente en `dist/docs/`.
