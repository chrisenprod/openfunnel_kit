# Platform UI delta

## ADDED Requirements

### Requirement: Configuración agrupada de agentes IA
La UI SHALL presentar Agentes, Prompts y Tools como navegación interna del módulo Agentes IA. Prompts y Tools no SHALL aparecer en el sidebar. Consultar sus listados, detalles o formularios SHALL mantener Agentes IA como sección principal activa y conservar CRUD, asociaciones y enlaces directos.

#### Scenario: Entrar a un catálogo
- **WHEN** se abre Agentes IA y se selecciona Prompts o Tools
- **THEN** se puede consultar y administrar ese catálogo desde el módulo, también con el sidebar colapsado o el menú móvil

#### Scenario: Enlace directo y navegación protegida
- **WHEN** se abre un enlace directo a un prompt/tool o se cambia de apartado con cambios pendientes
- **THEN** se muestra el contexto Agentes IA y se conserva la confirmación antes de descartar cambios; volver al listado mantiene filtros
