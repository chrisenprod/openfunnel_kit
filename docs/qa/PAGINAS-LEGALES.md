# Páginas legales de OpenFunnel

Revisión: 25 de septiembre de 2026. Cambio de contenido público y enlaces;
no habilita registro, aceptación contractual, cobros ni despliegue.

## Fuente y alcance

A petición del usuario se consultó la copia local de Creator OS en
`MOCCA 2026/MOCCA-Platform/creator-os`, archivo
`apps/manager/app/pages/legal/constants/legal-content.ts`.
Se tomaron la razón social MOCCA IA SpA, RUT 78.065.817-7, domicilio en
Cerro El Plomo 5931, Oficina 1213, Piso 12, Las Condes, Santiago, Chile,
y correo público `agent@mocca-ia.cl`. El usuario identificó a MOCCA IA como
operador del cloud. Esta consulta no verifica los datos ante un registro oficial.
El archivo original no es necesario para compilar ni usar este repositorio.

Los textos de OpenFunnel distinguen licencia Apache-2.0, autohospedaje y servicio
cloud oficial. Los operadores de otras instalaciones deben adaptar sus condiciones,
aunque habiliten el modo de cuentas múltiples. Las restricciones del servicio
cloud no modifican la licencia del código.

La adaptación usa los datos y flujos presentes en OpenFunnel: cuentas,
conversaciones, documentos, Resend, Zernio y proveedor de IA configurable.
No se copiaron los planes, cobros, cookies de marketing, certificaciones,
garantías de respaldos, plazos de borrado o promesas de retención cero de Creator OS.
Polar.sh figura en el checklist reutilizable como integración por realizar,
no como proveedor activo de OpenFunnel.

## Rutas generadas

- `/docs/terminos.html`: Términos de servicio / Terms of Service.
- `/docs/privacidad.html`: Política de privacidad / Privacy Policy.

Se incluyen en los builds de app, landing y documentación independiente.
La landing y las pantallas de acceso enlazan ambas páginas sin exigir sesión.
El alcance se explica antes de las cláusulas del cloud para evitar atribuir a
MOCCA la operación de cualquier instalación que distribuya la documentación.

## Pendientes de operación

- Confirmar proveedor y país de alojamiento del cloud y sus condiciones de tratamiento.
- Definir y verificar conservación, borrado de cuentas, registros y copias.
- Revisar la versión definitiva antes de abrir el registro público y definir el
  mecanismo de aceptación/versionado que corresponda. Los enlaces por sí solos
  no registran aceptación ni consentimiento.
- Actualizar condiciones y destinatarios antes de implementar pagos o nuevos
  tratamientos; revisar la entrada en vigor de la reforma chilena de datos.

## Verificación local

- `node --test tests/public-docs.test.js`: correcto; 12 páginas públicas,
  enlaces relativos, anclas y copias de app/landing consistentes.
- `npm run spec:validate`: 18 elementos correctos.
- `npm run build` y `npm run build:landing`: correctos.
- Chrome sobre un servidor HTTP temporal de la compilación de la landing:
  términos y privacidad responden 200 a 1440 y 390 px, sin desbordes horizontales;
  el primer Tab alcanza «Saltar al contenido» y Enter mueve el foco al contenido.
  Sin errores JavaScript en las páginas recorridas. Enlaces legales presentes en
  el pie de la landing y revisados visualmente junto con las páginas.
- Checklist: 18 pasos consecutivos y todas las casillas vacías.

La revisión local no demuestra publicación en los dominios oficiales ni constituye
una revisión jurídica o una auditoría del tratamiento de datos en producción.

## Fuentes consultadas

- [Ley 19.628, Biblioteca del Congreso Nacional](https://www.bcn.cl/leychile/Navegar?idNorma=141599).
- [Texto con vigencia desde el 1 de diciembre de 2026](https://www.bcn.cl/leychile/navegar?idNorma=141599&idVersion=2026-12-01).
- [Acuerdo de tratamiento de Resend](https://resend.com/legal/dpa).
- [Sandbox de Polar](https://polar.sh/docs/integrate/sandbox) y
  [portal de clientes](https://polar.sh/docs/features/customer-portal/introduction).
