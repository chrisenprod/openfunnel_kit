# Tasks

## 1. Persistencia y contratos
- [x] 1.1 Añadir migración aditiva y mapeos validados; probar identidad estable, datos incompatibles y protección de CRUD remoto.
- [x] 1.2 Configurar ZERNIO_API_KEY y LLM_BASE_URL/LLM_API_KEY/LLM_MODEL e instalar SDK OpenAI; comprobar errores depurados y ausencia de secretos en respuestas.

## 2. Canales y mensajes
- [x] 2.1 Implementar perfiles, conexión/reconexión con nonce y sincronización paginada; probar callback inválido, repetición y progreso persistido.
- [x] 2.2 Implementar webhook firmado, deduplicación, reconciliación e importación de mensajes; probar firma, comentarios, adjuntos y cambios de contrato.
- [x] 2.3 Implementar outbox, envío humano, ventanas y recuperación; probar duplicados, 429 y resultado incierto tras timeout/reinicio.

## 3. Agentes
- [x] 3.1 Implementar validación de modelo y runtime Chat Completions con tools acotadas; probar texto, tools, errores y límites.
- [x] 3.2 Implementar asignación, pausa/control humano y revisión antes de enviar; probar generación concurrente, cambio de agente y cancelación.

## 4. Interfaz y entrega
- [x] 4.1 Añadir controles de canales, agentes y conversaciones con estados reales; verificar build, escritorio, móvil y teclado.
- [x] 4.2 Documentar configuración y operación, ejecutar tests y validación OpenSpec; registrar evidencia y limitaciones.
- [x] 4.3 Verificar acceso real a Zernio y validación del deployment configurado sin activar automatización operativa; registrar solo resultados depurados.
- [ ] 4.4 Verificar recorrido real entrante/saliente en cuentas de prueba Instagram y WhatsApp con webhook público antes de activar canales operativos.
- [x] 4.5 Aclarar estado activado/desactivado y separar guardar agente de activar/desactivar respuestas; verificar ambos estados, cambios pendientes, error, teclado y móvil con respuestas API simuladas sin activar canales reales.

## Evidencia y pendientes

- Implementación y pruebas: `docs/qa/INTEGRACIONES.md`; guía: `docs/deploy/INTEGRACIONES.md`.
- 4.3: acceso Zernio real verificado e importación iniciada, con 3 cuentas Instagram.
  Sol, Terra y Luna 5.6 validados con texto y tool calling en el endpoint Azure configurado.
- 4.4: faltan `PUBLIC_BASE_URL`, `ZERNIO_WEBHOOK_SECRET` y cuenta de prueba WhatsApp.
  No se enviaron mensajes externos ni se activó automatización operativa.
