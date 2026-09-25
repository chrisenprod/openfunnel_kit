# Tasks

## 1. Persistencia y acceso
- [x] 1.1 Añadir migración aditiva de claves, contexto y versiones; verificar actualización de datos existentes y persistencia.
- [x] 1.2 Implementar claves y rutas con permisos/límites; probar revocación, vencimiento, cookie/Origin y denegación de acciones ajenas.
- [x] 1.3 Versionar y restaurar prompts con concurrencia y autor; probar conflictos, rollback y revalidación de generaciones pendientes.

## 2. Contexto y pruebas
- [x] 2.1 Compartir contexto de negocio en runtime y pruebas; verificar límites y separación de instrucciones.
- [x] 2.2 Implementar prueba aislada con tools simuladas y límites; probar errores depurados y ausencia de escrituras/envíos.

## 3. Interfaz y entrega
- [x] 3.1 Añadir contexto, claves, historial/restauración y formulario de prueba; verificar escritorio, móvil, temas y teclado con datos sintéticos.
- [x] 3.2 Actualizar PRD/arquitectura/guía API y comprobar npm test, npm run spec:validate y npm run build; registrar evidencia y límites.

## Evidencia

Ver `docs/qa/AGENTES.md`: suite de 71 tests más regresión focalizada de seeds, 17 validaciones OpenSpec, builds app/landing/docs, Docker y recorrido UI con documentos reales sintéticos. Sin despliegue ni llamadas a proveedores reales.

## 4. Experiencia acordada: documentos, modelo y docs
- [x] 4.1 Implementar documentos con BLOB, extracción TXT/MD/DOC/DOCX/PDF, cuotas y reemplazo seguro; probar archivos reales, persistencia, permisos y fallos.
- [x] 4.2 Usar documentos en runtime/pruebas y modelo exclusivo de entorno; verificar contexto, overrides legacy y cancelación por cambios.
- [x] 4.3 Añadir pestañas, gestión documental y chat temporal; verificar carga/descarga/reemplazo/error, continuidad, reinicio, móvil y teclado.
- [x] 4.4 Crear documentación pública estática y enlaces/deploy con app y landing; comprobar build, enlaces, búsqueda, raíz/subruta y ausencia de datos privados.
- [x] 4.5 Alinear PRD/guías, probar tests/specs/builds y Docker cuando esté disponible; registrar evidencia y limitaciones.

## 5. Simplificación de navegación
- [x] 5.1 Unificar Instrucciones/Herramientas/Contexto/Probar, separar edición por sección y reducir texto/acciones visibles; verificar navegación, formularios y chat conservado en escritorio/móvil.
