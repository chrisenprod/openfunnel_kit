## Context
El registro ejecutable está en backend/llm.js; la tabla tools empieza vacía. El agente selecciona IDs de esa tabla y el worker ejecuta únicamente tipos registrados. Bearer solo permite lectura, cambios de prompts existentes y pruebas.

## Goals / Non-Goals
Permitir configurar un agente con una API key limitada al espacio y ofrecer tools nativas sin crearlas manualmente. No añadir ejecución arbitraria, conectores nuevos, borrado por API key, administración de cuentas ni acceso a secretos.

## Decisions
- Sincronizar tres filas nativas con IDs estables al abrir cada base de negocio. Conservar registros y asociaciones anteriores; no asignar tools automáticamente a agentes. Definición ejecutable y schema proceden del registro backend.
- La colección tools es de lectura para sesiones y API keys. Retirar crear/editar/eliminar del frontend, incluyendo rutas antiguas de alta. Las tools heredadas se conservan como referencias; la selección nueva muestra las nativas.
- agents:write admite POST /ai_agents y PATCH /ai_agents/:id, incluidos prompt_ids y tool_ids. prompts:write admite POST /prompts, además de PATCH/restauración existentes con su control de versión. No dar scopes nuevos a claves existentes.
- channels:assign admite exclusivamente PUT /channels/:id/agent con agent_id. Reutilizar la operación existente de configuración con enabled=false; validar pertenencia, rechazar campos extra y no aceptar habilitación automática. Mantener acciones operativas bajo sesión y controles existentes.
- Cloud conserva X-OpenFunnel-Workspace más Bearer, sin cookie; se resuelve y valida la clave dentro de ese espacio. Los IDs conocidos de otro cliente no conceden acceso.
- Probar el flujo con transporte simulado y cuentas verificadas sintéticas. El handoff real conserva su comportamiento: modo manual, motivo, cancelación de trabajo pendiente; Probar sigue simulándolo.

## Risks / Trade-offs
La retirada del CRUD de tools cambia un contrato anterior: documentarlo y actualizar pruebas. Conservar filas heredadas evita romper referencias. Las llamadas de configuración no consumen créditos; ejecutar IA y tools conserva los requisitos de plan existentes.

## Migration Plan
Sin SQL nuevo: sincronización idempotente al iniciar el espacio. Comprobar reinicio, referencias anteriores y bases nuevas. Publicación mediante CI/Actions con respaldo habitual; no crear un agente operativo ni tocar canales del usuario durante la verificación.
