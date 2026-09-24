# Manual platform

## Purpose
Administrar registros manuales y configuraciones de la primera etapa con persistencia y relaciones coherentes sin integrar servicios externos.

## Requirements

### Requirement: CRUD persistente
El sistema SHALL ofrecer CRUD de users, contacts, channels, conversations, messages, ai_agents, prompts, tools, pipelines, pipeline_stages y tickets con los campos del PRD. SHALL validar entradas en servidor, buscar, filtrar y paginar listados (25 por defecto, máximo 100), rechazando campos desconocidos y consultas no válidas.

#### Scenario: Recorrido manual
- **WHEN** se crean contacto, canal, conversación, mensajes y ticket
- **THEN** las relaciones pueden consultarse y los datos persisten tras reiniciar

#### Scenario: Datos inválidos
- **WHEN** faltan campos requeridos, se usa un enum inválido, email inválido, JSON no objeto o texto demasiado largo
- **THEN** la API devuelve 400 con errores de campo y no guarda parcialmente

#### Scenario: Búsqueda y paginación
- **WHEN** se busca un contacto por nombre/email/teléfono o se filtran conversaciones/tickets por sus relaciones y estado
- **THEN** se devuelve la página solicitada, su total y un orden estable

### Requirement: Integridad y eliminación
El sistema SHALL impedir borrar registros referenciados, vincular datos inexistentes, asignar registros inactivos nuevos y duplicar asociaciones. Las relaciones existentes con registros inactivos SHALL seguir siendo legibles y conservables al editar otros campos.

#### Scenario: Referencia ocupada
- **WHEN** se elimina un contacto, canal, usuario, agente, prompt, tool, etapa o conversación todavía referenciado
- **THEN** responde 409 con explicación sin borrar sus dependencias

#### Scenario: Usuario repetido y estado inactivo
- **WHEN** se duplica un email normalizado del directorio o se asigna por primera vez un registro inactivo
- **THEN** la API rechaza la operación

### Requirement: Pipelines y tickets
El sistema SHALL crear pipelines con al menos una etapa, permitir ordenar/editar etapas atómicamente y ubicar cada ticket en una etapa de su pipeline. El vínculo ticket/conversación SHALL ser opcional 1:1 con contacto coincidente. Cierres y responsables SHALL ser independientes.

#### Scenario: Mover ticket
- **WHEN** se cambia de pipeline y etapa simultáneamente
- **THEN** ambos se guardan juntos si son coherentes; una etapa ajena se rechaza

#### Scenario: Reordenar o quitar etapas
- **WHEN** se reordenan etapas o se intenta borrar una ocupada o la última
- **THEN** el orden es consistente y los borrados inválidos se rechazan sin alterar datos

#### Scenario: Conversación y ticket incompatibles
- **WHEN** se intenta vincular una conversación ya ocupada, otro contacto o cambiar su contacto mientras tiene ticket
- **THEN** se rechaza la operación y se conservan ambos registros

### Requirement: Configuración de IA y mensajes manuales
El sistema SHALL administrar prompts ordenados y tools únicas por agente y registrar mensajes de texto con dirección/fecha. No SHALL enviar mensajes ni ejecutar herramientas, agentes o proveedores.

#### Scenario: Asociación de instrucciones
- **WHEN** se guardan prompts ordenados y tools en un agente
- **THEN** se leen en el mismo orden y se muestran los agentes que utilizan cada definición

#### Scenario: Registro de mensaje
- **WHEN** se crea, edita o elimina un mensaje manual
- **THEN** solo cambia el registro local y no se afirma envío, lectura o entrega externa
