## Context
PUT de conexiones cifra credenciales pero no prepara proveedores. La invalidación actual elimina la validación IA incluso al cambiar Zernio y viceversa.
## Goals / Non-Goals
Preparar al guardar, con estado veraz y recuperación. No activar IA, enviar mensajes, simular validación ni evadir cuotas. No llamar a proveedores al cargar una página o reiniciar.
## Decisions
Después de guardar, ejecutar validateModel o registerWebhook y devolver metadata con setup.status (ready/pending/failed/unconfigured/running) y error seguro. Un fallo externo conserva credenciales cifradas; PUT devuelve 200 con failed, evitando fingir rollback. Persistir error y versión en integration_settings; readiness se deriva del runtime actual.
POST /connections/:provider con expected_version reintenta sin recifrar ni invalidar; sesión y Origin, sin Bearer. Una preparación por proveedor en curso; mutaciones concurrentes del mismo proveedor rechazadas. Reintento ready no hace llamadas ni consume créditos. UI muestra éxito solo cuando ready, estado ocupado y acción Reintentar; conexiones existentes pendientes disponen de Completar conexión sin reingresar secretos. La validación mantiene cómputo de créditos y exención del dueño.
Invalidar modelo solo al cambiar IA e inbox/webhook solo al cambiar Zernio; ambos cambios conservan pausa operativa existente. La suspensión conserva invalidación completa. Proteger registro webhook contra cambios de conexión durante operación. Sin registro/validación automáticos en lectura o reinicio para evitar cargos y cambios externos inadvertidos.
## Risks / Trade-offs
Guardar puede tardar llamadas externas; un fallo parcial requiere estado claro. El secreto nunca se devuelve. Zernio reconcilia el webhook por ID/URL para reintento seguro.
