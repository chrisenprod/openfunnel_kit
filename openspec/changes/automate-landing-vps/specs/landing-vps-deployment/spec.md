# Spec Delta

## Purpose

Publicar automáticamente la landing estática en un VPS elegido por el operador, conservando alternativas educativas y servicios existentes.

## ADDED Requirements

### Requirement: Publicación autorizada y parametrizada
El sistema SHALL publicar solo el commit actual de la rama configurada con CI exitoso del repositorio configurado, usando SSH restringido y parámetros del operador para origen, destino y repositorio. Pages y Vercel MUST conservar su configuración.

#### Scenario: CI válido y VPS habilitado
- **WHEN** termina CI exitoso en main del repositorio propio y el operador habilitó VPS_LANDING_ENABLED
- **THEN** el servidor valida el run y publica la landing desde ese commit en la ubicación configurada

#### Scenario: CI o commit inválido
- **WHEN** la solicitud proviene de PR/fork, run fallido o commit obsoleto
- **THEN** se rechaza antes de sustituir archivos públicos

### Requirement: Actualización aislada y reversible
El sistema SHALL construir sin secretos con recursos limitados, publicar únicamente estáticos válidos y sustituir current atómicamente. MUST recuperar la versión anterior si la comprobación HTTPS falla, sin reiniciar servicios ni restaurar datos de app.

#### Scenario: Build o archivos inválidos
- **WHEN** falla el build o contiene enlaces/archivos especiales
- **THEN** la landing anterior permanece activa

#### Scenario: Salud fallida
- **WHEN** el HTML HTTPS no coincide con la nueva release
- **THEN** vuelve el enlace anterior, se verifica y se informa la ejecución fallida

### Requirement: Selección de cambios por destino
El sistema SHALL omitir publicación si no cambiaron entradas del destino desde su última release. MUST conservar los contenedores de la app y de otros servicios ante cambios exclusivos de landing.

#### Scenario: Solo landing
- **WHEN** cambia contenido exclusivo de landing
- **THEN** se actualiza landing sin recrear API/web de la app ni otros contenedores

#### Scenario: Recurso compartido
- **WHEN** cambia brand.css o la marca compartida por app y landing
- **THEN** ambos destinos detectan sus entradas afectadas
