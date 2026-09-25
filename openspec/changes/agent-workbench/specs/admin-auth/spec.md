# Admin auth delta

## MODIFIED Requirements

### Requirement: Sesión y protección de solicitudes
El sistema SHALL proteger cada endpoint de negocio, expirar sesiones a las 8 horas sin renovación automática, revocarlas al salir y validar el origen de las mutaciones autenticadas por cookie. SHALL aceptar Bearer únicamente en rutas habilitadas por permiso; un Bearer inválido no recurre a la cookie y una solicitud que mezcla Bearer con cookie se rechaza. SHALL limitar a 10 intentos de login por minuto para esta instancia single user.

#### Scenario: Logout y caducidad
- **WHEN** la sesión fue cerrada o venció
- **THEN** acceder a un recurso de negocio devuelve 401 y la UI solicita login

#### Scenario: Solicitud desde otro origen
- **WHEN** una mutación autenticada por cookie tiene un origen distinto del configurado o carece de Origin
- **THEN** la API responde 403 sin cambiar registros

#### Scenario: Intentos excesivos
- **WHEN** se exceden diez solicitudes de login en un minuto
- **THEN** se responde 429 con tiempo de reintento
