## Context
Las operaciones cobrables exigen un período pagado por FK no nula. No representar al dueño como una suscripción Polar ficticia.
## Goals / Non-Goals
Eximir al dueño, registrar consumo real, conservar autorización, aislamiento e idempotencia. No eximir clientes, cancelar suscripciones existentes ni activar canales automáticamente.
## Decisions
BILLING_OWNER_EXEMPT=false por defecto. Solo rol superadmin activo y correo verificado del espacio, consultados del servidor. La suspensión sigue bloqueando. BILLING_ENABLED=false conserva su comportamiento actual.
Tabla aditiva billing_exempt_operations con entorno, espacio, clave de operación, tipo, origen y estados reserved/consumed/released. Mismo ciclo de reserva/fallo/reinicio; consultar ambas tablas evita contar otra vez una operación previamente completada al cambiar la exención. Historial unificado con indicador exempt y créditos cobrados cero. Resumen owner_exempt y exempt_usage acumulado; saldo ilimitado no es un número artificial. Rechazar nuevo checkout exento y conservar acceso al portal si ya había suscripción, sin cancelarla automáticamente.
Entorno Docker con DOCKER_BILLING_OWNER_EXEMPT. Activar true en entornos privados solicitados; ejemplos false. Migración nueva, nunca editar aplicada. Publicación manual revisada si el workflow bloquea migraciones, conservando respaldo y única API.
## Risks / Trade-offs
Una tabla separada conserva el ledger pagado intacto y permite rollback de código. Exención no evita cargos del proveedor. Cambios de flag requieren reinicio; retirarla restaura exigencia de período pagado.
