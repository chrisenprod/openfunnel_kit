# Platform UI delta

## ADDED Requirements

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
