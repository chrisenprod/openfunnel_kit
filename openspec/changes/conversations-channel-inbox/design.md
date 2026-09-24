# Design

## Context

`ResourceList` usa `channel_id` y la API ya filtra antes de contar/paginar. `ReferenceSelect` está orientado a asignaciones: su opción vacía dice «Seleccionar» y oculta inactivos. `ConversationPanel` no tiene selector y se oculta bajo 1200 px. El contexto de regreso está en una referencia React que se pierde al recargar. Ver motivación en proposal.md.

## Goals / Non-Goals

**Goals:** reutilizar consultas y controles React, distinguir filtro de asignación y conservar el contexto en enlaces de conversación.

**Non-Goals:** cambiar auth, tablas, proveedores, orden del historial, entrega o ejecución de IA. No descargar todas las conversaciones para filtrarlas en memoria.

## Decisions

- Crear un pequeño control de bandeja reutilizado en listado y detalle. Usar un selector React controlado con popup propio, búsqueda y opciones con iconos; evita el picker del navegador y funciona con cuentas numerosas.
- Añadir opciones explícitas a `ReferenceSelect` para etiqueta vacía e inclusión de inactivos; sus valores predeterminados mantienen formularios existentes.
- Destacar el selector antes de filtros secundarios y eliminar el filtro Canal duplicado. En detalle, ubicar el control fuera del panel que se oculta en móvil.
- Reutilizar `channel_id` y `GET /api/conversations`; omitirlo representa todos. Cambiar el canal elimina `page`, preserva los demás filtros y navega al listado, sujeto a `canLeave`.
- Transportar la consulta del listado en los enlaces de detalle de conversaciones, usando esa consulta como origen del panel y del enlace de regreso. Evitar localStorage para datos de cuentas.
- Mantener abortos y reintentos de los componentes existentes. El catálogo se obtiene con `allRecords`, que recorre sus páginas.

- Compartir `AppSelect` entre referencias, filtros, campos enumerados, asociaciones, Kanban y conexión. Portal fijo que se adapta al viewport, opciones listbox, búsqueda, flechas/Enter/Escape/Tab, restauración de foco y validación obligatoria. Mantener entrada libre del modelo.
- Añadir SVG locales para Instagram, WhatsApp, correo, bandeja y burbujas; los iconos acompañan texto. Serializar `channel_kind` desde el canal local en conversaciones, sin exponer el JSON remoto.
- Densidad: contenido 20/24 px, secciones 16–24 px, controles de 36 px y filas de unos 40 px en escritorio; controles de al menos 44 px bajo 768 px o puntero táctil. Mensajes a 16 px.

## Risks / Trade-offs

- [Habilitar inactivos al asignar por accidente] → inclusión optativa solamente en el selector de bandeja.
- [Perder filtros tras recargar detalle] → consulta en URL y verificación del recorrido completo.
- [Nombres largos en móvil] → ancho limitado al contenedor y controles al 100 %.
- [Canal eliminado presente en enlace antiguo] → conservar y señalar opción no disponible hasta elegir otro, sin aparentar «Todos».

## Migration Plan

Publicar la compilación habitual del frontend. No hay migración de datos. Revertir los cambios de interfaz restaura la presentación anterior; `channel_id` sigue siendo compatible.
