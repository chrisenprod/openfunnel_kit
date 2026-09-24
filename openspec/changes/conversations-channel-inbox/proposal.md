# Proposal

## Why

La bandeja ya reúne conversaciones de distintos canales, pero su filtro genérico no comunica claramente la elección entre todos los canales y una cuenta individual. La selección debe estar disponible al consultar el historial y conservarse al navegar.

## What Changes

- Destacar un selector de bandeja con «Todos los canales» y cada canal individual en Conversaciones y sobre el detalle.
- Incluir canales inactivos para consultar su historial, sin cambiar las restricciones de asignación de los formularios.
- Conservar canal, búsqueda y filtros en la URL al abrir una conversación, recargar y volver; cambiar de canal reinicia la página.
- Reutilizar el filtro y la paginación existentes de la API; no modificar mensajes, cuentas ni automatizaciones.
- Alcance: todos los canales o un canal individual. Quedan fuera selecciones de subconjuntos múltiples, nuevas integraciones y cambios al envío. No hay decisiones bloqueantes.

- Sustituir selectores cerrados nativos por un componente React controlado con búsqueda, teclado, foco y estados accesibles. El modelo conserva entrada libre.
- Compactar espaciado global y añadir iconos de plataforma y contexto sin perder etiquetas ni áreas táctiles.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `platform-ui`: selección explícita de bandeja unificada o individual y navegación con contexto de canal.

## Impact

Frontend React (`records.jsx`, `components.jsx`, `main.jsx`, `style.css`), documentación de producto y verificación del filtro existente. Sin dependencias ni migraciones. La representación local de conversaciones añade `channel_kind` para mostrar el icono correcto sin deducirlo del nombre.
