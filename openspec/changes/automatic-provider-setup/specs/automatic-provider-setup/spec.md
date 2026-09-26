## ADDED Requirements
### Requirement: Preparar proveedores al guardar
El servidor SHALL validar el modelo al guardar IA y registrar el webhook al guardar Zernio, usando credenciales cifradas del espacio. SHALL conservar activación explícita del canal y límites de facturación.
#### Scenario: Guardado correcto
- **WHEN** el usuario guarda una conexión válida
- **THEN** su preparación se ejecuta automáticamente y se informa ready solo tras éxito real
#### Scenario: Fallo externo
- **WHEN** la preparación falla por credenciales, red, cuota o configuración
- **THEN** las credenciales quedan guardadas y la UI informa fallo y reintento sin mostrar secretos
### Requirement: Recuperación e independencia
El sistema SHALL permitir reintentar con sesión y versión vigente sin volver a guardar secretos. SHALL evitar preparaciones concurrentes del mismo proveedor y no invalidar la preparación del otro proveedor.
#### Scenario: Reintento listo o pendiente
- **WHEN** se reintenta una conexión ya lista o pendiente
- **THEN** la lista no hace llamadas nuevas y la pendiente intenta completar el paso sin rotar la versión
#### Scenario: Cambio de proveedor
- **WHEN** se cambia Zernio o IA
- **THEN** se conserva la validación del otro proveedor y se rechazan resultados obsoletos de la conexión cambiada
