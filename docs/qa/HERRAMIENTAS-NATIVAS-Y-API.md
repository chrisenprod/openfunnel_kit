# Herramientas nativas y preparación de agentes por API

Fecha: 2026-09-25. Cambio: `native-tools-and-agent-api`.

## Verificación local y CI

- 107 tests aprobados: creación/asociación mediante Bearer sin cookie, scopes,
  revocación, referencias cruzadas entre dos cuentas, catálogo tras reinicio y
  ausencia de llamadas a Zernio/LLM durante configuración.
- Handoff con proveedor simulado: guarda el motivo, deja la conversación en modo
  manual, registra `handed_off`, no responde a nuevos mensajes ni afecta otro chat.
- Build y 20 validaciones OpenSpec correctos. CI incluye auditoría de dependencias,
  builds app/landing y contenedores aislados.
- Chrome con una API real y SQLite temporal: catálogo sin botones de CRUD, redirección
  de `/tools/new`, selección nativa guardada, cinco permisos, navegación por teclado,
  sin desbordamiento a 390/1440 px en ambos temas. Capturas locales no versionadas.
- Ninguna prueba llamó a proveedores reales, compró planes ni envió mensajes.

## Contrato de publicación

Sin SQL nuevo ni cambios de variables. El inicio de cada base de negocio sincroniza
el catálogo estable y conserva herramientas y asociaciones anteriores. Las API keys
existentes no reciben `agents:write` ni `channels:assign`; se emiten nuevas claves con
los permisos necesarios. Vincular un agente desactiva la automatización del canal.

## Publicación verificada

Integrado mediante [PR #10](https://github.com/chrisenprod/openfunnel_kit/pull/10),
commit `c8269a7445a1cc93089c6bb832a5e18d5232c0f6`.
[CI main](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36211369805) y
[Publicar VPS](https://github.com/chrisenprod/openfunnel_kit/actions/runs/36211456049)
finalizaron correctamente. HTTPS devuelve salud SQLite correcta; la documentación
y el JavaScript publicados incluyen `agents:write` y `channels:assign`.

La verificación pública no inicia sesión, crea agentes, activa canales ni envía
mensajes. La configuración operativa solicitada por el dueño se gestiona por
separado con su API key, sin guardar credenciales en el repositorio.
