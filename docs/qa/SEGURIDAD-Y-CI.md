# Seguridad y CI — verificación previa

Informe previo a la publicación; evolución posterior en [PRODUCCION.md](PRODUCCION.md).

Fecha: 2026-09-24. Alcance: app single admin, integración, imágenes locales,
workflow y preparación privada de variables. No es una certificación ni la
validación final de la app publicada.

## Resultado local

- 29 pruebas Node aprobadas: sesiones, autorización, orígenes, límites, validación,
  relaciones, firmas, duplicados, cancelación y recuperación de envíos inciertos.
- Se reforzó el webhook: incluso una firma correcta se rechaza con 503 si la
  configuración tiene un secreto menor a 32 caracteres; no se inserta el evento.
- `npm audit`: cero avisos informados sobre el lockfile revisado. No equivale a
  escaneo de todos los paquetes del sistema operativo de las imágenes.
- Builds de app y landing correctos; 12 validaciones OpenSpec correctas.
- Prueba Docker aprobada con datos sintéticos. Añadidas comprobaciones de CSP,
  anti-framing y permisos. Se mantienen secretos/bases fuera del contexto.
- Chromium: login por teclado, contacto sintético, logout y temas en 1440/768/390;
  sin errores JavaScript ni violaciones CSP. El 401 de sesión previo al login es
  esperado. CSP permite estilos inline usados por la UI, no scripts inline.
- Búsqueda sobre 147 archivos candidatos: ninguna coincidencia con los secretos
  locales ni cabeceras de claves privadas. Es una comprobación acotada, no un
  análisis completo del historial Git ni de credenciales desconocidas.

## CI y configuración

Workflow sin secretos de producción, permisos de lectura y acciones fijadas por
SHA. Validación con actionlint y comandos equivalentes locales. Ejecución real en
Linux aprobada: [Actions 36039039967](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36039039967),
commit `2ad9f2099e471f15e3065aa9d9492674d67ea7f8`, en el
[PR #2](https://github.com/chrisenprod/openfunnel_kit/pull/2). La integración a main
queda pendiente; no hubo despliegue.

CI detectó una prueba de solo lectura que podía bloquearse al sobreescribir el
volumen con `compose run`. Se sustituyó por un montaje explícito del Engine,
inspección de `RW=false`, espera acotada y comprobación de error SQLite. WAL puede
fallar con CANTOPEN al no poder crear archivos auxiliares; se verifica ese caso
además del error de escritura. Un timeout o error ajeno ya no cuenta como éxito.
La prueba final pasó tanto localmente como en Linux. Las operaciones Docker tienen
límite de tiempo y registran su nombre, sin volcar argumentos ni configuración.

Entorno transferido por SSH con verificación de integridad y permisos. No se
arrancaron servicios, movieron bases, registraron webhooks ni activaron canales.

## Auditoría de infraestructura

Se revisaron por SSH versión/soporte del host, Docker, puertos, reglas de red,
permisos, acceso SSH, Nginx, renovación TLS y capacidad. Los hallazgos concretos
y pendientes se conservan en `docs/qa/private/`, ignorado por Git. La publicación
está condicionada a resolver los hallazgos altos del host y verificar la instalación
HTTPS final. No se modificaron firewall, SSH ni servicios de otros proyectos.

La inspección de código cubrió rutas HTTP, auth, SQL parametrizado, callback
vinculado a sesión/nonce, URLs de autorización permitidas, verificación HMAC,
deduplicación, permisos de herramientas y errores de proveedores depurados.
No se realizó explotación destructiva, fuerza bruta, escaneo de aplicaciones
ajenas, análisis CVE completo de imágenes ni recorrido real de mensajería.
