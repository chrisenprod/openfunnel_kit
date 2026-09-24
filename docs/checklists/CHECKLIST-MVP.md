# Checklist reutilizable: desarrollo del MVP

Plantilla para iniciar el desarrollo de un MVP en cualquier proyecto. Completar
los siguientes pasos a medida que se definan y marcar las tareas al realizarlas.

- [ ] **1. Instalar y configurar OpenSpec.** Inicializar OpenSpec en el proyecto para comenzar a trabajar con desarrollo guiado por especificaciones (SDD). Seguir las [instrucciones oficiales](https://github.com/Fission-AI/OpenSpec).

- [ ] **2. Instalar Better Auth.** Añadir el paquete `better-auth` como dependencia del proyecto con `npm install better-auth`, siguiendo la [guía oficial de instalación](https://better-auth.com/docs/installation). Este paso incluye únicamente la instalación; la configuración e implementación de la autenticación se definirán después.

- [ ] **3. Crear `docs/PRD.md` a partir del concepto.** Definir el objetivo de la primera entrega, usuarios, alcance, entidades y relaciones, operaciones de la interfaz, dirección visual y criterios de aceptación. Separar lo que se construirá ahora de las integraciones y capacidades de etapas posteriores. Registrar supuestos y decisiones pendientes antes de implementar.

- [ ] **4. Definir el sistema de diseño de la app.** Usar el PRD y la dirección visual existente para crear `docs/DESIGN_SYSTEM.md`: paleta, tipografía, espaciado, componentes, estados, navegación, accesibilidad y adaptación a móvil. Si existe `design.md`, consolidar sus decisiones vigentes en esta guía; guardar los antecedentes visuales locales en una subcarpeta de `docs/` ignorada por Git.

- [ ] **5. Especificar las funcionalidades con OpenSpec.** Convertir el alcance del PRD en cambios concretos con propuesta, especificaciones, diseño y tareas antes de implementar. Definir criterios de aceptación verificables, escenarios de error y exclusiones. Resolver las decisiones pendientes y mantener los artefactos alineados con lo acordado; instalar OpenSpec solo prepara la herramienta.

- [ ] **6. Implementar el MVP por funcionalidades completas.** Construir la interfaz, la API y la persistencia de cada flujo según sus especificaciones. Incluir la configuración e implementación real de la autenticación y los controles de acceso. Incorporar pruebas automatizadas de los comportamientos relevantes durante el desarrollo, comprobar los criterios de aceptación y mantener la documentación actualizada.

- [ ] **7. Integrar los servicios externos necesarios.** Conectar únicamente los servicios incluidos en el alcance del MVP. Configurar credenciales en el servidor, conexiones y webhooks cuando correspondan; contemplar errores, duplicados, reintentos y recuperación. Si una funcionalidad depende de un servicio, integrarlo mientras se construye. Verificar primero con cuentas o entornos de prueba y no confundir una conexión exitosa con un recorrido completo validado.

- [ ] **8. Validar con pruebas automatizadas y manuales.** Ejecutar las pruebas automatizadas, compilar y validar las especificaciones. Recorrer los flujos principales de extremo a extremo, incluidas las integraciones reales que correspondan, y revisar móvil, escritorio, teclado, permisos, estados vacíos y errores. Corregir los fallos y volver a comprobar los escenarios afectados. Registrar resultados, limitaciones y pendientes, distinguiendo pruebas simuladas de pruebas con servicios reales.
