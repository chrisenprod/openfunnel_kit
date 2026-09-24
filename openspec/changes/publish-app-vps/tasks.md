# Tasks

## 1. Preparación
- [ ] 1.1 Preparar Compose/release, firewall persistente, Nginx HTTPS y respaldos; validar configuración y specs.
- [ ] 1.2 Integrar código verificado en main y preparar release en el VPS sin sobrescribir el checkout existente.

## 2. Publicación
- [ ] 2.1 Aplicar aislamiento acotado y comprobar bloqueo desde red de prueba, acceso local y conservación de servicios.
- [ ] 2.2 Preparar TLS y renovar; detener worker local, respaldar, restaurar y arrancar una única API conservando datos y estados IA.
- [ ] 2.3 Verificar acceso y actualizar el webhook existente al origen HTTPS sin activar canales ni enviar mensajes de prueba.

## 3. Operación
- [ ] 3.1 Configurar respaldo diario, probar restauración y guardar copia inicial fuera del VPS; documentar destino automático pendiente si no está definido.
- [ ] 3.2 Verificar producción, salud, puertos, permisos y reinicio de app; registrar release, reversión y riesgos aplazados.
