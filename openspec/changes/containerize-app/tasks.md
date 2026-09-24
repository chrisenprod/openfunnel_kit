# Tasks

## 1. Construcción aislada

- [x] 1.1 Crear Dockerfile con targets api/web, versiones y digests fijados, dependencias de producción, frontend compilado y avisos legales; verificar que ambos targets se construyen desde fuentes y que ejecutan sus procesos sin root.
- [x] 1.2 Añadir `.dockerignore` con entradas acotadas; comprobar con archivos señuelo que entorno, datos, respaldos y configuración privada no llegan al contexto ni a las capas, y que la app conserva su CSS y símbolo compartidos.

## 2. Ejecución y proxy

- [x] 2.1 Configurar HOST en el arranque del backend preservando loopback por defecto; probar el valor predeterminado y la dirección explícita usada en Docker sin cambiar el contrato HTTP.
- [x] 2.2 Crear Compose con un único backend/worker, volumen SQLite escribible sin root, entorno dedicado, salud, reinicio y tiempo de parada; verificar configuración, ausencia de credenciales requerida, error de permisos, puertos publicados solo en loopback y arranque sobre volumen vacío.
- [x] 2.3 Añadir Nginx de la app con estáticos y proxy de API; verificar recursos, errores JSON, rutas privadas no servidas, límite de cuerpo y reconexión a API después de recrearla.

## 3. Verificación y documentación

- [x] 3.1 Añadir una prueba reproducible con Compose aislado y datos sintéticos: login/logout, acceso sin sesión, origen inválido, CRUD mínimo y webhook firmado/repetido/inválido por el proxy; comprobar resultados sin claves operativas ni mensajes externos.
- [x] 3.2 Verificar salud con API disponible/caída, SIGTERM, reinicio y recreación conservando volumen e IDs; comprobar integridad de SQLite y ejecutar las pruebas existentes de recuperación de envíos inciertos sin duplicar workers.
- [x] 3.3 Documentar construcción, configuración, arranque, parada y persistencia en `docs/deploy/DOCKER.md`; sincronizar README, AGENTS, ARCHITECTURE y ejemplo de entorno, comprobando que los comandos funcionan desde la raíz y distinguen limpieza de datos, respaldo y publicación futura.
- [x] 3.4 Ejecutar `npm test`, `npm run build` y `npm run spec:validate`; registrar evidencia de contenedores y revisión visual de login/app en escritorio y móvil en `docs/qa/`, con limitaciones explícitas y sin marcar como probado el recorrido real pendiente de Zernio.
