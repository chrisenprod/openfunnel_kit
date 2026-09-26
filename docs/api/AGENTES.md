# API para agentes externos

La API permite leer recursos, crear/configurar agentes y prompts, asignarlos a
canales con IA desactivada y probarlos. Las herramientas nativas están disponibles
automáticamente. Una clave no permite enviar mensajes, borrar registros, activar
canales ni editar herramientas. En cloud cada clave pertenece a un espacio aislado.
Usar HTTPS en producción. HTTP se reserva al desarrollo en loopback.

## Crear una clave

En **Configuración → Claves API**, indica nombre, vencimiento (1–365 días) y permisos:

| Permiso | Operaciones |
|---|---|
| `resources:read` | GET de recursos y versiones de prompts. |
| `prompts:write` | POST para crear prompts, PATCH para editarlos y POST para restaurar versiones. |
| `agents:write` | POST de agentes y PATCH de configuración, `prompt_ids` y `tool_ids`. |
| `channels:assign` | PUT `/api/channels/ID_CANAL/agent`: asignar agente con la IA del canal desactivada. |
| `agents:test` | POST de una prueba aislada del agente. |

Los permisos son independientes. Para leer y corregir un prompt selecciona los dos
primeros. Para preparar agentes selecciona también `agents:write` y
`channels:assign`. Las claves existentes no reciben permisos nuevos: crea otra con
los permisos necesarios y revoca la anterior cuando dejes de usarla. Guarda el secreto cuando se muestra: después solo aparece su prefijo. La
base conserva su hash. Revocar impide nuevas solicitudes inmediatamente; para rotar,
crea otra clave y revoca la anterior. Vencimiento y último uso aparecen en la lista.
No pegues claves en prompts ni las publiques en clientes web. Máximo 100 claves
conservadas en esta entrega; revocar no borra el registro.

Autenticación: `Authorization: Bearer <CLAVE>`, sin cookie. Mezclar ambos mecanismos
se rechaza; un Bearer inválido no recurre a una sesión válida. Crear/listar/revocar
claves requiere sesión del usuario del espacio (administrador en self-hosted) y
protección de origen en las mutaciones.

En cloud añade `X-OpenFunnel-Workspace: ID_ESPACIO` en **todas** las solicitudes con
Bearer. El ID aparece en la página de Claves API. En self-hosted se omite. La clave
se valida dentro de ese espacio; cambiar el ID no concede acceso a otra cuenta.
Los ejemplos `curl` siguientes omiten ese header por brevedad; añádelo en cloud.

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

## Crear y conectar un agente

Este ejemplo para Node.js 24 usa únicamente una API key. Define `OPENFUNNEL_URL`,
`OPENFUNNEL_API_KEY`, `OPENFUNNEL_CHANNEL_ID` (un canal Zernio ya conectado) y, en
cloud, `OPENFUNNEL_WORKSPACE_ID`. No utiliza usuario, contraseña ni cookie de login.
La clave necesita `resources:read`, `prompts:write`, `agents:write` y `channels:assign`.

```js
const base = process.env.OPENFUNNEL_URL.replace(/\/$/, '');
const headers = {
  Authorization: `Bearer ${process.env.OPENFUNNEL_API_KEY}`,
  'Content-Type': 'application/json',
  ...(process.env.OPENFUNNEL_WORKSPACE_ID
    ? { 'X-OpenFunnel-Workspace': process.env.OPENFUNNEL_WORKSPACE_ID } : {}),
};
async function request(method, path, body) {
  const response = await fetch(`${base}/api${path}`, {
    method, headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${data.error}`);
  return data;
}
const prompt = await request('POST', '/prompts', {
  name: 'Atención al cliente',
  content: 'Responde brevemente. Si solicitan una persona, usa handoff_to_human con el motivo.',
});
const handoff = await request('GET', '/tools/builtin_handoff_to_human');
const agent = await request('POST', '/ai_agents', {
  name: 'Asistente', active: true,
  prompt_ids: [prompt.id], tool_ids: [handoff.id],
});
await request('PUT', `/channels/${process.env.OPENFUNNEL_CHANNEL_ID}/agent`, {
  agent_id: agent.id,
});
console.log({ agentId: agent.id, promptId: prompt.id, automationEnabled: false });
```

POST devuelve 201 con el recurso creado. Para un agente existente utiliza PATCH
`/api/ai_agents/ID_AGENTE` con `prompt_ids` y/o `tool_ids`: cada array reemplaza esa
selección; las propiedades omitidas se conservan. Se rechazan referencias inexistentes
o de otras cuentas. POST no es idempotente: conserva los IDs devueltos y consulta antes
de repetir una creación tras una respuesta incierta.

PUT `/api/channels/ID_CANAL/agent` acepta exclusivamente `{agent_id}` y devuelve
`{ok:true}`. Guarda `default_ai_agent_id`, deja `automation_enabled:0` e invalida
trabajo pendiente. También desactiva un canal que ya tenía IA encendida. No llama al
proveedor, conecta una cuenta Zernio ni cambia el agente específico de conversaciones
que ya tenían uno asignado. Revisa la configuración y activa la IA desde la UI cuando
corresponda; `active:true` en el agente no activa el canal. No se admite `enabled` en
este endpoint. Crear/configurar recursos no consume créditos; probar o ejecutar IA
conserva los requisitos de proveedor, plan y saldo de la instancia.

## Herramientas nativas

No es necesario crear herramientas. Cada espacio dispone de:

| ID estable | Función | Comportamiento |
|---|---|---|
| `builtin_get_contact` | `get_contact` | Lee el contacto de la conversación actual. |
| `builtin_get_ticket` | `get_ticket` | Lee el ticket de la conversación actual. |
| `builtin_handoff_to_human` | `handoff_to_human` | Recibe `reason`, pausa la IA de esa conversación y guarda el motivo. |

Se seleccionan en **Agentes IA → agente → Herramientas** o mediante `tool_ids`.
No se añaden automáticamente a los agentes. Las definiciones y su ejecución pertenecen
al backend: `/api/tools` solo permite GET, incluso con sesión. Los registros heredados
y sus asociaciones se conservan; las nuevas opciones de la UI son las nativas.

La derivación cambia la conversación a modo manual y cancela ejecuciones y envíos IA
pendientes. No envía un mensaje, no pausa otros chats y no reanuda automáticamente al
recibir otro mensaje: una persona debe retomar la conversación o reactivar su IA.
El modo **Probar** simula la derivación sin modificar conversaciones.

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
El proveedor y modelo se configuran para el espacio desde **Agentes IA → Configurar
proveedor**, o mediante `LLM_BASE_URL`, `LLM_API_KEY` y `LLM_MODEL` del servidor.
Las API keys de OpenFunnel no pueden leer ni modificar esas credenciales.

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
