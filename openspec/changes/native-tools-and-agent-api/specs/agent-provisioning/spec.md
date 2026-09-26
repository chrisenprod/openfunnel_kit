## ADDED Requirements

### Requirement: Herramientas nativas
Cada espacio SHALL ofrecer automáticamente get_contact, get_ticket y handoff_to_human. Sus funciones SHALL pertenecer al backend, sin crear, editar ni borrar definiciones mediante la interfaz o la API pública. La asociación a agentes SHALL ser explícita y conservar referencias existentes.

#### Scenario: Espacio nuevo y reinicio
- **WHEN** se abre una cuenta nueva o se reinicia una existente
- **THEN** las tres herramientas nativas están disponibles una sola vez, sin cambiar la selección de herramientas de sus agentes

#### Scenario: Derivación real
- **WHEN** un agente autorizado ejecuta handoff_to_human con un motivo válido
- **THEN** se pausa solo esa conversación, se guarda el motivo y se cancela trabajo IA pendiente; una prueba aislada no modifica conversaciones reales

### Requirement: Preparación mediante API key
El sistema SHALL admitir crear prompts con prompts:write y crear/editar agentes y sus asociaciones con agents:write. SHALL validar pertenencia de cada referencia, mantener versiones de prompts y negar borrado, secretos y administración de claves mediante Bearer.

#### Scenario: Preparar agente sin sesión
- **WHEN** una API key con los permisos necesarios crea un prompt, consulta tools y crea un agente con esas referencias
- **THEN** las operaciones se completan sin cookie ni token de login y quedan limitadas a su espacio

#### Scenario: Permisos y aislamiento
- **WHEN** una clave carece del scope, está revocada o utiliza referencias de otra cuenta
- **THEN** la operación se rechaza sin modificar datos propios ni ajenos

### Requirement: Asignación de canal sin activación
channels:assign SHALL permitir PUT /api/channels/:id/agent con agent_id de su espacio. La asignación SHALL dejar la automatización del canal desactivada y SHALL rechazar parámetros para habilitarla o enviar mensajes.

#### Scenario: Vincular agente
- **WHEN** una API key autorizada asigna un agente a un canal Zernio existente
- **THEN** se guarda la asociación, se invalida trabajo pendiente y no se llama a Zernio ni al modelo

#### Scenario: Intentar activar con la clave
- **WHEN** una API key de configuración intenta activar automatización, enviar mensajes o cambiar credenciales
- **THEN** se rechaza aunque pueda asignar agentes a canales
