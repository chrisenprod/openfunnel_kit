# Spec Delta

## ADDED Requirements

### Requirement: Bandeja unificada y por canal
La sección Conversaciones SHALL ofrecer un selector visible de bandeja con «Todos los canales» como opción predeterminada y cada canal individual por nombre, incluidos los inactivos. SHALL aplicar el canal junto con la búsqueda, los filtros y la paginación del servidor. El selector SHALL estar disponible en el listado y al consultar una conversación, con teclado y en móvil.

#### Scenario: Todos los canales o una cuenta
- **WHEN** se abre Conversaciones sin canal seleccionado o se elige «Todos los canales»
- **THEN** la bandeja reúne conversaciones de todos los canales que cumplen los demás filtros y muestra su canal de origen

#### Scenario: Selección individual e historial
- **WHEN** se selecciona un canal, incluido uno inactivo
- **THEN** solo aparecen sus conversaciones, se conserva la búsqueda y los demás filtros, y la paginación comienza en la primera página

#### Scenario: Abrir, recargar y volver
- **WHEN** se abre una conversación desde la bandeja filtrada, se recarga o se vuelve al listado
- **THEN** se mantienen canal, búsqueda, filtros y página mediante la URL; la bandeja lateral usa la misma selección

#### Scenario: Cambiar de canal desde el detalle
- **WHEN** se cambia de canal mientras se consulta una conversación
- **THEN** se abre el listado del canal elegido sin mantener un detalle ajeno a la nueva selección y se respeta la protección de cambios pendientes

#### Scenario: Sin resultados y errores
- **WHEN** un canal no tiene resultados o falla la carga de opciones o conversaciones
- **THEN** se distingue ausencia de resultados de un fallo; se permite cambiar o limpiar filtros, y los errores ofrecen reintento sin presentar otro canal como seleccionado

#### Scenario: Selección accesible
- **WHEN** se usa teclado o una pantalla de 390 px
- **THEN** la selección tiene etiqueta y foco visibles y no provoca desbordamiento horizontal de la página


### Requirement: Selectores propios de la aplicación
La UI SHALL usar selectores controlados con presentación propia para opciones cerradas y referencias, incluida la bandeja. SHALL mostrar el valor seleccionado, búsqueda, selección con teclado, opciones deshabilitadas, error y carga. La entrada libre de modelos SHALL seguir disponible.

#### Scenario: Búsqueda y teclado
- **WHEN** se abre un selector y se busca, se pulsan flechas y Enter, Escape o Tab
- **THEN** se filtran las opciones, se confirma solo una opción habilitada con Enter, Escape cierra sin cambios y devuelve foco, y Tab permite continuar el formulario sin quedar atrapado

#### Scenario: Opciones y formularios
- **WHEN** falta un valor obligatorio o una opción está inactiva para asignación
- **THEN** se indica el error y se enfoca el control; las opciones inactivas no se pueden asignar, pero sí consultar en el filtro de bandeja

### Requirement: Interfaz compacta e iconos de contexto
La UI SHALL reducir padding y separación global de navegación, encabezados, filtros, tablas, formularios y detalles. SHALL conservar texto legible, foco y controles táctiles de al menos 44 px. Los canales Instagram y WhatsApp SHALL mostrar iconos reconocibles junto al texto; conversaciones y acciones principales SHALL usar iconos de contexto sin sustituir las etiquetas.

#### Scenario: Densidad y dispositivos
- **WHEN** se recorren listados y detalles en escritorio o móvil y en ambos temas
- **THEN** los controles y registros presentan espaciado compacto, la página no desborda y las acciones mantienen nombre accesible

#### Scenario: Plataforma de origen
- **WHEN** se muestran canales o conversaciones en la lista, el selector o el detalle
- **THEN** el icono corresponde al tipo del canal almacenado y no se deduce del nombre visible; todos los canales tiene icono de bandeja
