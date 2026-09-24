# Container runtime

## Purpose

Permitir construir y ejecutar la app de forma reproducible y aislada en contenedores,
conservando sus datos y contratos antes de preparar una instalación pública.

## ADDED Requirements

### Requirement: Construcción independiente del entorno local
La distribución en contenedores SHALL poder construirse desde las fuentes versionadas
y el lockfile sin depender de node_modules, compilaciones ni datos del equipo.
SHALL excluir secretos, bases locales y archivos privados del contexto de construcción
y de todas las capas; las imágenes de ejecución SHALL contener solo lo necesario
para operar, sin el servidor de desarrollo ni dependencias npm de desarrollo.

#### Scenario: Construcción desde un clon
- **WHEN** se construye la distribución con Docker y la configuración documentada
- **THEN** se generan imágenes identificables que sirven la app y la API sin requerir Node instalado en el host

#### Scenario: Archivos locales sensibles
- **WHEN** el árbol de trabajo contiene archivos de entorno, SQLite, respaldos o configuración privada
- **THEN** esos archivos no se envían al constructor ni aparecen en capas o recursos servidos

### Requirement: Entrada única y contratos HTTP conservados
La ejecución local SHALL exponer UI compilada y API bajo un mismo origen HTTP
vinculado solo a loopback del host; la API no tendrá un puerto publicado independiente.
SHALL conservar rutas, métodos, cookies, validación de Origin y firmas de webhook.
Los procesos de servicio SHALL ejecutarse sin root. Fuera de contenedores, la API
SHALL mantener loopback como dirección de escucha predeterminada.

#### Scenario: Acceso por el proxy
- **WHEN** el administrador inicia sesión, consulta datos y cierra sesión por la entrada de la app
- **THEN** recibe las respuestas y cookies previstas por los contratos existentes; una petición de negocio sin sesión no obtiene datos

#### Scenario: Rutas de API y archivos internos
- **WHEN** se solicita una ruta inexistente de API o un archivo interno como .env, SQLite o código del servidor
- **THEN** la API conserva su error JSON y el archivo interno no se entrega; no se disfraza el error de API como HTML de la app

#### Scenario: Webhook a través del proxy
- **WHEN** se envían eventos sintéticos con firma válida o inválida al proxy
- **THEN** el cuerpo y la firma llegan intactos a la API, que conserva su validación y deduplicación sin llamadas a cuentas reales

### Requirement: Configuración explícita y datos duraderos
Los secretos SHALL suministrarse al arrancar, sin incluirse en imágenes ni frontend.
La configuración de prueba SHALL estar separada de la instalación local existente.
La base y sus archivos auxiliares SHALL residir en almacenamiento persistente con
permiso de escritura para el servicio; recrear contenedores no deberá borrarlos ni
reinicializar registros. La topología soportada SHALL tener un único backend/worker
por base, con migraciones aditivas al arrancar.

#### Scenario: Recrear servicios
- **WHEN** se guardan registros y configuración, se detiene la instalación y se recrean sus contenedores conservando el volumen
- **THEN** los mismos registros y configuración siguen disponibles, sin duplicados ni pérdida de relaciones

#### Scenario: Configuración o almacenamiento inválidos
- **WHEN** faltan las credenciales requeridas por la receta de ejecución o el volumen no es escribible
- **THEN** el arranque no se presenta como una instalación operativa; el diagnóstico no revela secretos ni usa silenciosamente la base de otra instalación

### Requirement: Salud y ciclo de vida verificables
La instalación SHALL usar la comprobación real de SQLite existente para determinar
la salud de la API y comprobar la entrada web. SHALL permitir parada ordenada y
reinicio con la cola persistente existente; una terminación interrumpida no deberá
convertir un envío de resultado incierto en un reintento automático ciego.

#### Scenario: Servicio no disponible
- **WHEN** la API no puede iniciar o deja de responder
- **THEN** la comprobación de salud falla y no se afirma que UI accesible implique API operativa

#### Scenario: Parada y reinicio
- **WHEN** se solicita una parada normal y después se inicia la misma instalación
- **THEN** se conserva la integridad de SQLite y se aplica la recuperación existente de trabajos, sin iniciar otro worker sobre esa base

### Requirement: Procedimiento de operación local
La entrega SHALL documentar construcción, configuración, arranque, comprobaciones,
parada y recreación; distinguir parar de eliminar volúmenes y explicar que persistencia
no equivale a respaldo. La verificación SHALL usar datos y credenciales sintéticos,
sin cambiar canales operativos ni enviar mensajes a terceros.

#### Scenario: Verificación reproducible
- **WHEN** se ejecuta el procedimiento de prueba documentado
- **THEN** se obtienen resultados de login, API, recursos estáticos, errores, salud y persistencia en una instalación aislada, dejando intactos los datos existentes
