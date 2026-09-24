import { randomUUID } from 'node:crypto';
import { resources } from '../shared/resources.js';
import { transaction } from './migrate.js';
export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
const fail = (field, message) => {
  throw new HttpError(400, message, { [field]: message });
};
const get = (db, table, id) => db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
function definition(table) {
  if (!Object.hasOwn(resources, table)) throw new HttpError(404, 'Ruta no encontrada');
  return resources[table];
}
function normalize(field, value) {
  if (value === '' || value == null) {
    if (field.required || field.type === 'boolean')
      fail(field.key, `${field.label} es obligatorio.`);
    return null;
  }
  if (field.type === 'boolean') {
    if (value !== true && value !== false && value !== 0 && value !== 1)
      fail(field.key, 'Estado inválido.');
    return Number(value);
  }
  if (field.type === 'integer') {
    if (!Number.isSafeInteger(value) || value < 0 || value > 1000)
      fail(field.key, 'Orden inválido.');
    return value;
  }
  if (typeof value !== 'string') fail(field.key, `${field.label} debe ser texto.`);
  const result = field.key === 'body' || field.key === 'content' ? value : value.trim();
  if (field.required && !result.trim()) fail(field.key, `${field.label} es obligatorio.`);
  if (result.length > (field.max || 255))
    fail(field.key, `${field.label} supera el máximo de ${field.max || 255} caracteres.`);
  if (field.type === 'select' && !field.options.some(([option]) => option === result))
    fail(field.key, 'Estado inválido.');
  if (field.type === 'email' && result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    fail(field.key, 'Email inválido.');
  if (field.type === 'datetime') {
    if (!Number.isFinite(Date.parse(result))) fail(field.key, 'Fecha inválida.');
    return new Date(result).toISOString();
  }
  if (field.type === 'json') {
    try {
      const json = JSON.parse(result);
      if (!json || Array.isArray(json) || typeof json !== 'object') throw new Error();
      return JSON.stringify(json, null, 2);
    } catch {
      fail(field.key, 'Introduce un objeto JSON válido.');
    }
  }
  return result || null;
}
function validate(db, table, body, old) {
  if (!body || Array.isArray(body) || typeof body !== 'object')
    throw new HttpError(400, 'Se requiere un objeto JSON.');
  const def = definition(table);
  const extra =
    table === 'pipelines' ? ['stages'] : table === 'ai_agents' ? ['prompt_ids', 'tool_ids'] : [];
  for (const key of Object.keys(body))
    if (!def.fields.some((f) => f.key === key && !f.readOnly) && !extra.includes(key))
      fail(key, 'Campo desconocido.');
  const data = {};
  for (const field of def.fields.filter((f) => !f.readOnly)) {
    const raw = Object.hasOwn(body, field.key)
      ? body[field.key]
      : old
        ? old[field.key]
        : (field.default ?? null);
    data[field.key] = normalize(field, raw);
    if (field.type === 'reference' && data[field.key]) {
      const target = get(db, field.resource, data[field.key]);
      if (!target) fail(field.key, `${field.label} no existe.`);
      if (target.active === 0 && old?.[field.key] !== data[field.key])
        fail(field.key, `${field.label} está inactivo.`);
    }
  }
  if (table === 'users' && data.email) data.email = data.email.toLowerCase();
  if (table === 'tickets') {
    const stage = get(db, 'pipeline_stages', data.stage_id);
    if (stage.pipeline_id !== data.pipeline_id)
      fail('stage_id', 'La etapa no pertenece al pipeline.');
    if (
      data.conversation_id &&
      get(db, 'conversations', data.conversation_id).contact_id !== data.contact_id
    )
      fail('conversation_id', 'El contacto no coincide con la conversación.');
  }
  if (
    table === 'conversations' &&
    old &&
    old.contact_id !== data.contact_id &&
    db.prepare('SELECT 1 FROM tickets WHERE conversation_id=?').get(old.id)
  ) {
    throw new HttpError(409, 'Desvincula el ticket antes de cambiar el contacto.');
  }
  return data;
}
function writeRow(db, table, data, old) {
  const now = new Date().toISOString();
  const row = { ...data, updated_at: now };
  if (old) {
    const keys = Object.keys(row);
    db.prepare(`UPDATE ${table} SET ${keys.map((key) => `${key}=?`).join(',')} WHERE id=?`).run(
      ...keys.map((key) => row[key]),
      old.id,
    );
    return old.id;
  }
  row.id = randomUUID();
  row.created_at = now;
  const keys = Object.keys(row);
  db.prepare(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
  ).run(...keys.map((key) => row[key]));
  return row.id;
}
function saveStages(db, pipelineId, stages) {
  if (!Array.isArray(stages) || stages.length < 1 || stages.length > 100)
    fail('stages', 'El pipeline debe tener entre 1 y 100 etapas.');
  const old = db
    .prepare('SELECT * FROM pipeline_stages WHERE pipeline_id=? ORDER BY position')
    .all(pipelineId);
  const ids = new Set();
  const names = new Set();
  const normalized = stages.map((stage) => {
    if (
      !stage ||
      typeof stage !== 'object' ||
      Array.isArray(stage) ||
      Object.keys(stage).some((key) => !['id', 'name', 'description'].includes(key))
    )
      fail('stages', 'Etapa inválida.');
    if (stage.id && (!old.some((item) => item.id === stage.id) || ids.has(stage.id)))
      fail('stages', 'ID de etapa inválido o repetido.');
    if (stage.id) ids.add(stage.id);
    const name = normalize(
      { key: 'stages', label: 'Nombre de etapa', required: true, max: 160 },
      stage.name,
    );
    if (names.has(name)) fail('stages', 'Los nombres de etapas deben ser únicos.');
    names.add(name);
    return {
      id: stage.id,
      name,
      description: normalize({ key: 'stages', label: 'Descripción', max: 4000 }, stage.description),
    };
  });
  for (const stage of old)
    if (!ids.has(stage.id)) db.prepare('DELETE FROM pipeline_stages WHERE id=?').run(stage.id);
  // Free unique name/position slots before a rename or reorder, preserving stable IDs.
  for (const stage of old.filter((item) => ids.has(item.id)))
    db.prepare('UPDATE pipeline_stages SET name=?,position=? WHERE id=?').run(
      `__${randomUUID()}`,
      -stage.position - 1,
      stage.id,
    );
  normalized.forEach((stage, position) =>
    writeRow(
      db,
      'pipeline_stages',
      {
        name: stage.name,
        description: stage.description,
        pipeline_id: pipelineId,
        position,
      },
      stage.id ? { id: stage.id } : null,
    ),
  );
}
function saveAssociations(db, agentId, field, ids, oldIds) {
  if (!Array.isArray(ids) || ids.length > 100 || new Set(ids).size !== ids.length)
    fail(field, 'Selecciona hasta 100 elementos sin repetir.');
  const prompts = field === 'prompt_ids';
  const table = prompts ? 'prompts' : 'tools';
  for (const id of ids) {
    if (typeof id !== 'string') fail(field, 'Identificador inválido.');
    const row = get(db, table, id);
    if (!row || (row.active === 0 && !oldIds.includes(id)))
      fail(field, 'La selección contiene un registro inexistente o inactivo.');
  }
  const join = prompts ? 'agent_prompts' : 'agent_tools';
  db.prepare(`DELETE FROM ${join} WHERE ai_agent_id=?`).run(agentId);
  ids.forEach((id, position) =>
    db
      .prepare(`INSERT INTO ${join} VALUES (${prompts ? '?,?,?' : '?,?'})`)
      .run(...(prompts ? [agentId, id, position] : [agentId, id])),
  );
}
export function detail(db, table, id) {
  definition(table);
  const row = get(db, table, id);
  if (!row) throw new HttpError(404, 'Registro no encontrado.');
  const labels = {};
  for (const field of resources[table].fields)
    if (field.type === 'reference' && row[field.key]) {
      const target = get(db, field.resource, row[field.key]);
      labels[field.key] = target?.[resources[field.resource].title] || 'Sin registro';
    }
  if (table === 'pipelines')
    row.stages = db
      .prepare('SELECT * FROM pipeline_stages WHERE pipeline_id=? ORDER BY position')
      .all(id);
  if (table === 'ai_agents') {
    row.prompt_ids = db
      .prepare('SELECT prompt_id FROM agent_prompts WHERE ai_agent_id=? ORDER BY position')
      .all(id)
      .map((r) => r.prompt_id);
    row.tool_ids = db
      .prepare('SELECT tool_id FROM agent_tools WHERE ai_agent_id=? ORDER BY tool_id')
      .all(id)
      .map((r) => r.tool_id);
  }
  if (table === 'conversations')
    row.ticket_id =
      db.prepare('SELECT id FROM tickets WHERE conversation_id=?').get(id)?.id || null;
  if (table === 'conversations') {
    const channel = get(db, 'channels', row.channel_id);
    row.connected = !!row.external_id;
    row.channel_kind = channel.kind;
    row.effective_agent_name =
      get(db, 'ai_agents', row.ai_agent_id || channel.default_ai_agent_id || '')?.name || null;
  }
  return { ...row, labels };
}
export function list(db, table, params) {
  const def = definition(table);
  const special = table === 'ai_agents' ? ['prompt_id', 'tool_id'] : [];
  const allowed = ['q', 'page', 'pageSize', ...def.filters, ...special];
  for (const [key] of params)
    if (!allowed.includes(key) || params.getAll(key).length > 1)
      throw new HttpError(400, 'Filtro desconocido o repetido.');
  const number = (key, fallback, max) => {
    const raw = params.get(key);
    const value = raw == null ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value < 1 || value > max)
      throw new HttpError(400, 'Paginación inválida.');
    return value;
  };
  const page = number('page', 1, 1000000);
  const pageSize = number('pageSize', 25, 100);
  const where = [];
  const values = [];
  const q = params.get('q') || '';
  if (q.length > 200) throw new HttpError(400, 'Búsqueda demasiado larga.');
  if (q) {
    where.push(`(${def.search.map((key) => `${key} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
    values.push(...def.search.map(() => `%${q.replace(/[\\%_]/g, '\\$&')}%`));
  }
  for (const key of def.filters)
    if (params.has(key) && params.get(key) !== '') {
      const field = def.fields.find((f) => f.key === key);
      const value = params.get(key);
      if (key === 'active' && !['0', '1'].includes(value))
        throw new HttpError(400, 'Estado inválido.');
      if (field?.options && !field.options.some(([x]) => x === value))
        throw new HttpError(400, 'Filtro inválido.');
      where.push(`${key}=?`);
      values.push(value);
    }
  for (const key of special)
    if (params.has(key)) {
      const join = key === 'prompt_id' ? 'agent_prompts' : 'agent_tools';
      where.push(`id IN (SELECT ai_agent_id FROM ${join} WHERE ${key}=?)`);
      values.push(params.get(key));
    }
  const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS total FROM ${table}${clause}`).get(...values).total;
  const order =
    table === 'messages'
      ? 'occurred_at,id'
      : table === 'pipeline_stages'
        ? 'position,id'
        : 'created_at DESC,id';
  const rows = db
    .prepare(`SELECT id FROM ${table}${clause} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...values, pageSize, (page - 1) * pageSize);
  return {
    items: rows.map((row) => detail(db, table, row.id)),
    total,
    page,
    pageSize,
  };
}
export function save(db, table, body, id) {
  definition(table);
  const old = id ? detail(db, table, id) : null;
  if (table === 'messages') {
    if (old && old.source !== 'manual')
      throw new HttpError(409, 'Los mensajes externos no se editan con el CRUD manual.');
    const conversation = get(
      db,
      'conversations',
      body?.conversation_id || old?.conversation_id || '',
    );
    if (conversation?.external_id)
      throw new HttpError(409, 'Usa Enviar en la conversación conectada.');
  }
  const data = validate(db, table, body, old);
  if (table === 'channels' && old?.provider && data.kind !== old.kind)
    throw new HttpError(409, 'El tipo del canal conectado no se puede cambiar.');
  if (table === 'conversations') {
    if (
      old?.external_id &&
      (data.channel_id !== old.channel_id || data.contact_id !== old.contact_id)
    )
      throw new HttpError(409, 'No se puede cambiar la identidad de una conversación conectada.');
    if (!old?.external_id && get(db, 'channels', data.channel_id)?.provider)
      throw new HttpError(409, 'Las conversaciones conectadas se importan desde el proveedor.');
  }
  return transaction(db, () => {
    if (table === 'pipeline_stages') {
      if (old && old.pipeline_id !== data.pipeline_id)
        fail('pipeline_id', 'No se puede trasladar una etapa a otro pipeline.');
      const pipeline = detail(db, 'pipelines', data.pipeline_id);
      const stages = pipeline.stages
        .filter((stage) => stage.id !== id)
        .map(({ id, name, description }) => ({ id, name, description }));
      if (data.position > stages.length) fail('position', 'Posición fuera del pipeline.');
      stages.splice(data.position, 0, {
        ...(id ? { id } : {}),
        name: data.name,
        description: data.description,
      });
      saveStages(db, data.pipeline_id, stages);
      const savedId =
        id ||
        db
          .prepare('SELECT id FROM pipeline_stages WHERE pipeline_id=? AND position=?')
          .get(data.pipeline_id, data.position).id;
      return detail(db, table, savedId);
    }
    const savedId = writeRow(db, table, data, old);
    if (table === 'conversations' && old?.external_id)
      db.prepare('UPDATE conversations SET revision=revision+1 WHERE id=?').run(savedId);
    if (table === 'pipelines' && (!old || Object.hasOwn(body, 'stages')))
      saveStages(db, savedId, body.stages);
    if (table === 'ai_agents') {
      for (const field of ['prompt_ids', 'tool_ids'])
        if (!old || Object.hasOwn(body, field))
          saveAssociations(db, savedId, field, body[field] ?? [], old?.[field] || []);
    }
    return detail(db, table, savedId);
  });
}
export function remove(db, table, id) {
  const old = detail(db, table, id);
  if (table === 'messages' && old.source !== 'manual')
    throw new HttpError(409, 'No se puede borrar un mensaje externo.');
  transaction(db, () => {
    if (table === 'pipeline_stages') {
      const pipeline = detail(db, 'pipelines', old.pipeline_id);
      if (pipeline.stages.length <= 1)
        throw new HttpError(409, 'El pipeline debe conservar al menos una etapa.');
      saveStages(
        db,
        old.pipeline_id,
        pipeline.stages
          .filter((stage) => stage.id !== id)
          .map(({ id, name, description }) => ({ id, name, description })),
      );
      return;
    }
    if (table === 'pipelines')
      db.prepare('DELETE FROM pipeline_stages WHERE pipeline_id=?').run(id);
    if (table === 'ai_agents') {
      if (db.prepare('SELECT 1 FROM conversations WHERE ai_agent_id=?').get(id))
        throw new HttpError(409, 'El agente está asignado a una conversación.');
      db.prepare('DELETE FROM agent_prompts WHERE ai_agent_id=?').run(id);
      db.prepare('DELETE FROM agent_tools WHERE ai_agent_id=?').run(id);
    }
    db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);
  });
}
export function publicError(error) {
  if (error instanceof HttpError) return error;
  if (error.message?.includes('FOREIGN KEY constraint'))
    return new HttpError(
      409,
      'Este registro tiene referencias. Desvincula o reasigna los registros relacionados antes de eliminarlo.',
    );
  if (error.message?.includes('UNIQUE constraint'))
    return new HttpError(
      409,
      'Ya existe ese email, asociación o conversación vinculada. Revisa los valores.',
    );
  return new HttpError(500, 'No se pudo completar la operación.');
}
