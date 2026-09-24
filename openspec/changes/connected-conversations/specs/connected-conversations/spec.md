# Connected conversations

## Purpose

Atender DMs de Instagram y mensajes individuales de WhatsApp mediante Zernio y agentes con Azure, conservando el modelo propio de OpenFunnel.

## ADDED Requirements

### Requirement: Conexión y esquema propio
El sistema SHALL sincronizar cuentas Zernio y conectar/reconectar Instagram y WhatsApp desde la app con perfil, consentimiento externo y callback verificado. SHALL mantener IDs locales, asignaciones y datos manuales. SHALL traducir recursos externos y rechazar cambios incompatibles sin corromper datos.

#### Scenario: Sincronización repetida
- **WHEN** se sincroniza dos veces una cuenta con conversaciones y mensajes
- **THEN** no se duplican datos ni se sobrescribe configuración local; el historial no dispara IA

#### Scenario: Callback inválido
- **WHEN** un callback carece de sesión, nonce vigente o cuenta del perfil/plataforma esperados
- **THEN** no se confirma conexión

#### Scenario: Contrato incompatible
- **WHEN** faltan campos requeridos o hay tipos desconocidos
- **THEN** se muestra error, se conserva el evento para reprocesar y no se ejecuta IA sobre él

### Requirement: Mensajería confiable
El sistema SHALL persistir webhooks verificados por HMAC antes de confirmarlos, deduplicar y recuperar trabajo tras reinicio. SHALL enviar texto por el canal original, distinguir estados reales y no reintentar envíos inciertos sin reconciliación. SHALL excluir comentarios, grupos e interpretación de adjuntos.

#### Scenario: Duplicados y firma
- **WHEN** se repite un evento o llega con firma inválida
- **THEN** el duplicado no crea otro mensaje/run y la firma inválida no modifica datos

#### Scenario: Ventana vencida o entrega incierta
- **WHEN** vence la ventana de 24 horas o falla ambiguamente el envío
- **THEN** el envío queda bloqueado o incierto con explicación sin reenvío ciego

### Requirement: IA compatible y herramientas permitidas
El sistema SHALL usar SDK OpenAI con endpoint/modelo configurables, Azure como instalación inicial y Chat Completions con tool calling validado. SHALL acotar contexto, rondas, herramientas, salida y tiempo; persistir ejecución y consumo sin secretos. Solo SHALL ejecutar get_contact, get_ticket y handoff_to_human vinculadas al agente.

#### Scenario: Modelos por agente
- **WHEN** se configura un agente en esta instalación
- **THEN** se sugieren Sol, Terra y Luna 5.6, se admite otro deployment explícito y cada modelo requiere validación real; una raíz de recurso Azure utiliza su ruta v1

#### Scenario: Respuesta con tools
- **WHEN** un mensaje nuevo elegible llega a un canal con agente activo validado
- **THEN** utiliza sus prompts/contexto/tools y envía la respuesta final por el canal original

#### Scenario: Herramienta no autorizada
- **WHEN** el modelo pide una función desconocida o argumentos ajenos al contexto
- **THEN** se rechaza sin ejecutar código, SQL, URLs o acceso a otro contacto

### Requirement: Control humano y configuración
El sistema SHALL conservar secretos en servidor, permitir agente por canal con override por conversación y automatización inicialmente apagada. SHALL permitir tomar control y reanudar explícitamente, cancelando trabajo pendiente y revalidando modo/agente antes de enviar.

#### Scenario: Toma de control durante generación
- **WHEN** una persona toma control o cambia la configuración antes del envío
- **THEN** la generación obsoleta no se envía y se conserva historial

#### Scenario: Integración sin configurar
- **WHEN** faltan credenciales de proveedor
- **THEN** la base manual sigue operativa y la UI identifica la integración no disponible sin revelar secretos
