## ADDED Requirements
### Requirement: Exención explícita del dueño
El backend SHALL omitir suscripción y cuota exclusivamente para el superadmin activo y verificado cuando BILLING_OWNER_EXEMPT=true. La opción SHALL estar desactivada por defecto y no cancelar suscripciones existentes.
#### Scenario: Dueño sin plan
- **WHEN** el dueño ejecuta una llamada LLM o tool con exención habilitada
- **THEN** se permite y registra su consumo sin cobrar créditos
#### Scenario: Cliente o cuenta suspendida
- **WHEN** un cliente sin plan o un dueño suspendido intenta ejecutar IA
- **THEN** se rechaza sin invocar al proveedor
### Requirement: Historial y reversibilidad
El sistema SHALL registrar operaciones exentas reservadas, consumidas y liberadas, sin duplicar conteos al reintentar o cambiar el flag. SHALL mostrar acceso sin límite y uso acumulado en Facturación.
#### Scenario: Fallo y reinicio
- **WHEN** falla una operación o se reinicia con reservas pendientes
- **THEN** se libera la reserva y se conserva historial aislado por espacio y entorno
#### Scenario: Retirar exención
- **WHEN** se reinicia con BILLING_OWNER_EXEMPT=false
- **THEN** el dueño vuelve a necesitar un período pagado con saldo; el historial exento permanece visible
