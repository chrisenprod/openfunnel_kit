# Tasks

Orden según PRD §14 y [checklist microSaaS](../../../docs/checklists/CHECKLIST-MICROSAAS.md).
Pagos queda fuera de este cambio hasta elegir suscripción o créditos.

## 1. Correos con Resend
- [x] 1.1 Añadir envío Resend de verificación/recuperación e integrar callbacks de Better Auth; probar enlace seguro, caducidad, uso único, error depurado e idempotencia con transporte simulado.
- [x] 1.2 Añadir estado de verificación pendiente y reenvío limitado; documentar remitente/dominio por instalación y verificar la UI con correo simulado.
- [ ] 1.3 Completar registro y verificación real del dueño desde su bandeja con Resend; pendiente de que el dueño cree su cuenta. No sustituirlo por una prueba simulada.

## 2. Usuarios y superadmin
- [x] 2.1 Añadir modo cloud y autenticación Better Auth por correo verificado; probar registro, login, verificación de un solo uso, recuperación, cookies y límites.
- [x] 2.2 Implementar control de roles y bootstrap del dueño mediante CLOUD_OWNER_EMAIL en cualquier instalación; probar que registro/cliente/directorio no conceden superadmin y no hay correo codificado.
- [x] 2.3 Añadir administración de cuentas, auditoría y suspensión/reactivación; probar autorización backend y protección del propietario.
- [x] 2.4 Añadir acceso/crear cuenta/recuperar y panel superadmin con estados claros; verificar formulario, teclado, móvil y errores con cuentas sintéticas, sin abrir registro productivo aún.

- [x] 2.5 Añadir mostrar/ocultar contraseña y requisito de 12 caracteres con estados accesibles rojo/verde; verificar escritura, pegado, borrado, navegación y móvil sin enviar correo real.

## 3. Multicuenta y conexiones propias
- [x] 3.1 Añadir gestor de SQLite por espacio, despacho, API keys y ciclo de workers; verificar aislamiento cruzado y recuperación tras reinicio.
- [x] 3.2 Vincular callbacks/webhooks/colas a espacio y suspensión; probar firmas cruzadas y cancelación de trabajo sin reintentar entregas inciertas.
- [x] 3.3 Implementar almacén cifrado y resolución de entorno/espacio; probar persistencia, errores de clave, prioridad, CAS y ausencia de secretos en respuestas.
- [x] 3.4 Integrar conexiones dinámicas y controles de destino; probar rotación durante ejecución, SSRF y límites de acceso.
- [x] 3.5 Añadir conexiones desde Canales/Agentes, sin pedir datos del entorno en self-hosted; verificar guardar/reemplazar, secretos ocultos y borradores.

- [x] 3.6 Clarificar configuración Zernio con marca oficial, enlace y acción principal; retirar creación manual de canales de la UI y comprobar estados, borradores, errores, enlace antiguo, móvil y temas.

- [x] 3.7 Destacar proveedor IA con enlaces, iconos, URLs sugeridas y modelo editable; permitir OpenRouter por defecto manteniendo SSRF y política explícita, verificar cambios de destino, secretos, entorno y UI responsive.

## 4. Entrega
- [x] 4.1 Actualizar PRD, arquitectura, documentación pública, entorno, Docker y respaldos; comprobar compilación y referencias desde un clon.
- [x] 4.2 Ejecutar tests de aislamiento con dos clientes y superadmin, suite completa, OpenSpec, builds y Docker; registrar evidencia y límites.
- [x] 4.3 Preparar y ensayar traslado de la instalación existente al espacio del propietario, preservando datos y colas; no habilitar cloud productivo sin correo/secretos y procedimiento verificados.

- [x] 4.4 Separar entorno productivo y local, ampliar respaldo al conjunto cloud y verificar copia/recuperación con datos sintéticos.
- [x] 4.5 Revisar secretos, publicar main tras pruebas y activar cloud nuevo con respaldo de la base anterior; verificar HTTPS, registro disponible y proveedores sin credenciales globales. La verificación real del dueño sigue en 1.3.

Evidencia y límites: [QA microSaaS](../../../docs/qa/MICROSAAS.md). El registro del dueño y la compra real requieren pruebas externas explícitas; no sustituirlas por simulación.
