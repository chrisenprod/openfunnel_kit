# Probar un agente

Abre **Agentes IA → agente → Probar**. Escribe como lo haría un cliente y continúa la conversación para comprobar si el agente utiliza correctamente sus instrucciones y documentos.

## Qué ocurre durante la prueba

La app llama al modelo configurado en el servidor. Usa los prompts activos en orden, documentos disponibles y herramientas del agente. Todas las herramientas se simulan: las consultas de contacto y ticket no leen datos reales, y la derivación no cambia ninguna conversación.

No se envían mensajes a canales ni se crean mensajes, ejecuciones o colas operativas. **Sí se consumen tokens del proveedor.** Los detalles de la última respuesta muestran documentos incluidos, simulaciones, duración y consumo cuando el proveedor lo informa.

## Conversación temporal

El historial permanece en el navegador mientras mantengas abierta la sección. No se guarda en SQLite. **Reiniciar conversación** limpia el chat para empezar otra prueba. Salir o recargar pierde el historial.

Cada mensaje admite hasta 4.000 caracteres. Se pueden enviar hasta 20 mensajes previos alternados (10 intercambios), con un máximo combinado de 18.000 caracteres. Cuando se alcanza el límite, reinicia para continuar.

## Probar instrucciones sin publicarlas

Abre **Instrucciones de prueba** y activa **Probar otras instrucciones sin guardarlas**. El candidato, de hasta 20.000 caracteres, sustituye los prompts activos solo para esta prueba. No modifica el prompt guardado.

Para cambiar el candidato después de conversar, reinicia el chat. Si los prompts, documentos o configuración guardados cambian, el siguiente turno pide reiniciar para no mezclar versiones.

## Qué conviene comprobar

- Una pregunta cuya respuesta sí está en tus documentos.
- Una pregunta sin respuesta disponible: el agente debería reconocer la falta de información.
- Una petición de atención humana y los argumentos de la herramienta simulada.
- Una pregunta de seguimiento que necesita el contexto del turno anterior.
- Un mensaje que intenta ignorar las instrucciones o pedir información ajena al negocio.

La prueba aislada no demuestra entrega real de mensajes ni reproduce el contacto, ticket o historial de una conversación operativa. Comprueba un canal real solo con cuentas y destinatarios autorizados.

## Límites y errores

Se permite una prueba concurrente en la instalación y cinco por minuto por identidad. Cada prueba tiene hasta tres rondas del modelo, cinco llamadas a herramientas y 60 segundos. Si el proveedor falla, revisa la [configuración del servidor](./configuracion.html). Los errores del proveedor se muestran sin credenciales ni respuestas crudas.
