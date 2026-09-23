# Campo de tinta — landing de OpenFunnel

Fecha: 2026-09-22. Dirección aplicada en `landing/`.

Se eligió `02 · Campo de tinta` por la presencia del hero y la convergencia de sus trazos. Las secciones de lectura toman el espacio y la calma de `01 · Tinta sobre papel`. La referencia editorial es [Normatica](https://normatica.cl/); el fondo y la composición final son propios de OpenFunnel.

## Tratamiento

- Hero azul con acuarela estática, texto blanco y espacio libre detrás del contenido. Se mantiene azul en ambos temas.
- Cuerpo marfil en claro y tinta en oscuro, tipografía de peso regular, divisores finos y sin halos.
- Pipelines tipográficos en una única paleta azul tinta, sin círculos ni iconos repetidos. Etapas en HTML y conexiones SVG discontinuas tenues que convergen hacia el símbolo del núcleo; una sola conexión vertical en móvil. Se conserva la aparición secuencial y el movimiento reducido.
- Recorrido de integración explicado con HTML, sin imágenes de interfaz. Sales es la primera plantilla prevista; Support y Commerce son futuras aplicaciones del motor.
- Logo aprobado de seis burbujas en asterisco, con su movimiento original, navegación persistente y selector de tema conservados. El núcleo usa una versión estática del mismo símbolo y una lista abierta de capacidades, sin panel ni separadores entre iconos.

## Recurso de producción

[`06-watercolor-field.webp`](../landing/assets/images/06-watercolor-field.webp), 1536 × 1024. Generado con la herramienta integrada `image_gen` y convertido con `cwebp -q 82 -m 6`. El PNG original y las capturas exploratorias quedan fuera de Git. La imagen es decorativa; todo el texto vive en HTML.

## Prompt utilizado

```text
Use case: stylized-concept. Asset type: production website hero background, landscape 1536x1024. Reference image: OpenFunnel concept 02 Campo de tinta, supplied only for art direction. Generate ONLY its original watercolor background art; absolutely no text, logos, navigation, buttons, website layout, labels or UI. Rich deep ultramarine and indigo blue hand-painted watercolor on textured paper, fine organic pigment granulation and layered washes. Several understated pale blue watery ribbons enter from the middle right, converge around 65% width / 55% height, then branch as three wide translucent brush strokes toward the right edge. Keep the LEFT 55% and upper 20% calm, dark blue, low contrast, reserved for readable white HTML headline. More expressive pale watery strokes in the bottom-right quadrant with feathered edges. A bold editorial blue field, flat organic pigment rather than gradients or 3D, no neon, no glow, no shiny glass, no mountains, no photographic elements. Entire canvas filled with blue watercolor, no white border, no transparency needed. Composition must work cropped on mobile with calm blue behind text. Use the blue dominant watercolor portion of reference only; do not include the white section below it.
```
