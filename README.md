![OpenFunnel — De conversación a resultado. Un motor conversacional abierto. Logo de seis burbujas sobre acuarela azul oscura.](assets/readme-banner.webp)

# openfunnel_kit

Proyecto en etapa inicial. Partimos con lo mínimo y añadiremos estructura y herramientas a medida que sean necesarias.

El [checklist reutilizable](docs/CHECKLIST-PROYECTO.md) describe el proceso desde la inicialización del repositorio hasta la publicación de una landing. Incluye prompts y puede copiarse a otro proyecto sin recursos adjuntos.

## Licencia y marca

Copyright 2026 Chris Lobarede Fernández. El núcleo, la interfaz y la documentación
se ofrecen bajo [Apache License 2.0](LICENSE), conservando la licencia de la versión
inicial de OpenFunnel. Puedes adaptarlos, autohospedarlos y crear productos o
servicios comerciales, cumpliendo sus condiciones y conservando los avisos aplicables.

La landing comercial y los recursos de identidad tienen permisos separados:
consulta [el alcance por archivo y la política de marca](LICENSING.md). El código
abierto no concede la identidad para vender un producto propio ni acceso al cloud
oficial. Apache-2.0 sí permite ofrecer otros servicios basados en el código.
La disponibilidad jurídica del nombre «OpenFunnel» sigue pendiente de revisión.

## Stack

- Frontend: React + Vite, JavaScript y CSS.
- Backend: Node.js con `node:http`.
- Base de datos: SQLite con `node:sqlite`, sin ORM.
- Un único `package.json`, npm y módulos ES.

Requiere Node.js 24.13 o superior. `.nvmrc` selecciona la rama 24. En Node 24.13, `node:sqlite` emite una advertencia experimental; el módulo funciona sin flags adicionales.

## Desarrollo local

Ejecutar los comandos desde la raíz del proyecto:

```sh
npm install
```

En una terminal, iniciar el backend:

```sh
npm run dev:backend
```

En otra terminal, iniciar el frontend:

```sh
npm run dev
```

Abrir http://localhost:5173. Vite redirige `/api` al backend en `http://127.0.0.1:3001`. La pantalla inicial comprueba `GET /api/health`, que ejecuta una consulta real en SQLite.

La configuración es opcional: copiar los valores de `.env.example` a `.env` para cambiar `PORT` o `DATABASE_PATH`. Las rutas de SQLite son relativas a la raíz. Reiniciar ambos servidores después de cambiar la configuración. No guardar secretos en variables `VITE_*`, porque se exponen al navegador.

SQLite se crea automáticamente en `backend/data/app.sqlite`; todavía no hay tablas de negocio. Los datos locales, `.env`, dependencias y archivos compilados quedan fuera de Git.

## Comandos y estructura

La landing definitiva está en **`landing/`**, con la dirección visual **Campo de tinta**: hero de acuarela y secciones abiertas. El [brief visual y el prompt](docs/ACUARELA.md) documentan la propuesta. El HTML y CSS están en la raíz; las imágenes de producción se organizan en `landing/assets/images/`.

- `npm run dev:landing`: abre la landing en http://127.0.0.1:5174, independiente de la API.
- `npm run build:landing`: compila `landing/` en `dist/landing/`.
- `npm run preview:landing`: sirve la compilación en http://127.0.0.1:4174.
- `landing/`: HTML semántico, CSS responsive, fondo de acuarela WebP optimizado, recorridos tipográficos HTML y conexiones SVG discontinuas animadas. Las etiquetas permanecen en HTML. El selector del encabezado alterna entre tema claro y oscuro; inicialmente sigue al sistema y guarda la elección en el navegador. Usar `npm run dev:landing` para disponer de esta interacción; abrir [landing/index.html](landing/index.html) directamente permite ver la página estática.
- `docs/CHECKLIST-PROYECTO.md`: guía reutilizable de trabajo. Los recursos de diseño temporales se eliminan; solo se conservan en la landing las imágenes optimizadas que utiliza.

- `npm run build`: compila el frontend en `frontend/dist/`.
- `npm run preview`: previsualiza la compilación; requiere el backend iniciado para `/api`.
- `npm start`: inicia solo la API, sin recarga automática.
- `frontend/src/`: interfaz React y estilos.
- `backend/`: servidor HTTP y conexión SQLite.

## Publicar la landing

La [guía de despliegue](docs/DESPLIEGUE-LANDING.md) explica cómo publicar la misma
compilación `dist/landing/` en GitHub Pages, Vercel y un VPS con Caddy. Incluye
requisitos, pasos, comprobaciones y cómo volver a una versión anterior.

- GitHub Pages: workflow manual en `.github/workflows/deploy-landing.yml`.
- Vercel: `vercel.json` en la raíz configura `npm ci`, `npm run build:landing` y `dist/landing`.
- VPS: archivos estáticos y configuración de ejemplo en `deploy/Caddyfile.example`.

La base relativa de Vite permite usar tanto `/` como `/openfunnel_kit/`. La landing
no necesita variables de entorno, API ni SQLite. `npm run preview:landing` es solo
para comprobar la compilación localmente; producción utiliza el alojamiento estático.
El despliegue de la aplicación React y de la API se definirá por separado.

## Trabajo con GitHub

Repositorio: https://github.com/chrisenprod/openfunnel_kit

Usaremos siempre la cuenta de GitHub `chrisenprod` y GitHub CLI (`gh`) para autenticarnos, gestionar issues y pull requests y consultar el repositorio. Git se usa para los cambios locales y para `fetch`, `pull` y `push`, con la autenticación configurada mediante `gh`.

```sh
gh auth status
gh auth switch --hostname github.com --user chrisenprod
gh api user --jq .login # Debe devolver chrisenprod.
gh auth setup-git --hostname github.com
gh repo view
gh issue list
gh pr list
```

Si no hay una sesión de `chrisenprod`, ejecutar `gh auth login --hostname github.com --git-protocol https` con esa cuenta antes de continuar. No extraer ni inyectar tokens manualmente para cambiar de cuenta.

El remoto `origin` apunta a `https://github.com/chrisenprod/openfunnel_kit.git`.

Mantener el proyecto simple: añadir herramientas, dependencias y archivos solo cuando una necesidad concreta los justifique.
