# Un motor conversacional abierto

OpenFunnel reúne contactos, conversaciones, tickets y agentes IA en una aplicación que puedes desplegar y adaptar. El núcleo, la interfaz y esta documentación son abiertos bajo Apache-2.0.

## Empieza aquí

- [Instala la app](./instalacion.html) en tu equipo o con Docker.
- [Configura el servidor](./configuracion.html): acceso, IA y canales.
- [Conoce los módulos](./uso.html) y prepara tu primer agente.
- [Sube conocimiento](./conocimiento.html) y [prueba sus respuestas](./pruebas.html).
- [Usa la API](./api.html) para leer conversaciones y ajustar prompts desde tus agentes externos.
- [Despliega y respalda](./despliegue.html) tu instalación.

## Qué incluye

Una instalación tiene un administrador. Los usuarios del directorio sirven para asignar trabajo; no son cuentas con acceso. SQLite conserva los datos, originales de documentos y configuración. No necesitas un servicio de almacenamiento de archivos ni una base vectorial.

Puedes utilizar los módulos manuales sin configurar proveedores. La mensajería conectada utiliza Zernio; la IA usa un endpoint compatible con Chat Completions y llamadas a herramientas. Habilitar un canal automático es una decisión explícita: crear registros manuales no envía mensajes.

Esta documentación describe el código de esta versión. Una instalación publicada puede ejecutar una versión anterior. El chat de prueba simula herramientas y no acredita entrega real de mensajes.

## Cómo está organizado

Frontend React + Vite, backend Node.js con HTTP nativo y SQLite sin ORM. Una sola API ejecuta el worker de mensajes por base de datos. El proyecto utiliza JavaScript, módulos ES y npm.

El [repositorio](https://github.com/chrisenprod/openfunnel_kit) contiene las especificaciones, fuentes, migraciones y guías de operación. Consulta [cómo contribuir y las licencias](./contribuir.html) antes de reutilizar la identidad visual o la landing.
