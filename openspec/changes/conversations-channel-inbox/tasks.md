# Tasks

## 1. Selector de bandeja

- [x] 1.1 Añadir selección Todos/un canal en listado y detalle, incluidos canales inactivos, con componente controlado de la app y estados de carga/error; comprobar que los formularios mantienen sus restricciones de asignación.
- [x] 1.2 Conservar consulta al abrir, recargar y volver del detalle; cambiar canal reinicia página y respeta cambios pendientes. Verificar navegación y resultados filtrados.

- [x] 1.3 Reutilizar AppSelect en selectores cerrados y referencias; verificar búsqueda, flechas, Enter, Escape, Tab, validación y opciones deshabilitadas.
- [x] 1.4 Compactar la app y añadir iconos de canal/contexto; comprobar tipo de canal en API, contraste y áreas táctiles.

## 2. Verificación y documentación

- [x] 2.1 Documentar el selector en PRD y sistema de diseño; comprobar escritorio/móvil, teclado, vacío, error y selección individual/unificada, sin modificar datos reales.
- [x] 2.2 Ejecutar spec:validate, build y pruebas; comprobar GET /api/conversations con todos, un canal y filtros combinados y registrar evidencia de resultados.


## Evidencia de verificación — 2026-09-24

- `npm run build`: compilación correcta. `npm run spec:validate`: 10 elementos válidos.
- `npm test`: 26 pruebas correctas, incluida bandeja con canales cuyos nombres no coinciden con su plataforma, paginación, filtros combinados y canal inactivo.
- Chromium local: selector controlado, búsqueda sin coincidencias, flechas/Enter, Escape, Tab, clic fuera, selección individual/unificada, reinicio de página, consulta conservada en detalle/recarga/regreso y navegación entre módulos.
- Revisión visual a 1440, 768 y 390 px en claro/oscuro; popup dentro del viewport, controles móviles de 44 px y tablas desplazables sin comprimir nombres a una letra por línea.
- API local autenticada: filtrado individual y `channel_kind` corresponden a los canales reales. Sin mutaciones de negocio ni envíos en las comprobaciones.
- Respuestas simuladas solo en navegador para errores de opciones/listado y reintentos, canal inactivo y su icono WhatsApp; se comprobó que puede filtrarse, pero no asignarse desde un formulario nuevo. No se presenta esa simulación como verificación de una conexión WhatsApp real.
- Formulario: conserva cambios al cancelar navegación, descarta solo con confirmación y valida referencias obligatorias. El usuario administrador y datos importados permanecen intactos.
