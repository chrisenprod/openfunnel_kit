# Licencia, marca y servicio cloud

Copyright 2026 Chris Lobarede Fernández.

Este repositorio reúne software abierto y materiales de presentación con permisos
distintos. **El núcleo y la interfaz de la aplicación son Apache-2.0; la landing
comercial y los recursos de identidad no se ofrecen bajo esa licencia.**

## Alcance por archivo

Salvo un aviso específico o una licencia de terceros, el material propio del
repositorio se ofrece bajo [Apache License 2.0](LICENSE), con estas excepciones:

| Material | Régimen |
|---|---|
| `backend/`, `frontend/`, configuración de la raíz y documentación | Apache-2.0 |
| `landing/brand.css` y `landing/vite.config.js` | Apache-2.0; el CSS no licencia la imagen a la que hace referencia |
| Resto de `landing/`, incluido HTML, CSS, JavaScript, textos e imágenes | Derechos reservados, con los permisos limitados descritos abajo; ver [landing/LICENSE](landing/LICENSE) |
| `assets/`, incluido el banner y su prompt | Derechos reservados, con los permisos limitados descritos abajo; ver [assets/LICENSE](assets/LICENSE) |
| Dependencias y materiales de terceros | Sus propias licencias y avisos |

Incrustar una imagen reservada en un documento o en la aplicación, o incluirla en
una compilación, no cambia la licencia de esa imagen ni la del código que la usa.
Las compilaciones conservan el régimen de cada componente. El repositorio completo
no debe describirse como si todos sus archivos fueran Apache-2.0.

## Qué permite el software abierto

Apache-2.0 permite usar, estudiar, modificar, redistribuir y explotar comercialmente
el software cubierto, incluidas aplicaciones propias y servicios alojados. No obliga
a publicar las modificaciones. Al redistribuir, deben cumplirse sus condiciones:
entregar la licencia, señalar los archivos modificados y conservar los avisos
aplicables, incluido [NOTICE](NOTICE).

Se conserva sin modificaciones el texto de Apache-2.0 utilizado en la primera
versión de OpenFunnel. Esta política delimita materiales distintos; no añade una
prohibición de competir, cobrar o prestar servicios al código Apache-2.0.
Tampoco revoca permisos ya concedidos sobre versiones publicadas anteriormente.

## Landing y recursos de identidad

En la medida de los derechos que correspondan a Chris Lobarede Fernández, quedan
reservados los materiales indicados en la tabla. Se concede un permiso gratuito,
no exclusivo, para:

- Copiarlos junto con el repositorio, incluidos sus forks, conservando estos avisos.
- Inspeccionarlos, compilarlos y modificarlos localmente para aprendizaje, pruebas
  y preparación de contribuciones al proyecto, y presentar esos cambios al mantenedor.
- Mostrar el banner y el símbolo originales dentro de la documentación del
  repositorio y de sus forks, identificando el origen y, cuando corresponda,
  aclarando que se trata de un fork no oficial.
- Mostrar el nombre y el símbolo incluidos en la interfaz de instalaciones de la
  versión oficial sin modificaciones, también en autohospedaje empresarial. Esto
  identifica el software utilizado, no al operador como proveedor oficial.

Estos permisos no incluyen publicar la landing como sitio comercial propio,
redistribuir sus adaptaciones como plantilla ni reutilizar las imágenes o el logo
como identidad de otro producto o servicio. Esos usos requieren autorización
escrita del titular, salvo los usos permitidos por la ley o por otra licencia
aplicable. No se exige autorización para ejercer los derechos del código Apache-2.0.

Para publicar una aplicación derivada con identidad propia, sustituir el nombre
visible, el favicon y el símbolo. Actualmente las referencias están en
`frontend/index.html`, `frontend/src/main.jsx` y `landing/brand.css`; el símbolo está
en `landing/assets/images/openfunnel-mark.webp`. Los acentos decorativos de
`frontend/src/style.css` usan `landing/assets/images/07-app-watercolor.webp`,
que conserva los permisos de identidad de la landing. El motor no depende de estas imágenes:
puede reemplazarse o eliminarse su referencia sin cambiar su funcionalidad.
Los avisos legales de autoría y procedencia deben conservarse donde corresponda.

## Nombre, marca y procedencia

La sección 6 de Apache-2.0 no concede derechos de marca, salvo los usos razonables
para describir el origen y reproducir los avisos. Esta política se refiere a la
identidad utilizada por **el proyecto de Chris Lobarede Fernández**. No afirma
exclusividad mundial sobre la palabra «OpenFunnel», registro de marca ni derechos
sobre proyectos homónimos de terceros.

Puede indicarse de forma veraz «basado en OpenFunnel de chrisenprod», enlazar el
repositorio y explicar compatibilidad o procedencia. No se concede autorización
para presentar un fork, curso o servicio de terceros como oficial, patrocinado o
aprobado por el mantenedor. Para comercializar una derivación o un servicio propio,
usar identidad propia; una atribución no equivale a patrocinio.

Los permisos de identidad concedidos arriba alcanzan únicamente los derechos que
el titular pueda conceder. No certifican originalidad, protección por derecho de
autor de cada recurso generado con IA, registrabilidad ni ausencia de derechos
anteriores de terceros.

## Control del proyecto y oferta comercial

Chris Lobarede Fernández mantiene las decisiones del repositorio oficial, las
contribuciones que acepta, las versiones que publica, la landing y la operación
de su servicio cloud. La licencia no da acceso administrativo a sus cuentas,
dominios, infraestructura, credenciales o datos de clientes.

El núcleo, la interfaz, API y MCP se publicarán abiertos según se implementen,
conforme a [CONCEPTO.md](docs/CONCEPTO.md). La infraestructura comercial privada del
cloud —aprovisionamiento, facturación y operación— debe mantenerse separada del
código abierto y contar con avisos explícitos si llega a distribuirse. Una mención
al cloud no convierte automáticamente en privado código publicado bajo Apache-2.0.

OpenFunnel Cloud es la oferta administrada del mantenedor. Su contratación,
consumo, soporte y tratamiento de datos requieren condiciones de servicio y
privacidad propias antes del lanzamiento. La licencia del código no las sustituye.
**Apache-2.0 permite que terceros ofrezcan servicios comerciales basados en el
código; no concede exclusividad de alojamiento al cloud oficial.**

La formación y el acompañamiento de «De 0 a producción con IA» son ofertas
separadas. La licencia permite que los alumnos creen aplicaciones comerciales;
no les concede por ello derechos sobre la landing, la identidad ni los materiales
formativos externos al repositorio.

Las contribuciones al código abierto se reciben bajo Apache-2.0 conforme a su
sección 5, salvo acuerdo explícito distinto. Sus autores conservan sus derechos;
contribuir no transfiere automáticamente la titularidad al mantenedor. Los aportes
a materiales reservados requieren acordar expresamente sus permisos antes de
incorporarlos.

## Revisión pendiente del nombre

Existe otro [OpenFunnel](https://openfunnel.ai/) que ofrece herramientas de IA y GTM.
Esta coincidencia requiere revisar antecedentes y posible confusión en los mercados
de lanzamiento antes de invertir en el nombre o solicitar su registro. Añadir esta
política, comprar un dominio o usar «by chrisenprod» no resuelve por sí solo esa
cuestión. No se ha realizado una búsqueda registral ni una evaluación jurídica de
disponibilidad; conviene revisión profesional de nombre, identidad y reservas.

Referencias consultadas el 23 de septiembre de 2026:

- [Apache-2.0, secciones 2, 4, 5 y 6](https://www.apache.org/licenses/LICENSE-2.0): permisos, redistribución, contribuciones y marcas.
- [Open Source Definition](https://opensource.org/osd): una licencia abierta no puede excluir el uso comercial ni determinados sectores.
- [INAPI: información sobre marcas](https://www.inapi.cl/marcas/para-informarse): registro, derechos y causales de irregistrabilidad.
