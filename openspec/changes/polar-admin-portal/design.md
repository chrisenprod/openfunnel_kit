## Context
Cuentas cloud usan una SQLite de control y otra por espacio. El dueño tiene UI de cuentas. No hay facturación previa; los precios existen en Polar. El usuario autoriza completar cobro y conteo, sustituyendo la decisión abierta del PRD.

## Goals / Non-Goals
**Goals:** flujo completo de suscripción mensual, créditos, UI cliente/dueño y documentación para cualquier instalación.
**Non-Goals:** revender LLM/Zernio, cobrar sobreconsumo, equipos, impuestos propios, prorrateos o transferencias de créditos. No publicar ni cobrar pruebas reales.

## Decisions
- `BILLING_ENABLED` opt-in cloud; `POLAR_TOKEN`, `POLAR_SERVER` production/sandbox, `POLAR_WEBHOOK_SECRET`. Sin secretos frontend. API HTTPS fija de Polar, versión 2026-04 fijada en Polar-Version y en el webhook, timeout y errores sanitizados; verificación Standard Webhooks con compatibilidad clave histórica.
- Tablas de control: planes versionados por edición optimista, suscripciones, órdenes/períodos, operaciones de crédito, checkouts, ofertas con créditos aceptados al contratar y bandeja de eventos. Ambiente separado en claves de registros; cambiar sandbox/production no mezcla saldos ni productos.
- `/api/admin/billing`: configuración/estado, catálogo paginado, guardar planes, cuentas y eventos/reintento. `/api/billing`: resumen, movimientos, checkout, portal. Sesión obligatoria; privilegio dueño para admin, nada de API keys.
- `/api/billing/polar/webhook` recibe bytes limitados, valida firma y persiste evento mínimo. Worker serial procesa eventos; obtiene estado vigente de suscripción por API, usa período de orden pagada y persiste una asignación por suscripción/período. Reembolso total revoca asignación de su orden, parcial conserva créditos. No guardar payloads con datos de tarjeta ni datos de facturación innecesarios.
- La compra usa external_customer_id igual al workspace autorizado. Checkout toma únicamente producto publicado; controles locales de simultaneidad y checkout existente pendiente. Portal externo para cancelar/pagos/facturas; desactivar cambios de plan y múltiples suscripciones en Polar para este lanzamiento. Upgrade requiere terminar suscripción actual.
- Control SQLite compartido reserva mediante BEGIN IMMEDIATE; operación única por workspace/run/ronda/tool. LLM con wrapper de reserva/commit/release; tools con wrapper equivalente. Se conserva referencia de operación, nunca prompt ni contenido privado. Al reiniciar se liberan reservas huérfanas. Las llamadas correctas previas a un error de otra operación permanecen consumidas.
- Mensual sin rollover; créditos iniciales conservan el cupo aceptado al contratar; las renovaciones toman el cupo configurado al pago. Vencimiento detiene nuevos consumos; cancelación programada conserva período pagado. Sin límites de recursos ni envíos manuales cobrados. Pruebas consumen llamadas y tools simuladas; validación consume dos llamadas y una tool de prueba.
- UI Facturación propia y administración con navegación simple Cuentas/Facturación. Precio + impuestos aplicables; solo productos precio fijo mensual con tax_behavior exclusive se habilitan.

## Risks / Trade-offs
- Sin webhook/credenciales reales no es posible certificar pago real: mostrar estado pendiente y documentar prueba sandbox.
- Ventana entre efectos y commit en dos SQLite: reserva central limita gasto; caída devuelve reserva incierta al cliente, no reintenta envíos externos automáticamente.
- API Polar caída: no crear checkout ni conceder saldo; eventos quedan pendientes y son visibles/reintentables. Catálogo local conserva última sincronización pero checkout revalida producto.
- Una instancia/worker por SQLite sigue siendo requisito.
