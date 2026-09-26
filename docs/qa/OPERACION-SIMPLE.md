# Operación simple — evidencia

Fecha: 2026-09-26. Cambio: `simplify-daily-work`.

## Alcance verificado

- Creación de agente con nombre, instrucciones directamente editables y guardado
  atómico: versiones, orden, prompts compartidos y rechazo de conflictos sin cambios
  parciales. La primera edición crea/asocia el prompt en la misma transacción.
- Permisos: sesión con Origin; Bearer requiere ambos scopes de escritura. Lectura
  no revela secretos. La guía se deriva del espacio autenticado y es solo de sesión.
- Primer uso: consultas sin llamadas externas, prueba candidata no completa el logro;
  prueba guardada exitosa registra fecha sin mensajes/runs. Guía desaparece cuando
  IA, canal, agente asignado/preparado y prueba están completos.
- Selección de herramientas nativas, chat de prueba al lado del editor, vista móvil
  que conserva instrucciones sin guardar, mensaje y transcript al abrir/cerrar.
  Guardar configuración exige reiniciar el chat anterior.
- Sidebar con seis destinos; Ajustes agrupa conexiones/cuenta/API/facturación/directorio.
  Seguimiento mantiene Tickets/Pipelines. URLs anteriores siguen accesibles.
- Canal con cuenta, agente y activación; bloqueos con enlaces de resolución. La prueba
  llega a Activar IA habilitado sin pulsarlo ni activar el canal.
- Necesitan atención filtra abiertas manuales o entregas fallidas/inciertas con
  paginación en servidor. Se conservan filtros y controles de intervención humana.

## Verificación

- `npm test`: 120 pruebas aprobadas.
- `node --test tests/daily-work.test.js tests/integrations.test.js tests/provider-setup.test.js`:
  31 pruebas aprobadas después de los ajustes finales del estado del agente.
- `npm run build`: correcto. `npm run spec:validate`: 23 elementos correctos.
- Chrome local con API/SQLite temporales y proveedores simulados: 390, 768 y
  1440 px; agente en claro/oscuro, rutas operativas sin desbordar, ancho útil de
  bandeja móvil, navegación de Ajustes con Enter, menú móvil con Escape y retorno
  del foco. Sin errores JavaScript. Se corrigieron la disposición de la guía sobre
  la bandeja y una carrera de foco al abrir el chat móvil.
- Capturas sintéticas locales bajo `docs/referencias-visuales/operacion-simple/`,
  ignoradas por Git. No son dependencias de compilación ni contienen datos reales.

## Límites

No se enviaron mensajes, correos ni pagos reales, ni se activaron canales operativos.
La prueba de chat usa transporte simulado y no demuestra calidad del modelo ni entrega
real. Sin migraciones, nuevas dependencias ni modificaciones de secretos de instancia.
