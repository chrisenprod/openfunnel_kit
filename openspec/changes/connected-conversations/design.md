# Design

## Context

React/Vite, node:http y SQLite nativo. La UI y CRUD actuales usan shared/resources.js;
server.js autentica todas las rutas de negocio. Ver proposal.md y PRD §10.

## Goals / Non-Goals

Implementar el recorrido sin sustituir el modelo propio ni la autenticación.
No añadir colas externas, ORM, SDK Zernio ni un framework de adaptadores genérico.

## Decisions

- El panel de canal separa conexión, agente y respuestas automáticas. El estado visible
  procede del registro confirmado; guardar agente conserva `automation_enabled` y el
  botón contextual activa/desactiva usando el agente persistido. La desactivación está
  disponible incluso con selección pendiente; activar exige guardarla primero. Se reutiliza
  `/api/channels/:id/automation` sin cambiar API ni encender canales durante la verificación.

- Migraciones 003/004 aditivas: referencias externas, modos y tablas internas de conexiones,
  eventos, sincronización, ejecuciones, tools y outbox. Unicidad por cuenta/hilo/mensaje.
- Módulo zernio.js: fetch HTTPS a host fijo, timeouts, errores depurados y validadores
  de cuentas/hilos/mensajes. integration.js coordina persistencia y acciones.
- Conexión: POST autenticado crea nonce aleatorio con hash de sesión, vence en 15 minutos;
  callback GET valida nonce/sesión/perfil/cuenta por API y redirige a hash local limpio.
  Perfil creado explícitamente. Webhook propio registrado desde la UI, no al arrancar.
- Rutas /api/integrations para estado, perfiles, conexión/sync, webhook y validación IA;
  /api/channels/:id/automation y /api/conversations/:id/{mode,send,sync,activity}.
  Todos autenticados salvo webhook HMAC. Callback conserva sesión.
- Worker en el proceso, tick no solapado y SQLite persistido. Eventos se confirman solo
  tras persistir. Sincronización paginada almacena cursor; polling periódico de canales.
- Importaciones no generan IA. Cola de runs serial por conversación, instantánea de
  agente/prompts y revisión de conversación antes de enviar. Tomar control incrementa
  revisión y cancela trabajo pendiente. Las tools solo consultan contexto o derivan.
- Entorno canónico `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`; alias OPENAI_* compatibles.
- OpenAI Chat Completions sin streaming, maxRetries=0, timeout 30s, 3 rondas y 5 tools.
  Validación exige tool call y texto final, cacheada por endpoint/modelo/credencial.
- Outbox utiliza UUID como Idempotency-Key. 429 reintenta con espera acotada hasta 3
  intentos; timeout/5xx o caída en sending pasa a uncertain y bloquea reenvío automático.
  Reconcilia por ID remoto; sin evidencia inequívoca requiere revisión humana.
- Ventana de respuesta 24h a partir de último entrante, tanto humano como IA; otros
  controladores, grupos y adjuntos requieren atención humana. Nunca usa HUMAN_AGENT.
- Cargas de eventos terminados y trazas se depuran a los 7 días; eventos fallidos se
  conservan 30 días con aviso. Mensajes normalizados son el historial de negocio.
- Pruebas usan fetch/cliente inyectados y SQLite temporal sin credenciales reales.

## Risks / Trade-offs

- Cambios de contrato → validación, error visible, pausa del hilo y reprocesamiento.
- API externa acepta antes de fallar → estado incierto sin reenvío ciego.
- Un proceso por base para worker → no ejecutar dos instancias simultáneas.
- Historial parcial del proveedor → progreso visible, reconciliación periódica.
- Credenciales reales no verificadas → prueba real separada antes de activar canales.

## Migration Plan

Respaldar SQLite antes de iniciar la versión nueva; 003/004 se aplican transaccionalmente.
Conexiones/automatización apagadas por defecto. Conservar canales manuales.
Rollback de código requiere restaurar respaldo si se necesita revertir el esquema.

## Evidencia durante implementación

El contrato OpenAPI de Zernio distingue `message.platformMessageId` en webhook del
ID interno `message.id`; REST messages devuelve el ID de plataforma en `id`. El mapeo
usa el ID de plataforma para deduplicar ambos transportes. En datos reales aparecen
mensajes sin texto ni adjuntos visibles: se conservan como contenido no compatible,
sin ejecución automática. Una revisión externa evita que páginas antiguas reviertan
ediciones; un mensaje eliminado conserva su tombstone. La migración 004 agrega esa revisión.

La instalación configura `LLM_BASE_URL` como raíz Azure. El cliente reconoce únicamente
los sufijos oficiales OpenAI/Foundry y añade `/openai/v1/` a la raíz; respeta rutas
explícitas y otros proveedores. El formulario sugiere los tres modelos 5.6 indicados
por el usuario, sin restringir deployments personalizados ni elegir uno silenciosamente.
