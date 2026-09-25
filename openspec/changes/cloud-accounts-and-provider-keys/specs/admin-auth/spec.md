## MODIFIED Requirements

### Requirement: Acceso single user
En modo autohospedado, el sistema SHALL autenticar únicamente admin_user y admin_pass del servidor y denegar acceso de negocio cuando falten. Los usuarios del directorio no habilitan login. En modo cloud explícito, el sistema SHALL utilizar las cuentas verificadas de cloud-accounts en lugar de esas credenciales compartidas.

#### Scenario: Login correcto
- **WHEN** el administrador presenta las credenciales configuradas en modo autohospedado
- **THEN** recibe una cookie de sesión HttpOnly, SameSite y Secure bajo HTTPS; la respuesta no contiene contraseña, hash ni token de sesión

#### Scenario: Credenciales incorrectas o configuración ausente
- **WHEN** el login autohospedado usa credenciales inválidas o el servidor carece de configuración
- **THEN** no se crea sesión y se responde con error genérico 401 o indisponibilidad 503 respectivamente

#### Scenario: Registro y acceso alternativo
- **WHEN** en modo autohospedado se intenta registro público, cambio de contraseña por API o login de una persona del directorio
- **THEN** no se habilita otra identidad ni se modifican las credenciales del administrador

#### Scenario: Instalación autohospedada
- **WHEN** el administrador presenta las credenciales de servidor sin modo cloud
- **THEN** conserva su cookie privada y no existe registro público

#### Scenario: Acceso cloud
- **WHEN** se habilita cloud y una cuenta verificada inicia sesión
- **THEN** recibe una sesión privada asociada a su identidad y espacio, sin utilizar admin_user/admin_pass

### Requirement: Rotación y persistencia
El acceso autohospedado SHALL conservar su identidad y revocar sesiones al cambiar credenciales de servidor. Cloud SHALL conservar las identidades registradas y permitir recuperación de contraseña individual con revocación de sesiones según su contrato, sin modificar cuentas ajenas.

#### Scenario: Cambiar credenciales
- **WHEN** el servidor autohospedado reinicia con un nuevo usuario o contraseña
- **THEN** las sesiones anteriores dejan de acceder y las nuevas credenciales habilitan la misma identidad de administrador

#### Scenario: Rotación autohospedada
- **WHEN** cambia la contraseña del servidor en modo autohospedado
- **THEN** las sesiones anteriores se revocan sin crear otra identidad

#### Scenario: Recuperación cloud
- **WHEN** una cuenta restablece su contraseña mediante un token válido
- **THEN** invalida sus sesiones anteriores y conserva su espacio sin afectar a otros clientes
