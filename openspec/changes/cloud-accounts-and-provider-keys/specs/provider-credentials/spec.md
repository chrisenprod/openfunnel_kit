## Purpose
Configurar proveedores desde la interfaz cuando corresponda, protegiendo sus claves cifradas y preservando la configuración de servidor de instalaciones autohospedadas.

## ADDED Requirements

### Requirement: Configuración desde interfaz
Canales SHALL ofrecer una conexión Zernio mediante API key. Agentes SHALL ofrecer URL base, API key y modelo/deployment del proveedor compatible, pidiendo solamente campos que falten. La conexión SHALL ser del espacio y reutilizable por sus canales o agentes. Guardar no SHALL activar canales, enviar mensajes ni efectuar pruebas de pago automáticamente.

#### Scenario: Proveedor pendiente
- **WHEN** no existe configuración efectiva
- **THEN** la sección correspondiente muestra los campos necesarios y conserva errores sin mostrar secretos guardados

#### Scenario: Configuración completa en entorno
- **WHEN** una instalación autohospedada tiene todos los campos en su entorno
- **THEN** muestra conexión configurada por el servidor y no pide ni permite sobrescribir esos valores desde la UI

### Requirement: Conexión de canales guiada por Zernio
La sección Canales SHALL presentar «Configurar canales con Zernio», su logo oficial sin alteraciones, enlace a https://zernio.com y una explicación breve del uso de su API key. Mientras falte la conexión, «Configurar Zernio» SHALL ser la acción principal. Una vez configurada, «Conectar canal» SHALL ser la acción principal y la sustitución de la clave una acción secundaria. La interfaz SHALL retirar la creación manual de canales, incluso en estados vacíos y enlaces antiguos a /channels/new, conservando los registros existentes. Guardar la clave no SHALL sincronizar, conectar ni activar canales automáticamente.

#### Scenario: Primera conexión
- **WHEN** una persona abre Canales sin conexión Zernio
- **THEN** puede visitar Zernio y abrir la configuración mediante la acción principal, sin opciones para crear canales manuales

#### Scenario: Conexión guardada
- **WHEN** se guarda una API key de Zernio
- **THEN** se habilitan conectar y sincronizar canales, con la clave oculta y sin llamadas automáticas al proveedor

#### Scenario: Enlace antiguo de alta manual
- **WHEN** se abre /channels/new
- **THEN** se presenta la sección de canales con configuración Zernio y no un formulario manual

### Requirement: Configuración destacada del proveedor de IA
Agentes SHALL ofrecer un bloque destacado «Configurar proveedor de IA», iconos y enlaces a OpenAI Platform y OpenRouter. La configuración SHALL seguir siendo compartida por espacio y compatible con otros proveedores Chat Completions. El formulario SHALL ofrecer accesos rápidos para OpenAI (https://api.openai.com/v1), OpenRouter (https://openrouter.ai/api/v1) y URL personalizada/Azure, un campo de modelo/deployment y enlaces a sus catálogos. Guardar SHALL conservar cifrado, prioridad de entorno y política de destinos, sin llamadas de prueba automáticas. OpenRouter SHALL estar entre los hosts permitidos predeterminados; una lista explícita del operador SHALL conservar prioridad.

#### Scenario: Elegir proveedor
- **WHEN** se elige OpenAI u OpenRouter en el formulario
- **THEN** se completa su URL correspondiente sin guardar ni llamar al proveedor, se pide la API key correspondiente y se permite introducir el ID de modelo

#### Scenario: Cambiar destino
- **WHEN** cambia la URL del proveedor
- **THEN** se limpia cualquier API key escrita en el formulario y se exige una nueva para reemplazar la conexión guardada, sin revelar ni reutilizar claves de otro destino

#### Scenario: Conexión existente o de entorno
- **WHEN** ya hay una conexión de IA
- **THEN** el bloque muestra proveedor y modelo, distingue guardado de validación real y oculta los campos fijados por entorno

### Requirement: Prioridad y aislamiento de credenciales
Autohospedado SHALL priorizar valores del entorno y completar únicamente los ausentes desde almacenamiento cifrado. Cloud SHALL usar las claves propias del espacio sin heredar la cuenta Zernio global. Proveedor/modelo no SHALL ser campos genéricos del CRUD de agentes. La UI SHALL informar el origen y estado de la conexión sin revelar claves.

#### Scenario: Clientes cloud distintos
- **WHEN** dos clientes configuran Zernio o LLM
- **THEN** cada ejecución y sincronización utiliza exclusivamente las credenciales del cliente correspondiente

### Requirement: Cifrado y rotación
El backend SHALL cifrar los secretos con cifrado autenticado, nonce independiente y clave maestra externa a SQLite y al frontend. Las respuestas, logs y exportaciones ordinarias no SHALL incluir claves ni ciphertext. Actualización/borrado SHALL exigir sesión del propietario del espacio y Origin válido, rechazar API keys de automatización y conflictos de versión. La sustitución SHALL invalidar verificaciones y respuestas pendientes generadas con la conexión previa, preservando entregas inciertas.

#### Scenario: Lectura de la base
- **WHEN** se examina una copia de SQLite sin clave maestra
- **THEN** no se obtiene la API key en texto claro

#### Scenario: Reinicio y clave equivocada
- **WHEN** se reinicia con la clave maestra correcta o con una incorrecta
- **THEN** respectivamente se recupera la conexión o falla de forma explícita sin sobrescribir secretos ni usar credenciales de otro espacio

### Requirement: Destinos del proveedor
La configuración LLM SHALL aceptar únicamente destinos HTTPS autorizados y rechazar credenciales en URL, direcciones privadas/locales, redirecciones inseguras y resolución DNS hacia redes internas. La clave SHALL enviarse solo al destino vinculado a esa conexión. El despliegue SHALL conservar una política de salida restringida para el cloud.

#### Scenario: URL maliciosa
- **WHEN** se proporciona una URL local, privada o que resuelve a una red interna
- **THEN** no se realiza la petición ni se transmite la API key
