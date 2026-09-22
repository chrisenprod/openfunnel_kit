# OpenFunnel — concepto

Estado: decisión de producto tomada, nada construido todavía.
Fecha: 2026-08-05.

## Qué es

**An open-source platform for building AI-powered business workflows.**

No es un CRM open source. El CRM, el soporte y el e-commerce son **casos de uso** que
corren encima del mismo motor.

## La tesis

Un funnel no significa ventas. Es un proceso donde una conversación o entidad entra,
pasa por estados y termina en un resultado.

| Funnel | Entra | Sale |
|---|---|---|
| Sales | Lead | Customer |
| Support | Issue | Resolved |
| Commerce | Intent | Order |

Sales y Support usan el mismo motor: cambian el objetivo, los estados, el agente y las
acciones. Por eso **no** son productos separados.

Consecuencia directa: "ticket" deja de ser un concepto central del sistema. Un ticket es
un tipo de funnel.

## Arquitectura de marca

**OpenFunnel es el producto**, no la marca madre. Sales, Support y Commerce son tipos de
funnel dentro de él.

```
                    OPENFUNNEL
                         │
                  FUNNEL ENGINE
                         │
      ┌──────────────────┼──────────────────┐
      ↓                  ↓                  ↓
    SALES             SUPPORT            COMMERCE
      │                  │                  │
   Leads               Cases              Orders
   Deals               Issues             Products
   Quotes              SLA                Cart
   Pipeline            Escalación         Checkout
```

Descartado por ahora: `OpenSupport` y `OpenCommerce` como repos/productos aparte, y
`OpenBooking` completo (fuera del alcance, decisión de Chris).

## Núcleo compartido

Todo funnel, sea cual sea, usa las mismas piezas:

- `Agent` — el agente de IA que opera el funnel
- `Conversation` — el hilo con la persona
- `Channel` — WhatsApp, web chat, Instagram, email, API
- `Contact` — la persona del otro lado
- `Knowledge` — lo que el agente sabe
- `Tool` — lo que el agente puede ejecutar
- `Workflow` — estados, transiciones y automatizaciones
- `Human handoff` — cuando el agente no puede resolver
- `Memory`, `Webhooks`, `MCP`, `API`

Cada funnel agrega su propio modelo de dominio encima (Deal/Quote en sales,
Product/Cart/Order en commerce). El núcleo no se forkea.

## Los tres funnels de arranque

**Sales** — objetivo: convertir el contacto en cliente.
`Nuevo lead → Contactado → Calificado → Interesado → Propuesta → Negociación → Ganado`

**Support** — objetivo: resolver el problema.
`Nueva conversación → Identificado → Clasificado → En resolución → Esperando cliente → Resuelto`
Si el agente no puede: handoff a humano.

**Commerce** — objetivo: convertir la conversación en una orden.
`Visitante → Interesado → Producto identificado → Carrito → Checkout → Pagado → Enviado → Entregado`

## Funnels custom

El usuario define los suyos: nombre, trigger, etapas, agente.

```
Name: Insurance Claims
Trigger: mensaje de WhatsApp
Stages: New → Information Required → Documentation → Assessment → Approved / Rejected → Closed
Agent: Claims Agent
```

De ahí salen templates (Sales, Support, E-commerce, Healthcare, Real Estate, Automotive)
y, más adelante, funnels que comparte la comunidad. El producto real termina siendo el
**engine + el ecosistema**, no el CRM.

## Lo que NO se construye el día 1

- Un helpdesk con tickets como entidad central.
- Booking / agenda de horas.
- Tres productos separados en paralelo.

## Abierto (decidir antes de escribir código)

- Prior art: qué resuelve ya esto en open source y dónde falla. **Sin hacer.**
- Stack, licencia (¿open core?, ¿AGPL?), y qué queda self-hosted.
- Canal de arranque: ¿WhatsApp primero?
- Modelo de negocio, si lo hay.
- Nombre y dominio: verificar que `openfunnel` esté libre.
