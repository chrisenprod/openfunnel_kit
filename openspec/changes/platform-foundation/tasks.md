# Tasks

## 1. Auth y persistencia

- [x] 1.1 Implementar migraciones versionadas y conexión SQLite reutilizable; verificar arranque limpio y repetido con base temporal.
- [x] 1.2 Integrar Better Auth single user y rotación de credenciales; verificar login, logout, reinicio y rechazo de sesiones anteriores.
- [x] 1.3 Proteger API, origen, límites de entrada e intentos de acceso; verificar 401, 403, 429 y ausencia de endpoints alternativos.

## 2. CRUD del PRD

- [x] 2.1 Implementar users, contacts y channels con búsqueda, filtros y paginación; verificar CRUD y emails del directorio normalizados.
- [x] 2.2 Implementar conversations y messages; verificar persistencia, orden y bloqueos de eliminación.
- [x] 2.3 Implementar pipelines, stages y tickets; verificar reordenamiento atómico, contacto coincidente y etapa válida.
- [x] 2.4 Implementar agentes, prompts y tools con asociaciones; verificar orden, referencias inversas e inactivos.

## 3. UI de la app

- [x] 3.1 Construir login, navegación, temas y controles Campo de tinta; verificar sesión, recarga y build.
- [x] 3.2 Construir listados, filtros, formularios y confirmaciones para los módulos; verificar errores, reintento y cambios pendientes.
- [x] 3.3 Construir detalle de conversaciones y mensajes, relaciones, edición de stages y asociaciones IA; verificar el recorrido manual.
- [x] 3.4 Construir tickets en lista y tablero, con creación desde conversación y cambio de etapa; verificar coherencia entre vistas.

## 4. Verificación y entrega

- [x] 4.1 Ejecutar pruebas automatizadas de endpoints, seguridad e integridad con SQLite temporal; comprobar reinicio y migraciones sin pérdida.
- [x] 4.2 Revisar UI en 390, 768 y 1440 px, ambos temas, teclado y estados de error/vacío; registrar evidencia y corregir incidencias.
- [x] 4.3 Actualizar README, AGENTS, arquitectura y variables de ejemplo; verificar build, specs y diff, sin secretos ni bases versionadas.
- [x] 4.4 Sincronizar especificaciones verificadas y registrar evidencia final del cambio sin alterar el checklist reutilizable.

Evidencia: [verificación de la primera etapa](../../../docs/qa/PRIMERA-ETAPA.md).
