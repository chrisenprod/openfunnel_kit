# Verificación local: cuentas y conexiones microSaaS

Fecha: 2026-09-25. Rama `dev/local-development`.
Cambio: `cloud-accounts-and-provider-keys`.

## Implementación verificada

- Registro, correo verificado, acceso y recuperación con Better Auth y transporte
  Resend simulado. Caducidad y uso único, reenvío limitado, protección de Origin,
  respuestas de recuperación no enumerables y revocación de sesiones.
- Dueño por `CLOUD_OWNER_EMAIL` después de verificar; primer cliente sin privilegios.
  Administración autorizada en backend, auditoría, suspensión y reactivación.
- Espacios con SQLite propia, credenciales cifradas, prioridad de entorno en
  self-hosted y ausencia de herencia de claves globales en cloud.
- Referencias cruzadas denegadas en CRUD, relaciones, prompts, versiones, pruebas,
  documentos originales, API keys, firmas y callbacks. Worker recuperado sin login
  y suspensión durante generación sin envío posterior.
- Versiones de conexión, persistencia cifrada y rechazo con clave maestra errónea
  o con AAD de otro espacio. Rotación invalida resultados en curso; URL diferente
  requiere clave nueva. No se devuelven claves guardadas a la UI.
- Destinos LLM: rechazo de URL insegura, IPs privadas/especiales y DNS privado al
  abrir el socket, incluso para un hostname permitido. Sin redirecciones.
- Migración offline sobre copia: mismos IDs, originales y claves API; conexiones
  recifradas para el dueño; filas de cola conservadas pero pendientes cancelados
  y automatización pausada. Fuente intacta, rechazo de destino existente e
  integridad/FKs comprobadas.

## Comprobaciones

- `npm test`: suite de API, persistencia, auth, integraciones, documentos,
  conexiones, migración, arranque y regresión de despliegue, con SQLite temporal.
- `npm run spec:validate`: 18 elementos válidos.
- `npm run build`: app y 10 páginas públicas de documentación compiladas.
- `npm run test:docker`: contenedores sintéticos self-hosted y cloud, salud,
  autenticación, persistencia, apagado y conservación de la base anterior.
- Chrome con backend/Vite aislados y correo simulado: crear cuenta → verificar →
  entrar → guardar conexiones → administrar/suspender/reactivar → salir. Vista
  1440×1000 y 390×844, claro/oscuro, foco de formulario por teclado, errores que
  conservan valores y navegación que confirma descarte de borradores.
  Capturas locales en `docs/qa/private/cloud-ui/`, ignoradas por Git y no necesarias
  para reproducir el proyecto.

La revisión detectó y corrigió una importación circular que impedía arrancar
cloud como proceso, una ruta de verificación que retenía la pantalla de acceso
y desbordamiento móvil del panel. Hay regresión automatizada del arranque cloud.

## Límites y pendientes

No se enviaron correos reales durante las pruebas ni se usaron Zernio/LLM reales;
no se cobraron consumos ni se enviaron mensajes a terceros. Falta que el dueño
cree su cuenta y confirme el enlace recibido mediante Resend. No se migró la
SQLite operativa ni se habilitó cloud en producción. La migración se ensayó con
datos sintéticos; su aplicación real requiere respaldo y revisión de colas.

Las pruebas de aislamiento y destino no equivalen a una certificación de seguridad.
Para abrir una oferta comercial siguen pendientes pagos, condiciones del servicio,
respaldos externos y revisión de capacidad/abuso. El límite de cuentas incluye
registros pendientes; no se ha añadido limpieza automática de esas cuentas.

### Ayuda de contraseña (2026-09-25)

Verificado en Chrome con API simulada: estado pendiente con 11 caracteres, cumplido con 12, retorno a pendiente al borrar, evento de pegado, mostrar/ocultar sin cambiar el valor ni enviar el formulario, activación por teclado y limpieza al volver al acceso. Revisado a 390 y 1440 px en ambos temas, sin desbordamiento ni errores JavaScript. Captura móvil inspeccionada. No se crearon cuentas ni se enviaron correos reales.

### Configuración Zernio (2026-09-25)

Chrome con API simulada: conexión ausente, guardada y bloqueada por entorno; acción principal Configurar Zernio antes de guardar y Conectar canal después. Logos oficiales locales en ambos temas, enlace externo, 390/1440 px sin desbordamiento. Sin botones de alta manual en cabecera ni estado vacío; /channels/new vuelve a Canales. Cancelar descarte conserva borrador, error de guardado conserva la clave y reintento correcto limpia el campo; edición posterior no revela el secreto. Solo se emitieron las dos escrituras simuladas de configuración: ninguna sincronización, autorización de canal ni llamada real al proveedor. Capturas de escritorio y móvil inspeccionadas. Build y validación OpenSpec completados.

### Proveedor IA y enlaces destacados (2026-09-25)

Bloque IA con iconos, enlaces OpenAI Platform/OpenRouter, URL sugerida por proveedor y opción Otro / Azure. Modelo libre con enlace a catálogo, sin petición de modelos ni prueba automática. Estado guardado muestra proveedor/modelo y pide validación explícita; los campos de entorno permanecen bloqueados. Destino cambiado limpia la clave escrita y exige reemplazo. OpenRouter se permite por defecto, respetando listas explícitas del operador y controles de red existentes.

Chrome con APIs simuladas: presets y URLs correctas, clave limpiada al cambiar proveedor, requisito de nueva clave, modelo conservado ante error, cancelación de descarte, guardado/reintento, claves ocultas al editar, locks parciales/totales del entorno y teclado. Capturas inspeccionadas en escritorio y móvil; 320/390/1440 px y ambos temas sin desbordamiento de página. Enlaces Zernio/OpenAI/OpenRouter ampliados a 15 px con área mínima de 44 px. No se llamaron proveedores reales. Suite completa: 89/89 pruebas aprobadas; incluye persistencia cifrada OpenRouter y rechazo de hosts suplantados o excluidos por política explícita.
