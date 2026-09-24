# Admin auth

## Purpose
Permitir administrar la plataforma con una única identidad de servidor y sesiones privadas, sin habilitar registro de nuevos accesos.

## ADDED Requirements

### Requirement: Acceso single user
El sistema SHALL autenticar únicamente `admin_user` y `admin_pass` configurados en servidor y denegar acceso de negocio cuando falten. Los usuarios del directorio no habilitan login.

#### Scenario: Login correcto
- **WHEN** el administrador presenta las credenciales configuradas
- **THEN** recibe una cookie de sesión HttpOnly, SameSite y Secure bajo HTTPS; la respuesta no contiene contraseña, hash ni token de sesión

#### Scenario: Credenciales incorrectas o configuración ausente
- **WHEN** el login usa credenciales inválidas o el servidor carece de configuración
- **THEN** no se crea sesión y se responde con error genérico 401 o indisponibilidad 503 respectivamente

#### Scenario: Registro y acceso alternativo
- **WHEN** se intenta registro público, cambio de contraseña por API o login de una persona del directorio
- **THEN** no se habilita otra identidad ni se modifican las credenciales del administrador

### Requirement: Sesión y protección de solicitudes
El sistema SHALL proteger cada endpoint de negocio, expirar sesiones a las 8 horas sin renovación automática, revocarlas al salir y validar el origen de las mutaciones. SHALL limitar a 10 intentos de login por minuto para esta instancia single user.

#### Scenario: Logout y caducidad
- **WHEN** la sesión fue cerrada o venció
- **THEN** acceder a un recurso de negocio devuelve 401 y la UI solicita login

#### Scenario: Solicitud desde otro origen
- **WHEN** una mutación tiene un origen distinto del configurado o carece de Origin
- **THEN** la API responde 403 sin cambiar registros

#### Scenario: Intentos excesivos
- **WHEN** se exceden diez solicitudes de login en un minuto
- **THEN** se responde 429 con tiempo de reintento

### Requirement: Rotación y persistencia
El sistema SHALL conservar una única identidad al reiniciar, almacenar solo un hash de contraseña e invalidar sesiones cuando cambien usuario o contraseña de servidor.

#### Scenario: Cambiar credenciales
- **WHEN** el servidor reinicia con un nuevo usuario o contraseña
- **THEN** las sesiones anteriores dejan de acceder y las nuevas credenciales habilitan la misma identidad de administrador
