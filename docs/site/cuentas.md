# Cuentas, correos y conexiones

Estas capacidades están incluidas en el código abierto. Cada instalación tiene
su propio dueño. Las [suscripciones con créditos](./facturacion.html) son opcionales
y se configuran con la cuenta Polar del operador.

## Elegir modo

`APP_MODE=self-hosted` es el valor predeterminado y conserva `admin_user` y
`admin_pass`, sin registro público. `APP_MODE=cloud` habilita cuentas independientes
con Better Auth: registro, correo verificado, acceso y recuperación de contraseña.
Cualquiera que despliegue el repositorio puede usar este modo.

No cambies una instalación con datos directamente a cloud: usa primero el
procedimiento de traslado descrito más abajo. Las bases son distintas y los datos
anteriores nunca se entregan al primer registrante.

## Configurar Resend y al dueño

Ejemplo de variables del servidor, usando valores propios:

```dotenv
APP_MODE=cloud
APP_ORIGIN=https://app.example.com
PUBLIC_BASE_URL=https://app.example.com
CLOUD_DATA_DIR=backend/data/cloud
CLOUD_OWNER_EMAIL=owner@example.com
CLOUD_MAX_ACCOUNTS=100
BETTER_AUTH_SECRET=REEMPLAZAR_POR_UN_SECRETO_DE_AL_MENOS_32_CARACTERES
PROVIDER_ENCRYPTION_KEY=REEMPLAZAR_POR_64_CARACTERES_HEXADECIMALES
RESEND_API_KEY=REEMPLAZAR_POR_TU_CLAVE
RESEND_FROM="Mi instancia <noreply@example.com>"
```

Genera cada secreto por separado con
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Conserva la clave de cifrado fuera de SQLite, en un gestor de secretos y en un
respaldo privado. No uses `VITE_*` ni subas el archivo de entorno al repositorio.

En Resend añade tu dominio, publica los registros DNS solicitados y espera su
verificación. Usa un remitente de ese dominio en `RESEND_FROM`. No necesitas
crear un buzón para enviar desde `noreply`. La clave permanece en backend.
Consulta la [documentación de dominios de Resend](https://resend.com/docs/dashboard/domains/introduction).

El dueño debe registrarse y verificar el correo de `CLOUD_OWNER_EMAIL`; recién
entonces obtiene `superadmin`. No hay correo propietario codificado ni contraseña
creada automáticamente. Los demás registros son clientes. Cambiar la variable
no transfiere la propiedad: si ya existe dueño, el arranque rechaza el cambio.
Una transferencia exige migración administrativa explícita, no otro registro.

## Registro y recuperación

En la pantalla de acceso pulsa **Crear cuenta**. Usa una contraseña de 12–128
caracteres y abre el enlace recibido. Pulsa **Verificar correo** y luego entra.
Los enlaces vencen después de una hora y son de un solo uso. No puedes acceder
a recursos ni conectar proveedores antes de verificar el correo.

Desde el acceso puedes reenviar la verificación o recuperar la contraseña.
Espera al menos un minuto entre solicitudes de correo. Recuperar la contraseña
revoca las sesiones anteriores. La respuesta de recuperación es la misma para
correos existentes y desconocidos.

La verificación reduce altas con correos falsos; no es una garantía contra bots.
La instancia limita intentos de acceso y envíos, y permite hasta `CLOUD_MAX_ACCOUNTS`
registros (100 por defecto, máximo 500). Incluye cuentas pendientes de verificar;
el operador debe revisar capacidad y abuso antes de abrir un servicio público.

## Espacios y administración

Cada cuenta tiene un espacio propio. Usuarios del directorio, contactos,
conversaciones, archivos, prompts, claves y colas quedan dentro de ese espacio.
Crear una persona en «Usuarios» no le concede login. No hay equipos ni invitaciones.

Solo el dueño ve **Administración**: cuentas verificadas, estado y suspensión o
reactivación. Suspender revoca sesiones, bloquea API keys y detiene nuevos efectos
del agente. Una petición que ya llegó al proveedor puede haber tenido efecto;
los envíos inciertos requieren revisión y no se reintentan automáticamente.
Reactivar exige volver a iniciar sesión y revisar las conversaciones antes de
retomar automatización. El panel no muestra secretos ni conversaciones ajenas.

## Conectar tus proveedores

En **Canales → Configurar Zernio** introduce la API key de tu cuenta de
[Zernio](https://zernio.com). Después, usa **Conectar canal** o **Sincronizar canales**
y configura la recepción desde **Configurar recepción**. La interfaz ya no ofrece
crear canales manuales; los registros existentes se conservan.
Cada espacio tiene una URL y una firma propias; no copies el webhook de otro espacio.

En **Agentes IA → Configurar proveedor de IA** introduce URL base, API key y modelo
o deployment. Todos los agentes del espacio comparten esa conexión. Para Azure,
usa el endpoint v1 y el nombre del deployment. No hay campos de proveedor/modelo
en el formulario individual de cada agente.

El formulario permite completar la URL de [OpenAI Platform](https://platform.openai.com)
(`https://api.openai.com/v1`) o [OpenRouter](https://openrouter.ai)
(`https://openrouter.ai/api/v1`), o introducir otro proveedor compatible con
Chat Completions. Cada uno requiere su propia API key. Escribe el ID exacto del
modelo con soporte de herramientas; los enlaces a sus catálogos están junto al campo.
Cambiar la URL limpia la clave escrita y exige una nueva al sustituir una conexión.
Guardar no comprueba la disponibilidad del modelo: usa la validación explícita del agente.

En self-hosted, `.env` tiene prioridad: la UI pide solo los valores ausentes. En
cloud, las claves globales Zernio/LLM del operador no se heredan: cada cliente
aporta sus claves y paga directamente a los proveedores.

Las conexiones se cifran con AES-256-GCM en la SQLite del espacio. Tras guardar,
la clave no vuelve al navegador: ves su estado y puedes reemplazarla. Dejar la
clave vacía conserva la actual, salvo al cambiar URL, que exige una clave nueva.
Los valores ya configurados por entorno no pueden reemplazarse desde la app.

Guardar no realiza pruebas de pago ni activa IA o envíos. Cambiar una conexión
pausa automatización e invalida respuestas pendientes. Revisa sincronización,
webhook y comprobación del modelo antes de reactivar. Comprobar IA y probar un
agente sí llaman a tu proveedor y consumen tokens.

`LLM_ALLOWED_HOSTS` controla los destinos configurables, con hosts exactos o
sufijos `*.dominio`. El valor predeterminado permite OpenAI, OpenRouter y endpoints Azure.
Para otro proveedor, el operador añade su host; no se acepta HTTP, puertos
alternativos, credenciales en URL, redirecciones ni DNS a redes internas.
La conexión valida DNS al abrir el socket. Conserva además las restricciones de
salida y acceso a redes privadas del despliegue.

## API por espacio

Las API keys conservan sus permisos acotados. En cloud, incluye además:

```http
Authorization: Bearer TU_API_KEY
X-OpenFunnel-Workspace: ID_DE_TU_ESPACIO
```

La pantalla **Claves API** muestra el ID. Una clave de otro espacio no funciona
con ese encabezado. Las sesiones del navegador resuelven el espacio en servidor;
no lo cambian mediante encabezados. No combines cookie de sesión y Bearer.
Las API keys no administran cuentas ni conexiones. Ver [API](./api.html).

## Docker, respaldo y restauración

Usa los equivalentes `DOCKER_*` de `.env.docker.example` con
`docker compose --env-file .env.docker up -d --build`. En cloud, `DOCKER_ADMIN_*`
no es necesario; Resend, dueño, secreto de sesión y clave de cifrado sí lo son.
Compose conserva todas las bases en `/app/data/cloud` del volumen persistente.

Solo un proceso API administra las SQLite y sus workers. No ejecutes dos réplicas
contra el mismo directorio. El proceso recupera trabajo pendiente de todos los
espacios activos al arrancar, incluso si nadie vuelve a entrar.

Respalda **control.sqlite y workspaces/*.sqlite como un conjunto**, junto con el
entorno privado por separado. Para una copia consistente, detén la API, respalda
el directorio completo (incluidos archivos WAL si existen) y reiníciala; nunca
copies solo una SQLite activa ignorando WAL. Guarda copias cifradas fuera del host
y ensaya restauración en una instalación aislada sin conexiones operativas.
Restaurar solo las bases sin la clave maestra deja las conexiones ilegibles.

No cambies `PROVIDER_ENCRYPTION_KEY` sin recifrar antes todas las conexiones.
`rebindConnections` en `backend/provider-connections.js` permite recifrar una
copia offline de cada base con las claves antigua/nueva y su ID de espacio.
Prueba que cada copia abre con la nueva clave antes de sustituir el conjunto;
conserva respaldos y la clave anterior para reversión. La misma clave deriva las
firmas de webhooks cloud: tras rotarla vuelve a registrar cada webhook.

## Trasladar una instalación existente

1. Respalda la base original y el entorno privado. Prepara una instalación cloud
   separada, registra y verifica al dueño. **No inicies sesión todavía**: así su
   base de espacio aún no se ha creado.
2. Detén ambas APIs. Ejecuta desde la raíz, con el entorno cloud y clave maestra
   que abre las conexiones originales:
   `node --env-file=.env.cloud scripts/migrate-cloud-owner.js /ruta/original.sqlite --offline`.
3. El script crea una copia para el dueño verificado. Rechaza destinos existentes,
   preserva IDs, registros y archivos, elimina credenciales de login antiguas de
   la copia y comprueba integridad y claves foráneas. La fuente queda intacta.
4. Las colas se conservan como registros, pero respuestas pendientes se cancelan,
   envíos interrumpidos quedan inciertos y automatización queda pausada. Revisa
   conexiones propias, webhooks y conversaciones antes de reactivar. Si antes
   usabas claves solo de entorno, introdúcelas en el espacio del dueño.
5. Arranca únicamente cloud, comprueba los datos y el acceso con cuentas aisladas.
   Para revertir antes de operar mensajes reales, detén cloud y vuelve a la fuente
   preservada con su entorno. No ejecutes ambos workers ni mezcles historiales.

El ensayo automatizado usa datos sintéticos; no migra producción ni prueba la
entrega real de mensajes. El lanzamiento comercial necesita además respaldos
externos, condiciones del servicio y verificar los pagos en sandbox antes de activarlos.
