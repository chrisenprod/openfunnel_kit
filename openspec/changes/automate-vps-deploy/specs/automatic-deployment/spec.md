# Spec Delta

## Purpose

Publicar versiones verificadas de OpenFunnel automáticamente, preservando el entorno privado y los datos operativos del VPS compartido.

## ADDED Requirements

### Requirement: Desplegar únicamente main verificado
El sistema SHALL aceptar solo SHA de main del repositorio propio con ejecución exitosa del workflow CI esperado y MUST rechazar solicitudes o eventos de PR, forks, ramas ajenas y commits obsoletos.

#### Scenario: CI exitoso
- **WHEN** finaliza exitosamente CI de main actual
- **THEN** Actions solicita por SSH publicar ese SHA y el VPS valida independientemente su procedencia

#### Scenario: Procedencia inválida
- **WHEN** el run no coincide con SHA, workflow, repositorio, rama o conclusión requerida
- **THEN** se rechaza sin cambiar la versión activa

### Requirement: Acceso y concurrencia acotados
El sistema SHALL usar environment limitado a main, clave dedicada con host key fijada y comando SSH forzado. MUST serializar en Actions y VPS sin cancelar la publicación activa ni habilitar shell o forwarding.

#### Scenario: Comando arbitrario
- **WHEN** la clave solicita shell u otro comando
- **THEN** el servidor rechaza antes de ejecutar operaciones privilegiadas

#### Scenario: Desconexión
- **WHEN** se interrumpe el cliente SSH durante una publicación iniciada
- **THEN** el trabajo permanece supervisado por systemd en el VPS

### Requirement: Preservar datos y recuperar código
El sistema SHALL construir releases identificables, respaldar antes de sustituir, conservar el mismo volumen y entorno y comprobar salud interna y HTTPS. MUST rechazar cambios de migraciones antes del corte y MUST recuperar la release anterior ante fallo posterior sin restaurar SQLite automáticamente.

#### Scenario: Build o migraciones no aptos
- **WHEN** falla construcción o cambian migraciones/migrador
- **THEN** la versión activa sigue funcionando sin sustitución

#### Scenario: Falla salud nueva
- **WHEN** la nueva release no arranca o falla salud
- **THEN** se intenta recuperar código anterior sobre los mismos datos, se comprueba salud y la ejecución queda fallida con resultado claro

#### Scenario: Publicación correcta
- **WHEN** termina el arranque y salud de ambas capas
- **THEN** current identifica el SHA publicado y persiste una única API/worker con sus datos
