# Conocimiento del negocio

En **Agentes IA → agente → Contexto**, sube archivos con información útil para sus respuestas: horarios, productos, servicios, políticas y preguntas frecuentes.

## Archivos y límites

| Límite | Valor |
|---|---|
| Formatos | `.txt`, `.md`, `.doc`, `.docx`, `.pdf` |
| Tamaño del original | Hasta 5 MiB por archivo (5.242.880 bytes) |
| Cantidad | Hasta 10 archivos por agente, incluidos los que tengan error |
| Texto disponible | Hasta 30.000 caracteres combinados por agente |

TXT y Markdown deben usar UTF-8. PDF necesita una capa de texto; no se aplica OCR ni se interpretan imágenes, diagramas o formato visual. Los archivos cifrados, dañados o sin texto muestran un error. No se recorta contenido silenciosamente: reduce o divide el documento si supera el límite, respetando el total del agente.

## Qué se guarda

**El original se guarda completo como BLOB dentro de SQLite**, junto con nombre, tipo, tamaño, fechas, revisión y estado. El texto extraído se guarda en otro campo del mismo documento. No se guarda Base64 ni un archivo suelto en el servidor.

El documento permanece visible en la lista. Puedes abrir el texto que recibirá el agente, descargar los mismos bytes originales, reemplazar el archivo o eliminarlo. El original también se conserva si falla la extracción. Un formato no permitido o una carga rechazada antes de guardar muestra un aviso y no crea un documento.

## Cuándo lo lee el agente

La extracción ocurre una sola vez al subir o reemplazar el archivo. Se procesa un archivo a la vez, con un límite de 15 segundos y 128 MiB para el heap de V8 del worker de extracción. Esto no equivale a un límite de memoria total del proceso; utiliza los límites de recursos del contenedor si tu instalación los necesita.

Al generar **cada respuesta**, la app lee el texto de los documentos disponibles y lo envía como contexto inicial de la llamada, separado del prompt de instrucciones. La API del modelo no recuerda llamadas anteriores. El texto consume tokens en cada llamada, sin aparecer como mensajes repetidos en el chat.

No hay RAG, embeddings ni herramienta de búsqueda. Se incluye el texto disponible completo. El chat de prueba utiliza el mismo mecanismo y muestra los documentos incluidos.

## Reemplazar y eliminar

Al reemplazar, el documento anterior sigue disponible hasta que el nuevo se procese correctamente y cumpla las cuotas. Si falla, se conserva el original y su texto anteriores. Una revisión desactualizada se rechaza para evitar sobrescrituras; actualiza la lista.

Eliminar requiere confirmación y quita original y texto. La próxima respuesta usará el conocimiento restante. Si el servidor se reinicia durante una carga nueva, el archivo aparece con error de procesamiento interrumpido; reemplázalo para intentarlo otra vez.

## Contenido y privacidad

Sube únicamente información que pueda recibir tu proveedor de IA. Los documentos se envían como datos de referencia, no como instrucciones de sistema. Esto ayuda a separar información e instrucciones, pero no garantiza eliminar instrucciones maliciosas dentro de documentos.

La lista, el texto y las descargas requieren sesión o una clave con `resources:read`. La carga, reemplazo y eliminación requieren la sesión del administrador. Respaldar SQLite incluye los archivos originales y su texto.
