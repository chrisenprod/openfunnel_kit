# Verificación: facturación y créditos

Fecha: 2026-09-25. Rama local: `dev/local-development`.
Cambio: `openspec/changes/polar-admin-portal`.

## Implementado

- Administración → Facturación: sincronización de productos de Polar, créditos y
  publicación con versión optimista, cuentas/saldos y eventos fallidos reintentables.
- Facturación del cliente: planes, checkout, saldo, período, reservas, historial y
  portal Polar para pagos, cancelación y comprobantes.
- API restringida por sesión/rol; claves API no conceden acceso a facturación.
- Firma Standard Webhooks e histórica, timestamp, cuerpo acotado, persistencia antes
  de respuesta y worker con reintentos. Duplicados y período único sin doble crédito.
- Cancelación, vencimiento, reembolso total/parcial y procesamiento fuera de orden.
- Crédito inicial conserva oferta aceptada al contratar; renovación toma cupo
  configurado. No rollover ni sobreconsumo. Precios vienen de Polar.
- Reserva atómica por operación en SQLite de control, commit al éxito y devolución
  al fallo. Contado en LLM, tools del worker, Probar y validación. Reinicio libera
  reservas interrumpidas; reintento técnico del mismo paso no duplica débito.
- Migraciones 008/009 aditivas. Variables y docs públicas; facturación opt-in.

## Evidencia

- `npm test`: 101/101, incluidos contratos de facturación, endpoints con dueño y
  cliente, aislamiento, firmas y ejecución del worker con último crédito.
- Pruebas dirigidas posteriores: 11/11 para facturación/docs y 17/17 para API de facturación y cuentas cloud.
- `npm run build`: correcto; documentación pública de 13 páginas.
- `npm run spec:validate`: 19/19.
- `npm run test:docker`: correcto en proyecto y volumen sintéticos, incluyendo
  modos self-hosted/cloud; claves Polar vacías y cobros desactivados para QA.
- Chrome con APIs simuladas: guardado, conflicto que conserva borrador, teclado,
  visibilidad por rol, planes y saldo. Anchos 320/390/1440, temas claro/oscuro,
  sin desbordamiento de página. Las tablas permiten desplazamiento horizontal.
- Consulta real de solo lectura del catálogo: token válido, Starter USD25 y Pro
  USD50 mensuales presentes. No se creó checkout real ni se modificaron productos.

## Límites externos y puesta en marcha

No se ha realizado una compra sandbox/real. La preparación productiva tiene
`BILLING_ENABLED=true`, token y secreto de webhook configurados. Las consultas
reales de catálogo, clientes y suscripciones responden correctamente; el token
no tiene permiso para inspeccionar la configuración de endpoints. Las simulaciones
no acreditan una entrega pública real de Polar ni un pago completado.

Antes de cobrar: configurar webhook Raw con order.paid, order.refunded y
subscription.updated; sincronizar catálogo y asignar cupos (Starter acordado:
20.000; Pro se configura en el portal); desactivar cambios de producto y múltiples
suscripciones en Polar; verificar sandbox; publicar y activar explícitamente
BILLING_ENABLED. La cantidad comercial de créditos Pro aún requiere decisión del dueño.

Los cambios de plan con prorrateo no están incluidos: terminar la suscripción
actual antes de contratar otra. Las conversaciones pausadas por falta de saldo
se retoman explícitamente después de renovar, conservando control humano.
