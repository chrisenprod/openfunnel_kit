# Usar la app

La barra lateral organiza el trabajo y la configuración. Los listados permiten buscar, filtrar y abrir cada registro. Los cambios se guardan al confirmar el formulario.

## Contactos, conversaciones y mensajes

Contactos reúne a las personas. Cada conversación pertenece a un contacto y un canal; contiene su historial de mensajes. En canales conectados puedes sincronizar la conversación, revisar actividad y tomar el control humano.

Crear o editar un registro de mensaje manual solo modifica SQLite. El envío conectado es una acción explícita de la conversación. No confundas un registro guardado con un mensaje entregado; revisa su estado y errores.

## Tickets y pipelines

Un ticket representa el trabajo pendiente y puede vincularse a una conversación. Cada pipeline define sus etapas; puedes ver tickets en lista o tablero. El directorio de Usuarios permite asignar responsables, sin concederles acceso a la instalación.

## Preparar un agente

1. En **Prompts**, crea sus instrucciones: tarea, tono, límites y cuándo derivar a una persona.
2. En **Agentes IA**, crea un agente y asocia los prompts en el orden deseado. Añade solo las herramientas necesarias.
3. En **Contexto**, sube los documentos del negocio y comprueba el texto extraído.
4. En **Probar**, conversa con el agente antes de conectarlo a un canal.
5. Comprueba la conexión IA desde **Editar agente → Conexión IA** y asigna el agente al canal cuando estés listo.

El agente tiene una sola fila: **Instrucciones**, **Herramientas**, **Contexto** y **Probar**. Nombre y estado se cambian en **Editar agente**. Modelo y proveedor se configuran exclusivamente en el [entorno del servidor](./configuracion.html).

## Prompts y restauración

Cada guardado de un prompt crea una versión con fecha y autor. Abre **Versiones del prompt** para consultar el contenido anterior y restaurarlo. Restaurar crea una versión nueva; no elimina las intermedias.

Un prompt puede compartirse entre agentes. Revisa los agentes afectados antes de cambiarlo. Si otra persona o integración cambió la versión mientras editabas, la app muestra un conflicto: vuelve a abrir el registro y revisa los cambios.

## Herramientas y control humano

Las funciones ejecutables actuales permiten leer el contacto, consultar el ticket vinculado y derivar a una persona. Crear una definición de herramienta no añade una función de servidor ni permite ejecutar código arbitrario.

El modo humano pausa la automatización. Los envíos de resultado incierto necesitan revisión: no los reintentes a ciegas. Cambiar prompts, documentos o configuración durante una generación invalida el resultado pendiente en la siguiente comprobación; no puede deshacer un mensaje que el proveedor ya aceptó.

## Claves API

En **Configuración → Claves API** puedes crear, consultar el uso y revocar credenciales para integraciones. El secreto se muestra una vez. Asigna permisos de lectura, edición de prompts o pruebas según la necesidad. Consulta los [ejemplos API](./api.html).
