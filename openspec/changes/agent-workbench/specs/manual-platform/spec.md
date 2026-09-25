# Manual platform delta

## MODIFIED Requirements

### Requirement: Configuración de IA y mensajes manuales
El sistema SHALL administrar prompts ordenados y tools únicas por agente y registrar mensajes de texto con dirección/fecha. El CRUD manual no SHALL enviar mensajes ni ejecutar herramientas, agentes o proveedores. La operación explícita de prueba aislada puede llamar al modelo sin efectos operativos. SHALL asociar documentos de conocimiento por agente, configurar proveedor/modelo exclusivamente desde entorno y exigir expected_version al editar prompts, conservando historial y permitiendo restauración.

#### Scenario: Asociación de instrucciones
- **WHEN** se guardan prompts ordenados y tools en un agente
- **THEN** se leen en el mismo orden y se muestran los agentes que utilizan cada definición

#### Scenario: Registro de mensaje
- **WHEN** se crea, edita o elimina un mensaje manual
- **THEN** solo cambia el registro local y no se afirma envío, lectura o entrega externa
