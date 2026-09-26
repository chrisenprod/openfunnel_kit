# Exención opcional del dueño

Verificado el 2026-09-26. [PR #11](https://github.com/chrisenprod/openfunnel_kit/pull/11),
release `2fa15849abde263c8dc92e4205f23d1bd13597bf`.

- 111 tests aprobados, build y 21 validaciones OpenSpec. CI de main:
  [36213223813](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36213223813).
- Pruebas sintéticas: dueño verificado/activo, cliente, suspensión, flag desactivado,
  cuotas, exención con saldo agotado, reserva concurrente, reintento, fallo, recuperación,
  aislamiento por espacio/entorno y cambio de flag sin duplicar consumo.
- Validación del modelo sin plan con cliente simulado: dos llamadas LLM y una tool,
  tres usos exentos persistidos, cero operaciones pagadas o suscripciones creadas.
- UI con API simulada en Chrome: saldo sin límite, historial exento, administración,
  cliente sin exención y portal de suscripción existente, 390/1440 px y ambos temas.

## Producción

La migración 010 crea únicamente `billing_exempt_operations`; las nueve migraciones
anteriores y el migrador permanecen iguales. El control de despliegue automático
rechazó inicialmente el cambio de esquema, como corresponde. La publicación manual
revisó esa única adición por hash, comprobó CI/main y conservó el respaldo de datos,
el entorno privado previo y recuperación de código. El procedimiento general de
publicación no se modificó ni se desactivó su revisión de migraciones.

La publicación finalizó con exit 0 y contenedores saludables. Verificación productiva
solo de lectura: `BILLING_ENABLED=true`, `BILLING_OWNER_EXEMPT=true`, dueño activo con
correo verificado y tabla/migración aplicadas. Agente y asignación de canal existentes
preservados con IA desactivada. HTTPS de salud y documentación pública correctos.
No se ejecutaron validaciones con proveedores reales ni se enviaron mensajes.

La exención no cancela suscripciones existentes y no elimina los cargos del proveedor.
El usuario puede comprobar ahora su conexión y decidir cuándo activar la IA del canal.
