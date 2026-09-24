# OpenFunnel — concepto

<img src="../landing/assets/images/openfunnel-mark.webp" alt="Símbolo de OpenFunnel: seis burbujas de conversación forman un asterisco alrededor de un centro abierto" width="96" height="96">

Estado: dirección de producto definida; repositorio, landing y primera etapa manual de la plataforma implementados. El motor conversacional, las integraciones y la oferta cloud están por construir.
Actualizado: 2026-09-23.

## Qué es

**OpenFunnel es un motor conversacional open source que conecta canales con agentes de IA que conducen conversaciones por pipelines y actúan sobre los sistemas de cada empresa. Las personas supervisan e intervienen desde una misma interfaz.**

Una empresa puede usarlo solamente para recibir, procesar y responder conversaciones, extraer información o calificar prospectos. Después puede continuar el trabajo en su CRM, helpdesk o sistemas propios mediante API, webhooks e integraciones.

**Canales → Conversaciones → Pipelines con AI agents + personas → Resultados e integraciones.**

OpenFunnel administra la conversación, su contexto y su procesamiento. El CRM externo puede seguir siendo la fuente de verdad comercial; el sistema de pedidos conserva las órdenes y el sistema de soporte conserva sus casos. El cliente no necesita migrar esos sistemas para usar el motor.

La dirección comercial es un **microSaaS de uso flexible**, con un núcleo abierto autohospedable y una oferta cloud administrada orientada al pago por uso.

## Enfoque del producto

**La promesa de producto es convertir conversaciones en resultados verificables, siguiendo un proceso que la empresa puede configurar y supervisar.**

Ejemplo de resultado: el agente recopiló los datos requeridos, calificó la consulta y el sistema externo confirmó su recepción. El valor incluye el contexto persistente, las reglas de avance y la confirmación de las acciones, además de las respuestas del agente.

La unidad central es la conversación y su avance por un pipeline. El motor transforma mensajes en respuestas, datos estructurados y acciones autorizadas, mantiene el contexto y permite intervención humana.

OpenFunnel es el producto. **Sales, Support y Commerce son plantillas configurables del mismo motor**, con distintas etapas, objetivos e integraciones. Se mantienen como ejemplos de uso en el concepto y en la comunicación del producto.

Las etapas conversacionales viven en OpenFunnel. Los datos y las operaciones de negocio pueden vivir en sistemas externos: propuestas y cierre en un CRM, casos en un helpdesk o compras en una plataforma de comercio.

## Qué significa funnel o pipeline

Un funnel o pipeline es la definición configurable del recorrido de una conversación. Cada uno establece:

- **Objetivo:** qué debe lograr la conversación.
- **Etapas y transiciones:** cómo avanza y qué requisitos debe cumplir.
- **Datos:** qué necesita recopilar o validar.
- **Agente:** instrucciones, conocimiento y herramientas disponibles.
- **Integraciones:** dónde consultar información y ejecutar acciones autorizadas.
- **Intervención humana:** cuándo pedir aprobación o transferir el control.

El pipeline gobierna el proceso; el tablero lo representa. Cada etapa establece qué necesita saber el agente, qué acciones tiene permitidas y qué condiciones habilitan una transición. **El agente propone una transición y el motor comprueba sus requisitos antes de aplicarla.** Las personas operan bajo las mismas reglas; cualquier excepción autorizada debe quedar registrada.

Ejemplo mínimo de Sales:

| Etapa | Trabajo del agente | Condición para completar la etapa |
|---|---|---|
| Consulta | Entender qué necesita la persona | Necesidad registrada |
| Calificación | Recopilar y evaluar los datos configurados | Datos requeridos completos y criterio de calificación evaluado |
| Entrega | Enviar el resultado al sistema externo | Recepción confirmada por la integración |

Las transiciones pueden incluir volver a solicitar información o terminar como no calificada. Una conversación puede esperar una respuesta o requerir intervención sin avanzar de etapa. Las reglas y condiciones deben ser explícitas; el modelo no cambia etiquetas libremente ni declara una entrega exitosa sin confirmación.

## Plantillas sobre el mismo motor

Una plantilla incluye etapas, condiciones de avance, campos a recopilar, instrucciones del agente, herramientas e integraciones a conectar, reglas de intervención humana y resultado esperado. El usuario adapta esos elementos a su empresa.

| Plantilla | Etapas posibles | Integraciones |
|---|---|---|
| Sales | Consulta → Calificación → Entrega | CRM, calendario |
| Support | Consulta → Diagnóstico → Resolución / Escalación | Base de conocimiento, helpdesk |
| Commerce | Intención → Producto identificado → Compra derivada | Catálogo, carrito, pedidos |

Son recorridos orientativos, adaptables a cada empresa. Por ejemplo, Commerce puede consultar un catálogo externo y entregar un enlace de compra; OpenFunnel no necesita implementar una tienda ni gestionar sus pedidos internamente.

También puede haber procesamiento puntual, como clasificar o resumir una conversación enviada por API. Ese uso no obliga al cliente a operar la interfaz ni configurar un pipeline de varias etapas.

## Para AI agents y personas

«Agente» significa **agente de inteligencia artificial**, basado en un modelo y herramientas. Las personas son operadoras y supervisoras del mismo motor.

Los agentes pueden leer contexto, clasificar intención, extraer datos, responder, solicitar acciones y transferir la conversación.

**En la primera entrega, OpenFunnel ejecuta al agente:** llama a un proveedor de modelos inicial, utiliza instrucciones configurables y administra el contexto, las herramientas permitidas y el consumo. Conectar agentes ejecutados por sistemas externos se reserva para una expansión posterior mediante API y MCP sobre las mismas operaciones del motor.

Las personas pueden conectar canales, configurar agentes y pipelines, revisar conversaciones desde la bandeja o la vista de etapas, corregir datos, aprobar acciones y responder manualmente. También pueden tomar el control de una conversación y devolverla después al agente. Durante el control humano se debe evitar que el agente responda simultáneamente.

El motor conserva estado, permisos e historial. Una salida del modelo no confirma por sí sola una acción externa: por ejemplo, un prospecto no se considera entregado al CRM hasta que la integración confirme la operación.

## Etapa, atención y ejecución

El estado se distingue en tres dimensiones:

| Dimensión | Qué expresa | Ejemplo |
|---|---|---|
| Etapa del pipeline | Avance hacia el objetivo conversacional | Consulta, Calificación, Entrega |
| Control y atención | Quién controla la conversación y de quién se espera una acción | Control humano, esperando al cliente, pendiente de aprobación |
| Ejecución o entrega | Estado de una operación concreta | Pendiente, ejecutando, confirmada, fallida |

Ejemplo: una conversación puede tener calificación positiva, estar en la etapa Entrega, bajo control humano y tener un intento de envío al CRM fallido. El fallo no borra la calificación ni cambia automáticamente la etapa. La operación se recupera y el resultado solo se marca como entregado cuando existe confirmación.

La conversación puede durar días y reabrirse. Una ejecución de IA procesa una parte de ella y termina; su finalización no implica que la conversación o el pipeline hayan concluido. El historial conserva esas ejecuciones y los cambios de control sin perder el contexto.

## Dos formas de consumir el motor

### Con canales conectados

1. Entra un mensaje desde un canal habilitado.
2. OpenFunnel lo vincula con su conversación y contexto.
3. El agente procesa el mensaje según el objetivo y las herramientas permitidas.
4. Se responde por el canal, se solicita intervención humana o se entrega un resultado a una integración.
5. Se registra el resultado del procesamiento y de las acciones externas.

### Como servicio por API

1. Una aplicación envía mensajes o una conversación existente, con un objetivo de procesamiento.
2. OpenFunnel ejecuta el agente y produce una respuesta o datos estructurados.
3. La aplicación recibe el resultado, directamente o mediante un mecanismo asíncrono según el trabajo.
4. La empresa decide qué hacer después en sus propios sistemas.

Esta modalidad no exige conectar un canal ni usar la interfaz o el pipeline. Las políticas de almacenamiento y retención deben permitir distinguir el procesamiento puntual de las conversaciones que el cliente desea conservar.

## API, MCP e integraciones

- **API con claves de acceso:** para enviar conversaciones, solicitar procesamiento, consultar resultados y gestionar recursos autorizados.
- **Webhooks:** para notificar resultados y cambios a sistemas externos.
- **Herramientas e integraciones:** para que un agente ejecute acciones autorizadas, por ejemplo crear un prospecto en el CRM del cliente.
- **MCP:** para que otros AI agents y asistentes compatibles consulten y operen el motor mediante herramientas.
- **Interfaz:** para configuración, revisión y operación humana.

La clave de acceso a OpenFunnel y la clave del proveedor de IA son credenciales distintas. El núcleo debe permitir usar proveedores y claves configurados por el usuario; la oferta cloud podrá evaluar también consumo de modelos administrado.

Todos los accesos comparten permisos, validaciones e historial. Las entregas y los reintentos deben evitar duplicar acciones, como crear dos prospectos por el mismo resultado.

Estas son capacidades previstas; todavía no son endpoints ni integraciones disponibles. La primera entrega limita la entrada y la salida al recorrido descrito más abajo. MCP es una vía posterior de acceso al motor, no un requisito para validar el primer caso de uso.

## Primera plantilla: Sales para calificación y entrega

Se construirá primero una plantilla completa: Sales para calificación y entrega de prospectos. Una agencia de servicios que recibe consultas permite validar el recorrido de principio a fin. La configuración del motor se extrae de lo necesario para ese recorrido; se comprobará su reutilización con una segunda plantilla antes de ampliar las abstracciones. No se construirá un editor universal de procesos como condición previa.

1. Un prospecto escribe por un canal conectado, o la agencia envía la conversación por API.
2. El agente identifica la necesidad y recopila presupuesto y fecha estimada cuando corresponde.
3. OpenFunnel produce un resumen, los datos extraídos y un estado de calificación.
4. Si necesita criterio humano, una persona revisa o continúa la conversación.
5. El resultado se entrega por webhook o mediante una integración autorizada al CRM de la agencia.
6. La propuesta, negociación y cierre continúan en ese CRM.

Si la empresa solo necesita clasificar o resumir conversaciones, puede detenerse en el resultado del procesamiento. Si aún no tiene CRM, puede conservar los prospectos y seguir su estado en la bandeja y la vista de pipeline de OpenFunnel.

## Bandeja de conversaciones y vista de pipeline

**La bandeja y la vista de pipeline forman parte de la operación humana del motor.** Permiten entender dónde está cada conversación, qué recopiló el agente, qué ocurrió con las integraciones y qué requiere atención.

Ambas vistas muestran los mismos datos:

- Contacto o prospecto, con los datos mínimos recopilados.
- Conversación, resumen y campos extraídos.
- Pipeline y etapa actual, responsable y necesidad de intervención.
- Historial de acciones y estado de las integraciones.
- Estado de entrega al sistema externo y última actividad.

La bandeja permite leer y responder; la vista de pipeline permite seguir el avance por etapas. Las personas pueden intervenir y actualizar el estado respetando las mismas reglas que los agentes.

La definición del pipeline pertenece al motor y su tablero es una forma de visualizarlo. Un cliente que consume la API puede utilizar las mismas capacidades sin abrir la interfaz.

La entrega de un prospecto a un CRM es un resultado conversacional distinto de una venta ganada. El producto no necesita oportunidades comerciales, cotizaciones, facturación, cobros, catálogo propio ni pronósticos de ventas para ofrecer estas vistas. No se incorpora un miniCRM como producto adicional al alcance inicial.

## Núcleo compartido

- `Conversation / Message` — conversación y mensajes que se procesan.
- `Channel` — origen y destino de los mensajes cuando hay un canal conectado.
- `AI Agent` — configuración del agente, modelo, instrucciones y herramientas permitidas.
- `Run / Processing` — ejecución, estado, resultado y consumo medido.
- `Context / Knowledge` — información necesaria para responder y continuar.
- `Contact` — identificación mínima y opcional del interlocutor o prospecto.
- `Funnel / Pipeline` — objetivo, etapas, requisitos, datos, agente, integraciones y condiciones de intervención humana.
- `Human handoff / Approval` — intervención humana o aprobación explícita.
- `Integration / Delivery` — acción o entrega de un resultado a otro sistema y su confirmación.
- `History` — trazabilidad del procesamiento, las decisiones y las acciones.

Son conceptos de producto, no una instrucción para crear todas las tablas o integraciones desde el primer día.

## Modelo abierto y cloud

El núcleo conversacional, la interfaz y las capacidades de API y MCP se mantendrán abiertos según se implementen, bajo **Apache License 2.0**, recuperada de la versión inicial de OpenFunnel. El alcance por archivo y los permisos de identidad están en [LICENSING.md](../LICENSING.md); el texto estándar de la licencia permanece sin modificaciones en [LICENSE](../LICENSE).

| | OpenFunnel autohospedado | OpenFunnel Cloud |
|---|---|---|
| Núcleo e interfaz | Código abierto, sin cobro de licencia del núcleo | Mismo núcleo, administrado |
| API y MCP | Incluidos cuando se implementen | Disponibles según límites de consumo |
| Infraestructura | La instala y paga el usuario | Administrada por OpenFunnel |
| Actualizaciones y respaldos | Los gestiona el usuario | Servicio administrado según la oferta |
| Proveedores de IA y canales | Configuración y costes del usuario | Claves propias o consumo administrado, por definir |
| Cobro de OpenFunnel | Sin tarifa de uso del núcleo autohospedado | Objetivo: pago por uso |

El alojamiento propio puede tener costes de servidores, modelos y canales aunque el software sea gratuito.

La infraestructura comercial del cloud —aprovisionamiento de cuentas, facturación y operación del servicio— puede ser privada. Incorporar AI agents no implica cerrar el motor ni reservar API/MCP exclusivamente al cloud.

Chris Lobarede Fernández mantiene el repositorio oficial, su dirección de producto, la landing y el servicio cloud que opera. La landing comercial y los recursos de identidad quedan fuera de Apache-2.0, con permisos limitados para copia del repositorio, desarrollo y presentación de la versión oficial. El nombre no se concede como identidad para productos de terceros y su disponibilidad jurídica sigue pendiente de revisión.

**Este control no implica exclusividad sobre los servicios basados en el motor:** Apache-2.0 permite forks, aplicaciones comerciales y clouds de terceros. La formación y el acompañamiento son ofertas separadas; los alumnos pueden construir y comercializar sus aplicaciones con identidad propia. El cloud oficial necesitará condiciones de servicio y privacidad antes de su lanzamiento.

## MicroSaaS y pago por uso

**Objetivo: pagar por el uso del motor, con una oferta comprensible para usos ocasionales.** La aspiración es operar sin una suscripción fija obligatoria; su viabilidad y las tarifas están pendientes de validación.

**Hipótesis comercial inicial: saldo para procesamiento, con historial y almacenamiento básico incluidos bajo límites explícitos.** Es una propuesta a validar, no una tarifa definida ni una rentabilidad demostrada. El valor que se cobra es procesar y operar conversaciones; guardar prospectos no es el centro de la oferta.

La medición interna y la unidad comercial son decisiones distintas. Desde el primer recorrido se medirán llamadas al modelo, tokens, ejecuciones de herramientas y almacenamiento para conocer el coste real. Esto no obliga a facturar cada componente por separado al cliente.

La unidad de procesamiento debe permitir anticipar el gasto. No se fija todavía un precio uniforme por conversación: dos conversaciones pueden tener cantidades muy diferentes de mensajes, llamadas y acciones. La retención básica incluida, los excesos y el tratamiento de cuentas sin actividad deben ser explícitos; dejar de procesar no elimina el coste interno de conservar información.

Antes de lanzar el cobro se debe concretar:

- Una unidad de consumo comprensible, con ejemplos y estimaciones previas.
- Cómo se separa el coste de OpenFunnel del coste de modelos y canales, especialmente con claves propias.
- Qué sucede con ejecuciones fallidas, reintentos y eventos duplicados; evitar doble cobro por un mismo evento repetido.
- Medición verificable, historial de consumo, límites de gasto y alertas; límites de ejecución que eviten consumo ilimitado por una tarea.
- Retención, exportación y eliminación de datos, incluidos los periodos sin actividad.
- Validar la hipótesis de saldo para procesamiento frente a otras modalidades, los costes de operación y soporte, y la viabilidad de operar sin mínimo mensual.

## Secuencia de construcción

1. **Primer recorrido completo y abierto:** una entrada elegida, una conversación con contexto persistente, un agente ejecutado por OpenFunnel con un proveedor inicial, tres etapas de Sales, intervención humana y una entrega por webhook confirmada. Incluir una bandeja mínima, una vista sencilla de etapas y medición del consumo. La base humana y el agente se validan juntos en este recorrido.
2. **Validación con usuarios:** probar el recorrido con conversaciones autorizadas, comprobar la calidad de los resultados, identificar al primer comprador y medir el trabajo ahorrado, las correcciones humanas necesarias y el coste de procesamiento. Ajustar los requisitos de la plantilla y la recuperación de fallos antes de ampliar funciones.
3. **Cloud inicial:** ofrecer el mismo recorrido administrado, con aislamiento entre clientes, claves de acceso, límites y un mecanismo de cobro cuya unidad se haya validado. La puesta en producción requiere resolver permisos, retención y operación del servicio.
4. **Expansión guiada por uso:** comprobar la reutilización del motor con una segunda plantilla y después ampliar Support, Commerce, canales y herramientas. Incorporar agentes externos y MCP sobre las operaciones existentes según la necesidad de los usuarios.

No se requiere una plataforma completa de bandejas, conectores o edición visual antes de probar el recorrido con IA. La API de procesamiento puntual y las demás modalidades forman parte de la visión, pero no es necesario implementarlas todas en la primera entrega.

### Criterios para dar por logrado el primer recorrido

- Conserva el contexto y la etapa entre mensajes y al retomar una conversación.
- Impide avanzar cuando faltan los requisitos configurados y registra las transiciones aplicadas.
- Detiene las respuestas automáticas al tomar el control una persona, incluidas las que estuvieran pendientes de envío; la devolución al agente es explícita.
- Permite revisar y corregir los datos recopilados antes de entregarlos.
- Distingue una entrega pendiente o fallida de una confirmada y permite recuperarla sin duplicar el resultado, mediante un contrato de idempotencia con el receptor.
- Registra cada ejecución, su resultado y consumo, y distingue reintentos del procesamiento original.
- Permite evaluar el resultado de negocio: datos requeridos correctos y recepción externa confirmada, no solo una respuesta generada.

## Para quién y alcance

- Empresas que necesitan procesar conversaciones y continuar el trabajo en sus sistemas actuales.
- Desarrolladores y agencias que conectan canales, AI agents y herramientas para sus clientes.
- Equipos pequeños que necesitan gestionar conversaciones y, opcionalmente, conservar prospectos sin adoptar un CRM completo.

Fuera del alcance inicial: booking o agenda de horas, productos separados como `OpenSupport` y `OpenCommerce`, y soporte simultáneo de todos los canales y dominios.

## Decisiones técnicas y pendientes

Stack inicial: React + Vite, Node.js y SQLite. Landing en HTML, CSS y JavaScript. Convenciones y comandos en `AGENTS.md` y `README.md`. La arquitectura de producción del cloud se evaluará cuando se concreten aislamiento, concurrencia y operación; este documento no decide un cambio de stack.

Pendiente:

- Validar quién pagará primero por el recorrido de calificación y entrega, qué trabajo le ahorra y qué nivel de corrección humana necesita.
- Elegir una entrada inicial: API o un canal concreto; WhatsApp sigue siendo un ejemplo. La segunda entrada puede añadirse después.
- Definir el primer proveedor de IA y el contrato de resultados.
- Especificar permisos, aprobaciones, retención y recuperación de entregas fallidas.
- Validar costes y unidad de pago por uso antes de fijar precios.
- Mantener separado el código operativo privado del cloud y preparar sus condiciones de servicio y privacidad antes del lanzamiento.
- Investigar alternativas y verificar disponibilidad de nombre y dominio.

La comunicación y la landing deben presentar Sales, Support y Commerce como plantillas o ejemplos de pipelines del motor conversacional, distinguiendo la primera plantilla a implementar de las capacidades futuras. La bandeja y el pipeline permiten supervisar conversaciones; las integraciones conectan con los sistemas de negocio.
