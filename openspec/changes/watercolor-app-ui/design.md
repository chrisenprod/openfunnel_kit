# Design
## Context
La app utiliza estilos compartidos y formularios por recurso; la conversación muestra una ficha completa y varias secciones antes del historial. Existen cambios locales de agentes, conocimiento, claves API y pruebas que deben conservarse. Ver proposal.md.

## Goals / Non-Goals
**Goals:** aplicar el blend aprobado a todo el frontend, conservar la lectura y teclado, despejar la conversación.
**Non-Goals:** replicar todos los mockups, añadir paneles CRUD nuevos en todos los recursos, alterar APIs/datos, activar IA o desplegar.

## Decisions
- Editar los estilos compartidos y tokens existentes; añadir únicamente reglas necesarias para decoración y reorganización. Evitar un framework o duplicar todos los componentes.
- Usar un WebP de pigmento azul con transparencia real, localizado en márgenes y navegación. La textura previa enmascarada resultó casi invisible. El recurso conserva su régimen en landing/LICENSE; el CSS sigue Apache-2.0.
- Separar papel de trabajo, navegación y superficies secundarias. Borde de input conserva contraste suficiente y foco explícito; contenedores y tablas emplean líneas más suaves.
- Claves API muestra primero sus registros o vacío; Crear abre un panel lateral no modal con foco inicial y retorno al cerrar. El borrador y el secreto visible impiden abandonar sin confirmación. La ficha del agente usa una sola fila Instrucciones/Herramientas/Contexto/Probar, según el refinamiento de agent-workbench. La prueba conserva su estado al cambiar de sección. Editar agente contiene solo información general. Agregar el estado sucio de edición y prueba sin que desmontar uno borre la protección del otro. Los filtros secundarios se despliegan a demanda.
- Detalles de conversación se pliegan con un control semántico que conserva acceso a relaciones y ticket. El historial queda entre estado/control y compositor, sin cambiar contratos de envío, request_id ni revisión de entregas inciertas.
- Mantener errores, advertencias de conexión y entregas inciertas visibles. Solo información técnica secundaria se pliega.
- Preservar temas claro/oscuro, navegación compacta y móvil. Decoración no interactiva, sin animación y ausente en alto contraste.
- Las vistas de conocimiento/prueba usan su comportamiento actual y reciben los mismos tokens visuales.

## Vistas operativas
- Conversaciones utiliza un único contenedor de bandeja en listado y detalle. En escritorio, lista de 310 px junto al hilo; en móvil se muestra lista o hilo con vuelta explícita. Los filtros y la paginación viven en la URL. Historial con scroll propio, compositor al pie y metadatos desplegables. No inventar previews ni contadores no disponibles en la API.
- El canal tiene identidad y acceso a su bandeja en cabecera, respuestas IA y agente como contenido principal, conversaciones recientes y ajustes secundarios. El agente guardado se lee sin un select permanente; Cambiar abre la edición, cuyo borrador protege la navegación. Activar/desactivar sigue siendo una acción explícita separada de guardar agente.
- Las demás fichas omiten la repetición del nombre y priorizan notas/contenido o relaciones; los metadatos forman una columna secundaria. Eliminar se conserva dentro de un menú de acciones. Las herramientas mantienen su esquema accesible como detalle técnico.

## Risks / Trade-offs
- Reorganizar un compositor podría perder borradores → conservar instancia/estado React y verificar recarga de datos y cambio de modo sin enviar.
- La textura puede disminuir legibilidad → limitarla a pseudo-elementos decorativos, lejos de datos y con opacidad reducida; revisar ambos temas.
- Archivos ya modificados → parches sobre contenido actual y sin revertir cambios ajenos.
- La maqueta sugiere más variantes que este cambio → documentar el alcance concreto y comprobar pantallas reales en escritorio/móvil.

## Migration Plan
Sin migraciones ni despliegue. Validar y dejar cambios locales revisables; una reversión afecta únicamente presentación y estructura visual.
