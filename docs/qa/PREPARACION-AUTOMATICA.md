# Preparación automática de proveedores

Verificado el 2026-09-26. [PR #12](https://github.com/chrisenprod/openfunnel_kit/pull/12).
Release final `b09c51f73561dcd96d8a8cd9d284c6085a9bc83b` incluye bloqueo compartido
entre comprobaciones manuales y automáticas.

- 116 tests aprobados, build y 22 validaciones OpenSpec.
- HTTP local con proveedores simulados: guardado prepara modelo/webhook; fallos
  conservan ciphertext y error seguro; reintento no cambia versión ni cifra otra vez;
  cuota impide llamadas; Origin/Bearer protegidos; validaciones concurrentes rechazadas.
- Cambiar un proveedor conserva la preparación del otro; IA conserva verificación
  del inbox, y la configuración no activa respuestas del canal.
- Chrome con API/SQLite temporales: guardado, progreso, error tras recarga,
  reintento sin credenciales nuevas, cero llamadas al recargar, 390/1440 px y ambos temas.
- [CI final](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36214357261)
  y [Publicar VPS](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36214447688)
  finalizaron correctamente. La ejecución del commit anterior quedó obsoleta al
  incorporarse el bloqueo compartido y fue reemplazada por esta publicación.
- HTTPS de salud, documentación y bundle confirmados. Consulta productiva con SQLite
  de solo lectura y transportes que rechazan llamadas: ambas conexiones del dueño
  configuradas y listas, agente existente preservado. No se ejecutó preparación,
  validación real, activación ni envío de mensajes durante esta comprobación.

No hay nuevas migraciones ni dependencias. El contrato público está en
[cuentas y conexiones](../site/cuentas.md#preparación-automática-y-reintentos).
