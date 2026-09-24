# Platform UI

## Purpose
Ofrecer una interfaz de operación y configuración coherente con Campo de tinta, con controles accesibles y estados fieles a la primera etapa.

## ADDED Requirements

### Requirement: Navegación y CRUD
La UI SHALL implementar login, navegación Operación/Configuración, listados, detalle, creación, edición y eliminación de los módulos del PRD. Mensajes SHALL vivir dentro de conversaciones y etapas dentro de pipelines.

#### Scenario: Formularios y navegación
- **WHEN** se edita un registro y falla la validación o la red
- **THEN** se conservan los valores, se muestran errores y se permite reintentar; salir con cambios pide confirmación

#### Scenario: Listados vacíos y filtros
- **WHEN** una lista está vacía o sin resultados de búsqueda
- **THEN** distingue ambos estados y ofrece crear o limpiar filtros; volver de detalle conserva filtros

### Requirement: Relaciones y tablero
La UI SHALL mostrar registros relacionados, crear tickets desde conversaciones, mover tickets por selector y representar el mismo estado en lista y tablero de etapas.

#### Scenario: Recorrido entre entidades
- **WHEN** se abre un contacto, conversación, canal, prompt o tool
- **THEN** se pueden consultar sus relaciones relevantes sin perder integridad ni simular funciones externas

#### Scenario: Cambio de etapa
- **WHEN** se guarda una etapa desde el detalle de un ticket
- **THEN** la lista y el tablero muestran la nueva ubicación; el fallo mantiene la etapa anterior

### Requirement: Diseño y accesibilidad
La UI SHALL seguir docs/DESIGN_SYSTEM.md, ofrecer temas claro/oscuro persistidos, teclado, foco, etiquetas y estados carga/error/guardando. SHALL adaptarse a 390, 768 y 1440 px sin desbordar la página; tablas/tablero pueden desplazarse localmente.

#### Scenario: Operación con teclado y móvil
- **WHEN** se opera login, formularios, confirmaciones y navegación con teclado o en ancho móvil
- **THEN** campos y acciones siguen accesibles, el foco es predecible y las confirmaciones regresan al origen

#### Scenario: Estado de integración
- **WHEN** se muestran canales, agentes, tools y mensajes
- **THEN** se indica configuración o registro manual, sin botones de envío ni ejecución inexistentes
