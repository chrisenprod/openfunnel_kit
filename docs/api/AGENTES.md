# API para agentes externos

Esta entrega permite leer recursos, editar/restaurar prompts y probar agentes.
No permite a una clave enviar mensajes, borrar registros, activar canales ni editar
herramientas. Las claves corresponden a una sola instalación; no aíslan clientes.
Usar HTTPS en producción. HTTP se reserva al desarrollo en loopback.

## Crear una clave

En **Configuración → Claves API**, indica nombre, vencimiento (1–365 días) y permisos:

| Permiso | Operaciones |
|---|---|
| `resources:read` | GET de recursos y versiones de prompts. |
| `prompts:write` | PATCH de un prompt y POST para restaurar una versión. |
| `agents:test` | POST de una prueba aislada del agente. |

Los permisos son independientes. Para leer y corregir un prompt selecciona los dos
primeros. Guarda el secreto cuando se muestra: después solo aparece su prefijo. La
base conserva su hash. Revocar impide nuevas solicitudes inmediatamente; para rotar,
crea otra clave y revoca la anterior. Vencimiento y último uso aparecen en la lista.
No pegues claves en prompts ni las publiques en clientes web. Máximo 100 claves
conservadas en esta entrega; revocar no borra el registro.

Autenticación: `Authorization: Bearer <CLAVE>`, sin cookie. Mezclar ambos mecanismos
se rechaza; un Bearer inválido no recurre a una sesión válida. Crear/listar/revocar
claves requiere sesión de administrador y protección de origen en las mutaciones.

## Leer recursos

Los ejemplos son ilustrativos y usan identificadores de muestra:

```sh
curl 'https://TU_INSTANCIA/api/conversations?page=1&pageSize=25' \
  -H 'Authorization: Bearer <CLAVE>'
curl 'https://TU_INSTANCIA/api/messages?conversation_id=ID_CONVERSACION&page=1&pageSize=25' \
  -H 'Authorization: Bearer <CLAVE>'
curl 'https://TU_INSTANCIA/api/ai_agents/ID_AGENTE' \
  -H 'Authorization: Bearer <CLAVE>'
```

Recursos: `contacts`, `conversations`, `messages`, `tickets`, `ai_agents`, `prompts`,
`tools`, `channels`, `pipelines`, `pipeline_stages` y `users`. GET `/api/RECURSO/ID`
devuelve un registro. Los listados devuelven `{items,total,page,pageSize}`: 25 por
página de forma predeterminada, máximo 100. `q` busca según el recurso; filtros
permitidos en `shared/resources.js`. Las conversaciones admiten `channel_id` y los
mensajes `conversation_id`. Filtros desconocidos se rechazan.

## Editar y restaurar prompts

Lee primero GET `/api/prompts/ID_PROMPT` y utiliza su `version` como
`expected_version`. PATCH acepta nombre, descripción, contenido y estado activo.
El resto se conserva. Cada guardado crea una versión con autor y fecha.

```sh
curl -X PATCH 'https://TU_INSTANCIA/api/prompts/ID_PROMPT' \
  -H 'Authorization: Bearer <CLAVE>' -H 'Content-Type: application/json' \
  -d '{"expected_version":1,"content":"Responde brevemente y pide aclaración si faltan datos."}'
```

GET `/api/prompts/ID_PROMPT/versions?page=1` devuelve 20 versiones por página,
`current_version`, agentes afectados, total y paginación. Restaurar recupera nombre,
descripción, contenido y estado activo como una nueva versión:

```sh
curl -X POST 'https://TU_INSTANCIA/api/prompts/ID_PROMPT/restore' \
  -H 'Authorization: Bearer <CLAVE>' -H 'Content-Type: application/json' \
  -d '{"version":1,"expected_version":2}'
```

Si la versión de partida ya no es actual se devuelve 409: vuelve a leer y revisa los
cambios antes de reintentar. No repitas automáticamente con la nueva versión. Un
reintento del mismo PATCH con la versión vieja no crea otra revisión. Los prompts
compartidos afectan a todos sus agentes; la UI muestra las asociaciones. Cambiar la
configuración invalida resultados IA pendientes en la siguiente revalidación, pero
no puede deshacer un envío ya aceptado por el proveedor. Un hilo cancelado puede
requerir revisión y reanudación humana, conforme al runtime existente.

## Documentos de conocimiento

En **Agentes IA → agente → Conocimiento**, sube TXT/MD UTF-8, DOC, DOCX o PDF con
texto: 5 MiB por archivo, 10 documentos y 30000 caracteres disponibles por agente.
El original se conserva como BLOB en SQLite junto con su texto extraído, nombre,
tamaño, revisión, fecha y estado. No hay Base64, OCR, RAG ni embeddings.

Con `resources:read` puedes consultar:

- GET `/api/ai_agents/ID_AGENTE/documents`: `{items,limits}`, metadatos sin BLOB ni texto completo.
- GET `/api/ai_agents/ID_AGENTE/documents/ID_DOCUMENTO`: metadatos y `extracted_text`.
- GET `/api/ai_agents/ID_AGENTE/documents/ID_DOCUMENTO/download`: bytes originales como attachment.

Las mutaciones requieren sesión del administrador y `Origin`, nunca una API key.
POST a la colección carga un archivo; PUT al documento lo reemplaza. Ambos utilizan
`Content-Type: application/octet-stream`, `X-Filename` con nombre codificado mediante
`encodeURIComponent` y el binario crudo como cuerpo. No usar JSON ni Base64.
PUT y DELETE al documento exigen `If-Match: 1` con su revisión actual. Si cambió,
se devuelve 409 sin sobrescribir. DELETE elimina original y texto.

Una carga nueva devuelve 201 con `status: ready` o `status: error`; comprueba el
estado, ya que el original se conserva aunque la extracción falle. Los estados
`processing` aparecen en la lista mientras trabaja el servidor. Un reemplazo fallido
devuelve error y conserva intacto el documento anterior. Los límites por agente
incluyen archivos con error en el conteo, pero solo texto disponible en el presupuesto.

La extracción ocurre una vez por carga. El texto disponible se incluye en cada
llamada al modelo como referencia separada de instrucciones; consume tokens de cada
solicitud. Los valores legacy `business_context` se migran a `contexto-inicial.txt`.
`business_context`, `provider` y `model` ya no son campos editables de agentes.
El modelo se configura exclusivamente mediante `LLM_MODEL` del servidor.

## Probar un agente

Desde el detalle del agente, abre **Probar** y escribe un mensaje. Opcionalmente
ensaya otras instrucciones sin guardarlas. Por API, requiere `agents:test`:

```sh
curl -X POST 'https://TU_INSTANCIA/api/ai_agents/ID_AGENTE/test' \
  -H 'Authorization: Bearer <CLAVE>' -H 'Content-Type: application/json' \
  -d '{"message":"¿Cuándo atienden?","prompt":"Responde usando los horarios del negocio."}'
```

`message` admite 4000 caracteres. `prompt` es opcional, hasta 20000 caracteres, y
sustituye todos los prompts activos solo durante esa prueba. Si se omite, se usan
los prompts activos ordenados (máximo combinado 30000 caracteres). El contexto y
las herramientas provienen del agente guardado. No se exige que esté activo ni que
su modelo esté validado para operación, pero sí un proveedor/modelo configurado.

Devuelve `response`, `tools` simuladas, `usage` (null si no se informó), `duration_ms`,
`simulated`, `candidate` y versiones de prompts usadas cuando no hay candidato.
Todas las tools se simulan: contacto/ticket devuelven ausencia de datos reales y la
derivación humana no cambia el modo de ninguna conversación. No se guardan pruebas,
mensajes ni ejecuciones operativas. La prueba sí llama al modelo y consume tokens.
No reproduce el historial de una conversación operativa ni demuestra entrega real a un canal.

Para continuar una prueba envía `history`, un array alternado de objetos
`{role:"user"|"assistant",content:"..."}`, y el `context_hash` de la respuesta anterior.
Incluye el mismo candidato `prompt`, si lo usaste. Máximo 20 mensajes previos y 18000
caracteres combinados; no se admiten roles system/tool ni campos adicionales.
Cada respuesta incluye `documents` (id, filename, revision) y `context_hash`.
Si cambia la configuración, documentos o candidato, devuelve 409 y debes reiniciar
con historial vacío. El cliente conserva el historial: el servidor no lo persiste.

## Límites y errores

- 120 solicitudes/minuto por clave; 5 pruebas/minuto por identidad (administrador o
  clave), una prueba concurrente en la instancia. Los contadores reinician con la API.
- Pruebas: 60 segundos, 3 rondas de modelo, hasta 5 llamadas de herramientas y 1000
  tokens de salida por llamada. Cancelar la petición cancela la llamada en curso;
  los tokens ya consumidos no se revierten.
- 400: entrada inválida o mezcla de cookie/Bearer; 401: clave inválida, vencida o
  revocada; 403: permiso insuficiente u origen de sesión inválido; 404: inexistente;
  409: conflicto de versión/límite de ejecución/otra prueba en curso; 429: límite de
  solicitudes con `Retry-After`; 502/503: fallo o configuración del modelo;
  413: archivo demasiado grande; 415: formato de carga inválido; 422: extracción o cuota de texto;
  504: tiempo agotado o cancelación. Errores en `{error}` sin secretos del proveedor.

Las claves y versiones persisten en SQLite mediante la migraciones aditivas 005/006. El
historial dura mientras exista el prompt; eliminar un prompt sin referencias elimina
también sus versiones. El sistema mantiene las restricciones de borrado existentes.
