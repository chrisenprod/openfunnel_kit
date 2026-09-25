# Activación cloud en producción

Fecha: 2026-09-25. App: https://app.openfunnel.mocca.cl.
Código publicado: `288f6c0f6087d2769ed9aabcc96a3c4bf575fb5e`.

## Publicación y configuración

- [PR #9](https://github.com/chrisenprod/openfunnel_kit/pull/9) integrado a main.
- [CI de main](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36186693518):
  104 pruebas, npm audit sin vulnerabilidades, OpenSpec, builds y Docker correctos.
- El primer despliegue se detuvo correctamente por cambios de migraciones.
  Transición administrativa revisada con comparación de migraciones anteriores y
  hashes de las tres adiciones; no se eliminó la protección automática.
- [Publicar VPS](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36186846404)
  terminó correctamente tras reintentar con la transición ya aplicada; incluye landing.
- `.env` privado utiliza los orígenes HTTPS finales; desarrollo y demo cargan
  `.env.local`. Producción Docker recibe el equivalente privado `DOCKER_*`.
- Cuenta propietaria, Resend, Polar, clave de sesión y cifrado configurados.
  Zernio, LLM y credenciales compartidas de administrador vacíos. El dueño se
  registra y verifica su correo; no se creó ni verificó una cuenta por administración.
- El catálogo productivo devuelve los dos planes mensuales. No se importaron ni
  publicaron planes automáticamente: el dueño debe sincronizar y asignar créditos.

## Datos y respaldos

- Copia verificada previa al corte, más snapshot offline del volumen y entorno
  anterior protegido. La base autohospedada conserva el mismo SHA-256 tras activar cloud.
- Cloud arrancó con cero usuarios y cero planes en su base separada; el contenido
  anterior no quedó accesible a nuevos registros.
- Respaldo conjunto cloud ejecutado correctamente: dos SQLite verificadas
  (control nueva y base histórica). El script reinicia la API antes de verificar la copia.
- Restauración del archivo tar.gz ensayada en una carpeta temporal, sin red,
  credenciales ni worker, con integridad y claves foráneas correctas. SQLite requiere
  que esa copia permita crear sus archivos auxiliares WAL; la base activa no se monta.
- App saludable después del respaldo. Los demás servicios del VPS no se reiniciaron.
  La exportación externa automática de respaldos sigue pendiente.

## Comprobaciones públicas

- HTTPS: salud y configuración cloud correctas; documentación de cuentas,
  facturación y privacidad disponible.
- Sesión y administración sin autenticación responden 401; un Origin ajeno se
  rechaza con 403. Rutas a `.env` y SQLite responden 404.
- Webhook sin firma rechazado. Firma generada con el secreto configurado aceptada;
  payload deliberadamente inválido rechazado antes de persistir. No se acreditaron
  pagos ni créditos con la comprobación.
- Chrome real, sin enviar formularios: registro disponible, mostrar/ocultar
  contraseña, requisito de 12 caracteres, anchos 390/1440, sin desbordamiento ni
  errores JavaScript. Captura móvil inspeccionada.
- Revisión de archivos publicables y compilaciones: ninguna coincidencia con las
  credenciales privadas configuradas ni patrones comprobados de claves privadas.
  `.env`, copias, bases y evidencias privadas permanecen ignorados y fuera del build.

## Límites de la verificación

Resend reconoce la clave como restringida a envío; esa clave no permite consultar
dominios. No se enviaron correos de prueba: falta completar el registro/verificación
del dueño desde su bandeja. Polar acepta consultas de productos, clientes y
suscripciones; el token mínimo no permite consultar endpoints de webhook. La prueba
de firma contra la app no acredita que Polar tenga registrada la URL correcta.
Comprobar en su panel el endpoint de producción y realizar una compra controlada
para verificar entrega, créditos y portal de extremo a extremo antes de ofrecer pagos.

Se mantiene la regla actual: sin plan se puede configurar y usar la bandeja manual;
ejecutar IA o herramientas requiere periodo pagado y créditos, también para el dueño.
Los créditos de cada producto se definen en Administración → Facturación.
