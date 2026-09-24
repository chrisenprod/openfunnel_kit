# Checklist reutilizable: infraestructura y producción

Plantilla para llevar un MVP validado a una instalación operativa. Complementa el
[checklist del MVP](CHECKLIST-MVP.md). Adaptar al stack y al entorno del proyecto;
las casillas son una plantilla, no evidencia del estado de OpenFunnel.

Antes de empezar, definir la instalación objetivo, el dominio, quién la operará y
qué datos se conservarán. Registrar las decisiones en el PRD y concretar los cambios
en OpenSpec antes de implementarlos. Mantener separado el despliegue de la app del
de una landing que ya esté publicada.

- [ ] **1. Dockerizar la aplicación.** Preparar imágenes y una configuración de ejecución reproducible con versiones fijadas y el lockfile. Separar compilación y ejecución, servir el frontend compilado y ejecutar los servicios con permisos mínimos. Inyectar secretos al arrancar, excluirlos del contexto de construcción y conservar la base de datos fuera de los contenedores reemplazables. Comprobar arranque, salud, parada y persistencia al recrear contenedores; documentar los comandos y las limitaciones de concurrencia del stack.

- [ ] **2. Auditar seguridad antes de publicar.** Revisar autenticación, autorización, sesiones, validación de entradas, dependencias, secretos, firmas de webhooks y datos expuestos por API, archivos y logs. Incluir imágenes y configuración de contenedores. Registrar hallazgos con evidencia y prioridad, corregir los riesgos que bloquean la publicación y verificar las correcciones. Una auditoría no equivale a una garantía de ausencia de vulnerabilidades.

- [ ] **3. Configurar GitHub Actions.** Automatizar pruebas, validación de especificaciones, compilación y construcción de imágenes. Usar permisos mínimos y evitar que ejecuciones no confiables accedan a secretos de producción. Identificar la versión desplegable por commit o digest y preparar un despliegue inicialmente manual, condicionado a los controles previos. Serializar despliegues y documentar el procedimiento para volver a una versión anterior.

- [ ] **4. Publicar la app en el VPS.** Preparar usuario de operación, acceso SSH, red, dominio, HTTPS, proxy y secretos fuera del repositorio. Exponer solo los servicios necesarios; configurar arranque tras reinicio y logs con rotación. Respaldar antes de migrar datos y definir frecuencia, retención y destino externo de las copias. Comprobar restauración y reversión antes de abrir el uso operativo. Desplegar la versión verificada, conservar los servicios existentes y registrar su identidad sin copiar credenciales a la documentación.

- [ ] **5. Validar y observar en producción.** Comprobar login/logout, permisos, flujos principales, persistencia después de reinicios e integraciones reales con cuentas de prueba controladas. Verificar dominio, HTTPS, puertos y ausencia de secretos o archivos internos accesibles. Probar controles humanos, recuperación de errores, restauración de un respaldo en un entorno aislado y procedimiento de reversión. Definir quién recibe y atiende alertas de disponibilidad, disco y fallos de integración. Registrar evidencia y pendientes; habilitar automatizaciones operativas solo tras verificar su recorrido real.

La seguridad se revisa antes de publicar y nuevamente sobre la configuración
desplegada. Las pruebas automatizadas continúan durante toda la etapa. Una copia en
el mismo disco no cubre la pérdida del VPS; una imagen anterior no revierte por sí
sola una migración de datos.

Para cada paso, conservar comandos o procedimientos reproducibles, fecha, versión,
resultado y pendientes. Distinguir comprobaciones locales, simuladas y reales.
