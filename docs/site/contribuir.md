# Contribuir

Puedes proponer mejoras, reportar problemas y enviar cambios al [repositorio de OpenFunnel](https://github.com/chrisenprod/openfunnel_kit). Describe el problema, pasos para reproducirlo y resultado esperado. Usa datos sintéticos: no adjuntes credenciales, conversaciones reales ni bases de negocio.

## Preparar cambios

Instala con `npm ci` y sigue `AGENTS.md`. El proyecto mantiene JavaScript, React + Vite, HTTP nativo y SQLite sin ORM. Añade dependencias y estructura solo cuando resuelvan una necesidad concreta.

Las decisiones de producto viven en `docs/CONCEPTO.md` y `docs/PRD.md`. El diseño visual se define en `docs/DESIGN_SYSTEM.md` y la base técnica en `docs/ARCHITECTURE.md`. Los cambios de comportamiento se especifican en OpenSpec antes de implementarse. No necesitas materiales privados o ignorados para usar el clon.

## Verificar

```sh
npm test
npm run spec:validate
npm run build
npm run build:landing
```

Para cambios de despliegue, con Docker disponible, ejecuta `npm run test:docker`. Este comando usa datos sintéticos y elimina únicamente su proyecto y volumen temporales. No reutilices un entorno productivo para QA.

Verifica las pantallas afectadas en escritorio, móvil y con teclado. Explica en el cambio qué se probó y qué sigue pendiente. Una respuesta de un proveedor simulado no demuestra mensajería real.

## Editar esta documentación

Las páginas están en `docs/site/`; la referencia API está en `docs/api/AGENTES.md`. `scripts/build-docs.js` define la lista explícita de fuentes publicadas. Edita el Markdown, ejecuta `npm run dev:docs` y comprueba enlaces y navegación. La salida generada no se versiona.

Mantén la documentación de producto en español y los identificadores, comentarios técnicos y código en inglés. Los nuevos comandos deben reflejarse en README y AGENTS.

## Licencias e identidad

El núcleo, la interfaz y la documentación se ofrecen bajo **Apache-2.0**. La licencia permite modificar, distribuir, autohospedar y ofrecer servicios comerciales, cumpliendo sus condiciones y avisos. Consulta el texto de [LICENSE](https://github.com/chrisenprod/openfunnel_kit/blob/main/LICENSE) y [NOTICE](https://github.com/chrisenprod/openfunnel_kit/blob/main/NOTICE).

La landing comercial y los recursos de identidad tienen permisos separados. Revisa [LICENSING.md](https://github.com/chrisenprod/openfunnel_kit/blob/main/LICENSING.md), `landing/LICENSE` y `assets/LICENSE` antes de reutilizarlos. El código abierto no concede derechos sobre la identidad para presentar un producto propio como oficial ni acceso al servicio cloud del mantenedor. La disponibilidad jurídica del nombre no se afirma como resuelta.
