## MODIFIED Requirements

### Requirement: Diseño y accesibilidad
La UI SHALL seguir docs/DESIGN_SYSTEM.md, ofrecer temas claro/oscuro persistidos, teclado, foco, etiquetas y estados carga/error/guardando. SHALL adaptarse a 390, 768 y 1440 px sin desbordar la página; tablas/tablero pueden desplazarse localmente.

#### Scenario: Operación con teclado y móvil
- **WHEN** se opera login, formularios, confirmaciones y navegación con teclado o en ancho móvil
- **THEN** campos y acciones siguen accesibles, el foco es predecible y las confirmaciones regresan al origen

#### Scenario: Estado de integración
- **WHEN** se muestran canales, agentes, tools y mensajes
- **THEN** se distinguen registros manuales de conexiones y ejecuciones reales; solo se muestran acciones operativas disponibles

## ADDED Requirements

### Requirement: Controles de integración
La UI SHALL ofrecer sincronizar/conectar canales, registrar webhook, validar modelo, elegir agente y activar IA; en conversaciones SHALL mostrar origen, modo, pausa, envío y ejecuciones. SHALL conservar etiquetas, estados de error/carga y navegación accesible existente.

#### Scenario: Operación desde la app
- **WHEN** el administrador abre Canales, un agente o una conversación conectada
- **THEN** puede realizar las acciones correspondientes sin conocer claves ni usar el dashboard de Zernio para el flujo habitual

#### Scenario: Estado y acciones de respuestas automáticas
- **WHEN** se abre un canal conectado
- **THEN** la UI muestra «Respuestas automáticas activadas» o «Respuestas automáticas desactivadas» según el estado persistido, explica su efecto y separa la conexión externa de la automatización
- **AND** ofrece una única acción contextual para activar o desactivar; desactivar conserva el agente guardado y no desconecta la cuenta

#### Scenario: Guardado independiente del agente
- **WHEN** se selecciona otro agente
- **THEN** la selección queda pendiente hasta «Guardar agente», que conserva el estado de automatización; activar requiere una selección guardada y los requisitos del canal
- **AND** desactivar sigue disponible aunque haya cambios pendientes; un fallo conserva el estado confirmado y muestra el error sin afirmar éxito
