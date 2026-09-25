# Agent workbench

## Purpose
Permitir leer recursos desde integraciones y mejorar agentes mediante contexto textual, prompts versionados y pruebas sin efectos operativos.

## ADDED Requirements

### Requirement: Claves con permisos acotados
El sistema SHALL permitir al administrador crear claves con nombre, vencimiento entre 1 y 365 días y permisos independientes resources:read, prompts:write y agents:test. SHALL mostrar el secreto una sola vez, almacenar solo su hash, mostrar último uso y permitir revocación inmediata. SHALL limitar cada clave a 120 solicitudes por minuto y cada identidad de prueba a 5 pruebas por minuto, con una prueba concurrente por instancia.

#### Scenario: Lectura y denegación
- **WHEN** una clave con resources:read consulta recursos de negocio
- **THEN** recibe datos paginados; no puede editar prompts, enviar mensajes, administrar claves ni acceder a rutas de integración

#### Scenario: Clave inválida o limitada
- **WHEN** una clave está vencida, revocada, es inválida o excede el límite
- **THEN** no accede y recibe 401 o 429 con Retry-After respectivamente

### Requirement: Documentos de conocimiento
El sistema SHALL admitir TXT, MD, DOC, DOCX y PDF con texto, hasta 5 MiB por archivo, 10 documentos y 30000 caracteres disponibles por agente. SHALL conservar original BLOB y texto extraído en SQLite, con nombre, tamaño, revisión, fechas y estado. SHALL mostrar carga, procesamiento, éxito/error y permitir abrir texto, descargar original, reemplazar y eliminar con confirmación. SHALL mantener el documento anterior si falla un reemplazo y rechazar cambios con revisión obsoleta. SHALL rechazar documentos vacíos, ilegibles, cifrados y PDF sin texto sin fingir OCR ni recortar texto silenciosamente.

#### Scenario: Original recuperable
- **WHEN** se sube un documento válido y se reinicia la API
- **THEN** el documento sigue listado y su descarga devuelve los mismos bytes originales, con el texto extraído disponible

#### Scenario: Reemplazo fallido o concurrente
- **WHEN** falla la extracción, se excede una cuota o la revisión enviada dejó de estar vigente
- **THEN** se informa el error sin sustituir el archivo ni texto anterior

#### Scenario: Uso y límites de contexto
- **WHEN** se genera una respuesta o prueba
- **THEN** se inyecta el texto de documentos disponibles del agente como datos separados de instrucciones y se identifican los documentos usados; un cambio invalida respuestas operativas pendientes

#### Scenario: Acceso y recuperación
- **WHEN** una subida se interrumpe al reiniciar o un consumidor sin permiso intenta obtener el original
- **THEN** el procesamiento interrumpido muestra error y el acceso no autorizado se deniega

### Requirement: Modelo configurado en servidor
El sistema SHALL usar exclusivamente el modelo y endpoint configurados en el entorno para respuestas, validación y pruebas. SHALL omitir campos editables de proveedor/modelo en UI/API de agentes y no usar overrides históricos.

#### Scenario: Configuración legacy
- **WHEN** un agente conserva un modelo anterior en la base
- **THEN** se usa LLM_MODEL y un intento de cambiar provider/model por API se rechaza

### Requirement: Documentación pública desplegable
El proyecto SHALL incluir un sitio estático público de documentación, compilable desde un clon, enlazado desde app y landing y desplegable junto a ellas o independiente. SHALL cubrir instalación, entorno, operación de la app, conocimiento, pruebas, API, respaldos, actualización, contribuciones y licencias; no incluir secretos ni documentación privada. SHALL admitir navegación por teclado, móvil, búsqueda y enlaces directos.

#### Scenario: Publicación y acceso
- **WHEN** se construye el sitio y se sirve en raíz o subruta
- **THEN** páginas, enlaces y recursos funcionan sin API ni sesión, y app/landing ofrecen acceso a la documentación

### Requirement: Historial de prompts
El sistema SHALL versionar nombre, descripción, contenido y estado activo de prompts, incluyendo existentes, con autor y fecha. SHALL exigir expected_version al editar/restaurar y rechazar conflictos con 409. Restaurar SHALL crear una nueva versión sin borrar anteriores. SHALL mostrar agentes afectados y paginar historial a 20 versiones.

#### Scenario: Restauración y concurrencia
- **WHEN** se restaura una versión anterior usando la versión vigente
- **THEN** se crea una nueva versión atribuida y otro cambio basado en la versión anterior se rechaza sin sobrescribir

#### Scenario: Cambio durante generación
- **WHEN** cambia o se restaura un prompt mientras existe una respuesta IA pendiente
- **THEN** la revalidación de configuración impide enviar el resultado obsoleto sin repetir efectos

### Requirement: Prueba aislada
El sistema SHALL permitir probar un agente guardado desde UI/API con mensaje de hasta 4000 caracteres, historial temporal alternado user/assistant de hasta 20 mensajes/18000 caracteres e instrucciones candidatas opcionales de hasta 20000. La UI SHALL permitir continuar y reiniciar el chat y mostrar los documentos incluidos; no aceptar roles system/tool ni mezclar instrucciones candidatas diferentes en un mismo chat. SHALL usar contexto y tools activas del agente, simulando todas las tools sin leer contactos reales ni ejecutar efectos. SHALL devolver respuesta, simulaciones, duración y consumo disponible, sin persistir pruebas ni modificar mensajes, prompts, modo humano o colas. SHALL limitar a 3 rondas, 5 llamadas de tools y 60 segundos totales.

#### Scenario: Ensayo de instrucciones
- **WHEN** se prueba un candidato que solicita derivación humana
- **THEN** la derivación aparece como simulada, la configuración activa no cambia y no se envían mensajes

#### Scenario: Proveedor o herramienta inválidos
- **WHEN** falla el proveedor o solicita tools no autorizadas/argumentos inválidos
- **THEN** la prueba falla con error depurado sin ejecutar acciones ni exponer secretos

### Requirement: Navegación simple del agente
La UI SHALL presentar una sola fila Instrucciones, Herramientas, Contexto y Probar, sin configuración anidada ni pruebas visibles permanentemente. La edición SHALL limitarse a los campos de la sección elegida.

#### Scenario: Cambiar de sección
- **WHEN** el usuario cambia entre secciones del mismo agente
- **THEN** ve únicamente el contenido elegido y conserva la conversación de prueba
- **AND** los cambios sin guardar requieren confirmación antes de descartarse

#### Scenario: Editar información del agente
- **WHEN** el usuario pulsa Editar agente
- **THEN** puede cambiar nombre, descripción y estado sin repetir los editores de instrucciones y herramientas
