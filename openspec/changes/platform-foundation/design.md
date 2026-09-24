# Design

## Context

La base actual usa node:http, node:sqlite y React/Vite. Ver proposal.md y PRD.
Better Auth 1.7.5 admite DatabaseSync directamente y login username; no necesitamos
Express, un ORM propio, otro driver SQLite ni un proveedor externo.

## Goals / Non-Goals

**Goals:** implementar la primera etapa completa con código local sencillo, pruebas
de contratos y un CRUD consistente. Mantener salud sin autenticación.

**Non-Goals:** integraciones y ejecución de IA, permisos multicuenta o un framework
genérico de administración distribuible.

## Decisions

- Auth: Better Auth + username con tablas `auth_*` separadas del directorio `users`.
  Solo exponer wrappers `/api/login`, `/api/session`, `/api/logout`; ningún handler
  público de registro, cambio de contraseña o introspección de usuarios. Sanitizar
  respuestas: la cookie es el único transporte del token. Sembrar una identidad
  estable y su hash al arrancar; cambiar credenciales revoca sesiones. Secret fuerte
  persistido localmente en SQLite si no se proporciona BETTER_AUTH_SECRET.
- Origen: APP_ORIGIN explícito (por defecto http://localhost:5173), sin confiar en
  encabezados forwarded arbitrarios. Toda mutación exige Origin exacto. Cookie
  HttpOnly/SameSite y Secure según URL; sesiones de 8 horas sin cache ni renovación.
  Diez intentos/minuto globales en la instancia single user, memoria acotada.
- Persistencia: migraciones SQL versionadas y transaccionales, fechas ISO, IDs UUID,
  constraints y consultas parametrizadas. No recrear SQLite en reinicios. No usar
  el esquema de auth como directorio de negocio.
- API: `/api/<entidad>` GET/POST y `/api/<entidad>/<id>` GET/PATCH/DELETE, nombres
  snake_case. JSON: `{items,total,page,pageSize}` o registro. Errores `{error,fields?}`.
  400 validación, 401 sesión, 403 origen, 404 no encontrado, 409 dependencias.
- Validación declarativa pequeña compartida con formularios, listas explícitas de
  tablas/campos; SQL dinámico solo con identificadores internos conocidos. Textos
  cortos máximo 160 (email 254, referencias 255), descripción/notas 4000,
  cuerpo/prompt 20000, esquema JSON 20000; body HTTP máximo 128 KiB. Paginación 1–100.
- Pipeline: guardar etapas como colección del pipeline para reordenar en transacción;
  IDs estables, orden único y bloqueo de etapas ocupadas. Borrar pipeline solo vacío
  de tickets, eliminando explícitamente su configuración de etapas en transacción.
- Agentes: guardar prompt_ids ordenados y tool_ids junto al agente en transacción;
  mostrar referencias inversas en detalle. Mantener referencias inactivas existentes.
- UI: React con navegación por hash, sin router adicional. Metadata compartida para
  campos repetidos; vistas específicas para conversaciones, etapas, asociaciones y
  tablero. Fetch con errores de sesión, diálogos nativos accesibles y formularios
  con guardado y confirmación de cambios pendientes. Tokens del sistema de diseño.
- Relación ticket/conversación opcional 1:1 como en el PRD; estado y responsables
  independientes. Canales y mensajes manuales sin estado de entrega ficticio.

## Risks / Trade-offs

- Configuración de auth y actualización de credenciales → comprobar reinicio,
  invalidación, ausencia de secretos en respuestas y acceso a rutas alternativas.
- Escrituras síncronas SQLite → transacciones cortas; sin proveedores ni tareas lentas
  dentro de ellas. No se promete edición colaborativa: último guardado válido gana.
- Catálogos grandes → listados paginados y selectores consultables; no truncar
  silenciosamente opciones ni depender solo de la primera página.
- UI genérica insuficiente → componentes específicos donde hay relaciones, orden
  o mensajes. No recortar módulos del PRD para forzar un formulario único.

## Migration Plan

Migraciones al arrancar y registro de versión. Pruebas usan archivos SQLite temporales.
Antes de usar datos reales, respaldar SQLite con la API de backup y probar restauración.
No desplegar automáticamente. Volver a la versión anterior de código requiere conservar
su backup compatible; no se borran tablas automáticamente al hacer rollback.

Fuentes técnicas consultadas: [SQLite](https://better-auth.com/docs/adapters/sqlite),
[username](https://better-auth.com/docs/plugins/username) y
[sesiones](https://better-auth.com/docs/concepts/session-management) de Better Auth,
contrastadas con los exports de la versión instalada.
