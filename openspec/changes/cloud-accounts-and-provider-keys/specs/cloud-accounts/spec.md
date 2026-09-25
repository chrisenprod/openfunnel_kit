## Purpose
Permitir operar OpenFunnel Cloud con cuentas verificadas, espacios separados y administración del servicio, sin compartir los datos ni las credenciales de clientes.

## ADDED Requirements

### Requirement: Registro y recuperación cloud
En modo cloud, el sistema SHALL ofrecer registro por email y contraseña con Better Auth, verificación del correo y recuperación mediante Resend, acceso y cierre de sesión. SHALL requerir verificación antes de acceder a recursos o conectar proveedores. SHALL mantener hashes de contraseña, tokens temporales de un solo uso y respuestas que no enumeren cuentas en recuperación. El registro SHALL crear únicamente el rol cliente. Los campos desconocidos de rol o pertenencia SHALL rechazarse.

#### Scenario: Alta verificada
- **WHEN** una persona completa el registro y verifica su correo
- **THEN** accede a un único espacio nuevo sin registros ni secretos de otros clientes

#### Scenario: Elevación desde registro
- **WHEN** una petición de registro incluye superadmin, roles o un espacio ajeno
- **THEN** se rechaza sin asignar privilegios ni pertenencias

#### Scenario: Recuperación y abuso
- **WHEN** se solicita recuperación, se reutiliza un token o se excede el límite de intentos
- **THEN** se aplican respuestas no enumerables, caducidad, uso único y límites sin exponer secretos

### Requirement: Ayuda al introducir contraseña
Los formularios cloud SHALL permitir mostrar y ocultar la contraseña mediante un botón accesible, sin enviar el formulario ni cambiar el valor. Registro y restablecimiento SHALL mostrar el requisito mínimo de 12 caracteres en rojo mientras esté pendiente y verde al cumplirse, acompañado de texto e icono. SHALL conservar el máximo de 128 caracteres, autocompletado y validación del servidor. Cambiar de formulario SHALL ocultar y limpiar la contraseña.

#### Scenario: Cumplimiento en tiempo real
- **WHEN** la persona escribe, pega o borra caracteres al crear su cuenta
- **THEN** el requisito cambia al alcanzar 12 caracteres y vuelve a pendiente al bajar de ese mínimo

#### Scenario: Mostrar y ocultar
- **WHEN** la persona activa el control de visibilidad con ratón o teclado
- **THEN** cambia la visibilidad conservando el valor y sin registrar la cuenta ni enviar correos

### Requirement: Propietario de la instancia
El sistema SHALL distinguir superadmin y cliente mediante autorización backend. El superadmin inicial SHALL asignarse únicamente al correo configurado mediante CLOUD_OWNER_EMAIL después de verificarlo. Cualquier despliegue del núcleo abierto SHALL poder configurar su propio dueño sin modificar código. No SHALL existir un correo propietario predeterminado, ni asignarse el rol por orden de registro o datos enviados desde frontend. La variable no SHALL crear cuentas ni contraseñas automáticamente. El directorio de negocio users SHALL continuar sin conceder acceso.

#### Scenario: Propietario verificado
- **WHEN** se verifica la identidad configurada por el operador
- **THEN** se habilita su panel de administración cloud y los demás registros conservan rol cliente

#### Scenario: Autorización del panel
- **WHEN** un cliente llama directamente a un endpoint de administración cloud
- **THEN** recibe denegación aunque conozca identificadores de otras cuentas

#### Scenario: Dueño en otra instalación
- **WHEN** quien despliega un clon configura CLOUD_OWNER_EMAIL con su propio correo y registra y verifica esa cuenta
- **THEN** obtiene superadmin solo en esa instancia sin depender del correo del operador del cloud oficial

### Requirement: Aislamiento integral
El sistema SHALL resolver el espacio desde la sesión o credencial autenticada en servidor. SHALL aislar CRUD, búsquedas, relaciones, documentos originales, versiones, API keys, pruebas, conexiones, webhooks, colas y workers. Los callbacks y firmas de webhook SHALL estar vinculados al espacio correcto. El superadmin no SHALL recibir claves descifradas ni acceso implícito al contenido de conversaciones de clientes.

#### Scenario: Referencia cruzada
- **WHEN** una cuenta utiliza el ID de un recurso, documento o relación de otra
- **THEN** la operación se deniega sin leer ni modificar datos de la otra cuenta

#### Scenario: Trabajo en segundo plano
- **WHEN** llega un webhook o se ejecuta trabajo sin sesión del navegador
- **THEN** se utilizan exclusivamente la base, secretos y recursos del espacio al que pertenece

#### Scenario: API key cruzada
- **WHEN** una clave válida de un espacio intenta acceder a otro
- **THEN** se deniega la operación y se mantienen sus permisos limitados originales

### Requirement: Administración mínima
El superadmin SHALL poder listar cuentas paginadas, consultar estado y suspender o reactivar un cliente. SHALL proteger su propia cuenta de suspensión y no permitir a clientes cambiar roles. La suspensión SHALL revocar acceso, impedir nuevas ejecuciones y revalidar trabajo pendiente antes del envío. Las entregas inciertas no SHALL reintentarse automáticamente.

#### Scenario: Suspender cuenta
- **WHEN** el superadmin suspende un cliente
- **THEN** sus sesiones, API keys y nuevas operaciones dejan de acceder y el worker evita enviar trabajo pendiente

### Requirement: Activación y conservación de datos
Cloud SHALL habilitarse explícitamente, con correo y secretos configurados. El arranque no SHALL convertir silenciosamente la base autohospedada ni asignar su contenido al primer registrante. SHALL existir un procedimiento verificado de migración al espacio del propietario y recuperación con respaldos.

#### Scenario: Instalación existente
- **WHEN** se actualiza una instalación sin activar cloud
- **THEN** conserva sus datos y acceso actual sin abrir registro público
