import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../backend/server.js';
import { save, detail } from '../backend/resources.js';

async function fixture(t) {
  let calls = 0;
  const env = { admin_user: 'admin', admin_pass: 'synthetic-password-123', APP_ORIGIN: 'http://localhost:5173', LLM_API_KEY: 'synthetic', LLM_BASE_URL: 'https://api.openai.com/v1', LLM_MODEL: 'fixture' };
  const app = await createApp({ databasePath: ':memory:', env, integrationOptions: {
    llmClient: { chat: { completions: { create: async () => { calls++; return { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'Respuesta de prueba.' } }] }; } } } },
    fetch: async () => { throw Error('No remote requests allowed'); },
  } });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  t.after(async () => { await app.integrations.stop(); app.server.closeAllConnections(); await new Promise(resolve => app.server.close(resolve)); app.db.close(); });
  let cookie = '';
  async function request(method, path, body, headers = {}) {
    const res = await fetch(`http://127.0.0.1:${app.server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', Origin: env.APP_ORIGIN, Cookie: cookie, ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (res.headers.getSetCookie().length) cookie = res.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    return { status: res.status, data: await res.json() };
  }
  await request('POST', '/login', { username: env.admin_user, password: env.admin_pass });
  const agent = save(app.db, 'ai_agents', { name: 'Ejemplo' });
  return { ...app, request, agent, calls: () => calls };
}

test('direct instructions create atomically, preserve versions/order/shared impact and reject stale writes', async t => {
  const a = await fixture(t), path = `/ai_agents/${a.agent.id}/instructions`;
  const empty = await a.request('GET', path); assert.deepEqual(empty.data.prompts, []);
  assert.equal((await a.request('PUT', path, { expected_ids: [], prompts: [{ content: '' }] })).status, 400);
  assert.equal(a.db.prepare('SELECT count(*) n FROM prompts').get().n, 0);
  const first = await a.request('PUT', path, { expected_ids: [], prompts: [{ content: 'Ayuda al cliente.' }] });
  assert.equal(first.status, 200); const p = first.data.prompts[0]; assert.equal(p.version, 1);
  assert.equal((await a.request('GET', `/ai_agents/${a.agent.id}/integration`)).data.has_instructions, true);
  assert.equal((await a.request('PUT', path, { expected_ids: [], prompts: [{ content: 'Stale' }] })).status, 409);
  const p2 = save(a.db, 'prompts', { name: 'Segundo', content: 'No inventes.' });
  save(a.db, 'ai_agents', { prompt_ids: [p.id, p2.id] }, a.agent.id);
  const other = save(a.db, 'ai_agents', { name: 'Compartido', prompt_ids: [p.id] });
  assert.ok((await a.request('GET', path)).data.prompts[0].agents.some(row => row.id === other.id));
  const body = { expected_ids: [p.id, p2.id], prompts: [{ id: p.id, expected_version: 1, content: 'Nuevo' }, { id: p2.id, expected_version: 1, content: 'Otra instrucción' }] };
  save(a.db, 'prompts', { expected_version: 1, content: 'Edición concurrente' }, p2.id);
  assert.equal((await a.request('PUT', path, body)).status, 409);
  assert.equal(detail(a.db, 'prompts', p.id).version, 1); assert.equal(detail(a.db, 'prompts', p.id).content, p.content);
  body.prompts[1].expected_version = 2;
  assert.equal((await a.request('PUT', path, body)).status, 200);
  assert.equal(detail(a.db, 'prompts', p.id).version, 2);
  assert.equal(a.db.prepare('SELECT content FROM prompt_versions WHERE prompt_id=? AND version=1').get(p.id).content, p.content);
  assert.deepEqual(detail(a.db, 'ai_agents', a.agent.id).prompt_ids, [p.id, p2.id]);
  assert.equal(a.calls(), 0);
});

test('instructions require session origin or BOTH API scopes; setup is session-only', async t => {
  const a = await fixture(t), path = `/ai_agents/${a.agent.id}/instructions`, body = { expected_ids: [], prompts: [{ content: 'Ayuda.' }] };
  assert.equal((await a.request('PUT', path, body, { Origin: 'https://foreign.test' })).status, 403);
  for (const scopes of [['agents:write'], ['prompts:write'], ['resources:read'], ['agents:write','prompts:write']]) {
    const key = (await a.request('POST', '/api-keys', { name: 'fixture', scopes, expires_in_days: 1 })).data;
    const headers = { Authorization: `Bearer ${key.secret}`, Cookie: '' };
    assert.equal((await a.request('GET', '/setup', undefined, headers)).status, 403);
    assert.equal((await a.request('PUT', path, body, headers)).status, scopes.length === 2 ? 200 : 403);
  }
  assert.equal((await a.request('GET', path, undefined, { Cookie: '' })).status, 401);
});

test('first-use progress records only successful saved-instruction tests, reads have no effects', async t => {
  const a = await fixture(t);
  await a.request('PUT', `/ai_agents/${a.agent.id}/instructions`, { expected_ids: [], prompts: [{ content: 'Ayuda.' }] });
  const channel = save(a.db, 'channels', { name: 'Canal', kind: 'instagram' });
  a.db.prepare("UPDATE channels SET provider='zernio',connection_status='connected',default_ai_agent_id=? WHERE id=?").run(a.agent.id, channel.id);
  let state = (await a.request('GET', '/setup')).data;
  assert.equal(state.agent, true); assert.equal(state.tested, false); assert.equal(a.calls(), 0);
  assert.equal((await a.request('POST', `/ai_agents/${a.agent.id}/test`, { message: 'Hola', prompt: 'Candidato' })).status, 200);
  assert.equal((await a.request('GET', '/setup')).data.tested, false);
  assert.equal((await a.request('POST', `/ai_agents/${a.agent.id}/test`, { message: 'Hola' })).status, 200);
  assert.equal((await a.request('GET', '/setup')).data.tested, true);
  assert.equal(a.calls(), 2); assert.equal(a.db.prepare('SELECT count(*) n FROM messages').get().n, 0);
  assert.equal(a.db.prepare('SELECT count(*) n FROM agent_runs').get().n, 0);
});

test('attention filter paginates open manual or failed/uncertain delivery conversations', async t => {
  const a = await fixture(t);
  const channel = save(a.db, 'channels', { name: 'Manual', kind: 'instagram' });
  const contact = save(a.db, 'contacts', { name: 'Ejemplo' });
  const ids = [];
  for (let i = 0; i < 4; i++) ids.push(save(a.db, 'conversations', { title: `Consulta ${i}`, contact_id: contact.id, channel_id: channel.id, status: i === 3 ? 'closed' : 'open' }).id);
  a.db.prepare("UPDATE conversations SET automation_mode='automatic' WHERE id IN (?,?)").run(ids[1], ids[2]);
  const message = save(a.db, 'messages', { conversation_id: ids[1], body: 'Prueba', direction: 'outgoing', occurred_at: new Date().toISOString() });
  a.db.prepare("INSERT INTO outbound_messages(id,message_id,conversation_id,revision,status,available_at,created_at,updated_at) VALUES('fixture',?,?,1,'uncertain',datetime('now'),datetime('now'),datetime('now'))").run(message.id, ids[1]);
  const filtered = await a.request('GET', `/conversations?attention=needed&channel_id=${channel.id}&pageSize=1`);
  assert.equal(filtered.status, 200); assert.equal(filtered.data.total, 2); assert.equal(filtered.data.items.length, 1);
  const all = await a.request('GET', '/conversations?attention=needed');
  assert.deepEqual(new Set(all.data.items.map(row => row.id)), new Set([ids[0], ids[1]]));
  assert.equal((await a.request('GET', '/conversations?attention=unknown')).status, 400);
});
