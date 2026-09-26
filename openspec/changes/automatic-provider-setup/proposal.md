## Why
Guardar las credenciales deja pasos técnicos ocultos que bloquean activar un canal: validar el modelo y registrar el webhook.
## What Changes
- Guardar IA valida texto y tool calling automáticamente; guardar Zernio registra su webhook automáticamente.
- Mostrar estado real, error persistente y reintento sin reintroducir claves ni volver a guardarlas.
- Conservar requisitos de pago, aislamiento y activación explícita de canales.
## Capabilities
### New Capabilities
- `automatic-provider-setup`: preparación automática y recuperable al guardar proveedores.
## Impact
Backend de conexiones e integraciones, UI, pruebas y documentación. Sin migración nueva ni dependencia.
