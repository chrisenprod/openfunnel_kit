## MODIFIED Requirements

### Requirement: Configuración de IA y mensajes manuales
El sistema SHALL administrar prompts ordenados y tools únicas por agente y registrar mensajes manuales de texto con dirección/fecha sin enviarlos. Solo SHALL ejecutar IA y enviar mensajes mediante las acciones explícitas de canales conectados. SHALL impedir editar o borrar mensajes remotos mediante CRUD manual.

#### Scenario: Asociación de instrucciones
- **WHEN** se guardan prompts ordenados y tools en un agente
- **THEN** se leen en el mismo orden y se muestran los agentes que utilizan cada definición

#### Scenario: Registro de mensaje
- **WHEN** se crea, edita o elimina un mensaje manual
- **THEN** solo cambia el registro local y no se afirma envío, lectura o entrega externa

#### Scenario: Registro remoto
- **WHEN** se intenta editar o borrar un mensaje remoto por CRUD
- **THEN** se rechaza sin cambiar el mensaje ni llamar al proveedor
