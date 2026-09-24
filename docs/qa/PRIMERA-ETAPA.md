# Verificación de la primera etapa

Fecha: 2026-09-23. Cambio: [platform-foundation](../../openspec/changes/platform-foundation/tasks.md).
Entorno local con Node.js 24.13.0, SQLite temporal y Chrome headless mediante Playwright.

## Comprobaciones reproducibles

Desde la raíz, con las dependencias instaladas:

```sh
npm test
npm run build
npm run spec:validate
git diff --check
```

Resultado: siete pruebas de API aprobadas, compilación React correcta, cuatro
especificaciones y un cambio OpenSpec válidos; sin errores de espacios en el diff.

[tests/platform.test.js](../../tests/platform.test.js) cubre:

- Login, cookie privada, sesión, logout, vencimiento y cierre de rutas alternativas.
- Rechazo de mutaciones desde otro origen, acceso sin credenciales y límite de intentos.
- Reinicio con SQLite en disco, conservación de datos/sesiones y revocación al rotar credenciales.
- CRUD, normalización de email, validaciones, búsqueda, paginación y límites de entrada.
- Conversaciones, mensajes y tickets; contacto y etapa compatibles, bloqueos de borrado y rollback.
- Prompts ordenados y tools por agente; asociaciones inversas e inactivos.
- CRUD de etapas, booleanos inválidos y respuesta 503 ante fallo de SQLite en salud.

## Recorrido de navegador realizado

Se usaron credenciales y una base desechables en `/tmp`, sin modificar `.env`
ni datos de la instalación. Playwright y sus scripts de inspección se instalaron
fuera del repositorio; no son dependencias de la aplicación.

- Login y creación de contacto, usuario del directorio, canal y pipeline de dos etapas.
- Creación de prompt, tool y agente con asociaciones; JSON inválido muestra error y conserva valores.
- Conversación con contacto, canal, responsable y agente; registro de mensaje manual.
- Ticket desde conversación, cambio de etapa y comprobación de su ubicación en el tablero.
- Vistas a 1440, 768 y 390 px sin desbordamiento horizontal de la página; scroll local del tablero.
- Tema claro/oscuro, persistencia de preferencia y sesión al recargar.
- Menú móvil con Escape y retorno del foco al botón de apertura.
- Borrado bloqueado por referencias y confirmación de salida con cambios pendientes.
- Login, navegación, guardado y confirmación por teclado; retorno del foco al cancelar.
- Fallo de red simulado durante un guardado: conserva el formulario y permite reintentar con éxito.
- Logout y ausencia de errores JavaScript no controlados durante el recorrido.

Se inspeccionaron capturas del login, detalle de conversación y tablero móvil oscuro.
Se corrigieron durante la revisión el aviso inicial de sesión expirada y el retorno
del foco al cerrar el menú móvil.

## Alcance y límites

Es verificación local de la primera etapa manual. No se ha desplegado la app ni
verificado en Safari, Firefox, dispositivos físicos o con lector de pantalla.
La sesión Secure bajo HTTPS está configurada, pero el recorrido de navegador usó HTTP local.
No se evaluaron carga concurrente ni integraciones externas; Zernio, OpenAI, API keys
y MCP pertenecen a etapas posteriores. Las pruebas de formato de OpenSpec no sustituyen
las pruebas funcionales.

Las especificaciones de `admin-auth`, `manual-platform` y `platform-ui` se sincronizaron
con `openspec/specs/`. El cambio conserva sus artefactos y tareas para revisión.
El checklist reutilizable del MVP permanece como plantilla.
