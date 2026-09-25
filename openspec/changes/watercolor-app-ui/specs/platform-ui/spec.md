# Spec Delta
## ADDED Requirements

### Requirement: Formularios bajo demanda y agente con navegación simple
Claves API SHALL mostrar primero el listado o estado vacío sin campos de creación. Crear SHALL abrir un panel lateral con foco y cierre explícitos. Los cambios sin guardar y el secreto visible SHALL conservar la protección al abandonar. El agente SHALL mostrar una sola fila Instrucciones/Herramientas/Contexto/Probar en escritorio y móvil, conservando la prueba al cambiar secciones. No SHALL incluir una pestaña Configuración anidada ni el chat permanente a un lado. Los filtros secundarios SHALL estar disponibles bajo un despliegue identificado.

#### Scenario: Crear y cancelar una clave
- **WHEN** se abre Crear clave y se modifica un campo
- **THEN** cancelar pide confirmación, un error conserva el borrador y la creación exitosa muestra el secreto una sola vez hasta ocultarlo explícitamente

#### Scenario: Cambiar sección del agente
- **WHEN** se escribe una prueba y se abre Conocimiento
- **THEN** la prueba conserva su borrador y salir del agente continúa protegido; descartar cambios de configuración no borra la prueba

### Requirement: Identidad moderna con acentos de acuarela
La UI SHALL combinar estructura compacta, superficies abiertas y jerarquía tipográfica con marfil cálido, azul tinta y acuarela localizada en navegación y márgenes. El contenido de mensajes, tablas y campos SHALL conservar superficies limpias. La decoración MUST ser no interactiva y no necesaria para comprender estados.

#### Scenario: Recorrido por módulos y temas
- **WHEN** se recorren acceso, conversaciones, tickets, contactos, canales, pipelines, agentes, prompts, herramientas, usuarios y claves API en claro u oscuro
- **THEN** comparten controles y jerarquía visual; la acuarela no cubre datos ni impide leer estados o usar acciones

#### Scenario: Móvil y teclado
- **WHEN** se usa un ancho de 390, 768 o 1440 px y se navega con teclado
- **THEN** no se desborda la página, los controles conservan foco visible y los selectores propios de la app siguen operativos; tablas y tablero pueden desplazarse localmente

### Requirement: Conversación centrada en mensajes
La UI SHALL dar prioridad al historial, estado de atención y control humano. Los metadatos y ticket SHALL estar disponibles en un apartado plegable. En canales conectados el compositor manual SHALL aparecer después del historial, conservando borrador y validaciones. Advertencias, errores y revisiones de entrega incierta SHALL seguir disponibles sin quedar ocultos como configuración secundaria.

#### Scenario: Leer y responder
- **WHEN** se abre una conversación conectada en modo manual
- **THEN** se ven el estado, los mensajes y después el compositor; se pueden desplegar sus detalles y abrir o crear el ticket sin alterar el modo de atención

#### Scenario: Atención automática y registro manual
- **WHEN** una conversación usa IA o no está conectada a un proveedor
- **THEN** conserva respectivamente el control humano o el registro manual, sin presentar un mensaje registrado como enviado

#### Scenario: Borrador y errores
- **WHEN** se escribe un borrador, se actualizan los datos o falla una operación
- **THEN** la presentación conserva el borrador y los errores relevantes; abandonar cambios mantiene la confirmación existente

### Requirement: Bandeja operativa y detalle de canal
La UI SHALL presentar conversaciones como lista y área de conversación en escritorio, con historial desplazable y compositor al pie. En móvil SHALL mostrar lista o conversación con vuelta explícita. Los filtros, selección de canal y paginación SHALL conservarse en la URL. El detalle del canal SHALL separar conexión, estado IA y agente; el selector de agente SHALL abrirse bajo demanda y conservar protección del borrador. Los detalles de recursos SHALL priorizar contenido y relaciones, con metadatos secundarios y acciones destructivas accesibles bajo demanda.

#### Scenario: Seleccionar y volver a la bandeja
- **WHEN** se abre una conversación desde una bandeja filtrada y se vuelve a la lista
- **THEN** permanecen filtros y página; el cambio de conversación respeta la confirmación del borrador, y en móvil la lista no empuja el hilo fuera de la pantalla

#### Scenario: Canal en lectura y edición de agente
- **WHEN** se abre un canal conectado con IA apagada
- **THEN** muestra la conexión y la IA apagada como estados independientes; cambiar y guardar el agente no activa IA, cancelar conserva el agente guardado y los errores permanecen visibles
