# UI moderna con acentos de acuarela

Fecha: 2026-09-24. Cambio: `watercolor-app-ui`. Rama: `dev/local-development`.
Estado: implementado y verificado en local; el usuario aprobó la publicación conjunta en main.

## Corrección después del rechazo visual

La primera entrega pasó comprobaciones técnicas, pero no resolvió la estructura ni
la fidelidad visual solicitadas. Esas comprobaciones no constituían aceptación de diseño.
Esta revisión cambia componentes y distribución, además de los estilos:

- Claves API abre con listado o vacío, sin inputs. Crear abre un panel lateral con
  nombre, vigencia y permisos verticales. Incluye cancelación, retorno de foco y
  presentación del secreto una sola vez.
- El agente muestra una sola fila Instrucciones/Herramientas/Contexto/Probar, con
  prueba conservada al cambiar de sección y edición de información bajo demanda.
  Se conserva la protección independiente de los borradores.
- Los listados agrupan filtros secundarios bajo «Filtros». Los recursos sin filtros
  no muestran ese control. Búsqueda y selección de canal permanecen visibles.
- Campos, botones, tablas, tipografía y navegación comparten estilos actualizados.
  Se elimina el contorno de foco incorrecto del título, conservándolo en controles.
- Un nuevo WebP transparente aporta pigmento azul reconocible a márgenes y selección
  de navegación. La decoración no captura eventos y desaparece en alto contraste.
- Se conserva el historial antes del compositor y la presentación plegable de datos
  de conversación. La selección lateral compara IDs de ruta y registro como cadenas.

No se alteraron APIs, migraciones, credenciales ni activaciones de canales. No se
publicó ni se hizo push. Los formularios generales de crear/editar mantienen rutas
propias; el panel lateral implementado corresponde a Claves API.

## Verificación de esta revisión

- `npm run build`: correcto.
- `npm run spec:validate`: 17 elementos válidos, sin fallos.
- `git diff --check`: correcto.
- Datos locales, solo lectura: 18 vistas, 108 combinaciones de 390/768/1440 px y
  claro/oscuro; sin desbordes ni errores JavaScript. Ninguna escritura de negocio.
- API simulada: 21 vistas y tres secciones adicionales del agente, 144 combinaciones
  de ancho y tema; sin desbordes ni errores JavaScript.
- Panel de claves abierto: seis combinaciones de ancho y tema, sin desbordes.
- Claves: cero campos al entrar; foco inicial; Escape y cancelación conservan el
  borrador si no se confirma; descarte devuelve foco; error conserva el nombre;
  éxito muestra secreto; cancelar su cierre lo conserva; ocultarlo lo elimina del DOM.
- Agente: cambiar de sección conserva el mensaje; cancelar descarte conserva la
  configuración; descartar configuración conserva la prueba; salir sigue protegido;
  una respuesta simulada y su historial permanecen al cambiar secciones.
- Teclado: filtros, selectores, detalles, navegación móvil y retorno de foco.
- Conversación: borrador durante polling y error simulado; control IA/manual,
  entrega incierta visible y registro manual, con todas las mutaciones interceptadas.
- Inspección de capturas de Claves API vacío/listado/creación, agente, formularios,
  conversación y temas, incluyendo móvil. Se corrigieron el cierre inmediato del
  diálogo al pulsar Escape y un error de referencia en listas relacionadas antes
  de repetir la verificación.

Las escrituras de los recorridos simulados no llegaron al backend ni a proveedores.
La respuesta del agente en las capturas es ficticia: no prueba Azure ni mensajería real.

## Evidencia local

En `docs/referencias-visuales/ui-acuarela-implementacion/`, ignorado por Git:

- `revision-keys-empty.png`, `revision-keys-list.png`, `revision-keys-create.png`.
- `revision-keys-mobile-light.png`, `revision-keys-mobile-dark.png`.
- `revision-agent.png`, `revision-agent-mobile.png`.
- `fixture-report.json`, `revision-interaction-report.json` y el reporte de lectura.

Las capturas `revision-*` y `fixture-*` muestran la app renderizada con datos ficticios.
Las capturas del recorrido de lectura pueden incluir datos locales y no se versionan.

## Ampliación: canal, bandeja y fichas operativas

La revisión siguiente reemplaza la ficha genérica de conversaciones por una bandeja,
y el detalle de canal por una vista de operación. También reorganiza contactos,
tickets, pipelines, prompts, herramientas y usuarios. Se conservan los ajustes
concurrentes de agentes; su navegación vigente se recorre sin revertirla.

- Bandeja: lista/hilo, filtro de canales, búsqueda, filtros secundarios y página en
  URL; selección visible, historial con scroll propio y compositor al pie. En móvil
  se alternan lista e hilo. Metadatos se consultan con «Detalles» y se conserva el borrador.
- Canal: conexión e IA independientes; asignación de agente en lectura y edición bajo
  demanda; guardar mantiene la IA como estaba. Últimas cinco conversaciones, acceso
  a todas, información y mantenimiento secundarios.
- Fichas: contenido y relaciones en zona principal, metadatos secundarios y acciones
  destructivas bajo «Más acciones». Se conserva CRUD y la confirmación de cambios.
- Se retiran estilos del antiguo panel lateral de conversaciones y la paginación
  sin páginas adicionales deja de mostrar botones deshabilitados.

Verificación de esta ampliación:

- 60 combinaciones de diez vistas operativas en 390/768/1440 px y ambos temas:
  sin desbordes horizontales, errores JavaScript ni escrituras.
- Recorrido general de 144 combinaciones, incluidas creación, fichas, agentes y claves:
  sin desbordes ni errores JavaScript. Las mutaciones de conversación se interceptaron.
- Datos locales en solo lectura: 18 vistas, 108 combinaciones; sin errores, desbordes
  ni escrituras de negocio.
- Canal simulado: selector cerrado al entrar; cancelar conserva cambios si se rechaza
  el descarte; salir pide confirmación; error de guardado conserva selección. Guardado
  exitoso devuelve a lectura. Ambos cuerpos de guardado verificaron `enabled: false`.
- Bandeja simulada: canal/página conservados al entrar y volver desde móvil; selección
  resaltada; borrador conservado al abrir/cerrar detalles, durante polling y después
  de fallo de envío; cancelar cambio de conversación conserva el texto.
- Historial largo: scroll interno, compositor dentro de viewport (923 de 960 px) y
  documento sin scroll vertical adicional. IA/manual y entrega incierta conservan controles.
- Registro manual mantiene visible «No se envía al canal» y permite abrir/cancelar
  formulario. Edición de contacto protege borrador; cancelar eliminación restaura foco
  a «Más acciones».
- Estados simulados de IA activada, conexión caída con error, canal manual e historial
  vacío. Se revisó móvil de 390 × 560 px y se corrigió el recorte al abrir detalles:
  el panel ocupa el área de conversación hasta cerrarlo, preservando sus datos.

Capturas de app con datos ficticios: `operational-conversations-1-1440-light.png`,
`operational-channels-1-1440-light.png`, `operational-contacts-1-1440-light.png`,
`operational-tickets-1-1440-light.png`, sus variantes móviles/oscuras, y reportes
`operational-report.json`, `operational-interactions.json`, `operational-states.json`,
en la misma carpeta local ignorada. No son maquetas ni pruebas del proveedor real.

## Recurso de identidad

`landing/assets/images/07-app-watercolor.webp`, aproximadamente 147 kB, generado con
la herramienta integrada ImageGen y convertido con cwebp preservando transparencia.
El código sigue Apache-2.0 y el recurso conserva los permisos de identidad documentados
en LICENSING.md. La app no depende de imágenes presentes solo en carpetas ignoradas.

Prompt utilizado:

> Generate a production decorative texture asset on TRUE TRANSPARENT alpha background. ABSTRACT WATERCOLOR PIGMENT ONLY. Absolutely NO flowers, NO petals, NO leaves, NO botanical shapes, NO recognizable objects. Landscape 3:2 canvas. Irregular abstract puddles and stains of watery cobalt blue ink, authentic pigment sediment and granulation, cauliflower water-backrun edges, uneven ragged watermarks, translucent pale blue washes overlapping. Like a close-up of abstract watercolor paint experiments. Rich medium blue pigment concentrated bottom left, then thin irregular stains tapering towards lower right. Upper half mostly transparent. No white paper background, no black background, use true alpha. NOT a smooth gradient, not ribbons, no text, no UI. Fine hand-painted watercolor stains for sophisticated web app margins. Blue #567fc8 and #a6cbed, restrained but visible. Ragged organic cloud shapes without any representational form.
