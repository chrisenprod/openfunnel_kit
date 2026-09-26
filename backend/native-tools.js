import { toolRegistry } from './llm.js';
import { transaction } from './migrate.js';

const labels = {
  get_contact: ['Consultar contacto', 'Lee los datos del contacto de esta conversación.'],
  get_ticket: ['Consultar ticket', 'Lee el ticket vinculado a esta conversación.'],
  handoff_to_human: ['Derivar a una persona', 'Pausa la IA de esta conversación y guarda el motivo para que continúe una persona.'],
};

// Stable IDs preserve associations; unchanged definitions preserve runtime fingerprints.
export function syncNativeTools(db) {
  const upsert = db.prepare(`INSERT INTO tools
    (id,name,description,kind,input_schema,active,created_at,updated_at)
    VALUES (?,?,?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET
    name=excluded.name,description=excluded.description,kind=excluded.kind,
    input_schema=excluded.input_schema,active=1,updated_at=excluded.updated_at
    WHERE tools.name IS NOT excluded.name OR tools.description IS NOT excluded.description
      OR tools.kind IS NOT excluded.kind OR tools.input_schema IS NOT excluded.input_schema
      OR tools.active IS NOT 1`);
  transaction(db, () => {
    const now = new Date().toISOString();
    for (const [kind, definition] of Object.entries(toolRegistry)) {
      const [name, description] = labels[kind];
      upsert.run(`builtin_${kind}`, name, description, kind, JSON.stringify(definition.parameters), now, now);
    }
  });
}
