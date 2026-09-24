# Platform UI delta

## ADDED Requirements

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
