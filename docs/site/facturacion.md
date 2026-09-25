# Facturación con Polar

La facturación es opcional y pertenece al núcleo abierto. Cada instalación cloud
usa su propia cuenta de Polar, sus precios y sus créditos. OpenFunnel no cobra por
instalar el proyecto. Zernio y el proveedor de IA se pagan directamente con las
claves de cada cliente.

## Preparar la instancia

1. Crea productos **recurrentes mensuales de precio fijo** en el panel de Polar,
   sin prueba gratuita. Selecciona impuestos **Exclusive**. Los nombres, precios y
   monedas se leen desde Polar; no se escriben en el código.
2. Crea un Organization Access Token con `products:read`, `checkouts:write`,
   `customers:read`, `subscriptions:read` y `customer_sessions:write`.
3. Configura el backend y reinícialo:

```dotenv
APP_MODE=cloud
POLAR_TOKEN=tu_token_privado
POLAR_SERVER=sandbox
POLAR_WEBHOOK_SECRET=secreto_del_endpoint
BILLING_ENABLED=false
```

No uses `VITE_*` para secretos. `npm run dev:backend` carga `.env`, no
`.env.local`; este último lo carga Vite. Docker usa los equivalentes
`DOCKER_POLAR_TOKEN`, `DOCKER_POLAR_SERVER`, `DOCKER_POLAR_WEBHOOK_SECRET`
y `DOCKER_BILLING_ENABLED` de `.env.docker`.

4. Entra como dueño → **Administración → Facturación → Sincronizar productos**.
   Configura los créditos mensuales de cada producto y activa «Ofrecer este plan».
   Sincronizar no publica automáticamente todos los productos de tu organización.
5. En Polar → Settings → Webhooks, registra el endpoint **Raw**:

```text
https://tu-app.example.com/api/billing/polar/webhook
```

Selecciona la API version **2026-04**, formato **Raw**, y los eventos
`order.paid`, `order.refunded` y `subscription.updated`. El backend fija la misma
versión mediante `Polar-Version`; actualiza ambos tras verificar compatibilidad. Copia el secreto
al entorno. La URL exacta aparece en Administración; `PUBLIC_BASE_URL` debe apuntar
al backend público de la app, con `/api` redirigido correctamente.

6. En la configuración del portal Polar desactiva cambios de producto y múltiples
   suscripciones. Esta versión permite gestionar cancelación, método de pago y
   comprobantes; cambiar de plan requiere terminar la suscripción anterior. No hay
   prorrateos ni recargas de créditos. El checkout solicita impuestos exclusivos
   usando el precio vigente del producto.
7. Activa `BILLING_ENABLED=true` y reinicia la API cuando la configuración esté lista.
   Las cuentas sin período pagado podrán gestionar recursos, pero no ejecutar IA/tools.

## Probar antes de producción

Sandbox y producción tienen cuentas, tokens, productos y secretos separados.
`POLAR_SERVER=sandbox` conserva sus planes y saldos separados de producción.
El backend local necesita un túnel o Polar CLI para recibir eventos. Configurar
un dominio de producción no publica automáticamente un servidor local.

Realiza una compra de prueba, confirma la entrega del webhook y comprueba saldo,
una ejecución del agente y su historial. Prueba también renovación, pago fallido,
cancelación y reembolso. Al cambiar a `production`, sincroniza y configura los
productos de esa organización otra vez. Un test con respuestas simuladas no
certifica que tu cuenta de Polar esté lista para vender.

## Qué consume créditos

- Cada llamada completada al modelo: **1 crédito**.
- Cada herramienta ejecutada, incluso simulada en Probar: **1 crédito**.
- Validar proveedor realiza dos llamadas y una herramienta de prueba: **3 créditos**
  cuando todas las operaciones terminan correctamente.
- Leer recursos, editar prompts y enviar mensajes manuales: **0 créditos**.

Se reserva saldo antes de cada operación. Si falla, su reserva se devuelve. Los
pasos exitosos previos a otro fallo conservan su consumo. Reintentos técnicos del
mismo paso del run no duplican cargos. Los tokens del modelo no son créditos:
el proveedor de IA factura ese consumo por su cuenta.

Los créditos se asignan una vez por período pagado y no se acumulan. El siguiente
período obtiene su cupo completo solo tras confirmar el pago. Cancelar al final
del período conserva el saldo hasta el vencimiento; un reembolso total revoca los
créditos de esa orden. Un reembolso parcial conserva el cupo.

Cuando se agota el saldo no comienza otra operación. Puedes seguir leyendo,
configurando y respondiendo manualmente. Tras renovar, retoma explícitamente las
conversaciones pausadas: no se reenvían respuestas antiguas automáticamente.

## Cliente y administrador

**Facturación** muestra el plan, créditos disponibles, consumidos y reservados,
fin del período e historial. «Gestionar suscripción» abre una sesión temporal del
portal de Polar vinculada exclusivamente a la cuenta autenticada. Allí se
administran pagos, cancelación y comprobantes. No se guardan datos de tarjeta en
OpenFunnel.

**Administración → Facturación** permite sincronizar productos, cambiar créditos
y visibilidad, consultar suscripciones y consumo por cuenta y reintentar eventos
fallidos. Cambiar créditos no modifica un período ya acreditado. Cambiar precios
se hace en Polar y exige volver a sincronizar antes de nuevas compras; las
suscripciones existentes siguen las reglas de precio de Polar.

Los webhooks se firman, verifican y guardan antes de responder. El worker consulta
el estado de la suscripción y procesa las entregas pendientes. Los duplicados no
vuelven a acreditar. Hay hasta ocho intentos con espera creciente; después el
administrador puede reintentar. Consulta también las entregas del panel de Polar.
Nunca concedas créditos manualmente basándote únicamente en una redirección de checkout.

Respalda toda la carpeta cloud y conserva los secretos por separado. Debe haber
una única API/worker por SQLite. Al reiniciar, las reservas interrumpidas se
liberan a favor del cliente.

Referencias: [autenticación](https://polar.sh/docs/integrate/authentication),
[checkout](https://polar.sh/docs/features/checkout/session),
[webhooks](https://polar.sh/docs/integrate/webhooks/delivery).
