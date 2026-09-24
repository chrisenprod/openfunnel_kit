# Platform UI

## Purpose
Ofrecer una interfaz de operación y configuración coherente con Campo de tinta, con controles accesibles y estados fieles a la primera etapa.

## Requirements

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

### Requirement: Operación Kanban de pipelines
La UI SHALL abrir cada pipeline como tablero de tickets con columnas en el orden de sus etapas, incluyendo etapas vacías, conservando acceso a editar el pipeline. SHALL permitir mover tickets entre etapas del mismo pipeline mediante arrastre con ratón o interacción táctil y mediante selector operable por teclado. El tablero de Tickets SHALL ofrecer los mismos controles.

#### Scenario: Abrir pipeline
- **WHEN** se abre un pipeline desde su listado
- **THEN** se ven sus etapas, cantidades y tarjetas relacionadas; se puede abrir el detalle de un ticket y editar el pipeline

#### Scenario: Movimiento persistente
- **WHEN** se suelta una tarjeta sobre otra etapa o se elige esa etapa en su selector
- **THEN** se guarda el cambio, se actualizan ambas columnas y sus cantidades, y la nueva ubicación se conserva tras recargar sin cambiar el estado abierto/cerrado

#### Scenario: Fallo y reintento
- **WHEN** falla el guardado de un movimiento
- **THEN** se muestra el error, no se presenta el movimiento como guardado y se permite reintentar; no se envían movimientos simultáneos desde ese tablero

#### Scenario: Cancelación y movimiento redundante
- **WHEN** se pulsa Escape durante el arrastre, se suelta fuera del tablero o en la etapa original
- **THEN** no se realiza ninguna mutación

#### Scenario: Accesibilidad y táctil
- **WHEN** se usa teclado o una pantalla táctil
- **THEN** se puede mover un ticket, se anuncia el resultado y las columnas se desplazan dentro del tablero sin desbordar la página

### Requirement: Navegación compacta e identificable
La UI SHALL mostrar un icono por sección y permitir colapsar/expandir la navegación de escritorio, persistiendo la preferencia cuando el almacenamiento esté disponible. Los botones SHALL conservar nombre accesible, ayuda visual en modo compacto e indicación de sección activa. El menú móvil SHALL conservar etiquetas completas independientemente de esa preferencia.

#### Scenario: Colapsar y recargar
- **WHEN** se colapsa el sidebar y se recarga la aplicación
- **THEN** se conserva el modo compacto, el contenido usa el espacio liberado y se puede navegar o expandir con teclado

#### Scenario: Menú móvil y almacenamiento no disponible
- **WHEN** se usa la app en móvil o el navegador impide guardar preferencias
- **THEN** la navegación sigue operativa; el menú móvil muestra iconos y textos y retorna el foco al cerrarse

### Requirement: Densidad del tablero
La UI SHALL presentar tarjetas con espaciado compacto sin perder título, contacto, responsable, estado, selector ni arrastre. Los controles SHALL mantener áreas táctiles de al menos 44 px en dispositivos táctiles y la página no SHALL desbordarse horizontalmente.

#### Scenario: Tablero compacto
- **WHEN** se abre un pipeline o la vista por etapas de Tickets
- **THEN** se muestran tarjetas con 10 px de padding y 6 px entre contenidos; los movimientos y sus errores mantienen su comportamiento

### Requirement: Configuración agrupada de agentes IA
La UI SHALL presentar Agentes, Prompts y Tools como navegación interna del módulo Agentes IA. Prompts y Tools no SHALL aparecer en el sidebar. Consultar sus listados, detalles o formularios SHALL mantener Agentes IA como sección principal activa y conservar CRUD, asociaciones y enlaces directos.

#### Scenario: Entrar a un catálogo
- **WHEN** se abre Agentes IA y se selecciona Prompts o Tools
- **THEN** se puede consultar y administrar ese catálogo desde el módulo, también con el sidebar colapsado o el menú móvil

#### Scenario: Enlace directo y navegación protegida
- **WHEN** se abre un enlace directo a un prompt/tool o se cambia de apartado con cambios pendientes
- **THEN** se muestra el contexto Agentes IA y se conserva la confirmación antes de descartar cambios; volver al listado mantiene filtros
