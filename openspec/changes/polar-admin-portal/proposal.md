## Why
OpenFunnel necesita administrar los productos creados en Polar y completar la contratación cloud con créditos, sin imponer los precios de una instancia a quienes despliegan el núcleo abierto.

## What Changes
- Administración de productos y créditos, suscripciones y eventos de cobro exclusiva del dueño.
- Facturación del cliente: planes, checkout, portal Polar, saldo y movimientos.
- Webhooks firmados persistentes, renovaciones idempotentes, cancelación y reembolso.
- Un crédito por llamada al modelo y ejecución de herramienta; reserva atómica, devolución por error y control de saldo en worker, pruebas y validaciones.
- Facturación opcional mediante entorno; sin límites de agentes, contactos o canales. Proveedores pagados por el cliente.
- Decisiones: mensual, sin acumulación de créditos, sin sobreconsumo de pago ni prueba gratuita. Cambio de plan al finalizar/cancelar la suscripción actual en esta primera entrega; evitar prorrateos ambiguos.
- Los créditos Pro se configuran desde el portal; no dependen de resolver ahora su cifra comercial. Despliegue y compra real no forman parte de la verificación sintética.

## Capabilities
### New Capabilities
- `cloud-billing`: catálogo configurable, contratación y administración de suscripciones con créditos aislados por espacio.
### Modified Capabilities
Ninguna; amplía las cuentas cloud en curso.

## Impact
Backend cloud, ejecución LLM/tools, SQLite, UI de administración y facturación, API oficial Polar y Standard Webhooks, entorno, Docker, docs públicas y pruebas. No modifica proveedores remotos ni activa cobros por guardar planes.
