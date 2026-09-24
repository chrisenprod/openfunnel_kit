import OpenAI from 'openai';
import { createHash } from 'node:crypto';
import { HttpError } from './resources.js';
export const toolRegistry = {
  get_contact: {
    description: 'Read the contact in this conversation.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  get_ticket: {
    description: 'Read the ticket linked to this conversation.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  handoff_to_human: {
    description: 'Pause AI and request a human. Use when unable to help or asked for a person.',
    parameters: {
      type: 'object',
      properties: { reason: { type: 'string', maxLength: 500 } },
      required: ['reason'],
      additionalProperties: false,
    },
  },
};
export const functionTool = (name) => ({
  type: 'function',
  function: { name, ...toolRegistry[name] },
});
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export function llmConfiguration(env) {
  let baseURL = env.LLM_BASE_URL || env.OPENAI_BASE_URL;
  const apiKey = env.LLM_API_KEY || env.OPENAI_API_KEY;
  const model = env.LLM_MODEL || env.OPENAI_MODEL || '';
  let validURL = false;
  try {
    const u = new URL(baseURL);
    validURL = u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash;
    if (
      validURL &&
      u.pathname === '/' &&
      (u.hostname.endsWith('.openai.azure.com') || u.hostname.endsWith('.services.ai.azure.com'))
    )
      baseURL = new URL('/openai/v1/', u).href;
  } catch {}
  return { baseURL, apiKey, model, configured: !!(validURL && apiKey) };
}
export function createLLM(env, injectedClient) {
  const config = llmConfiguration(env);
  const client =
    injectedClient ||
    (config.configured
      ? new OpenAI({
          baseURL: config.baseURL,
          apiKey: config.apiKey,
          maxRetries: 0,
          timeout: 30000,
        })
      : null);
  function fingerprint(model) {
    return hash(JSON.stringify([config.baseURL, config.apiKey, model]));
  }
  async function complete(model, messages, tools = [], extra = {}) {
    if (!client || !model)
      throw new HttpError(503, 'Configura LLM_BASE_URL, LLM_API_KEY y el deployment/modelo.');
    try {
      const result = await client.chat.completions.create({
        model,
        messages,
        stream: false,
        max_completion_tokens: 1000,
        ...(tools.length ? { tools } : {}),
        ...extra,
      });
      const choice = result.choices?.[0];
      if (!choice?.message || !['stop', 'tool_calls'].includes(choice.finish_reason))
        throw new Error('invalid_completion');
      return {
        message: choice.message,
        usage: result.usage
          ? {
              prompt_tokens: result.usage.prompt_tokens || 0,
              completion_tokens: result.usage.completion_tokens || 0,
              total_tokens: result.usage.total_tokens || 0,
            }
          : null,
      };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      const status = Number(error.status) || 0;
      const message =
        status === 429
          ? 'El modelo alcanzó su límite temporal.'
          : status === 401 || status === 403
            ? 'El proveedor IA rechazó las credenciales o permisos.'
            : 'El modelo no completó Chat Completions/tools. Revisa el endpoint y deployment.';
      const problem = new HttpError(502, message);
      problem.providerStatus = status;
      throw problem;
    }
  }
  async function validate(model) {
    const probe = {
      type: 'function',
      function: {
        name: 'connection_probe',
        description: 'Verify function calling.',
        parameters: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
    };
    const messages = [
      {
        role: 'user',
        content: 'Call connection_probe with an empty object, then answer OK after its result.',
      },
    ];
    const first = await complete(model, messages, [probe], {
      tool_choice: { type: 'function', function: { name: 'connection_probe' } },
    });
    const calls = first.message.tool_calls;
    if (
      !calls ||
      calls.length !== 1 ||
      calls[0].function?.name !== 'connection_probe' ||
      !calls[0].id ||
      calls[0].function.arguments.trim() !== '{}'
    )
      throw new HttpError(502, 'El modelo no confirmó soporte de tool calling.');
    const last = await complete(model, [
      ...messages,
      first.message,
      { role: 'tool', tool_call_id: calls[0].id, content: '{"ok":true}' },
    ]);
    if (!last.message.content?.trim() || last.message.tool_calls?.length)
      throw new HttpError(502, 'El modelo no completó la respuesta después de la herramienta.');
    return fingerprint(model);
  }
  return { config, complete, validate, fingerprint };
}
