# Platform UI delta

## MODIFIED Requirements

### Requirement: Configuración agrupada de agentes IA
La UI SHALL ofrecer edición directa de instrucciones y selección de herramientas nativas dentro del agente, con biblioteca de prompts como acceso secundario. Prompts y herramientas no SHALL ocupar pestañas de navegación general. SHALL conservar enlaces directos, asociaciones, orden y versiones; las herramientas no SHALL ofrecer creación ni edición de código.

#### Scenario: Preparar un agente
- **WHEN** se abre un agente
- **THEN** sus instrucciones son editables, sus archivos y herramientas están en secciones identificables y se puede probar sin abandonar el editor

#### Scenario: Prompt compartido y conflicto
- **WHEN** se guarda una edición de instrucciones
- **THEN** se identifica el alcance sobre otros agentes, se exige la versión leída y un conflicto no guarda parcialmente ni pierde el borrador

#### Scenario: Entrar a un catálogo
- **WHEN** se abre la biblioteca de prompts desde un agente
- **THEN** permite consultar y administrar instrucciones reutilizables; las herramientas se seleccionan en el agente y su catálogo antiguo conserva lectura por URL

#### Scenario: Enlace directo y navegación protegida
- **WHEN** se abre un enlace directo a un prompt/tool o se cambia de apartado con cambios pendientes
- **THEN** se muestra Agentes como sección activa, se conserva la confirmación antes de descartar cambios y volver al listado mantiene filtros

## ADDED Requirements

### Requirement: Navegación por tareas
La UI SHALL priorizar Conversaciones, Agentes, Canales y Contactos; agrupar Tickets/Pipelines en Seguimiento y cuenta, conexiones, directorio, API y facturación en Ajustes. SHALL conservar acceso por URL, filtros, protección de borradores, teclado y navegación móvil.

#### Scenario: Abrir un enlace anterior
- **WHEN** se visita directamente un recurso de configuración
- **THEN** permanece accesible y su sección principal corresponde al nuevo agrupamiento

### Requirement: Editor y prueba simultáneos
La UI SHALL presentar instrucciones y prueba lado a lado en escritorio; en móvil SHALL permitir abrir/cerrar la prueba conservando ambos borradores. SHALL mostrar si la prueba usa instrucciones guardadas y mantener contexto/herramientas sin tabs anidadas. Los cambios de contexto SHALL exigir reiniciar la prueba existente antes de continuar.

#### Scenario: Cambiar a prueba en móvil
- **WHEN** se abre y cierra Probar con instrucciones sin guardar
- **THEN** el texto se conserva, la prueba indica que usa lo guardado y el foco vuelve al control de apertura

### Requirement: Primer uso basado en estado real
La UI SHALL presentar una guía breve con pasos de conexión IA, canal, agente preparado/asignado y prueba exitosa de instrucciones guardadas. SHALL desaparecer al completar todos los pasos, persistir el logro de prueba sin guardar mensajes y no ejecutar proveedores al consultar el progreso.

#### Scenario: Configuración incompleta
- **WHEN** se abre la bandeja con pasos pendientes
- **THEN** se muestra el progreso y enlaces directos; errores de consulta no se representan como éxito

### Requirement: Atención y bloqueos accionables
La UI SHALL mostrar cuenta conectada, agente y estado IA juntos en el canal, con acción pertinente para resolver el primer bloqueo. SHALL conservar validación IA y webhook automáticos y activación explícita. La bandeja SHALL ofrecer Necesitan atención para conversaciones abiertas manuales o con envíos fallidos/inciertos; los controles de tomar/devolver control SHALL seguir visibles.

#### Scenario: Canal no preparado
- **WHEN** falta conexión, acceso a mensajes, agente, preparación o suscripción
- **THEN** se identifica el bloqueo y su acción de resolución sin permitir activar IA prematuramente

#### Scenario: Filtrar atención
- **WHEN** se selecciona Necesitan atención
- **THEN** se filtra en servidor conservando paginación y filtros de canal, y no se incluyen conversaciones cerradas
