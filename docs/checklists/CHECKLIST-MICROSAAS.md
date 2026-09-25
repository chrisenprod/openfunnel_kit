# Checklist reutilizable: de app a microSaaS

Plantilla para convertir una aplicación en un microSaaS y seguir el proceso en un
curso. Complementa los checklists de [MVP](CHECKLIST-MVP.md) e
[infraestructura y producción](CHECKLIST-INFRAESTRUCTURA-PRODUCCION.md).
Copiar a cada proyecto, adaptar las decisiones y marcar las tareas al completarlas.
Las casillas no representan el estado de implementación de OpenFunnel.

Antes de empezar, definir quién usará la app, qué representa una cuenta o espacio
de trabajo y qué servicio se cobrará. Registrar el alcance en el PRD y concretar
cada bloque en OpenSpec antes de implementarlo. Seguir el orden **correos → usuarios
y superadmin → multitenancy y API keys → términos y privacidad → pagos con Polar.sh**; las cuentas pueden avanzar
mientras se termina de definir el modelo comercial.

## Correos con Resend

- [ ] **1. Configurar Resend.** Crear la cuenta del servicio, verificar el dominio remitente mediante los registros DNS indicados y definir la dirección de envío. Guardar la API key únicamente en el servidor y documentar la configuración con valores de ejemplo. Separar los entornos de prueba y producción.

- [ ] **2. Integrar los correos transaccionales.** Conectar Resend con la autenticación de la app para enviar verificación de correo y recuperación de contraseña. Preparar plantillas con el nombre del producto, instrucciones claras y enlaces al dominio correcto. Gestionar fallos de envío, reenvíos y límites de frecuencia; comprobar la recepción real en una bandeja controlada además de las pruebas simuladas.

## Usuarios y superadmin

- [ ] **3. Crear el registro y el acceso de usuarios.** Configurar la autenticación con Better Auth o la solución elegida para el proyecto. Implementar creación de cuenta, inicio y cierre de sesión, validación de formularios, protección de sesiones y límites de intentos. Definir los estados de la cuenta y mostrar mensajes de error que no permitan averiguar si un correo está registrado.

- [ ] **4. Validar el correo electrónico.** Enviar el enlace al registrarse, mostrar el estado pendiente y permitir solicitar uno nuevo con un tiempo de espera. Usar enlaces temporales de un solo uso y definir qué acciones requieren una cuenta verificada. Comprobar enlaces válidos, caducados y reutilizados, y aplicar las restricciones también en el backend.

- [ ] **5. Recuperar y cambiar la contraseña.** Añadir solicitud de recuperación, correo con enlace temporal y formulario para establecer una contraseña nueva. Invalidar el enlace después de usarlo y revocar las sesiones anteriores al completar la recuperación. Verificar el recorrido completo, incluidos enlaces caducados, intentos repetidos y fallos de envío.

- [ ] **6. Crear el usuario superadmin.** Definir un procedimiento explícito y reproducible para crear o asignar al administrador de la plataforma, con identidad verificada. Separar este rol de los administradores de cada cliente y evitar que el registro público permita elegirlo. Proteger sus operaciones en el servidor y definir cómo recuperar el acceso administrativo.

- [ ] **7. Implementar la gestión de usuarios y cuentas.** Crear el panel mínimo para consultar cuentas, revisar su estado y suspenderlas o reactivarlas. Definir quién puede cambiar roles y registrar las acciones administrativas. Evitar que una operación deje la plataforma sin un administrador; comprobar que una suspensión bloquee sesiones, API keys y tareas en segundo plano según las reglas del producto.

## Multitenancy y API keys

- [ ] **8. Definir el modelo multitenant.** Decidir si cada cliente tendrá un espacio individual o una organización con miembros y roles. Elegir una estrategia de separación de datos adecuada al stack y crear la pertenencia al espacio desde el servidor. Si se necesitan invitaciones o cambio de espacio, especificar sus permisos y estados antes de implementarlos.

- [ ] **9. Aislar los datos y las operaciones de cada cliente.** Aplicar el contexto del espacio a consultas, archivos, relaciones, integraciones, webhooks y trabajos en segundo plano. Validar la pertenencia en cada operación, sin confiar solo en un identificador enviado por el navegador. Probar con al menos dos clientes que ninguno pueda leer, modificar o ejecutar acciones sobre recursos del otro, incluso alterando las peticiones.

- [ ] **10. Gestionar las API keys de acceso a la app.** Si la app expone una API, permitir crear, identificar, limitar permisos, caducar y revocar claves por espacio. Mostrar el secreto solo al crearlo y almacenar una huella para validarlo. Aplicar autorización, aislamiento y límites de uso a cada petición; comprobar claves revocadas, permisos insuficientes y accesos cruzados entre clientes.

- [ ] **11. Gestionar las credenciales de servicios externos.** Definir qué integraciones paga y configura la plataforma y cuáles conecta cada cliente con sus propias API keys. Guardar las credenciales por espacio, cifradas y con la clave de cifrado fuera de la base de datos; permitir reemplazarlas y eliminarlas sin mostrarlas en respuestas ni logs. Validar los destinos configurables y probar conexión, rotación, revocación y fallos sin ejecutar acciones operativas inesperadas.

## Términos de servicio y privacidad

- [ ] **12. Crear los Terms of Service (Términos de servicio).** Identificar al prestador, país y contacto; describir el servicio, las responsabilidades de las partes, uso permitido, proveedores externos, precios, cancelación, reembolsos y suspensión según el producto real. Si se ofrece código abierto y cloud, separar la licencia del software de las condiciones del alojamiento y aclarar quién opera cada instalación. Publicar una página con URL estable, enlazarla desde la landing y el registro, y definir cómo registrar su versión y aceptación cuando corresponda. Revisar el texto antes de lanzar; no copiar prestaciones ni garantías de otra aplicación.

- [ ] **13. Crear la Privacy Policy (Política de privacidad).** Inventariar datos, finalidades, fundamento del tratamiento, responsables, proveedores, transferencias, cookies, conservación, eliminación y canales para ejercer derechos. Adaptar el contenido al funcionamiento real, incluida la transmisión de datos a Resend, IA y pagos cuando se utilicen. Distinguir al operador del cloud de quien autohospeda el código. Publicar una URL estable y accesible sin login, enlazarla desde la landing y el registro, y usarla en las configuraciones de proveedores que la soliciten. Implementar consentimiento para los tratamientos que lo requieran y comprobar que la práctica coincide con lo publicado.

## Pagos con Polar.sh

- [ ] **14. Definir el modelo de cobro.** Elegir suscripción, créditos o pago único según el servicio. Documentar precios, moneda, límites, periodo de prueba si corresponde y qué ocurre al cancelar, vencer o agotar el saldo. Definir reembolsos y quién asume los costes de servicios externos; convertir estas decisiones en criterios de aceptación antes de implementar los cobros.

- [ ] **15. Preparar la organización y los entornos.** Crear la organización en [Polar.sh](https://polar.sh/docs/merchant-of-record/introduction), comprobar la elegibilidad del negocio y país, completar la verificación requerida y configurar las URLs públicas de términos y privacidad. Preparar primero su [sandbox](https://polar.sh/docs/integrate/sandbox), con productos, tokens y webhooks separados de producción. Documentar las responsabilidades de Polar como Merchant of Record y las del operador de la app.

- [ ] **16. Crear el Organization Access Token.** Para cobrar con la organización del operador, usar un token de organización; reservar OAuth para una integración que conecte organizaciones de terceros. Conceder solo los permisos del flujo implementado y comprobarlos con peticiones del backend. Guardar el token en el servidor y documentar su configuración sin valores reales. Ver la tabla de referencia inferior y la [autenticación de Polar](https://polar.sh/docs/integrate/authentication).

- [ ] **17. Crear los productos en el panel de Polar.** Definir nombre, descripción, imagen, precio, moneda, periodicidad y prueba gratuita si corresponde. Decidir si los impuestos se incluyen o se añaden al precio y mostrarlo de forma coherente en la app y el checkout. Establecer qué ocurre con clientes existentes cuando cambia un precio o se retira un producto. Cada operador debe poder usar sus propios productos y precios, sin modificar el código. Ver [productos](https://polar.sh/docs/features/products) e [impuestos incluidos o adicionales](https://polar.sh/docs/features/tax-inclusive-pricing).

- [ ] **18. Crear el panel administrativo de planes.** Permitir sincronizar el catálogo, elegir qué productos ofrecer, asociar prestaciones o créditos y publicar o retirar cada plan. Importar un producto no debe publicarlo automáticamente. Validar que moneda, periodicidad y tipo de precio sean compatibles con la app; conservar las condiciones aceptadas en cada compra. Restringir estas acciones al administrador de la instancia y registrar sus cambios.

- [ ] **19. Configurar el webhook en Polar.** Registrar la URL pública del backend en los ajustes de la organización, elegir formato `Raw`, seleccionar los eventos implementados y guardar el secreto del endpoint en el servidor. Fijar una versión de API compatible tanto en las peticiones como en el webhook; no depender de la versión predeterminada del proveedor. Para desarrollo local, usar un túnel hacia el backend. Conservar URL, entorno, versión y eventos como referencia reproducible. Ver [configuración de webhooks](https://polar.sh/docs/integrate/webhooks/endpoints).

- [ ] **20. Implementar el checkout.** Crearlo desde el backend con un producto publicado y vincular el cliente de Polar al espacio autorizado mediante un identificador estable. Validar producto y condiciones en el servidor; evitar compras concurrentes o suscripciones duplicadas según las reglas del negocio. Delegar los datos de tarjeta en Polar y mostrar estados de pago pendiente, completado o cancelado. El retorno del navegador no demuestra que exista un pago. Ver [sesiones de checkout](https://polar.sh/docs/features/checkout/session).

- [ ] **21. Procesar pagos y cambios de suscripción.** Validar la firma sobre el cuerpo original y la antigüedad de la petición antes de procesarla. Persistir eventos válidos, responder pronto y gestionar reintentos sin duplicar activaciones ni créditos. Contemplar eventos repetidos, retrasados o fuera de orden; contrastar el estado con Polar cuando sea necesario. Definir acceso ante impago, cancelación al final del periodo, revocación y reembolso parcial o total. Ver [validación y entregas](https://polar.sh/docs/integrate/webhooks/delivery).

- [ ] **22. Contar créditos, si el modelo los utiliza.** Definir qué acción consume una unidad, incluidos pruebas, herramientas y operaciones fallidas cuando corresponda. Reservar saldo de forma atómica antes de ejecutar, confirmar al completar y liberar reservas según la política de errores. Evitar doble consumo por reintentos y saldo negativo por concurrencia; recuperar operaciones interrumpidas. Definir renovación, caducidad, acumulación y ajustes por reembolso, manteniendo un historial por cuenta. Probar agotamiento y reposición sin depender solo de restricciones visuales.

- [ ] **23. Crear la gestión de facturación del cliente.** Abrir una sesión del [portal de Polar](https://polar.sh/docs/features/customer-portal/navigate-customers) desde el backend para la cuenta autorizada. Mostrar plan, próxima renovación, saldo, consumo e historial; enlazar comprobantes y gestión del medio de pago. Decidir si se permiten cambios de plan y cuándo se aplican, con sus reglas de prorrateo y créditos. Alinear esas decisiones con la configuración del portal y comprobar el aislamiento entre clientes.

- [ ] **24. Preparar operación y recuperación.** Mostrar al administrador el estado de conexión, planes publicados, última entrega verificada y eventos pendientes o fallidos, sin revelar secretos. Permitir reintentos seguros y conciliación con Polar para recuperar eventos perdidos. Definir avisos de pago fallido, saldo bajo y fallos persistentes de sincronización según el producto. Tener un secreto configurado no demuestra que el webhook esté llegando.

### Referencia: permisos del token

Permisos para un flujo que consulta productos, crea checkouts, consulta clientes y
suscripciones y abre el portal. Adaptarlos si cambia la implementación:

| Permiso | Uso en el backend |
| --- | --- |
| `products:read` | Consultar y sincronizar el catálogo de productos. |
| `checkouts:write` | Crear la sesión de checkout. |
| `customers:read` | Consultar el cliente y su estado. |
| `subscriptions:read` | Consultar y conciliar suscripciones. |
| `customer_sessions:write` | Crear una sesión del portal del cliente. |

Crear productos y registrar el webhook manualmente en el panel de Polar no exige
`products:write` ni `webhooks:write` en el token de la app. Añadir permisos como
`webhooks:write`, `subscriptions:write` o `refunds:write` solo si el backend va a
realizar esas operaciones mediante la API. No activar todos los permisos por defecto.

### Referencia: eventos y webhook secret

El **webhook secret no tiene permisos o scopes**. Sirve para verificar la firma de
las notificaciones recibidas; los eventos se eligen al configurar el endpoint en
Polar. Es distinto del Organization Access Token y no lo reemplaza.

Eventos de referencia para una suscripción con saldo por periodo; ajustar la lista
al contrato del backend y probar cada evento seleccionado:

| Evento | Tratamiento esperado en la app |
| --- | --- |
| `order.paid` | Confirmar el pago y conceder el periodo o saldo correspondiente una sola vez. |
| `order.refunded` | Aplicar la política de reembolso y ajustar derechos o saldo, distinguiendo reembolso parcial y total. |
| `subscription.updated` | Sincronizar estado, fechas y cancelación; no conceder créditos solo por recibir una actualización. |

Consultar el [catálogo de eventos](https://polar.sh/docs/integrate/webhooks/events)
si se necesitan otros flujos. Recibir estos eventos no requiere permisos
`webhooks:read` o `webhooks:write` en el token; requiere un endpoint configurado y
validación de su firma.

### Referencia: configuración y respaldo

Nombres de variables sugeridos para la app; son una convención del proyecto, no
nombres obligatorios impuestos por Polar:

```dotenv
# Enable billing only after validating the complete flow.
BILLING_ENABLED=false
# Keep sandbox and production resources separate.
POLAR_SERVER=sandbox
# Organization Access Token; backend only.
POLAR_TOKEN=
# Signing secret from the matching Polar webhook endpoint.
POLAR_WEBHOOK_SECRET=
```

- [ ] Documentar qué archivo de entorno carga realmente el backend (`.env`, `.env.local` u otro), cómo se inyecta en producción y cuándo hay que reiniciar el servicio. Publicar solo ejemplos vacíos, nunca variables de secretos con prefijo `VITE_`.
- [ ] Guardar token y webhook secret en un gestor de secretos o respaldo cifrado con acceso restringido. Documentar responsable, entorno, permisos y procedimiento de rotación; no incluir valores en Git, capturas, tickets ni logs.
- [ ] Conservar sin secretos el identificador de organización, endpoint, URL, versión de API, eventos y correspondencia entre productos y planes de cada entorno. Ejemplo de URL adaptable: `https://tu-app.example.com/api/billing/polar/webhook`.
- [ ] Respaldar la configuración de planes y el historial de pagos, eventos y créditos. Probar restauración y conciliación sin conceder créditos duplicados. Rotar una credencial expuesta y verificar la conexión tras actualizarla.

## Validación y puesta en marcha

- [ ] **25. Validar el recorrido completo en sandbox.** Recorrer registro, recepción del correo, verificación, acceso, recuperación de contraseña, creación del espacio, API keys, selección de plan, compra y portal. Comprobar que un webhook real confirme el pago y actualice acceso y saldo. Probar duplicados, firma inválida, reordenamiento, renovación, impago, cancelación, reembolso, aislamiento y agotamiento de créditos. Revisar móvil, teclado, textos y enlaces legales; ejecutar pruebas automatizadas, compilación y validación de especificaciones.

- [ ] **26. Activar producción.** Completar el checklist de infraestructura y producción; preparar migración, respaldos y restauración si ya existen usuarios. Configurar organización, token, productos, webhook y secreto de producción; volver a seleccionar y publicar los planes del entorno final. Confirmar precios, impuestos y reglas del portal, realizar una comprobación real autorizada con una cuenta controlada y revisar la entrega firmada antes de abrir el servicio. Documentar cómo deshabilitar nuevas compras ante una incidencia sin perder el historial ni el procesamiento de pagos existentes.

Para cada paso, conservar instrucciones reproducibles, resultados y pendientes en
el proyecto que use la plantilla. Distinguir pruebas simuladas, pruebas con servicios
externos y comprobaciones en producción. El seguimiento de implementación de cada
app pertenece a sus tareas y registros de verificación.
