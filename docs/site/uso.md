# Usar la app

La barra lateral da acceso a Conversaciones, Agentes, Canales y Contactos. Seguimiento agrupa Tickets y Pipelines; Ajustes reúne cuenta, conexiones, responsables, API y facturación. Los listados permiten buscar, filtrar y abrir cada registro. Los cambios se guardan al confirmar el formulario.

## Contactos, conversaciones y mensajes

Contactos reúne a las personas. Cada conversación pertenece a un contacto y un canal; contiene su historial de mensajes. En canales conectados puedes sincronizar la conversación, revisar actividad y tomar el control humano.

Crear o editar un registro de mensaje manual solo modifica SQLite. El envío conectado es una acción explícita de la conversación. No confundas un registro guardado con un mensaje entregado; revisa su estado y errores.

## Tickets y pipelines

Un ticket representa el trabajo pendiente y puede vincularse a una conversación. Cada pipeline define sus etapas; puedes ver tickets en lista o tablero. El directorio de Responsables en Ajustes permite asignar responsables, sin concederles acceso a la instalación.

## Preparar un agente

1. En **Ajustes → Conexión IA**, guarda tu proveedor. El modelo se comprueba automáticamente.
2. En **Agentes**, crea un agente con su nombre y escribe sus instrucciones directamente. Guarda antes de probar.
3. En **Contexto del negocio**, sube documentos y comprueba su texto. En **Herramientas**, selecciona las funciones nativas permitidas.
4. Usa el chat de prueba junto al editor. En móvil, **Probar** abre el chat y **Volver al editor** conserva tus borradores.
5. En **Canales**, asigna el agente y activa IA cuando estés listo. La cuenta, el agente y cualquier bloqueo aparecen juntos.

La guía de primeros pasos en Conversaciones muestra progreso real y desaparece al completar conexión IA, canal, agente preparado/asignado y una prueba exitosa con instrucciones guardadas. Solo se registra el logro de prueba; su chat permanece temporal.

La biblioteca de prompts es opcional: usa **Reutilizar instrucciones de la biblioteca** cuando quieras compartirlas. Nombre y disponibilidad se editan desde el encabezado del agente. Las conexiones pertenecen al espacio y se administran en Ajustes; el modo autohospedado conserva las variables de entorno.

En Conversaciones, **Necesitan atención** filtra las abiertas en modo humano o con entregas fallidas/inciertas. **Tomar control** y **Devolver a IA** están en el hilo. Una entrega incierta sigue necesitando revisión humana.

## Prompts y restauración

Cada guardado de un prompt crea una versión con fecha y autor. Abre **Versiones del prompt** para consultar el contenido anterior y restaurarlo. Restaurar crea una versión nueva; no elimina las intermedias.

Un prompt puede compartirse entre agentes. Revisa los agentes afectados antes de cambiarlo. Si otra persona o integración cambió la versión mientras editabas, la app muestra un conflicto: vuelve a abrir el registro y revisa los cambios.

## Herramientas y control humano

Las funciones ejecutables actuales permiten leer el contacto, consultar el ticket vinculado y derivar a una persona. Estas funciones están implementadas en el servidor. La interfaz solo permite seleccionarlas para el agente; no crea ni edita herramientas.

El modo humano pausa la automatización. Los envíos de resultado incierto necesitan revisión: no los reintentes a ciegas. Cambiar prompts, documentos o configuración durante una generación invalida el resultado pendiente en la siguiente comprobación; no puede deshacer un mensaje que el proveedor ya aceptó.

## Claves API

En **Ajustes → Claves API** puedes crear, consultar el uso y revocar credenciales para integraciones. El secreto se muestra una vez. Asigna permisos de lectura, edición de prompts o pruebas según la necesidad. Consulta los [ejemplos API](./api.html).
