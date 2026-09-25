# Verificación de herramientas mínimas de agentes

Fecha: 2026-09-24. Cambio: `agent-workbench`. Rama: `dev/local-development`.
Implementación local, sin despliegue ni activación de canales.

## Evidencia automatizada

- `npm test`: 71 pruebas correctas, 0 fallos, incluyendo documentos y docs públicas.
  Después se añadió una regresión para versiones iniciales de prompts demo y se
  ejecutó el módulo completo `node --test tests/agent-workbench.test.js` (11 pruebas).
- `npm run spec:validate`: 17 elementos correctos (incluye otros cambios del espacio
  compartido). El formato de OpenSpec no demuestra cumplimiento funcional.
- `npm run build` y `npm run build:landing`: compilaciones correctas con 9 páginas de
  documentación pública y recursos relativos.
- `npm run test:docker`: ambos targets construidos; instalación sintética aislada,
  recursos CSS/docs accesibles, carga DOC/DOCX/PDF y archivo mayor de 1 MiB,
  descarga original y persistencia al recrear; health/auth/Origin y aislamiento.
  Proyecto y volumen de prueba eliminados al terminar.
- `git diff --check`: sin errores.

Las pruebas usan SQLite en memoria/temporal y proveedores simulados. Verifican claves
con permisos independientes, secreto/hash, revocación/vencimiento, cookie/Bearer y
límites. Versiones de prompts atribuidas, conflictos, restauración, paginación y
rollback por referencias. Migraciones desde 004/005 y reapertura de SQLite.

Documentos: fixtures sintéticos TXT/MD/DOC/DOCX/PDF, texto extraído y mismos bytes en
la descarga, archivos vacíos/ilegibles, formato/tamaño/nombre inválidos, cuotas de
cantidad/texto, reemplazo fallido y revisión obsoleta/concurrente, original conservado
ante error, recuperación de processing y borrado en cascada del agente.

Runtime: cambios de prompt/documento durante generación cancelan el resultado sin
crear envío. Pruebas aisladas: historial alternado, context_hash y reinicio ante
cambios; modelo de entorno pese a campos legacy; candidato y herramientas simuladas,
argumentos inválidos, error depurado, rondas, concurrencia y cancelación. No crean
mensajes, conversaciones, runs operativos ni trabajos de envío.

Docs: lista explícita de 9 fuentes públicas, enlaces relativos y anclas válidos,
índice de búsqueda y copias idénticas de app/landing. Las reglas de publicación
consideran cambios de docs como entradas de build; no publican informes privados.

## Interfaz

Chrome local con perfil temporal, frontend compilado y API/SQLite en memoria.
Proveedor sintético sin conexiones externas. Recorrido verificado:

- Login y envío de prueba mediante teclado.
- Configuración sin inputs de proveedor/modelo/contexto legacy.
- Cargar DOC, abrir texto, descargar original exacto, reemplazar por PDF, conservar
  el anterior ante reemplazo inválido, cargar archivo inválido visible, recargar la
  página y eliminar con confirmación. TXT queda disponible para probar el agente.
- Dos turnos de chat incluyen historial anterior; detalles muestran documentos
  usados y consumo; reiniciar deja la conversación vacía.
- Docs sin sesión, búsqueda de BLOB, navegación y carga en subruta independiente.
- Anchos 1440, 768 y 390 px, temas claro/oscuro; sin desbordamiento horizontal ni
  errores JavaScript. Capturas de conocimiento, chat móvil y docs inspeccionadas.
- La verificación anterior conserva cobertura de edición/restauración de prompts
  y creación/ocultación/revocación de claves.

## Límites

No se usaron credenciales de proveedores reales ni la base local operativa. La
simulación no demuestra calidad del deployment real ni entrega por canales.
Las pruebas de la app sí consumen tokens; todas sus herramientas se simulan y el
chat es temporal. No hay OCR, RAG, OpenAPI ni webhooks nuevos. Los 128 MiB del worker
limitan su heap V8, no toda la memoria nativa del proceso. No se realizó una auditoría
exhaustiva de parsers frente a documentos adversariales.

Producción no se modificó: al publicar, aplicar las migraciones aditivas y ajustar
también el proxy externo a 5 MiB. Los pendientes operativos anteriores siguen abiertos.

## Simplificación de la ficha del agente

Verificado con Chrome headless y SQLite temporal: una sola fila Instrucciones/Herramientas/Contexto/Probar, sin navegación de catálogos superpuesta, formulario de información sin asociaciones, PATCH limitado a los campos de cada sección, confirmación al descartar cambios, carga/vista/descarga/reemplazo de documentos, acciones secundarias plegadas y conversación conservada al cambiar de sección. Dos respuestas con proveedor simulado y reinicio; sin llamadas reales ni datos operativos. Revisados 1440, 768 y 390 px, sin desbordamiento ni errores JavaScript; capturas de Contexto y Probar inspeccionadas.
