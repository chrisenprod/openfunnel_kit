# Instrucciones para agentes

## Enfoque

Mantener el proyecto lo más simple posible. Añadir estructura, frameworks, dependencias y archivos solo cuando una necesidad concreta los justifique.

## Stack y estructura

- Frontend: React + Vite en `frontend/`, JavaScript y CSS.
- Backend: Node.js con `node:http` en `backend/`.
- Persistencia: SQLite mediante `node:sqlite`; conexión en `backend/db.js`, sin ORM.
- Usar módulos ES y npm con un único `package.json` y `package-lock.json` en la raíz.
- Requiere Node.js >=24.13.0; `.nvmrc` selecciona la rama 24. `node:sqlite` emite una advertencia experimental en Node 24.13.
- No añadir TypeScript, frameworks de servidor ni otras capas sin una necesidad concreta.

## Desarrollo y verificación

- Ejecutar todos los comandos desde la raíz.
- Instalar dependencias con `npm install`; usar `npm ci` para reproducir el lockfile.
- Ejecutar `npm run dev:backend` y `npm run dev` en terminales separadas.
- La landing definitiva vive en `landing/`: HTML y CSS en la raíz, imágenes de producción en `landing/assets/images/` y conectores SVG. Comprimir las ilustraciones a WebP conservando la transparencia; mantener etiquetas en HTML. Se basa en la propuesta v2 seleccionada. Los recursos de diseño temporales fueron eliminados; no versionar propuestas descartadas, galerías ni originales pesados regenerables. Conservar las imágenes WebP utilizadas por la landing. El proceso y los prompts reutilizables están en `docs/CHECKLIST-PROYECTO.md`. Usar `npm run dev:landing` (5174), `npm run build:landing` (salida `dist/landing/`) y `npm run preview:landing` (4174). No requiere backend. Añadir JavaScript solo cuando la interacción lo necesite. Revisar escritorio, móvil y navegación por teclado.
- El frontend usa el puerto 5173; el backend usa `PORT` o 3001. Vite redirige `/api` al backend.
- `GET /api/health` verifica SQLite con una consulta real.
- Verificar cambios con `npm run build` y comprobar los endpoints afectados.
- `npm start` inicia solo la API. `npm run preview` sirve la compilación del frontend y necesita la API para `/api`.
- Variables opcionales en `.env`, documentadas en `.env.example`: `PORT` y `DATABASE_PATH`. Nunca exponer secretos mediante `VITE_*`.
- SQLite se crea por defecto en `backend/data/app.sqlite`. No versionar bases de datos, `.env`, `node_modules` ni `frontend/dist`.
- No crear tablas de negocio hasta definir la funcionalidad que las necesita. Usar parámetros SQL para valores externos.
- Mantener este archivo y `README.md` sincronizados cuando cambien el stack o los comandos.

## Git y GitHub

- Repositorio: https://github.com/chrisenprod/openfunnel_kit
- Remoto `origin`: `https://github.com/chrisenprod/openfunnel_kit.git`.
- Usar siempre la cuenta de GitHub `chrisenprod`; no utilizar otras cuentas para este repositorio.
- Usar siempre GitHub CLI (`gh`) para autenticarse, consultar GitHub y gestionar el repositorio, issues y pull requests. Usar Git para los cambios locales y para `fetch`, `pull` y `push`, con la autenticación configurada mediante `gh auth setup-git`.
- Antes de operar con GitHub, comprobar la cuenta activa. Si es otra, ejecutar `gh auth switch --hostname github.com --user chrisenprod` y verificar que `gh api user --jq .login` devuelve `chrisenprod`.
- No extraer tokens ni inyectarlos manualmente en comandos o variables de entorno para cambiar de cuenta; utilizar los comandos de autenticación de `gh`.

Comandos básicos:

```sh
gh auth status
gh auth switch --hostname github.com --user chrisenprod
gh api user --jq .login
gh auth setup-git --hostname github.com
gh repo view
gh issue list
gh pr list
```

Si `chrisenprod` no tiene una sesión iniciada, autenticarse con `gh auth login --hostname github.com --git-protocol https` usando esa cuenta y verificar la identidad antes de continuar.
