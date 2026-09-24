# Verificación de canales y agentes

Fecha: 2026-09-23. Cambio: `connected-conversations`.

## Implementación verificada localmente

- Migraciones aditivas 003/004 sobre el modelo propio. Respaldo previo de SQLite
  en `backend/data/backups/` (ignorado); datos manuales conservados.
- SDK OpenAI instalado. Zernio por fetch; claves exclusivamente en servidor.
- Conexión por perfil y nonce/sesión, sincronización paginada, mapeo y deduplicación.
- Webhook firmado, recuperación de trabajo, estados de mensajes y outbox persistido.
- Chat Completions con tools permitidas, contexto acotado, control humano y cancelación.
- UI de canales, validación de agentes, envío/pausa y actividad en conversaciones.

## Pruebas

`npm test`: **25 pruebas aprobadas**. Proveedores simulados y SQLite temporal:

- Firmas, eventos duplicados, comentarios ignorados y cambios incompatibles.
- Identidades estables y protección de mensajes externos frente al CRUD manual.
- Callback con sesión incorrecta y nonce consumido; verificación de cuenta por API.
- Entrante → agente → salida, tanto Instagram como WhatsApp.
- Tools autorizadas con datos del contacto; rechazo de función desconocida.
- Toma de control, cambio de agente y nuevo mensaje mientras el modelo genera.
- 429 con espera, ventana vencida, timeout de envío y recuperación como incierto.
- Ediciones, eliminaciones, mensajes sin contenido representable y estados sin regresión.
- Texto sin tool calling rechazado; errores depurados; sesión/origen en rutas nuevas.
- Regresión completa de autenticación, CRUD, persistencia, migraciones y relaciones.

`npm run build`: aprobado. `npm run spec:validate`: 9 elementos aprobados.
La validación de formato no reemplaza las pruebas funcionales.

## Interfaz

Chrome mediante Playwright, 1440×1000 y 390×844:

- Canales y formulario de conexión visibles, sin errores de React ni desborde horizontal.
- Conversación conectada con datos ficticios: toma de control, formulario humano,
  historial y estados correctos.
- Borrador conservado durante actualizaciones periódicas; botón Enviar accesible por Tab.
- Capturas locales temporales en `/tmp/openfunnel-*-desktop.png` y
  `/tmp/openfunnel-*-mobile.png`; no se versionan capturas de cuentas reales.
- No se iniciaron autorizaciones externas ni se enviaron mensajes como parte del QA visual.

## Prueba real parcial

La clave configurada por el usuario devolvió HTTP 200 y **3 cuentas de Instagram**;
no devolvió cuentas WhatsApp. Las tres cuentas se importaron a canales locales con
`automation_enabled=0`. La carga paginada ya superó 700 conversaciones y 1200 mensajes
al registrar esta evidencia; continúa/reconcilia en segundo plano. Estos datos privados
permanecen en la base ignorada, sin exportarse a fixtures ni logs.

La importación encontró mensajes sin texto ni adjuntos visibles. Se ajustó el mapeo
para conservarlos como contenido no compatible y se reprogramaron las páginas afectadas.
No se asumieron credenciales inválidas ni se ignoraron errores de contrato silenciosamente.

## IA real verificada

El usuario confirmó los modelos Sol, Terra y Luna 5.6. Se consultó el catálogo real
y se verificaron `gpt-5.6-sol`, `gpt-5.6-terra` y `gpt-5.6-luna` con el SDK OpenAI:
llamada a `connection_probe`, resultado de la función y respuesta final de texto.
Los tres devolvieron HTTP 200 y quedaron validados para la configuración actual.
La prueba utilizó contenido sintético; no envió mensajes de contactos al modelo.

La URL del usuario contiene la raíz del recurso Azure. El cliente ahora añade
`/openai/v1/` a raíces oficiales Azure, conservando rutas explícitas. Se añadió una
prueba de regresión y sugerencias de los tres modelos en el formulario del agente.
No se modificaron secretos ni se eligió un modelo por defecto sin configuración.

## Pendientes antes de activar respuestas operativas

- No están configurados `PUBLIC_BASE_URL` ni `ZERNIO_WEBHOOK_SECRET`; falta registrar
  y verificar un webhook público. El callback real requiere iniciar sesión en el origen
  HTTPS configurado, además de completar consentimiento de Meta.
- Conectar una cuenta WhatsApp Business de prueba y verificar entrante/saliente en
  ambas plataformas. No se han enviado mensajes externos ni habilitado canales automáticos.

Por estos pendientes, el cambio conserva 4.4 abierto y no se archiva.

## Claridad de respuestas automáticas — 2026-09-24

- Panel con conexión externa separada, estado explícito activado/desactivado y un
  botón contextual para activar o desactivar. Guardar agente conserva ese estado.
- Chromium sobre la app local: ambos estados en 1440, 768 y 390 px, claro/oscuro,
  sin desbordamiento. Revisión visual de capturas y activación por teclado.
- Verificados selección pendiente, guardado con IA encendida/apagada, desactivación
  con cambios pendientes (conserva agente guardado), ausencia de agente, conexión
  caída, inbox sin verificar, controles bloqueados durante envío y error sin falso éxito.
- Seis escrituras interceptadas y simuladas en el navegador. Lectura antes/después
  confirma que agente asignado y automatización del canal real no cambiaron.
  No demuestra entrega externa ni sustituye la prueba pendiente del recorrido real.
- `npm run build` correcto; `npm run spec:validate`: 10 elementos válidos.
