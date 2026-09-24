# Verificación de Kanban

Fecha: 2026-09-23. Cambio: `pipeline-kanban`.

## Resultado

- `npm test`: nueve pruebas aprobadas, incluyendo validación de relaciones de tickets y errores del cliente API.
- `npm run build`: compilación correcta.
- `npm run spec:validate`: seis elementos válidos; requisito nuevo sincronizado en `platform-ui`.
- `git diff --check`: sin errores.

## Recorridos verificados

Chrome headless con Playwright externo al repositorio, contra la app local:

- Pipeline con cinco etapas: arrastre con ratón, consulta de la API y recarga confirman persistencia; `status` no cambia.
- Escape, destino original y soltar fuera del tablero no envían PATCH.
- Respuesta 503 simulada: error visible, reconciliación y reintento con selector por teclado.
- Pantalla táctil emulada de 390 px: eventos táctiles reales de Chrome, arrastre desde el asa, desplazamiento horizontal al borde y guardado.
- Vista por etapas de Tickets: movimiento hacia una columna vacía y bloqueo de controles durante una respuesta demorada.
- Anchos 390, 768 y 1440 px, tema oscuro y capturas inspeccionadas; sin desbordamiento de página.
- Sin errores JavaScript no controlados durante el recorrido principal.

Se restauró la etapa original del ticket demo utilizado; los registros temporales
de la prueba adicional se eliminaron al terminar. Las capturas y scripts temporales
quedan fuera del repositorio. No se probó en dispositivos físicos, Safari, Firefox
ni con lector de pantalla. No se incorpora orden manual de tarjetas dentro de etapas.

Se corrigieron dos incidencias detectadas: etiquetas accesibles que escapaban del
contenedor con scroll y un aviso de arrastre que desplazaba verticalmente el destino
bajo el dedo. El tablero mantiene ahora su posición durante el gesto.

## Ajuste de densidad y navegación

Cambio `compact-navigation`, verificado el 2026-09-23 en Chrome local:

- Nueve iconos SVG; sidebar de 232/72 px, colapso con teclado, navegación por iconos,
  tooltip y cierre con Escape; preferencia conservada tras recargar.
- Menú móvil con textos completos, retorno de foco y cierre automático al pasar a
  escritorio. El shell continúa operativo si localStorage rechaza lectura/escritura.
- Capturas inspeccionadas: escritorio expandido/compacto, tema oscuro y menú móvil.
- Tarjetas con padding 10 px y gap 6 px: 136 px de alto en la primera tarjeta demo
  medida en escritorio. Controles compactos con ratón y de 44 px con puntero táctil.
- Repetido recorrido Kanban: arrastre con ratón y táctil, persistencia, Escape,
  misma etapa, fallo 503 y reintento por teclado. Sin desbordamiento a 390 px ni
  errores JavaScript no controlados. El ticket de prueba volvió a su etapa original.
- Build y validación de siete elementos OpenSpec correctos; diff sin errores.

Estas comprobaciones usan emulación táctil de Chrome; no constituyen pruebas
sobre un dispositivo físico ni con lector de pantalla.
