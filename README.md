# openfunnel_kit

Proyecto en etapa inicial. Partimos con lo mínimo y añadiremos estructura y herramientas a medida que sean necesarias.

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

- `npm run build`: compila el frontend en `frontend/dist/`.
- `npm run preview`: previsualiza la compilación; requiere el backend iniciado para `/api`.
- `npm start`: inicia solo la API, sin recarga automática.
- `frontend/src/`: interfaz React y estilos.
- `backend/`: servidor HTTP y conexión SQLite.

Esta base cubre desarrollo local. El despliegue y el servicio del frontend compilado se definirán cuando sean necesarios.

## Trabajo con GitHub

Repositorio: https://github.com/chrisenprod/openfunnel_kit

Usaremos Git para los cambios locales y GitHub CLI (`gh`) para gestionar issues, pull requests y consultar el repositorio.

```sh
gh auth login # Solo si todavía no tienes una sesión iniciada.
gh repo view
gh issue list
gh pr list
```

El remoto `origin` apunta a `https://github.com/chrisenprod/openfunnel_kit.git`.

Mantener el proyecto simple: añadir herramientas, dependencias y archivos solo cuando una necesidad concreta los justifique.
