# Canales Zernio y agentes compatibles con OpenAI

Implementación: `openspec/changes/connected-conversations/`. La base manual funciona
sin estas variables. Las integraciones usan solo credenciales de servidor.

## Configuración

Añadir valores propios a `.env`, sin sobrescribir las credenciales del administrador:

```dotenv
ZERNIO_API_KEY=
LLM_BASE_URL=https://YOUR-RESOURCE.openai.azure.com/openai/v1/
LLM_API_KEY=
LLM_MODEL=YOUR-DEPLOYMENT
PUBLIC_BASE_URL=https://YOUR-APP-DOMAIN
ZERNIO_WEBHOOK_SECRET=
```

`LLM_MODEL` es el nombre del deployment en Azure; un agente puede sobrescribirlo con
su campo Modelo. El formulario propone `gpt-5.6-sol`, `gpt-5.6-terra` y
`gpt-5.6-luna`, conservando entrada libre para otro deployment. No es obligatorio
`LLM_MODEL` si cada agente tiene su modelo. Si `LLM_BASE_URL` contiene solamente la
raíz de un recurso `*.openai.azure.com` o `*.services.ai.azure.com`, el cliente
completa `/openai/v1/` sin modificar `.env`; endpoints con ruta explícita se conservan.
El proveedor del agente admite `azure`, `openai` u `openai-compatible`.
El SDK estándar `openai` usa Chat Completions y function tools, sin streaming. La
compatibilidad se prueba con una función inocua antes de activar el agente. Los alias
`OPENAI_BASE_URL`, `OPENAI_API_KEY` y `OPENAI_MODEL` también se aceptan, con prioridad
para `LLM_*`. Nunca usar `VITE_*` para estas variables.

El secreto del webhook debe tener al menos 32 caracteres aleatorios. Puede generarse
localmente con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
y guardarse en `.env`. No pegarlo en chats ni commits. Reiniciar el backend tras cambios.

`PUBLIC_BASE_URL` debe ser el origen HTTPS público, sin ruta, consulta o fragmento.
El proxy debe enrutar `/api` al backend y servir la compilación React. Para conectar
cuentas, abrir e iniciar sesión en ese origen público y configurar `APP_ORIGIN` con
él: el callback necesita la misma sesión de administrador. La landing estática no
publica estos endpoints. Para webhooks de prueba se puede enrutar una URL HTTPS al
backend local; esto por sí solo no traslada las cookies de localhost a ese dominio.

## Desde la app

1. Abrir **Canales → Sincronizar canales**. Se importan cuentas Instagram/WhatsApp y
   se carga el historial disponible en segundo plano. Se conservan registros manuales.
2. Para una cuenta nueva, usar **Conectar canal**, seleccionar perfil y plataforma,
   completar consentimiento externo y regresar a OpenFunnel. Instagram requiere una
   cuenta profesional; WhatsApp Business permite Cloud API o coexistencia. Un número
   WhatsApp adicional necesita otro perfil; el formulario permite crearlo.
3. Guardar la API key de Zernio registra automáticamente el webhook con HTTPS y
   secreto configurados. Para conexiones anteriores pendientes, usar **Completar conexión**.
   Solo se gestiona el webhook de OpenFunnel, con eventos privados y estados de conexión.
4. Guardar el proveedor de IA comprueba automáticamente modelo y herramientas. La
   comprobación usa dos llamadas y una tool: 3 créditos si corresponde facturación.
   Un fallo queda visible junto al proveedor con **Reintentar conexión**.
5. En **Agentes IA**, asociar un prompt activo y las herramientas nativas
   `get_contact`, `get_ticket` o `handoff_to_human`. Sus contratos son funciones internas: los campos
   JSON del catálogo no autorizan código, SQL o URLs. El backend define el esquema
   efectivo y limita el contexto al contacto/ticket de la conversación.
6. Abrir el canal, elegir agente y **Guardar agente**. Este botón conserva el estado
   de las respuestas automáticas, indicado por separado de la conexión. Cuando se haya
   probado con una cuenta y conversación controladas, **Activar respuestas**.
   Si están activadas, se muestra **Desactivar respuestas**: detiene la IA y conserva
   el agente y la conexión. Los cambios de agente deben guardarse antes de activar.
7. En Conversaciones, **Tomar control** pausa la IA; el formulario envía texto por el
   canal. **Reanudar IA** es explícito. Una asignación de agente en la conversación
   prevalece sobre el agente del canal. La activación no responde al historial importado.

## Operación y recuperación

- Ejecutar un único backend/worker por archivo SQLite. `npm start` y `dev:backend`
  inician procesamiento; no levantar ambos sobre la misma base. Las pruebas usan bases
  temporales y proveedores simulados.
- Cada cinco minutos se reconcilian cuentas y se programan páginas de conversaciones
  y mensajes. Se procesa una página por tick, conservando cursor y estado. Una primera
  importación grande puede tardar varios minutos; el proveedor puede limitar su historial.
- Firmas HMAC se verifican sobre el cuerpo original; los eventos se guardan antes de
  confirmar recepción y se deduplican. Un evento incompatible se muestra en Canales
  para revisión y reprocesamiento. El hilo afectado no responde hasta resolverlo.
- Sincronización y webhook usan el mismo mapeo. Campos adicionales son tolerados;
  campos requeridos incompatibles producen error visible. No hay migraciones automáticas
  a partir de JSON externo. Mensajes remotos no admiten edición/eliminación por CRUD.
- Se envía solo texto de hasta 1000 caracteres y dentro de las 24 horas posteriores
  al último mensaje entrante. Contenido vacío/no compatible, adjuntos y control externo
  suspenden la automatización de mensajes nuevos. No hay comentarios, campañas o plantillas.
- La ejecución limita historial a 30 mensajes/18000 caracteres, prompts a 30000 caracteres,
  salida a 1000 tokens, 3 rondas y 5 tools, con timeout por solicitud de 30 segundos y
  presupuesto de 60 segundos comprobado entre rondas. El deployment elegido debe soportar
  ese contexto y `max_completion_tokens`; un rechazo se muestra y deriva a revisión.
- El outbox usa una clave de idempotencia estable. Ante 429 espera y reintenta hasta
  tres intentos; ante timeout/5xx ambiguo queda **Entrega incierta**. Actualizar mensajes
  y revisar el historial externo antes de **Cerrar revisión**. Cerrar revisión no
  confirma entrega ni reenvía. Un envío aceptado externamente no se puede deshacer al pausar.
- Al reiniciar se recupera trabajo pendiente; un envío interrumpido se trata como incierto.
  Los mensajes propios no disparan IA. Los estados entregado/leído solo proceden del proveedor.
- Cargas de eventos terminados y contenido detallado de trazas se depuran a los 7 días;
  cargas de eventos fallidos a los 30 días. Permanecen IDs de deduplicación y metadatos.
  Después de depurar una carga no puede reprocesarse: reconciliar desde el proveedor.
- Respaldar SQLite antes de actualizar. Las migraciones 003 y 004 son aditivas; no se
  editan migraciones aplicadas ni se recrea la base para actualizar.

## Verificación

Ejecutar `npm test`, `npm run build` y `npm run spec:validate`. La evidencia local
está en [QA de integraciones](../qa/INTEGRACIONES.md). Antes de activar un canal operativo,
verificar un recorrido entrante/saliente real por plataforma con cuentas de prueba,
webhook HTTPS y un deployment validado. Las pruebas simuladas no prueban permisos de Meta.

Contratos consultados: [Zernio OpenAPI](https://docs.zernio.com/api/openapi),
[conexiones](https://docs.zernio.com/guides/connecting-accounts),
[envíos e idempotencia](https://docs.zernio.com/messages/send-inbox-message),
[Azure v1](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle).
