## Purpose
Permitir a cualquier operador de OpenFunnel comercializar suscripciones de Polar con créditos por uso, conservando aislamiento, trazabilidad y autohospedado sin cobros.

## ADDED Requirements
### Requirement: Catálogo configurable y privado
El sistema SHALL permitir solo al superadmin sincronizar productos mensuales de precio fijo desde su cuenta Polar y asignar créditos positivos y visibilidad. SHALL mostrar nombre, precio y moneda del proveedor, sin secretos. SHALL detectar ediciones concurrentes y conservar planes históricos. Los cambios de créditos SHALL aplicarse a nuevos períodos, no alterar saldos ya otorgados.
#### Scenario: Cliente intenta configurar precios
- **WHEN** un cliente o API key accede a administración
- **THEN** el servidor rechaza la operación sin consultar Polar
#### Scenario: Producto inválido o proveedor caído
- **WHEN** un producto archivado/no mensual es seleccionado o falla Polar
- **THEN** no se publica un checkout inválido y la UI explica el error sin revelar respuesta remota

### Requirement: Checkout y portal vinculados
El sistema SHALL crear checkout solo para un plan publicado desde sesión verificada y vincularlo al espacio desde backend. SHALL impedir una segunda suscripción abierta y reutilizar checkout vigente. SHALL crear sesiones de portal solamente para el cliente correspondiente. El retorno del checkout no SHALL conceder créditos.
#### Scenario: Manipulación del comprador
- **WHEN** un cliente envía un espacio, precio o identificador de cliente ajeno
- **THEN** el servidor rechaza los campos y no altera identidad ni precio

### Requirement: Confirmación de pago persistente
El sistema SHALL verificar firma y antigüedad del webhook sobre el cuerpo original, persistir entregas y procesarlas con reintentos acotados. SHALL conceder créditos una vez por período pagado, sin acumulación, e ignorar duplicados y eventos anteriores que contradigan estado más reciente. SHALL mantener acceso hasta fin del período pagado en cancelación programada, bloquear nuevos consumos tras vencimiento/revocación o reembolso total y no conceder créditos por pago fallido. SHALL mostrar eventos fallidos al dueño y permitir reintentarlos.
#### Scenario: Duplicados y renovación
- **WHEN** Polar reenvía una orden pagada o entrega otra orden del mismo período
- **THEN** no duplica créditos; un nuevo período pagado obtiene su asignación independiente
#### Scenario: Webhook falso
- **WHEN** falta firma o es inválida o antigua
- **THEN** no se persiste ni concede saldo

### Requirement: Créditos atómicos por ejecución
El sistema SHALL reservar un crédito antes de cada llamada al modelo y herramienta ejecutada, incluso en pruebas y validaciones, confirmar consumo al éxito y liberar reservas al error. SHALL usar claves estables para reintentos de un run y no duplicar cargos. SHALL recuperar reservas interrumpidas al reiniciar sin convertirlas en cobros. SHALL impedir saldo negativo y bloquear operaciones sin período vigente o saldo, preservando lectura y gestión manual de recursos.
#### Scenario: Competencia por el último crédito
- **WHEN** dos ejecuciones solicitan el último crédito simultáneamente
- **THEN** solo una reserva puede ejecutarse y la otra recibe saldo insuficiente
#### Scenario: Fallo y reintento
- **WHEN** falla una llamada y luego se reintenta, o se reejecuta una operación ya cobrada del mismo run
- **THEN** la fallida no consume saldo y el reintento técnico no cobra dos veces

### Requirement: Interfaz y modo opcional
El sistema SHALL mostrar al cliente saldo disponible, reservado, consumido, fin del período, historial paginado y gestión de suscripción. SHALL mostrar estados de carga, error y vacío y ser utilizable en móvil y teclado. El operador SHALL habilitar facturación mediante entorno explícito; sin habilitarla el núcleo no exige suscripción y las llamadas no generan cargos OpenFunnel.
#### Scenario: Instalación libre
- **WHEN** la facturación está desactivada
- **THEN** los agentes funcionan sin Polar ni saldo obligatorio
