import { pathToFileURL } from 'node:url';
import { openDatabase } from '../backend/db.js';
import { transaction } from '../backend/migrate.js';

// Stable IDs make repeated runs safe without overwriting edits to demo records.
export function seedDemo(db) {
  const counts = {};
  const now = new Date();
  const timestamp = now.toISOString();
  const id = (key) => `demo-${key}`;
  const earlier = (hours) => new Date(now.getTime() - hours * 3600000).toISOString();
  const insert = (table, key, values) => {
    const row = { id: id(key), ...values, created_at: timestamp, updated_at: timestamp };
    if (db.prepare(`SELECT 1 FROM ${table} WHERE id=?`).get(row.id)) return row.id;
    const columns = Object.keys(row);
    // Table and column names are defined exclusively by this fixture file.
    db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...Object.values(row));
    counts[table] = (counts[table] || 0) + 1;
    return row.id;
  };
  return transaction(db, () => {
    const users = ['Camila Torres', 'Diego Rojas', 'Valentina Soto'].map((name, index) =>
      insert('users', `user-${index}`, { name: `${name} · Demo`, email: `demo.operator${index + 1}@example.com`, active: 1 }));
    const channels = [
      ['WhatsApp comercial', 'whatsapp'], ['Instagram consultas', 'instagram'], ['Email soporte', 'email'],
    ].map(([name, kind], index) => insert('channels', `channel-${index}`, {
      name: `${name} · Demo`, kind, description: 'Canal ficticio para explorar la app. Sin conexión ni envío de mensajes.',
      external_reference: null, active: 1,
    }));
    const promptData = [
      ['Atención y tono', 'Responde en español con claridad y cercanía. Haz una pregunta a la vez. No inventes precios, disponibilidad ni acciones realizadas. Si falta información, solicita ayuda humana.'],
      ['Calificación comercial', 'Identifica la necesidad, el tamaño del equipo y el plazo esperado. Resume el contexto para el responsable. No prometas descuentos ni cierres automáticos.'],
      ['Diagnóstico de soporte', 'Recopila el problema, los pasos para reproducirlo y el impacto. No solicites contraseñas. Resume lo probado y deriva al equipo cuando sea necesario.'],
    ];
    const prompts = promptData.map(([name, content], index) => insert('prompts', `prompt-${index}`, {
      name: `${name} · Demo`, description: 'Instrucciones de ejemplo; no se ejecutan en esta etapa.', content, active: 1,
    }));
    const tools = [
      ['lookup_contact', 'Consultar la ficha de un contacto.', { contact_id: { type: 'string' } }],
      ['lookup_product', 'Consultar información de un producto del catálogo.', { product_id: { type: 'string' } }],
      ['summarize_ticket', 'Preparar un resumen de un caso para revisión humana.', { ticket_id: { type: 'string' } }],
    ].map(([name, description, properties], index) => insert('tools', `tool-${index}`, {
      name: `${name}_demo`, description: `${description} Definición ficticia, sin ejecución.`, kind: 'internal',
      input_schema: JSON.stringify({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false }), active: 1,
    }));
    const agents = ['Asistente comercial', 'Asistente de soporte'].map((name, index) => {
      const exists = db.prepare('SELECT 1 FROM ai_agents WHERE id=?').get(id(`agent-${index}`));
      const agentId = insert('ai_agents', `agent-${index}`, {
        name: `${name} · Demo`, description: 'Configuración de ejemplo. Sin proveedor ni modelo conectado.', provider: null, model: null, active: 1,
      });
      // Only initialize associations on first creation; preserve later UI edits.
      if (!exists) {
        [prompts[0], prompts[index + 1]].forEach((promptId, position) =>
          db.prepare('INSERT INTO agent_prompts VALUES (?,?,?)').run(agentId, promptId, position));
        [tools[0], tools[index + 1]].forEach((toolId) =>
          db.prepare('INSERT INTO agent_tools VALUES (?,?)').run(agentId, toolId));
      }
      return agentId;
    });
    const pipelineData = [
      ['Ventas', ['Nuevo contacto', 'Calificación', 'Propuesta enviada', 'Seguimiento', 'Cerrado']],
      ['Soporte', ['Por revisar', 'En diagnóstico', 'Esperando respuesta', 'Resuelto']],
    ];
    const pipelines = pipelineData.map(([name, stageNames], index) => {
      const pipelineId = insert('pipelines', `pipeline-${index}`, {
        name: `${name} · Demo`, description: `Flujo ficticio de ${name.toLowerCase()} para recorrer lista y tablero.`, active: 1,
      });
      const stages = stageNames.map((stage, position) => insert('pipeline_stages', `stage-${index}-${position}`, {
        pipeline_id: pipelineId, name: stage, description: null, position,
      }));
      return { id: pipelineId, stages };
    });
    const scenarios = [
      ['Lucía Méndez', 'Estudio Bruma', 'Centralizar consultas del estudio', 'Necesitamos reunir las consultas de Instagram y WhatsApp en un solo lugar.', '¿Cuántas personas atienden hoy las consultas?', 'Somos cuatro. Nos gustaría revisar una propuesta esta semana.', 0, 0],
      ['Tomás Herrera', 'Café Umbral', 'Atención de pedidos y reservas', 'Recibimos muchas preguntas por horarios y reservas. Queremos ordenar la atención.', 'Podemos revisar el flujo actual. ¿Qué canal concentra más consultas?', 'Instagram, sobre todo los viernes por la tarde.', 0, 1],
      ['Antonia Silva', 'Taller Canelo', 'Propuesta para equipo comercial', 'Gracias por la reunión. ¿Pueden enviarnos el alcance para seis personas?', 'Dejamos la propuesta preparada para revisión del responsable.', 'Perfecto, la revisaremos con el equipo mañana.', 0, 2],
      ['Mateo Fuentes', 'Casa Nativa', 'Seguimiento de propuesta', 'Ya revisamos la propuesta y tenemos una duda sobre la puesta en marcha.', '¿Qué parte del proceso necesitan aclarar?', 'Cómo organizaríamos los contactos que ya tenemos.', 0, 3],
      ['Isidora Vega', 'Órbita Estudio', 'Implementación acordada', 'Confirmamos el alcance revisado en la reunión.', 'Registramos el acuerdo y los próximos pasos para el equipo.', 'Gracias, quedamos atentos al inicio.', 0, 4],
      ['Benjamín Costa', 'Ruta Clara', 'Consulta inicial de canales', 'Queremos conocer cómo organizar las conversaciones de dos marcas.', '¿Ambas marcas comparten el mismo equipo de atención?', 'Sí, tenemos tres personas que atienden las dos.', 0, 0],
      ['Emilia Paredes', 'Papel Norte', 'Evaluación de atención comercial', 'Nos gustaría dar seguimiento a cotizaciones que hoy quedan sin respuesta.', '¿Cuántas cotizaciones reciben aproximadamente por semana?', 'Unas veinte; necesitamos asignarlas a un responsable.', 0, 1],
      ['Joaquín Reyes', 'Lumbre Diseño', 'Ajuste de alcance comercial', 'Necesitamos agregar un segundo equipo a la propuesta.', 'El responsable revisará el ajuste de alcance solicitado.', 'Muchas gracias. Podemos conversar el jueves.', 0, 2],
      ['Florencia Díaz', 'Mercado Alba', 'Revisar asignación de conversaciones', 'Una consulta quedó sin responsable y necesitamos revisar el flujo.', 'Dejamos el caso registrado para revisar la asignación.', 'Gracias, puedo compartir los pasos que seguimos.', 1, 0],
      ['Agustín Molina', 'Surco Taller', 'Diagnóstico de contactos duplicados', 'Vemos dos fichas que parecen corresponder al mismo cliente.', 'Estamos revisando qué datos diferencian ambas fichas.', 'Una tiene email y la otra solo el nombre.', 1, 1],
      ['Catalina López', 'Bosque Editorial', 'Confirmar datos del caso', 'Tenemos una duda sobre el cambio de etapa de un ticket.', '¿Puedes indicarnos en qué pipeline y etapa se encuentra?', 'Lo revisaré con mi compañera y les confirmaré.', 1, 2],
      ['Vicente Campos', 'Vértice Objetos', 'Consulta de uso resuelta', 'No encontrábamos cómo consultar los tickets de un contacto.', 'Desde el detalle del contacto puedes abrir sus tickets relacionados.', 'Ya lo encontramos. Muchas gracias por la ayuda.', 1, 3],
    ];
    scenarios.forEach(([name, company, title, first, reply, last, pipelineIndex, stageIndex], index) => {
      const contactId = insert('contacts', `contact-${index}`, {
        name: `${name} · Demo`, email: `demo.contact${index + 1}@example.com`, phone: null, company,
        notes: 'Persona y empresa ficticias. Datos de demostración para explorar la plataforma.',
      });
      const closed = stageIndex === pipelines[pipelineIndex].stages.length - 1;
      const conversationId = insert('conversations', `conversation-${index}`, {
        title: `${title} · Demo`, contact_id: contactId, channel_id: channels[pipelineIndex ? 2 : index % 2],
        assigned_user_id: users[index % users.length], ai_agent_id: agents[pipelineIndex], status: closed ? 'closed' : 'open',
      });
      [first, reply, last].forEach((body, messageIndex) => insert('messages', `message-${index}-${messageIndex}`, {
        conversation_id: conversationId, body, direction: messageIndex === 1 ? 'outgoing' : 'incoming',
        occurred_at: earlier((scenarios.length - index) * 4 - messageIndex * 0.25),
      }));
      insert('tickets', `ticket-${index}`, {
        title: `${title} · Demo`, description: `Caso ficticio de ${company}. Revisar el contexto de la conversación y coordinar el siguiente paso con el responsable.`,
        contact_id: contactId, conversation_id: conversationId, pipeline_id: pipelines[pipelineIndex].id,
        stage_id: pipelines[pipelineIndex].stages[stageIndex], assigned_user_id: users[index % users.length], status: closed ? 'closed' : 'open',
      });
    });
    return counts;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openDatabase();
  try {
    console.log('Demo records created:', seedDemo(db));
  } finally {
    db.close();
  }
}
