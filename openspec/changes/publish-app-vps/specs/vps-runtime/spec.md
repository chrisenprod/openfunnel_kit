## ADDED Requirements

### Requirement: Acceso aislado
La instalación SHALL exponer la app mediante HTTPS y bloquear acceso directo
externo a sus contenedores y al puerto interno, conservando otros servicios.

#### Scenario: Tráfico externo
- **WHEN** un cliente externo intenta alcanzar el puerto interno o una IP de contenedor
- **THEN** las reglas específicas bloquean el tráfico y el acceso HTTPS sigue funcionando

#### Scenario: Arranque
- **WHEN** Docker arranca después del reinicio del host
- **THEN** el firewall específico se aplica antes de iniciar los contenedores

### Requirement: Traslado consistente
La migración SHALL respaldar SQLite, verificar la restauración y mantener un
único worker operativo sin habilitar canales previamente apagados.

#### Scenario: Corte a producción
- **WHEN** se traslada la instalación local
- **THEN** se conservan IDs y datos, se detiene el worker anterior y se actualiza el webhook existente

#### Scenario: Resultado incierto
- **WHEN** existe un envío con resultado incierto
- **THEN** conserva su revisión humana y no se reintenta a ciegas durante la migración

### Requirement: Operación verificable
La instalación SHALL contar con salud, renovación TLS y respaldos diarios privados
con retención, restauración comprobada y copia inicial externa al VPS.

#### Scenario: Respaldo
- **WHEN** se ejecuta la copia programada
- **THEN** produce un snapshot SQLite consistente sin imprimir datos ni secretos

#### Scenario: Riesgos diferidos
- **WHEN** el usuario aplaza mantenimiento del sistema o falta un destino externo automático
- **THEN** la documentación los conserva explícitamente pendientes sin declararlos resueltos
