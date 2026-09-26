## Why
El dueño cloud necesita validar y operar sus agentes sin comprarse una suscripción, conservando el registro de consumo y los límites de clientes.
## What Changes
- BILLING_OWNER_EXEMPT opt-in, false por defecto, exime al superadmin activo y verificado.
- Registro de operaciones exentas y presentación explícita sin límite ni créditos cobrados.
- Configuración documentada, pruebas y activación en producción.
## Capabilities
### New Capabilities
- `owner-billing-exemption`: exención del dueño con consumo auditable.
## Impact
Backend de facturación, UI, entorno y migración SQL aditiva para operaciones exentas. Publicación con respaldo y revisión de migración.
