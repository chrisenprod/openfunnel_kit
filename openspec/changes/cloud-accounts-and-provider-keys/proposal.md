## Why
OpenFunnel publicado utiliza una identidad única y proveedores del servidor. La cuarta etapa, microSaaS (PRD §14), permite ofrecer cloud con registro público, espacios aislados, claves propias y un superadmin del dueño de cada instancia, conservando la instalación autohospedada. Estas capacidades pertenecen al núcleo abierto; cualquiera que lo despliegue puede configurarlas.

## What Changes
- Modo cloud explícito, con Better Auth para registro por email, verificación mediante Resend, acceso y recuperación; sustituye admin_user/admin_pass únicamente en cloud.
- Un espacio por cuenta en esta etapa. Roles de plataforma superadmin y cliente, autorizados en backend; Usuarios sigue siendo un directorio de negocio.
- Superadmin inicial mediante CLOUD_OWNER_EMAIL y correo verificado; dueño de esa instancia, sin correo codificado ni privilegios por elección durante registro o por ser el primer usuario.
- Zernio configurable desde Canales; LLM desde Agentes (URL base, clave y modelo/deployment cuando falte). Credenciales cifradas, reemplazables y nunca devueltas al navegador.
- Autohospedado conserva prioridad de los valores de entorno y no solicita los campos ya definidos. Cloud BYOK utiliza credenciales de cada espacio, sin heredar claves Zernio compartidas del operador.
- Canales orientado a Zernio: marca oficial, enlace, configuración como acción principal inicial y retirada de creación manual en la interfaz.
- Configuración IA destacada con accesos OpenAI/OpenRouter y proveedor compatible personalizado, sin catálogo fijo de modelos ni llamadas automáticas.
- Administración mínima de cuentas y suspensión, sin acceso implícito a conversaciones o secretos de clientes.
- Suscripción o créditos, precios y procesador de pagos quedan pendientes de decisión. No implementar todavía checkout, saldos, restricciones por pago ni portal de costes; no presentar gastos estimados como cobros. Con claves propias, el cliente paga directamente sus proveedores.
- Secuencia acordada: Resend → usuarios y superadmin → multicuenta y conexiones → pagos. Este cambio cubre los tres primeros bloques del checklist microSaaS; pagos tendrá otro cambio una vez definido.

## Capabilities
### New Capabilities
- `cloud-accounts`: registro, roles, aislamiento, administración y operación cloud.
- `provider-credentials`: configuración cifrada por espacio y resolución de entorno.
### Modified Capabilities
- `admin-auth`: distinguir acceso autohospedado de cloud, conservando sesiones protegidas y registro cerrado en instalaciones existentes.

## Impact
Autenticación y despacho HTTP, persistencia, ciclo de workers/webhooks, conectores Zernio/LLM, frontend, Docker, documentación y pruebas. Mantener React, Node y SQLite. No transformar ni publicar automáticamente la base productiva existente. La activación cloud requiere configurar correo, secretos y asignación del propietario, además de verificar migración de los datos previos.
