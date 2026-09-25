import { readyDocuments } from './documents.js';
import { HttpError, detail, save } from './resources.js';
import { objectBody } from './api-keys.js';
import { createLLM, agentMessages, functionTool, toolRegistry, hash } from './llm.js';

export function promptVersions(db, id, params) {
  const prompt = detail(db, 'prompts', id);
  if ([...params].some(([key]) => key !== 'page') || params.getAll('page').length > 1 ||
      (params.has('page') && !/^[1-9]\d{0,5}$/.test(params.get('page'))))
    throw new HttpError(400, 'Página inválida.');
  const page = Number(params.get('page') || 1), pageSize = 20;
  return {
    current_version: prompt.version,
    items: db.prepare('SELECT * FROM prompt_versions WHERE prompt_id=? ORDER BY version DESC LIMIT ? OFFSET ?')
      .all(id, pageSize, (page - 1) * pageSize),
    agents: db.prepare('SELECT a.id,a.name FROM ai_agents a JOIN agent_prompts p ON p.ai_agent_id=a.id WHERE p.prompt_id=? ORDER BY a.name,a.id').all(id),
    total: db.prepare('SELECT count(*) n FROM prompt_versions WHERE prompt_id=?').get(id).n,
    page, pageSize,
  };
}
export function restorePrompt(db, id, body, actor) {
  objectBody(body, ['version', 'expected_version']);
  detail(db, 'prompts', id);
  if (!Number.isSafeInteger(body.version) || body.version < 1)
    throw new HttpError(400, 'Versión inválida.');
  const snapshot = db.prepare('SELECT name,description,content,active FROM prompt_versions WHERE prompt_id=? AND version=?')
    .get(id, body.version);
  if (!snapshot) throw new HttpError(404, 'Versión no encontrada.');
  return save(db, 'prompts', { ...snapshot, expected_version: body.expected_version }, id, actor);
}
export function createAgentTester(db, env, client) {
  const llm = createLLM(env, client);
  let running = false;
  return async function testAgent(id, body, signal) {
    objectBody(body, ['message', 'prompt', 'history', 'context_hash']);
    const history = body.history ?? [];
    if (!Array.isArray(history) || history.length > 20 || history.length % 2 ||
        history.some((item, index) => !item || typeof item !== 'object' || Array.isArray(item) ||
          Object.keys(item).some((key) => !['role','content'].includes(key)) ||
          item.role !== (index % 2 ? 'assistant' : 'user') || typeof item.content !== 'string' || !item.content.trim()) ||
        history.reduce((n, item) => n + item.content.length, 0) > 18000)
      throw new HttpError(400, 'Historial inválido: hasta 20 mensajes alternados y 18000 caracteres.');
    if (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 4000 ||
        (Object.hasOwn(body, 'prompt') && (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 20000)))
      throw new HttpError(400, 'Escribe un mensaje (hasta 4000 caracteres) e instrucciones válidas (hasta 20000).');
    const agent = detail(db, 'ai_agents', id);
    const prompts = db.prepare('SELECT p.id,p.version,p.content FROM agent_prompts a JOIN prompts p ON p.id=a.prompt_id WHERE a.ai_agent_id=? AND p.active=1 ORDER BY a.position').all(id);
    const instructions = body.prompt ?? prompts.map((p) => p.content).join('\n\n');
    if (!instructions.trim()) throw new HttpError(409, 'Asocia un prompt activo o escribe instrucciones para esta prueba.');
    const documents = readyDocuments(db, id);
    const messages = [...agentMessages(instructions, documents), ...history, { role: 'user', content: body.message }];
    const names = [...new Set(db.prepare('SELECT t.kind FROM agent_tools a JOIN tools t ON t.id=a.tool_id WHERE a.ai_agent_id=? AND t.active=1').all(id)
      .map((t) => t.kind).filter((kind) => Object.hasOwn(toolRegistry, kind)))];
    const contextHash = hash(JSON.stringify([agent, prompts, documents, names, instructions, llm.config.model]));
    if (history.length && body.context_hash !== contextHash)
      throw new HttpError(409, 'La configuración cambió. Reinicia la conversación de prueba.');
    if (running) throw new HttpError(409, 'Ya hay una prueba en curso. Espera a que termine.');
    running = true;
    const started = Date.now(), tools = [];
    let usage = null;
    const deadline = AbortSignal.timeout(60000);
    const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
    try {
      for (let round = 0; round < 3; round++) {
        combined.throwIfAborted();
        const result = await llm.complete(llm.config.model, messages, names.map(functionTool), {}, { signal: combined });
        combined.throwIfAborted();
        if (result.usage) {
          usage ||= { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
          for (const key of Object.keys(usage)) usage[key] += result.usage[key] || 0;
        }
        const calls = result.message.tool_calls;
        if (!calls?.length) {
          if (typeof result.message.content !== 'string' || !result.message.content.trim())
            throw new HttpError(502, 'El modelo no devolvió texto.');
          return { response: result.message.content, tools, usage, duration_ms: Date.now() - started,
            simulated: true, context_hash: contextHash, documents: documents.map(({ id, filename, revision }) => ({ id, filename, revision })), prompt_versions: body.prompt === undefined ? prompts.map(({ id, version }) => ({ id, version })) : [],
            candidate: body.prompt !== undefined };
        }
        messages.push(result.message);
        for (const call of calls) {
          if (tools.length >= 5) throw new HttpError(409, 'Se alcanzó el límite de herramientas de la prueba.');
          const name = call.function?.name;
          let args;
          try { args = JSON.parse(call.function?.arguments); } catch { args = null; }
          if (!names.includes(name) || typeof call.id !== 'string' || !call.id || call.id.length > 255 ||
              !args || typeof args !== 'object' || Array.isArray(args) ||
              Object.keys(args).some((key) => name !== 'handoff_to_human' || key !== 'reason') ||
              (name === 'handoff_to_human' && (typeof args.reason !== 'string' || !args.reason.trim() || args.reason.length > 500)))
            throw new HttpError(409, 'Herramienta o argumentos no autorizados en la prueba.');
          const output = name === 'handoff_to_human'
            ? { simulated: true, handedOff: true }
            : { simulated: true, found: false, message: 'No real contact or ticket is available in this test.' };
          tools.push({ name, arguments: args, result: output, simulated: true });
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(output) });
        }
      }
      throw new HttpError(409, 'Se alcanzó el límite de rondas de la prueba.');
    } catch (error) {
      if (combined.aborted) throw new HttpError(504, 'La prueba se canceló o superó 60 segundos.');
      throw error;
    } finally {
      running = false;
    }
  };
}
