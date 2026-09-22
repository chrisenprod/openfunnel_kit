# Checklist reutilizable: del repositorio a la landing

Plantilla para iniciar un proyecto con Codex y llevarlo hasta una landing publicada. Copiar a cada proyecto y marcar las tareas al completarlas. No depende de imágenes, galerías ni archivos de otro repositorio.

Antes de empezar, definir nombre del proyecto, cuenta de GitHub, repositorio y objetivo. Los nombres de carpetas, ramas y comandos siguientes son convenciones sugeridas: adaptarlos al proyecto.

## Base del proyecto

- [ ] **1. Inicializar el repositorio local y preparar el remoto.** Crear la carpeta, iniciar Git en `main` y crear o verificar el repositorio de GitHub. Revisar si el remoto contiene trabajo antes de sincronizar.

- [ ] **2. Crear `README.md` y `AGENTS.md`.** Documentar propósito, enfoque minimalista, estructura, convenciones, comandos y forma de trabajar. El README orienta a quienes usan el proyecto; AGENTS define las instrucciones para los agentes.

- [ ] **3. Conectar Git y GitHub mediante `gh`.** Configurar `origin`, comprobar la cuenta activa y ejecutar `gh auth setup-git`. Usar `gh` para autenticación, consultas, issues y pull requests; Git para cambios locales y sincronización. No extraer ni inyectar tokens manualmente.

- [ ] **4. Generar el banner del repositorio.** Usar `image_gen` con el contexto del producto, revisar el resultado e incluir el banner definitivo en el README. Si todavía no existe una definición del producto, adelantar el paso 5.1 antes de diseñarlo.

- [ ] **5. Decidir e instalar el stack mínimo.** Elegir frontend, backend y persistencia según las necesidades. Documentar versiones, gestor de paquetes y comandos; guardar el lockfile. Un ejemplo de base mínima es React + Vite, Node.js y SQLite, sin que sea obligatorio para otros proyectos.

- [ ] **5.1. Crear `CONCEPTO.md`.** Definir qué es el producto, para quién sirve, qué problema resuelve, sus casos de uso, el alcance inicial, lo que no se construirá todavía y las decisiones abiertas. Usarlo como fuente de contexto para diseño e implementación.

- [ ] **5.2. Configurar el entorno local.** Preparar `.env.example`, `.gitignore`, puertos y scripts. Excluir secretos, bases de datos locales, dependencias y compilaciones. No exponer secretos en variables del frontend.

- [ ] **5.3. Verificar la base y subir el primer commit.** Levantar los servicios necesarios, comprobar la comunicación frontend/backend y una consulta real a la base de datos. Compilar, crear el commit inicial y subirlo a `main`.

- [ ] **6. Crear una rama de trabajo.** Partir de una base limpia, crear una rama descriptiva como `feat/landing` y configurar su seguimiento en `origin`.

## Diseño e implementación

- [ ] **7. Crear una propuesta visual con Codex e `image_gen`.** Usar el concepto y el banner como referencias. Diseñar el recorrido completo: hero, explicación del producto, casos de uso, llamada a la acción y footer. Evitar promesas de funcionalidades que todavía no existen.

- [ ] **8. Explorar y seleccionar versiones.** Comparar composición, colores, tipografía, brillo y legibilidad. Generar secciones por separado manteniendo continuidad visual. Elegir una dirección antes de consolidar la implementación y registrar la decisión en texto.

- [ ] **9. Implementar la landing.** Construir HTML semántico y CSS responsive; añadir JavaScript cuando lo requiera la interacción. Incorporar navegación, enlaces reales, estados de foco y acceso por teclado. Evitar dependencias innecesarias.

- [ ] **10. Generar las ilustraciones como kit de diseño.** Crear solo las piezas que necesita la landing, como recursos independientes, sin texto incrustado y con transparencia cuando corresponda. Comprobar que el fondo tenga un canal alfa real, no una cuadrícula dibujada.

- [ ] **10.1. Integrar las ilustraciones.** Sustituir las aproximaciones iniciales, ajustar proporciones y conservar títulos y etiquetas en HTML accesible. Revisar los gráficos sobre el fondo real del sitio.

- [ ] **11. Comprimir las imágenes a WebP.** Medir peso antes y después, conservar transparencia, comprobar dimensiones y comparar visualmente. Actualizar las rutas del HTML y usar carga diferida para imágenes fuera del hero.

- [ ] **12. Consolidar la versión definitiva y limpiar recursos.** Dejar la implementación en `landing/` y las imágenes optimizadas en `landing/assets/images/`. Eliminar propuestas descartadas, galerías temporales y originales pesados que no necesita el sitio. Conservar únicamente recursos usados y documentación ligera; mantener los intermedios fuera de Git si se desean guardar localmente.

## Verificación y entrega

- [ ] **13. Validar la landing completa.** Compilar y servir el resultado por HTTP. Revisar imágenes, enlaces y consola; comprobar escritorio, tablet, móvil, teclado y ausencia de desbordes horizontales. Verificar también las interacciones añadidas, como menú o selector de tema.

- [ ] **14. Actualizar la documentación.** Sincronizar README y AGENTS con el stack, la estructura y los comandos finales. Eliminar referencias a archivos borrados. El checklist debe poder compartirse sin adjuntar recursos visuales.

- [ ] **15. Crear el commit final y sincronizar la rama.** Revisar el diff y los archivos excluidos; subir implementación, recursos optimizados y documentación. Confirmar que no se incluyan secretos ni archivos temporales.

- [ ] **16. Revisar e integrar en `main`.** Crear una pull request con `gh`, describir el resultado y las comprobaciones, revisar los cambios e integrar la rama cuando corresponda.

- [ ] **17. Publicar la landing.** Definir hosting y dominio, desplegar la compilación y verificar HTTPS, rutas, recursos y navegación en la URL pública.

## Comandos de referencia

Adaptar la cuenta y los scripts al proyecto; ejecutar solo el paso que corresponda.

```sh
# Identidad y autenticación: sustituir TU_USUARIO por la cuenta correcta.
gh auth status
gh auth switch --hostname github.com --user TU_USUARIO
gh api user --jq .login
gh auth setup-git --hostname github.com
git remote -v

# Scripts sugeridos: definirlos primero en package.json.
npm run dev:landing
npm run build:landing
npm run preview:landing

# Conversión de un recurso, con cwebp instalado.
# Crear primero la carpeta de destino.
mkdir -p landing/assets/images
cwebp -q 85 -m 6 -alpha_q 100 -exact ilustracion.png -o landing/assets/images/ilustracion.webp

# Revisión antes de guardar cambios.
git status --short
git diff --check
```

## Prompts reutilizables

**Concepto:** «Ayúdame a definir este proyecto en CONCEPTO.md: problema, público, propuesta de valor, casos de uso, alcance inicial, exclusiones y decisiones pendientes. Usa lo que ya acordamos y señala lo que falta decidir».

**Banner:** «Basándote en CONCEPTO.md, genera con image_gen un banner horizontal para el README. Prioriza nombre, propuesta de valor y una ilustración coherente con el producto. No inventes métricas, clientes ni funciones disponibles».

**Propuesta visual:** «Usa CONCEPTO.md y el banner para generar tres imágenes coordinadas de una landing: hero, sección central y cierre con footer. Mantén tipografía, colores, márgenes y botones consistentes. Preséntala como propuesta visual para implementar».

**Kit de ilustraciones:** «A partir de la propuesta elegida, genera por separado las ilustraciones necesarias. Sin textos ni interfaz incrustados, con PNG de transparencia real y margen para no cortar los bordes. Mantén la misma dirección visual. Después comprime los recursos finales a WebP e intégralos en la landing».

Estos prompts permiten repetir el proceso; regenerar imágenes puede producir variantes, no copias exactas de una propuesta anterior.
