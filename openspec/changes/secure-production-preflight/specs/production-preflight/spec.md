## ADDED Requirements

### Requirement: Verificación sin secretos de producción
El workflow SHALL ejecutar pruebas, specs, auditoría de dependencias, compilación
y prueba Docker aislada en push a main, PR y ejecución manual, con permisos mínimos.

#### Scenario: Cambio no confiable
- **WHEN** un pull request ejecuta CI
- **THEN** las pruebas usan datos sintéticos y no reciben claves de proveedores ni del VPS

#### Scenario: Verificación fallida
- **WHEN** falla una prueba o compilación
- **THEN** el workflow falla y no publica ni despliega la app

### Requirement: Provisionamiento privado
El entorno de producción SHALL viajar por SSH con host key verificada y conservarse
fuera del repositorio con permisos 0600 dentro de un directorio 0700.

#### Scenario: Configuración inicial
- **WHEN** se provisiona un destino vacío autorizado
- **THEN** se conservan las claves autorizadas, se usa el origen HTTPS acordado y no se revelan valores ni se activa mensajería

#### Scenario: Destino existente
- **WHEN** ya existe el archivo de entorno
- **THEN** el procedimiento aborta antes de sobrescribirlo

### Requirement: Defensa del frontend y del receptor
La app SHALL denegar framing y scripts externos mediante cabeceras y rechazar
recepción de webhooks si el secreto configurado tiene menos de 32 caracteres.

#### Scenario: Secreto débil
- **WHEN** llega un evento firmado con un secreto configurado demasiado corto
- **THEN** el receptor devuelve 503 y no persiste el evento

#### Scenario: Frontend compilado
- **WHEN** se abre la app servida por el contenedor
- **THEN** sus recursos propios y login funcionan bajo CSP y la respuesta deniega framing

### Requirement: Evidencia limitada al alcance real
La auditoría SHALL distinguir hallazgos comprobados, riesgos y verificaciones pendientes.

#### Scenario: Infraestructura compartida
- **WHEN** se detecta mantenimiento pendiente fuera de la app
- **THEN** se documenta en privado sin alterar otros servicios ni declarar producción aprobada
