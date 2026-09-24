# Platform health

## Purpose

Describir el contrato de salud que ya ofrece la API de OpenFunnel para comprobar
su disponibilidad y la conexión real con SQLite durante el desarrollo y la operación.

## Requirements

### Requirement: Comprobación real de SQLite
La API SHALL atender `GET /api/health` con una consulta real a SQLite y responder
en JSON con el resultado de la comprobación.

#### Scenario: Base de datos disponible
- **WHEN** se solicita `GET /api/health` y la consulta `SELECT 1 AS ok` se ejecuta correctamente
- **THEN** la API devuelve HTTP 200, `Content-Type: application/json; charset=utf-8` y `{"ok":true}`

#### Scenario: Error al ejecutar la consulta de salud
- **WHEN** la API está escuchando y falla la consulta SQLite del endpoint de salud
- **THEN** la API devuelve HTTP 503 y `{"ok":false}` sin exponer detalles internos en la respuesta

### Requirement: Rutas no implementadas
La API SHALL responder con un error JSON a las rutas o métodos que no implementa.

#### Scenario: Solicitud sin manejador
- **WHEN** se solicita una ruta inexistente o un método distinto de GET para `/api/health`
- **THEN** la API devuelve HTTP 404 y `{"error":"Ruta no encontrada"}`
