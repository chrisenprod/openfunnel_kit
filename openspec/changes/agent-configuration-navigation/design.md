# Design

## Context
Los catálogos ya tienen CRUD y asociaciones desde el editor de agentes. El sidebar se deriva de resourceEntries y todas las rutas usan el hash del recurso.

## Goals / Non-Goals
**Goals:** una única entrada Agentes IA y navegación interna a ambos catálogos.
**Non-Goals:** cambiar propiedad de datos, esquema, endpoints o permisos.

## Decisions
- Añadir navigationParent a prompts/tools y excluirlos de resourceEntries. Mantener group para el contexto de configuración.
- Resolver la entrada activa del sidebar con navigationParent. Renderizar navegación local Agentes/Prompts/Tools en listados, detalles y formularios del módulo.
- Conservar rutas existentes para no romper enlaces ni asociaciones; la jerarquía visual no requiere migrar URLs.
- Reutilizar navigate y listRoutes para confirmaciones de cambios pendientes y filtros. Controles de navegación con nombre, foco y aria-current, sin simular un widget tablist que exigiría otro patrón de teclado.

## Risks / Trade-offs
La URL continúa usando el nombre del catálogo; la navegación visible comunica el módulo padre. Los catálogos siguen compartidos por varios agentes, evitando duplicación de instrucciones y herramientas.
