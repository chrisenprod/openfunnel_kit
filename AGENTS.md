# Instrucciones para agentes

## Enfoque

Mantener el proyecto lo más simple posible. Añadir estructura, frameworks, dependencias y archivos solo cuando una necesidad concreta los justifique.

## Stack y estructura

- Frontend: React + Vite en `frontend/`, JavaScript y CSS.
- Backend: Node.js con `node:http` en `backend/`.
- Persistencia: SQLite mediante `node:sqlite`; conexión en `backend/db.js`, sin ORM.
- Better Auth 1.7.5 integrado con SQLite nativo. Acceso single user con `admin_user` y `admin_pass` de servidor; el CRUD de users es un directorio sin login. No exponer el handler general de Better Auth ni habilitar registro público.
- Usar módulos ES y npm con un único `package.json` y `package-lock.json` en la raíz.
- Requiere Node.js >=24.13.0; `.nvmrc` selecciona la rama 24. `node:sqlite` emite una advertencia experimental en Node 24.13.
- No añadir TypeScript, frameworks de servidor ni otras capas sin una necesidad concreta.
- Escribir código, identificadores, tablas, columnas y comentarios técnicos en inglés. Mantener textos de interfaz y documentación de producto en español.

## Desarrollo y verificación

- Ejecutar todos los comandos desde la raíz.
- Instalar dependencias con `npm install`; usar `npm ci` para reproducir el lockfile.
- Ejecutar `npm run dev:backend` y `npm run dev` en terminales separadas.
- La landing definitiva vive en `landing/`: HTML y CSS en la raíz, imágenes de producción en `landing/assets/images/` y conectores SVG. Comprimir las ilustraciones a WebP conservando la transparencia; mantener etiquetas en HTML. La estructura partió de la propuesta v2; la dirección visual vigente es Campo de tinta: hero de acuarela original, tipografía regular y diagramas HTML/SVG sin halos. La adaptación visual a la app está en `docs/DESIGN_SYSTEM.md`; los prompts y antecedentes locales se conservan en `docs/referencias-visuales/`, ignorado por Git. Los recursos de diseño temporales fueron eliminados; no versionar propuestas descartadas, galerías ni originales pesados regenerables. Conservar las imágenes WebP utilizadas por la landing. El proceso y los prompts reutilizables están en `docs/checklists/CHECKLIST-PROYECTO.md`. Usar `npm run dev:landing` (5174), `npm run build:landing` (salida `dist/landing/`) y `npm run preview:landing` (4174). No requiere backend. Añadir JavaScript solo cuando la interacción lo necesite. Revisar escritorio, móvil y navegación por teclado.
- El frontend usa el puerto 5173; el backend usa `PORT` o 3001. Vite redirige `/api` al backend.
- Publicación de la landing: seguir `docs/deploy/DESPLIEGUE-LANDING.md`. La base relativa de Vite permite servir `dist/landing/` en la raíz o en una subruta. GitHub Pages usa el workflow manual `.github/workflows/deploy-landing.yml`; Vercel usa `vercel.json` desde la raíz del repositorio. El VPS sirve https://openfunnel.mocca.cl con Nginx (`deploy/openfunnel.nginx.conf`), desde `/var/www/openfunnel/current`; el repositorio completo está en `/srv/openfunnel_kit`, fuera del directorio público. Caddy queda como alternativa en `deploy/Caddyfile.example`. No usar `vite preview` como servidor de producción ni exponer el repositorio completo por HTTP.
- `GET /api/health` verifica SQLite con una consulta real.
- Verificar cambios con `npm run build`, `npm test` para cambios de API/auth/datos y comprobar los endpoints afectados. Las pruebas usan SQLite temporal y servidores en localhost.
- `npm start` inicia solo la API. `npm run preview` sirve la compilación del frontend y necesita la API para `/api`.
- Docker de la app: un `Dockerfile` con targets `web`/`api` y `compose.yaml`, separados de la landing. Seguir `docs/deploy/DOCKER.md`, usar `--env-file .env.docker` y variables `DOCKER_*`; nunca reutilizar la base ni credenciales reales para QA. `npm run test:docker` construye y verifica un proyecto/volumen sintéticos aislados. Mantener una sola API/worker por SQLite; no eliminar volúmenes de negocio. El dominio de la app es `app.openfunnel.mocca.cl`, con API bajo `/api`; ver operación y evidencia en `docs/deploy/PRODUCCION.md`.
- `HOST` controla la escucha de la API: loopback (`127.0.0.1`) por defecto, `0.0.0.0` dentro de Docker. Compose publica únicamente web en loopback del host.
- CI de app: `.github/workflows/ci.yml` verifica main/PR/manual con datos sintéticos y sin secretos productivos; no despliega. Seguir `docs/deploy/CI-Y-ENTORNO.md`. El entorno VPS se conserva fuera del repositorio, en `/etc/openfunnel/app.env` (0600). No imprimir `docker compose config` ni `docker inspect` completos con secretos. Los informes privados de infraestructura viven en `docs/qa/private/`, ignorado por Git.
- App publicada en `https://app.openfunnel.mocca.cl`; seguir `docs/deploy/PRODUCCION.md`. Producción usa `compose.production.yaml`, red/volumen externos y firewall específico previo a Docker, sin actualizar el host compartido. La base operativa está en el VPS: no reiniciar la antigua base local como segundo worker. Ubuntu se aplazó por decisión expresa del usuario; respaldos externos automáticos y alertas siguen pendientes. Los contenedores siguen ejecutando la app sin root.
- Variables en `.env`, documentadas en `.env.example`: `admin_user` y `admin_pass` habilitan el acceso; `APP_ORIGIN` define el origen exacto permitido (por defecto http://localhost:5173). `PORT`, `DATABASE_PATH` y `BETTER_AUTH_SECRET` son opcionales. Si falta el secreto, se genera y persiste en SQLite. Nunca exponer secretos mediante `VITE_*`. Al cambiar credenciales, reiniciar la API; las sesiones anteriores se revocan.
- SQLite se crea por defecto en `backend/data/app.sqlite`. No versionar bases de datos, `.env`, `node_modules` ni `frontend/dist`.
- No crear tablas de negocio hasta definir la funcionalidad que las necesita. Usar parámetros SQL para valores externos.
- Migraciones SQL versionadas en `backend/migrations/`, aplicadas al arrancar; no editar una migración aplicada ni recrear bases para actualizar. Mantener los identificadores SQL dinámicos dentro de las listas explícitas de `shared/resources.js`.
- Mantener este archivo y `README.md` sincronizados cuando cambien el stack o los comandos.

## Integraciones

- Zernio se traduce al modelo local en `backend/zernio.js` e `integration-store.js`; `integrations.js` coordina sincronización, webhooks y procesamiento. No exponer el JSON remoto como contrato de UI.
- SDK oficial `openai` en `backend/llm.js`, Chat Completions sin streaming; entorno canónico `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Azure utiliza endpoint v1 y nombre de deployment. Nunca registrar secretos ni respuestas crudas de errores del proveedor.
- Zernio usa `ZERNIO_API_KEY`; conexión/webhook requieren `PUBLIC_BASE_URL` y `ZERNIO_WEBHOOK_SECRET`. Ver `docs/deploy/INTEGRACIONES.md`. No activar canales operativos ni enviar mensajes de prueba a terceros sin autorización específica.
- Un único backend/worker por SQLite. Cola, runs y eventos son persistidos; no reintentar envíos inciertos a ciegas. Conservar control humano y revisión antes del envío.
- Migraciones 003/004 amplían datos sin reemplazar registros manuales. Probar mapeo, duplicados, firmas, edición remota, ventanas y cancelación concurrente. No presentar una prueba simulada como evidencia del recorrido real.

## Desarrollo guiado por especificaciones (SDD)

- Mantener solo `CONCEPTO.md`, `PRD.md`, `DESIGN_SYSTEM.md` y `ARCHITECTURE.md` en la raíz de `docs/`. Organizar el resto en subcarpetas como `docs/checklists/` y `docs/deploy/`. Los antecedentes de acuarela, ilustraciones y logo viven en `docs/referencias-visuales/`, ignorado por Git.
- Seguir `docs/DESIGN_SYSTEM.md` para la UI y `docs/ARCHITECTURE.md` para la base técnica. Los documentos locales ignorados no deben ser necesarios para implementar ni para usar un clon.

- `docs/CONCEPTO.md` define la dirección de producto; `docs/PRD.md` conserva la primera etapa, define canales Zernio/IA en la segunda y planifica infraestructura y producción en la tercera. Los checklists del MVP y de infraestructura/producción en `docs/checklists/` son plantillas reutilizables, no un roadmap de OpenFunnel. Concretar las decisiones del PRD en OpenSpec antes de implementar; el despliegue existente de la landing no demuestra que la app esté en producción.
- OpenSpec 1.13.1 es una dependencia de desarrollo local. Usar `npm run openspec -- <comando>` desde la raíz con Node.js >=24.13.0; el script desactiva la telemetría.
- Las skills generadas muestran `openspec <comando>`; en este repositorio ejecutar su equivalente `npm run openspec -- <comando>` para usar la versión local sin depender del PATH global.
- Configuración y reglas en `openspec/config.yaml`; contratos vigentes en `openspec/specs/`; propuestas y tareas en `openspec/changes/`. Escribir artefactos en español conservando encabezados y palabras SHALL/MUST requeridos por OpenSpec.
- Para nuevas capacidades o cambios de comportamiento del MVP, preparar propuesta, specs, diseño y tareas antes de implementar. Resolver decisiones rutinarias dentro del alcance autorizado; preguntar solo por decisiones pendientes que bloqueen el cambio. Mantener los artefactos alineados si cambia el alcance.
- Codex usa seis skills versionadas en `.agents/skills/`: `openspec-explore`, `openspec-propose`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs` y `openspec-archive-change`. Invocarlas con `$nombre-de-skill`; abrir una nueva sesión si no se detectan.
- Regenerar la integración mínima con `npm run openspec -- init --tools codex --profile core --no-animation`; revisar el diff generado. No hace falta reinicializar al clonar ni instalar globalmente.
- Ejecutar `npm run spec:validate` y `npm run build`, además de comprobar endpoints y escenarios afectados. La validación de OpenSpec verifica formato, no demuestra cumplimiento funcional.
- Sincronizar specs y archivar solo cambios terminados y verificados. No presentar capacidades futuras como implementadas.

## Subagentes del proyecto

- Definir subagentes de este repositorio en `.codex/agents/*.toml`, nunca en la configuración global del usuario. Usar el formato de Codex con `name`, `description` y `developer_instructions`.
- `security-pentester` cubre ciberseguridad y pentesting autorizado de la app, API y VPS propios. Su definición está en `.codex/agents/security-pentester.toml`; ejemplos de invocación en `README.md`.
- Mantener las definiciones sin credenciales ni datos privados. `.codex/ssh-config` y los demás archivos locales de `.codex/` siguen ignorados por Git.

## Licencia e identidad

- Conservar Apache-2.0 sin modificaciones en `LICENSE`; el alcance por archivo está en `LICENSING.md`.
- El núcleo y la interfaz son abiertos. La landing comercial y los recursos de identidad tienen permisos separados; respetar `landing/LICENSE` y `assets/LICENSE`.
- No trasladar código del núcleo a materiales reservados ni incorporar infraestructura privada del cloud sin delimitar sus permisos. No añadir restricciones comerciales a Apache-2.0.
- No afirmar que el nombre está registrado o disponible: la revisión de antecedentes sigue pendiente.

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
