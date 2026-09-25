# Configuración del servidor

`npm run dev:backend` carga `.env.local`; `npm start` carga `.env` para producción. También se pueden inyectar variables del proceso. `.env.example` documenta las opciones. Mantén bases y secretos separados; los secretos nunca deben llevar el prefijo `VITE_`, que los expondría al navegador. Reinicia la API después de cambiar el entorno.

## Acceso y base de datos

| Variable | Uso |
|---|---|
| `admin_user` | Usuario del único administrador. |
| `admin_pass` | Contraseña de 12–128 caracteres, sin valor predeterminado. |
| `APP_ORIGIN` | Origen exacto de la interfaz, por defecto `http://localhost:5173`. |
| `DATABASE_PATH` | Ruta SQLite, por defecto `backend/data/app.sqlite`. |
| `HOST` | `127.0.0.1` por defecto; `0.0.0.0` dentro de Docker. |
| `PORT` | Puerto de la API, por defecto `3001`. |
| `BETTER_AUTH_SECRET` | Opcional, al menos 32 caracteres. Si falta, se genera y conserva en SQLite. |

En el modo predeterminado `self-hosted`, sin credenciales no hay acceso a recursos de negocio. Las sesiones vencen a las ocho horas; cambiar usuario o contraseña y reiniciar la API revoca las anteriores. El directorio de Usuarios no concede login. Para registro por correo y espacios independientes, consulta [Cuentas y conexiones](./cuentas.html).

`APP_ORIGIN` incluye protocolo y puerto, sin ruta: `http://localhost:5173` y `http://127.0.0.1:5173` son orígenes diferentes. En producción usa el origen HTTPS público.

## Inteligencia artificial

| Variable | Uso |
|---|---|
| `LLM_BASE_URL` | URL HTTPS del endpoint compatible con OpenAI. |
| `LLM_API_KEY` | Credencial del proveedor. Solo backend. |
| `LLM_MODEL` | Modelo o nombre exacto del deployment. |

Todos los agentes del espacio comparten una conexión. **No hay selector ni campos de proveedor/modelo en el formulario del agente.** En self-hosted, el entorno tiene prioridad y los valores ausentes se completan desde Agentes IA → Conexión IA. En cloud, cada espacio guarda sus propias credenciales cifradas. Los valores antiguos almacenados por agente no cambian la conexión.

Para Azure usa su endpoint v1, por ejemplo `https://TU_RECURSO.openai.azure.com/openai/v1/`, y el nombre del deployment en `LLM_MODEL`. Para otro proveedor usa su URL compatible; debe soportar Chat Completions y llamadas a herramientas. La app no transmite respuestas en streaming.

Al editar un agente, **Comprobar conexión** verifica texto y herramientas. La comprobación llama al proveedor y puede consumir tokens. La prueba aislada también consume tokens, aunque no exige activar el agente ni validar antes la operación automática.

## Canales Zernio

`ZERNIO_API_KEY` habilita la conexión. Para webhooks y retorno de conexión configura `PUBLIC_BASE_URL` con el origen HTTPS de la app y `ZERNIO_WEBHOOK_SECRET` con al menos 32 caracteres.

Desde Canales conecta o sincroniza las cuentas autorizadas, registra el webhook y asigna un agente. Revisa las restricciones y ventanas del canal antes de habilitar automatización. Usa primero una cuenta propia de prueba. No reutilices una base operativa con dos workers.

La [guía de integración del repositorio](https://github.com/chrisenprod/openfunnel_kit/blob/main/docs/deploy/INTEGRACIONES.md) describe firma, webhooks y preparación del proveedor. Las claves de Zernio y del LLM son distintas de las [claves API de OpenFunnel](./api.html).

## Docker

`.env.docker.example` contiene los equivalentes `DOCKER_*`, como `DOCKER_LLM_MODEL` y `DOCKER_APP_ORIGIN`. Usa siempre `--env-file .env.docker`. No imprimas la configuración resuelta con secretos en registros compartidos; `config --quiet` valida sin mostrarlos.
