![OpenFunnel — De conversación a resultado. Un motor conversacional abierto. Logo de seis burbujas sobre acuarela azul oscura.](assets/readme-banner.webp)

# openfunnel_kit

Primera etapa de la plataforma: acceso single user y administración manual de
contactos, conversaciones, mensajes, tickets, pipelines, usuarios y configuraciones de IA.

El [checklist reutilizable](docs/checklists/CHECKLIST-PROYECTO.md) describe el proceso desde la inicialización del repositorio hasta la publicación de una landing. Incluye prompts y puede copiarse a otro proyecto sin recursos adjuntos.

El [checklist del MVP](docs/checklists/CHECKLIST-MVP.md) cubre diseño, especificación, implementación, integraciones y pruebas. El [checklist de infraestructura y producción](docs/checklists/CHECKLIST-INFRAESTRUCTURA-PRODUCCION.md) continúa con Docker, auditoría, GitHub Actions, VPS y validación operativa. Ambos son plantillas reutilizables.

El [PRD de la plataforma](docs/PRD.md) define la primera entrega: acceso de un único
administrador, esquema de datos y CRUD de los módulos base, con tickets y pipelines.
La segunda etapa implementa canales Zernio (Instagram/WhatsApp), mensajería y agentes
con SDK OpenAI sobre endpoint configurable, con Azure como proveedor de esta instalación.
Configuración y límites en [la guía de integraciones](docs/deploy/INTEGRACIONES.md).
La cuarta etapa añade [API keys, contexto, versiones de prompts y pruebas aisladas](docs/api/AGENTES.md)
en la rama de desarrollo; no está desplegada en producción. MCP sigue pendiente. La verificación real
completa de respuestas se registra separadamente de las pruebas simuladas.

La tercera etapa del PRD cubre infraestructura y producción. La app tiene un
[Dockerfile con targets web/api y Compose](docs/deploy/DOCKER.md) para ejecución
local aislada; tareas y verificación en
[containerize-app](openspec/changes/containerize-app/tasks.md). La app está publicada
en **https://app.openfunnel.mocca.cl**, con API en `/api`. Operación, respaldo y
reversión en [PRODUCCION.md](docs/deploy/PRODUCCION.md); evidencia en
[verificación de producción](docs/qa/PRODUCCION.md). El mantenimiento de Ubuntu y
el respaldo externo automático conservan pendientes explícitos.

El workflow [Verificar app](.github/workflows/ci.yml) configura CI para main y PR:
tests, specs, auditoría npm, builds y prueba Docker aislada, sin despliegue ni claves
de producción. La [guía de CI y entorno](docs/deploy/CI-Y-ENTORNO.md) documenta la
configuración privada del VPS;
resultados en [seguridad y CI](docs/qa/SEGURIDAD-Y-CI.md).
Verificado en GitHub e integrado a main mediante el
[PR #2](https://github.com/chrisenprod/openfunnel_kit/pull/2). El workflow [Publicar VPS](.github/workflows/deploy-app.yml) publica main cuando pasa CI,
mediante SSH restringido, respaldo previo y comprobación de salud. Los cambios de
migraciones requieren revisión manual.

La implementación de esta etapa se sigue en las
[tareas de la base](openspec/changes/platform-foundation/tasks.md) y las
[tareas de integración](openspec/changes/connected-conversations/tasks.md), con
[evidencia de verificación](docs/qa/PRIMERA-ETAPA.md). Estas tareas pertenecen al
producto y son independientes del checklist reutilizable.

El [sistema de diseño de la app](docs/DESIGN_SYSTEM.md) define tokens, componentes,
estados y patrones de interfaz a partir de la landing y del PRD. Los antecedentes
visuales locales se guardan en `docs/referencias-visuales/`, ignorado por Git.

La raíz de `docs/` contiene [concepto](docs/CONCEPTO.md), [PRD](docs/PRD.md),
[sistema de diseño](docs/DESIGN_SYSTEM.md) y [arquitectura](docs/ARCHITECTURE.md).
Los checklists y las guías de publicación se organizan en `docs/checklists/` y
`docs/deploy/`.

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

## Documentación pública

La app incluye una [web de documentación](docs/site/index.md) en `/docs/`, sin login:
instalación, entorno, operación, archivos, pruebas, API, despliegue y contribuciones.
En desarrollo: http://localhost:5173/docs/; independiente: `npm run dev:docs` (5175).
`npm run build:docs` genera `dist/docs/` para cualquier hosting estático, raíz o
subruta. Los builds de app y landing la incluyen automáticamente. Fuentes públicas
en `docs/site/` y `docs/api/AGENTES.md`, con lista de publicación explícita.

Los agentes ahora tienen **Configuración / Conocimiento / Probar**. Conocimiento
admite TXT, MD, DOC, DOCX y PDF con texto (5 MiB/archivo, 10 archivos, 30000 caracteres).
Original BLOB y texto permanecen en SQLite; se pueden abrir, descargar, reemplazar y
eliminar. El texto se extrae una vez y se incluye en cada llamada, sin RAG/OCR.
La prueba mantiene chat temporal y simula herramientas. Modelo y proveedor se
configuran únicamente en `.env`, sin campos editables por agente.

## Stack

- Frontend: React + Vite, JavaScript y CSS.
- Backend: Node.js con `node:http`.
- Base de datos: SQLite con `node:sqlite`, sin ORM.
- Better Auth 1.7.5 para el administrador y sus sesiones, sobre SQLite nativo.
- SDK oficial `openai` para Chat Completions y tools; Zernio mediante fetch nativo.
- Extracción Word/PDF con `word-extractor` y `pdfjs-dist`; `marked` solo para compilar documentación.
- Un único `package.json`, npm y módulos ES.

Requiere Node.js 24.13 o superior. `.nvmrc` selecciona la rama 24. En Node 24.13, `node:sqlite` emite una advertencia experimental; el módulo funciona sin flags adicionales.

## Desarrollo local

Ejecutar los comandos desde la raíz del proyecto:

```sh
npm install
```

Configurar `.env` a partir de `.env.example` sin sobrescribir valores existentes.
Definir `admin_user` y una contraseña propia de 12–128 caracteres en `admin_pass`.
`APP_ORIGIN` debe coincidir exactamente con el origen usado en el navegador:
por defecto `http://localhost:5173`. Las credenciales no se gestionan desde la UI.

En una terminal, iniciar el backend:

```sh
npm run dev:backend
```

En otra terminal, iniciar el frontend:

```sh
npm run dev
```

Abrir http://localhost:5173 e iniciar sesión. Vite redirige `/api` al backend en
`http://127.0.0.1:3001`. `GET /api/health` sigue comprobando SQLite sin requerir sesión.

`PORT` y `DATABASE_PATH` son opcionales. Las rutas SQLite son relativas a la raíz.
Reiniciar el backend tras cambiar credenciales: las sesiones anteriores quedan
revocadas si cambia el usuario o la contraseña. Sin credenciales, la API conserva
salud disponible y rechaza los accesos de negocio. No usar secretos en `VITE_*`.

SQLite se crea en `backend/data/app.sqlite`; las migraciones versionadas de
`backend/migrations/` se aplican al arrancar sin borrar datos. El secreto de sesión
se genera y persiste en la base si no se define `BETTER_AUTH_SECRET` (mínimo 32
caracteres). Las sesiones vencen a las 8 horas. Los datos locales, `.env`, dependencias
y compilaciones quedan fuera de Git.

Los registros de Usuarios son personas asignables, sin login. Canales, mensajes,
agentes y tools funcionan de forma manual o como configuración: no envían mensajes
ni ejecutan servicios externos. Las reglas y endpoints están en
[la arquitectura](docs/ARCHITECTURE.md).

Para explorar la app con datos ficticios, ejecutar `npm run seed:demo`. Añade
12 contactos, 12 conversaciones con 36 mensajes, 12 tickets, dos pipelines con
nueve etapas, tres usuarios, tres canales, dos agentes, tres prompts y tres tools.
Los ejemplos se identifican como Demo; no conectan servicios ni envían mensajes.
La carga usa la base configurada en `.env`, es transaccional y utiliza IDs estables:
repetirla no duplica registros existentes ni sobrescribe sus ediciones. No borrar
etapas del ejemplo antes de repetir la carga. Los datos se pueden editar desde la UI.

## Comandos y estructura

La landing definitiva está en **`landing/`**, con la dirección visual **Campo de tinta**: hero de acuarela, cuerpo marfil o tinta, tipografía regular y secciones abiertas. Su adaptación a la app está en el [sistema de diseño](docs/DESIGN_SYSTEM.md). El HTML y CSS están en la raíz de `landing/`; las imágenes de producción se organizan en `landing/assets/images/`.

- `npm run dev:landing`: abre la landing en http://127.0.0.1:5174, independiente de la API.
- `npm run build:landing`: compila `landing/` en `dist/landing/`.
- `npm run preview:landing`: sirve la compilación en http://127.0.0.1:4174.
- `landing/`: HTML semántico, CSS responsive, fondo de acuarela WebP optimizado, recorridos tipográficos HTML y conexiones SVG discontinuas animadas. Las etiquetas permanecen en HTML. El selector del encabezado alterna entre tema claro y oscuro; inicialmente sigue al sistema y guarda la elección en el navegador. Usar `npm run dev:landing` para disponer de esta interacción; abrir [landing/index.html](landing/index.html) directamente permite ver la página estática.
- `docs/checklists/CHECKLIST-PROYECTO.md`: guía reutilizable de trabajo. Los recursos de diseño temporales se eliminan; solo se conservan en la landing las imágenes optimizadas que utiliza.

- `npm run build`: compila el frontend en `frontend/dist/`.
- `npm run preview`: previsualiza la compilación; requiere el backend iniciado para `/api`.
- Para usar preview, configurar `APP_ORIGIN` con su origen exacto (por ejemplo `http://localhost:4173`) y reiniciar la API.
- `npm test`: pruebas de API, autenticación y persistencia con SQLite temporal.
- `npm start`: inicia solo la API, sin recarga automática.
- `frontend/src/`: interfaz React y estilos.
- `backend/`: servidor HTTP y conexión SQLite.
- `backend/migrations/`: migraciones SQL de negocio y auth; `shared/resources.js`: definición de campos para API y formularios.

## Desarrollo guiado por especificaciones

OpenSpec 1.13.1 está fijado como dependencia de desarrollo. Usa el esquema
`spec-driven`, contexto en español en `openspec/config.yaml` y seis skills de Codex
en `.agents/skills/`. Las especificaciones vigentes viven en `openspec/specs/` y
los cambios en curso en `openspec/changes/`.

```sh
npm run openspec -- --version
npm run openspec -- list
npm run spec:validate
```

Ejecutar desde la raíz con Node.js 24.13 o superior, después de `npm install` o
`npm ci`. Los scripts desactivan la telemetría del CLI; no hace falta instalarlo
globalmente. Para regenerar la integración de Codex con el perfil mínimo:

```sh
npm run openspec -- init --tools codex --profile core --no-animation
```

En Codex, iniciar con `$openspec-explore` o `$openspec-propose`; implementar con
`$openspec-apply-change` y cerrar con `$openspec-sync-specs` y
`$openspec-archive-change` después de verificar el resultado. Usar
`$openspec-update-change` cuando cambie el alcance. Si no aparecen las skills,
abrir una nueva sesión. Usar el [PRD](docs/PRD.md) como base de alcance antes de proponer
un cambio funcional; concretar sus supuestos en las especificaciones.

`npm run spec:validate` comprueba el formato de las especificaciones; acompañarlo
de `npm run build` y comprobaciones de los endpoints y escenarios afectados.

## Subagentes de Codex

El agente de ciberseguridad y pentesting del proyecto se define en
[`.codex/agents/security-pentester.toml`](.codex/agents/security-pentester.toml).
Audita código, app, API y VPS propios dentro del alcance autorizado; entrega
hallazgos reproducibles, correcciones propuestas y verificación posterior.
Hereda el modelo y los permisos de la sesión. La definición vive en este
repositorio; no requiere instalar un agente global.

Para usarlo, abre una nueva sesión de Codex en este proyecto y pide, por ejemplo:

> Usa el subagente security-pentester para auditar la autenticación y la API
> local. Reproduce los hallazgos con datos de prueba y entrega un informe.

Para una auditoría remota, indica el host o IP del VPS propio, los servicios y
el entorno autorizado. Por ejemplo, sustituyendo `<host-propio>` por el destino:

> Usa security-pentester para auditar mi VPS <host-propio>: SSH, Nginx y HTTPS.
> Autorizo comprobaciones de bajo impacto y lectura por SSH; entrega los
> hallazgos sin modificar servicios.

Solo las definiciones `.codex/agents/*.toml` se incluyen en Git. La configuración
SSH y los demás archivos locales de `.codex/` permanecen ignorados.

## Publicar la landing

La [guía de despliegue](docs/deploy/DESPLIEGUE-LANDING.md) explica cómo publicar la misma
compilación `dist/landing/` en GitHub Pages, Vercel y un VPS. Incluye
requisitos, pasos, comprobaciones y cómo volver a una versión anterior.

- GitHub Pages: workflow manual en `.github/workflows/deploy-landing.yml`.
- Vercel: `vercel.json` en la raíz configura `npm ci`, `npm run build:landing` y `dist/landing`.
- VPS: https://openfunnel.mocca.cl, servido por Nginx con HTTPS. Configuración en `deploy/openfunnel.nginx.conf`; Caddy queda como alternativa en `deploy/Caddyfile.example`.

La landing del VPS dispone de [publicación automática opcional](docs/deploy/LANDING-VPS-ACTIONS.md)
tras CI, con configuración por instalación. Pages y Vercel siguen como alternativas.

La base relativa de Vite permite usar tanto `/` como `/openfunnel_kit/`. La landing
no necesita variables de entorno, API ni SQLite. `npm run preview:landing` es solo
para comprobar la compilación localmente; producción utiliza el alojamiento estático.
La app y API tienen su despliegue separado en [PRODUCCION.md](docs/deploy/PRODUCCION.md).

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
