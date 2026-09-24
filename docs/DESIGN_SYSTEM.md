# OpenFunnel — sistema de diseño de la app

Estado: guía visual de la app, aplicada en la primera etapa manual. Los componentes
viven en `frontend/src/`; la revisión se registra en `docs/qa/PRIMERA-ETAPA.md`.

Actualizado: 2026-09-23. Alcance funcional: [PRD.md](PRD.md).

Este documento transforma el antiguo `design.md` de exploración de la landing en
una guía concreta para la aplicación. Conserva la dirección vigente **Campo de tinta**:
tipografía regular, marfil y azul tinta, composición abierta y divisores finos.
Las variantes descartadas y las medidas de sitios de referencia no son reglas de la app.

## 1. Principios

- **La conversación y el trabajo primero.** Dar prioridad a mensajes, contactos,
  tickets y sus etapas; las configuraciones tienen una jerarquía secundaria.
- **Densidad moderada.** Usar tablas y agrupaciones simples, con espacio suficiente
  para leer y actuar. Reservar paneles para separar zonas con funciones distintas.
- **Acciones claras.** Una acción primaria por vista; nombres que expliquen el resultado.
- **Estado veraz.** Un canal registrado no está conectado y un mensaje guardado no
  está enviado. Mostrar ejecución únicamente para agentes validados y funciones implementadas.
- **Consistencia.** Los mismos datos, estados y acciones conservan su representación
  entre listado, detalle, conversación y tablero.

No utilizar halos, neón, vidrio, gradientes decorativos, sombras en cada fila,
ilustraciones detrás de datos ni títulos de escala publicitaria. La acuarela del
hero pertenece a la presentación comercial; no es un fondo para operar la app.

## 2. Fundamentos y tokens

Los colores base proceden de la dirección vigente de la landing. Los tokens de
controles y estados completan esa base para la app. Son valores de especificación;
se implementarán como variables CSS cuando se construya la interfaz.

### Color

| Token propuesto | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-page` | `#faf9f6` | `#0c1626` | Fondo de la aplicación. |
| `--color-surface` | `#f0f1f1` | `#121f32` | Formularios, paneles y zonas secundarias. |
| `--color-text` | `#152842` | `#edf1f8` | Texto principal. |
| `--color-muted` | `#4c5b6e` | `#b1bed2` | Ayudas y metadatos legibles. |
| `--color-line` | `#cdd3da` | `#34415a` | Divisores decorativos. |
| `--color-control-border` | `#78879b` | `#71829b` | Límites de inputs y controles. |
| `--color-accent` | `#2349a0` | `#b5c3ff` | Enlaces, foco, selección y botón primario. |
| `--color-on-accent` | `#ffffff` | `#0c1626` | Texto sobre el botón primario. |
| `--color-accent-hover` | `#193c88` | `#cad3ff` | Hover del botón primario. |
| `--color-accent-active` | `#12316e` | `#a2b3f5` | Botón primario presionado. |
| `--color-selected` | `#e5ebfa` | `#1c3052` | Fondo de navegación o fila seleccionada. |
| `--color-danger` | `#a52938` | `#ff9ca8` | Error y acciones destructivas. |
| `--color-on-danger` | `#ffffff` | `#0c1626` | Texto sobre botón destructivo sólido. |
| `--color-success` | `#176446` | `#8bd4b5` | Confirmación de una operación real. |
| `--color-warning` | `#805500` | `#e8c77a` | Advertencias que requieren atención. |

Reglas: `line` no sustituye el borde de un input ni su foco. Los estados se expresan
con texto, además del color. Abierto/cerrado y activo/inactivo son estados neutrales;
no convertir automáticamente «cerrado» en una confirmación verde de éxito comercial.
Los colores danger/success/warning sirven como texto sobre page/surface, sin crear
fondos arbitrarios o transparencias que alteren el contraste.

Al iniciar, respetar la preferencia del sistema. Guardar una elección explícita
claro/oscuro en el navegador; aplicar el tema antes de mostrar contenido cuando sea
posible. No guardar datos de sesión junto a la preferencia visual.

### Tipografía

Familia: `"Helvetica Neue", Helvetica, Arial, sans-serif`. No descargar una fuente.

| Rol | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| Título de página | 24 / 32 px | 400 | Un H1 por vista. |
| Título de sección | 18 / 26 px | 400 | Grupos de formulario y paneles. |
| Texto y formularios | 14 / 22 px; mensajes y campos móviles 16 / 24 px | 400 | Mensajes, inputs y contenido. |
| Tabla, navegación, botones y etiquetas | 14 / 20 px | 400; 500 para énfasis | Controles y lectura compacta. |
| Metadatos | 12 / 18 px | 400 | Fechas y ayudas complementarias, nunca la única instrucción. |
| Texto técnico | 14 / 22 px, `ui-monospace, monospace` | 400 | Esquema JSON de tools y referencias técnicas cuando sean necesarias. |

Tracking de títulos: `-0.025em`; el resto normal. No usar párrafos en mayúsculas,
pesos muy gruesos ni convertir descripciones en bloques de texto técnico.

### Espaciado, forma y movimiento

- Escala de espacio: 4, 8, 12, 16, 24, 32 y 48 px. Separación entre etiqueta y campo:
  6–8 px; campos: 14–16 px; secciones: 16–24 px; padding de panel: 12–16 px.
- Radios: controles 6 px; paneles y diálogos 8 px; etiquetas de estado 4 px.
- Bordes de 1 px. Sombras solo para superficies superpuestas: menú y diálogo.
- Controles de escritorio: altura mínima de 36 px. En móvil o puntero táctil, controles principales y áreas de iconos de al menos 44 × 44 px.
  Un icono visible puede medir 18–20 px dentro de esa área.
  Excepción de densidad en Kanban con ratón: asa de 28 px y selector de 32 px;
  con puntero táctil ambos conservan un mínimo de 44 px.
- Foco: contorno sólido de 2 px con `accent`, separado 3 px y sin recorte.
  Usar un separador del color de fondo cuando sea necesario distinguirlo del control.
- Transiciones: color/borde 150 ms; apertura de panel 180 ms. Sin animaciones de
  entrada en cada fila. Con movimiento reducido, eliminar desplazamientos y giros.

## 3. Estructura de la aplicación

| Zona | Contrato |
|---|---|
| Navegación lateral | 216 px expandida o 76 px compacta en escritorio, con preferencia persistida. Iconos SVG de 20 px; en modo compacto, etiqueta visible de 10/12 px bajo cada icono, nombre accesible y tooltip al enfocar/pasar el cursor. Ítem activo con fondo seleccionado y `aria-current="page"`. En móvil mantener iconos y textos completos. |
| Encabezado | Altura mínima 56 px; contexto de la vista, selector de tema y cierre de sesión. Las acciones del módulo viven en el encabezado de contenido. |
| Contenido | Padding 20 px vertical y 24 px horizontal en escritorio, 24 px en tablet y 16 px en móvil. Ancho máximo 1440 px para listados; formularios de lectura hasta 720 px. |
| Encabezado de vista | Título, explicación breve si aporta información y una acción primaria. Los filtros ocupan una fila inferior. |
| Detalle | Título y navegación de regreso; contenido principal y datos relacionados. En ancho reducido, una columna. |

Navegación del PRD:

- **Operación:** Conversaciones, Tickets, Contactos.
- **Configuración:** Canales, Pipelines, Agentes IA, Usuarios.
- Dentro de **Agentes IA:** Agentes, Prompts y Tools como navegación interna.
  Prompts y Tools conservan sus catálogos compartidos y CRUD; no aparecen en el sidebar.

Mensajes se administran dentro de conversaciones y stages dentro de pipelines.
No crear enlaces para las tablas de relación ni un dashboard decorativo de inicio.

### Adaptación responsive

- Desde 1200 px: navegación visible; bandeja con lista de 280 px y detalle flexible.
- De 768 a 1199 px: navegación en panel desplegable; vista principal ocupa el ancho.
  Conversaciones permite alternar lista y detalle conservando filtros y selección.
- Bajo 768 px: una columna; acciones apiladas cuando no caben y formularios al 100 %.
  Evitar barras fijas que oculten campos al aparecer el teclado.
- Tablas y tablero pueden desplazarse dentro de su contenedor identificado; la página
  no debe desbordarse horizontalmente. No ocultar una acción imprescindible para hacerla caber.

El menú móvil tiene nombre accesible, indica su estado y devuelve el foco al botón
que lo abrió. Si se presenta como panel modal, aplica las mismas reglas de foco del diálogo.

## 4. Componentes y estados

Implementar estos patrones con React y CSS cuando los módulos los necesiten; los
nombres describen contratos, no exigen una biblioteca ni un archivo por componente.

| Componente | Uso y variantes | Estados y comportamiento |
|---|---|---|
| Botón | Primario sólido, secundario con borde, discreto para acciones auxiliares y destructivo para confirmar borrado. | Normal, hover, presionado, foco, deshabilitado y guardando. Durante una petición conservar ancho, indicar «Guardando…» y prevenir envíos duplicados. |
| Campo | Etiqueta visible, input/textarea nativo y selector React controlado, ayuda opcional y error. | Normal, foco, inválido, deshabilitado y solo lectura. Error con texto y `aria-invalid`; conectar ayuda/error mediante `aria-describedby`. No usar placeholder como etiqueta. |
| Buscador y filtros | Búsqueda textual, selects de filtros y acción «Limpiar filtros» cuando corresponda. | Etiquetas accesibles, valor preservado al regresar, cero resultados distinto de lista vacía. Buscar no roba foco ni muestra cada pulsación como anuncio. |
| Tabla | Encabezados semánticos, primera columna identificable y acciones con nombre. Filas desde 40 px en escritorio y 48 px en móvil, creciendo con el contenido. | Carga, vacío, error, selección y resultado. Enlace explícito al detalle; no depender solo de clic en toda la fila. Orden interactivo solo si está implementado. |
| Paginación | Cantidad de resultados, página actual y anterior/siguiente. | Deshabilitar navegación no disponible; mantener filtros y anunciar el resultado tras cambiar de página. No inventar totales durante carga. |
| Estado | Etiqueta corta con texto, borde fino opcional y color semántico justificado. | «Abierto», «Cerrado», «Activo», «Inactivo», «Sin integración». El estado no parece un botón si no lo es. |
| Diálogo | Confirmar eliminación o una decisión breve. Formularios largos viven en páginas de detalle. | Título accesible, foco dentro del modal, Escape para cancelar cuando no hay petición pendiente, retorno del foco al origen. No anidar diálogos. |
| Aviso | Mensaje junto a la operación, éxito discreto, advertencia o error recuperable. | Éxito con región de estado; errores urgentes con alerta. No depender de un toast que desaparece para explicar un fallo. |
| Estado vacío | Título concreto, explicación breve y acción útil. | «Aún no hay contactos» y «Crear contacto». Con filtros: «No hay resultados» y «Limpiar filtros». Sin ilustración grande obligatoria. |

Botón secundario/discreto: hover y presionado usan surface/selected y mantienen
texto principal. Inputs: fondo page o surface, borde control-border; foco visible
además del borde; error danger con explicación. Solo lectura conserva contraste y
permite copiar. Deshabilitado conserva una etiqueta legible y explica el motivo
cuando no sea evidente; no depender de tooltip inaccesible.

El borrado muestra nombre del registro y consecuencia real. Si hay referencias,
explicar qué vínculo impide eliminar y ofrecer la navegación para resolverlo.
Durante un fallo de guardado, conservar valores y permitir reintentar. Un formulario
con cambios pendientes debe advertir antes de descartarlos al salir o cancelar.

## 5. Patrones de las pantallas del PRD

### Login

Bloque centrado de hasta 400 px, logo discreto, título «Acceder a OpenFunnel», usuario,
contraseña y acción «Entrar». Etiquetar usuario como usuario, no como email. Campos
con autocompletado apropiado y botón accesible para mostrar/ocultar contraseña.
Error genérico para credenciales inválidas y estado de envío visible. No mostrar
registro, invitación o recuperación por email que esta etapa no implementa.

### CRUD y configuración

Patrón común: encabezado → búsqueda/filtros → lista → paginación. Crear/editar abre
una vista con campos agrupados, «Guardar» y «Cancelar». Eliminar se separa visualmente
de guardar. Usar el nombre de la entidad: «Crear contacto», «Crear pipeline».

- **Usuarios:** explicación breve «Personas para asignación; no habilita acceso».
- **Canales:** tipo y estado; «Sin integración» visible. No mostrar conectar ni iconos de conexión exitosa.
- **Agentes IA:** datos, prompts ordenados y tools asociadas en grupos simples.
  Mostrar «Ejecución pendiente» sin acciones de probar o ejecutar.
- **Prompts:** textarea amplio con título y ayuda; no un editor de código por defecto.
- **Tools:** definición y esquema JSON opcional, con errores legibles en el campo.
  No incluir campos de credenciales o una consola de ejecución.
- **Contactos:** datos principales y listas relacionadas de conversaciones/tickets.

Los selectores cerrados y de referencias usan `AppSelect`: disparador con valor e
icono cuando aporta contexto; popup propio con búsqueda, lista de opciones, selección
y opción deshabilitada. Soportan flechas, Enter, Escape, Tab, clic fuera y validación
obligatoria. El popup se ajusta al viewport y los contenedores con scroll no lo recortan.
La entrada libre de modelo conserva sus sugerencias. Instagram y WhatsApp tienen
iconos SVG reconocibles y colores discretos adaptados a cada tema; siempre acompañan texto.

### Conversaciones y mensajes

En canales conectados, separar el estado de la conexión del estado «Respuestas
automáticas activadas/desactivadas». Mostrar texto e icono, además de color, y una
única acción contextual «Activar respuestas» o «Desactivar respuestas». «Guardar
agente» conserva ese estado; señalar cambios pendientes y los requisitos que impiden
activar. Desactivar conserva la cuenta conectada y permite atención humana.

Destacar un selector propio «Bandeja de conversaciones» antes de los filtros
secundarios: «Todos los canales» por defecto o una cuenta individual. Incluir canales
inactivos para consultar historial. El mismo control aparece sobre el detalle, también
en móvil; cambiar de canal vuelve a la lista filtrada y conserva búsqueda y estado.
Mantener la consulta en la URL al abrir, recargar y volver de una conversación.

Lista con título, contacto, canal, fecha y estado. La conversación seleccionada tiene
un encabezado con contexto y enlaces al contacto y al ticket. El responsable y la
configuración de agente son metadatos editables, sin fingir una ejecución activa.

Mensajes con texto de 16 px, fecha y etiqueta «Entrada» o «Salida»; la dirección no
depende solo de la alineación o el color. El texto largo se ajusta y conserva saltos
de línea. Acciones de editar/eliminar accesibles mediante botón rotulado.

Usar «Registrar mensaje» para la acción y explicar su carácter manual. No mostrar
doble check, «Enviado», «Leído», indicador de escritura ni compositor que simule
un canal conectado. Al abrir una conversación, mostrar el contenido pertinente sin
quitar el control del scroll a quien esté leyendo mensajes anteriores.

### Pipelines, stages y tickets

El editor de pipeline muestra nombre, descripción y lista ordenada de etapas. Crear,
renombrar y reordenar mediante botones «Subir»/«Bajar» con contexto accesible. Mostrar
por qué no se puede eliminar una etapa ocupada. No requiere lienzo de nodos.

Tickets tiene selector de pipeline y vistas «Lista» / «Por etapas». Cada columna
representa una stage, con nombre y cantidad real; cada tarjeta muestra título,
contacto, responsable y estado. No añadir importes comerciales ni indicadores SLA.
Los colores de etapa son neutrales, dentro de la paleta tinta.

El detalle de cada pipeline abre un Kanban con sus etapas, incluidas las vacías.
Cada tarjeta usa padding de 10 px y gap de 6 px; columnas separadas 12 px y con
padding de 10 px. Título de 13 px y metadatos de 12 px, sin truncar información.
Ofrece un asa de 28 px con ratón, 44 px con puntero táctil, y un selector
de etapa para teclado. Resaltar la columna de destino y permitir cancelar con
Escape o soltando fuera del tablero. El arrastre junto al borde desplaza el tablero.
Durante el guardado, bloquear nuevos movimientos y anunciar el resultado. Ante
un fallo, explicar el error y recuperar la ubicación del servidor para reintentar.
La etapa no cambia automáticamente el estado abierto/cerrado. En móvil, el tablero
se desplaza localmente; el cuerpo de la tarjeta conserva el scroll táctil normal.

## 6. Identidad, iconos y movimiento

Usar el símbolo existente de seis burbujas y el nombre como texto, con tamaño de
marca de 20–24 px en la navegación. El logo decorativo se oculta de lectores de
pantalla cuando acompaña al nombre; el enlace tiene un nombre comprensible.

El estilo compartido existente está en `landing/brand.css`. Su movimiento autorizado
puede conservarse una vez al montar la estructura de la app; no remontar el logo
para repetirlo en cada navegación. Respetar siempre movimiento reducido. No usar
el símbolo animado como indicador permanente de carga.

Los iconos de acción deben ser simples y coherentes, de 18–20 px. Preferir texto
para acciones importantes; iconos sin texto llevan nombre accesible. No añadir un
paquete de iconos solo por tener disponible un sistema de diseño.

Crear CSS propio de la app a partir de esta especificación. No importar toda la
hoja comercial ni copiar su estructura de página. Los recursos de identidad y
la landing conservan sus permisos separados en [LICENSING.md](../LICENSING.md);
esta guía no cambia sus licencias.

## 7. Verificación y adopción

### Comprobaciones sobre esta especificación

Se comprobaron numéricamente pares de color opacos con luminancia relativa sRGB:

| Par | Claro | Oscuro |
|---|---|---|
| Texto principal / fondo | 14,11:1 | 16,00:1 |
| Texto secundario / superficie | 6,13:1 | 8,81:1 |
| Texto de botón / acento | 8,29:1 | 10,54:1 |
| Borde de control / superficie | 3,23:1 | 4,23:1 |

Los tres colores semánticos sobre surface superan 4,5:1 en ambos temas. Estos cálculos
no sustituyen la revisión visual, ni verifican overlays, transparencias, todos los
estados o una interfaz que aún no se ha implementado.

### Criterios de aceptación al implementar

- Mantener texto normal con contraste mínimo 4,5:1 y controles/foco distinguibles
  con al menos 3:1 sobre la superficie adyacente. Verificar cada estado real.
- Probar al menos 390, 768 y 1440 px, y zoom de texto/interfaz al 200 %. La página
  no pierde acciones ni campos; tablas anchas permanecen en su contenedor.
- Completar login, CRUD, filtros, confirmación y cambio de etapa usando solo teclado.
  Al cerrar diálogos o cambiar de pantalla, el foco queda en un lugar predecible.
- Revisar ambos temas, movimiento reducido, estados vacíos, carga, error, guardando,
  referencia bloqueada y sesión vencida. No usar datos ficticios como estado inicial real.
- Mantener coherencia entre tabla, detalle, bandeja y tablero; no añadir capacidades
  que el PRD reserva para otra etapa.
- Comprobar `npm run build`, endpoints afectados y `npm run spec:validate` cuando
  el cambio incluya especificaciones. Las pruebas visuales corresponden a la futura UI.

Adoptar primero tokens y estructura, después los controles necesarios para auth y
el primer CRUD. Extraer componentes reutilizables cuando exista repetición concreta;
no construir por adelantado una biblioteca independiente.

## 8. Organización de la documentación

- Este archivo es la fuente versionada del diseño de la app.
- `PRD.md` define alcance y comportamiento; este sistema define presentación e interacción.
- Los antecedentes locales de acuarela, ilustraciones y logo se conservan en
  `docs/referencias-visuales/`, carpeta ignorada por Git. No son necesarios para
  implementar esta guía ni se garantiza que existan en un clon del repositorio.
- Las imágenes de producción utilizadas por la landing permanecen en
  `landing/assets/images/`; mover documentos no cambia las rutas de esos recursos.
