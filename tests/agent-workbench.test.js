import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../backend/server.js';
import { openDatabase } from '../backend/db.js';
import { save, remove } from '../backend/resources.js';
import { createAgentTester, restorePrompt } from '../backend/agent-workbench.js';
import { createKeyAccess } from '../backend/api-keys.js';
import { createDocuments, readyDocuments } from '../backend/documents.js';
import { seedDemo } from '../scripts/seed-demo.js';
import { agentMessages } from '../backend/llm.js';
const env = { admin_user: 'admin', admin_pass: 'synthetic-test-password', APP_ORIGIN: 'http://localhost:5173', LLM_MODEL: 'test-model' };
const completion = (content = 'Respuesta sintética') => ({ choices: [{ finish_reason: 'stop', message: { role: 'assistant', content } }], usage: { total_tokens: 12, prompt_tokens: 8, completion_tokens: 4 } });
const call = (name, args = {}) => ({ choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', tool_calls: [{ id: 'call-1', type: 'function', function: { name, arguments: JSON.stringify(args) } }] } }] });
const client = (fn = async () => completion()) => ({ chat: { completions: { create: fn } } });
async function start(t, options = {}) {
  const app = await createApp({ databasePath: ':memory:', env, integrationOptions: { llmClient: client() }, ...options });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  let cookie = '';
  t.after(async () => { app.server.closeAllConnections(); await new Promise((done) => app.server.close(done)); app.db.close(); });
  const request = async (method, path, body, token, extra = {}) => {
    const r = await fetch(`http://127.0.0.1:${app.server.address().port}/api${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(token !== undefined ? { Authorization: `Bearer ${token}` } : { Cookie: cookie, Origin: env.APP_ORIGIN }), ...extra },
      ...(body === undefined ? {} : { body: body instanceof Uint8Array ? body : JSON.stringify(body) }) });
    if (r.headers.getSetCookie().length) cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    return { status: r.status, data: r.headers.get('content-type')?.startsWith('application/octet-stream') ? Buffer.from(await r.arrayBuffer()) : await r.json(), headers: r.headers };
  };
  assert.equal((await request('POST', '/login', { username: env.admin_user, password: env.admin_pass })).status, 200);
  const key = async (scopes) => {
    const r = await request('POST', '/api-keys', { name: 'Fixture', scopes, expires_in_days: 90 });
    assert.equal(r.status, 201, JSON.stringify(r.data)); return r.data;
  };
  return { ...app, request, key, cookie: () => cookie };
}
function agentFixture(db) {
  const prompt = save(db, 'prompts', { name: 'Base', content: 'Responde brevemente.' });
  const tool = save(db, 'tools', { name: 'Derivar', description: 'Deriva a una persona', kind: 'handoff_to_human' });
  const agent = save(db, 'ai_agents', { name: 'Agente de prueba', prompt_ids: [prompt.id], tool_ids: [tool.id] });
  db.prepare("INSERT INTO agent_documents (id,ai_agent_id,filename,media_type,size,original,extracted_text,status,created_at,updated_at) VALUES (?,?,'horarios.txt','text/plain',35,?,'Atención de lunes a viernes.','ready','2026-01-01','2026-01-01')").run(`reference-${agent.id}`, agent.id, Buffer.from('Atención de lunes a viernes.'));
  return { prompt, tool, agent };
}

test('API keys: secrets shown once, scoped access, Origin preserved, revoked and expired keys fail', async (t) => {
  const a = await start(t); const { prompt, agent } = agentFixture(a.db);
  const key = await a.key(['resources:read']);
  assert.match(key.secret, /^of_[A-Za-z0-9_-]{43}$/);
  const stored = a.db.prepare('SELECT * FROM api_keys WHERE id=?').get(key.id);
  assert.equal(stored.secret_hash.length, 64); assert.notEqual(stored.secret_hash, key.secret);
  const listed = await a.request('GET', '/api-keys');
  assert.equal(listed.status, 200); assert.ok(!JSON.stringify(listed.data).includes(key.secret)); assert.ok(!JSON.stringify(listed.data).includes('secret_hash'));
  const contact = save(a.db, 'contacts', { name: 'Synthetic' });
  const channel = save(a.db, 'channels', { name: 'Manual', kind: 'manual' });
  const conversation = save(a.db, 'conversations', { title: 'Test', contact_id: contact.id, channel_id: channel.id });
  save(a.db, 'messages', { conversation_id: conversation.id, body: 'Hola', direction: 'incoming', occurred_at: new Date().toISOString() });
  for (const resource of ['conversations', 'messages', 'contacts', 'tickets', 'ai_agents', 'prompts', 'channels', 'pipelines', 'pipeline_stages', 'tools', 'users']) {
    const result = await a.request('GET', `/${resource}?pageSize=1`, undefined, key.secret);
    assert.equal(result.status, 200, resource); assert.equal(result.data.pageSize, 1);
  }
  assert.equal((await a.request('GET', `/messages?conversation_id=${conversation.id}`, undefined, key.secret)).data.items[0].body, 'Hola');
  for (const [method, path, body] of [
    ['GET', '/api-keys'], ['POST', '/api-keys', {}], ['GET', '/session'], ['POST', '/login', {}],
    ['GET', '/integrations'], ['GET', `/ai_agents/${agent.id}/integration`],
    ['POST', `/conversations/${conversation.id}/send`, { body: 'No' }],
    ['PATCH', `/prompts/${prompt.id}`, { content: 'No', expected_version: 1 }],
    ['POST', '/contacts', { name: 'No' }], ['DELETE', `/contacts/${contact.id}`],
    ['POST', `/ai_agents/${agent.id}/test`, { message: 'Hola' }],
  ]) assert.equal((await a.request(method, path, body, key.secret)).status, 403, `${method} ${path}`);
  assert.equal((await a.request('GET', '/contacts', undefined, 'invalid', { Cookie: a.cookie() })).status, 400);
  assert.equal((await a.request('GET', '/contacts', undefined, 'invalid')).status, 401);
  assert.equal((await a.request('POST', '/api-keys', { name: 'No', scopes: ['resources:read'], expires_in_days: 1 }, undefined, { Origin: '' })).status, 403);
  assert.equal((await a.request('POST', '/api-keys', { name: 'No', scopes: ['admin'], expires_in_days: 1 })).status, 400);
  assert.ok(a.db.prepare('SELECT last_used_at FROM api_keys WHERE id=?').get(key.id).last_used_at);
  assert.equal((await a.request('POST', `/api-keys/${key.id}/revoke`, {})).status, 200);
  assert.equal((await a.request('GET', '/contacts', undefined, key.secret)).status, 401);
  const expired = await a.key(['resources:read']);
  a.db.prepare('UPDATE api_keys SET expires_at=? WHERE id=?').run('2000-01-01T00:00:00.000Z', expired.id);
  assert.equal((await a.request('GET', '/contacts', undefined, expired.secret)).status, 401);
});

test('Prompts: attributed versions, stale writes, restore and history pagination', async (t) => {
  const a = await start(t); const { prompt, agent } = agentFixture(a.db);
  const key = await a.key(['prompts:write']);
  assert.equal((await a.request('GET', `/prompts/${prompt.id}`, undefined, key.secret)).status, 403);
  assert.equal((await a.request('PATCH', `/prompts/${prompt.id}`, { content: 'Missing version' }, key.secret)).status, 400);
  const [one, two] = await Promise.all([
    a.request('PATCH', `/prompts/${prompt.id}`, { content: 'Primero', expected_version: 1 }, key.secret),
    a.request('PATCH', `/prompts/${prompt.id}`, { content: 'Segundo', expected_version: 1 }, key.secret),
  ]);
  assert.deepEqual([one.status, two.status].sort(), [200, 409]);
  const history = (await a.request('GET', `/prompts/${prompt.id}/versions`)).data;
  assert.equal(history.items.length, 2); assert.equal(history.items[0].actor, `api_key:${key.id}`); assert.equal(history.agents[0].id, agent.id);
  const restored = await a.request('POST', `/prompts/${prompt.id}/restore`, { version: 1, expected_version: 2 }, key.secret);
  assert.equal(restored.status, 200); assert.equal(restored.data.version, 3); assert.equal(restored.data.content, prompt.content);
  assert.equal((await a.request('POST', `/prompts/${prompt.id}/restore`, { version: 1, expected_version: 2 }, key.secret)).status, 409);
  assert.equal((await a.request('PATCH', `/prompts/${prompt.id}`, { content: '', expected_version: 3 }, key.secret)).status, 400);
  assert.equal(a.db.prepare('SELECT count(*) n FROM prompt_versions WHERE prompt_id=?').get(prompt.id).n, 3);
  for (let v = 3; v < 23; v++) save(a.db, 'prompts', { content: `Version ${v + 1}`, expected_version: v }, prompt.id);
  assert.equal((await a.request('GET', `/prompts/${prompt.id}/versions`)).data.items.length, 20);
  assert.equal((await a.request('GET', `/prompts/${prompt.id}/versions?page=2`)).data.items.length, 3);
  assert.equal((await a.request('GET', `/prompts/${prompt.id}/versions?page=-1`)).status, 400);
  assert.throws(() => remove(a.db, 'prompts', prompt.id));
  assert.equal(a.db.prepare('SELECT count(*) n FROM prompt_versions WHERE prompt_id=?').get(prompt.id).n, 23);
});

test('Tests endpoint: independent scope, no operational writes, usage and limits', async (t) => {
  const inputs = [];
  const a = await start(t, { integrationOptions: { llmClient: client(async (input) => { inputs.push(input); return inputs.length % 2 ? call('handoff_to_human', { reason: 'Solicita persona' }) : completion(); }) } });
  const { agent, prompt } = agentFixture(a.db);
  const key = await a.key(['agents:test']);
  const r = await a.request('POST', `/ai_agents/${agent.id}/test`, { message: 'Necesito ayuda', prompt: 'Candidato temporal' }, key.secret);
  assert.equal(r.status, 200, JSON.stringify(r.data)); assert.equal(r.data.simulated, true);
  assert.equal(r.data.tools[0].result.handedOff, true); assert.equal(r.data.candidate, true); assert.equal(r.data.usage.total_tokens, 12);
  assert.match(inputs[0].messages[0].content, /Candidato temporal/);
  assert.equal(inputs[0].messages[1].role, 'user'); assert.match(inputs[0].messages[1].content, /lunes a viernes/);
  assert.equal(a.db.prepare('SELECT content FROM prompts WHERE id=?').get(prompt.id).content, prompt.content);
  for (const table of ['messages', 'agent_runs', 'tool_runs', 'outbound_messages', 'conversations'])
    assert.equal(a.db.prepare(`SELECT count(*) n FROM ${table}`).get().n, 0, table);
  for (let i = 0; i < 4; i++) assert.equal((await a.request('POST', `/ai_agents/${agent.id}/test`, { message: 'Hola' }, key.secret)).status, 200);
  const limited = await a.request('POST', `/ai_agents/${agent.id}/test`, { message: 'Hola' }, key.secret);
  assert.equal(limited.status, 429); assert.ok(limited.headers.get('retry-after'));
  assert.equal((await a.request('POST', `/ai_agents/${agent.id}/test`, { message: 'Hola' }, undefined, { Origin: 'https://evil.test' })).status, 403);
});

test('Rate limit: 120 requests per key with Retry-After', async (t) => {
  const a = await start(t); const key = await a.key(['resources:read']);
  for (let i = 0; i < 120; i++) assert.equal((await a.request('GET', '/contacts', undefined, key.secret)).status, 200);
  const r = await a.request('GET', '/contacts', undefined, key.secret);
  assert.equal(r.status, 429); assert.ok(r.headers.get('retry-after'));
});

test('Tester: invalid tools, arguments, errors, concurrent test and cancellation', async (t) => {
  const db = openDatabase(':memory:'); t.after(() => db.close()); const { agent } = agentFixture(db);
  for (const response of [call('delete_everything'), call('handoff_to_human', { reason: 'Okay', contact_id: 'another' }), call('handoff_to_human', { reason: '' })]) {
    const tester = createAgentTester(db, env, client(async () => response));
    await assert.rejects(tester(agent.id, { message: 'Hola' }), (e) => e.status === 409);
  }
  const broken = createAgentTester(db, env, client(async () => { throw new Error('raw-provider-secret'); }));
  await assert.rejects(broken(agent.id, { message: 'Hola' }), (e) => e.status === 502 && !e.message.includes('raw-provider-secret'));
  const repeated = createAgentTester(db, env, client(async () => call('handoff_to_human', { reason: 'Ayuda' })));
  await assert.rejects(repeated(agent.id, { message: 'Hola' }), /rondas/);
  let started; const entered = new Promise((r) => { started = r; });
  const slow = createAgentTester(db, env, client(async (_input, options) => {
    started(); await new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    return completion();
  }));
  const cancel = new AbortController(); const pending = slow(agent.id, { message: 'Hola' }, cancel.signal);
  await entered;
  await assert.rejects(slow(agent.id, { message: 'Otro' }), /curso/);
  cancel.abort(); await assert.rejects(pending, (e) => e.status === 504);
  assert.throws(() => agentMessages('x'.repeat(30001), []), /30000/);
  assert.throws(() => agentMessages('Base', [{ extracted_text: 'x'.repeat(30001) }]), /30000/);
});

test('Migration: existing prompts preserved and keys/context/versions survive reopen', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'workbench-migration-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'test.sqlite'); const old = new DatabaseSync(path);
  old.exec('CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)');
  for (const name of ['001-platform.sql', '002-auth.sql', '003-integrations.sql', '004-message-revisions.sql']) {
    old.exec(readFileSync(new URL(`../backend/migrations/${name}`, import.meta.url), 'utf8'));
    old.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(name, new Date().toISOString());
  }
  old.prepare('INSERT INTO prompts(id,name,content,active,created_at,updated_at) VALUES (?,?,?,?,?,?)').run('legacy', 'Legacy', 'Preservado', 1, '2026-01-01', '2026-01-01'); old.close();
  const db = openDatabase(path);
  assert.equal(db.prepare('SELECT actor FROM prompt_versions WHERE prompt_id=?').get('legacy').actor, 'migration');
  save(db, 'prompts', { content: 'Nuevo', expected_version: 1 }, 'legacy');
  const { agent } = agentFixture(db);
  const key = createKeyAccess(db).create({ name: 'Persistent', scopes: ['resources:read'], expires_in_days: 30 });
  db.close();
  const reopened = openDatabase(path); t.after(() => reopened.close());
  assert.equal(reopened.prepare('SELECT version FROM prompts WHERE id=?').get('legacy').version, 2);
  assert.equal(createKeyAccess(reopened).authenticate({ headers: { authorization: `Bearer ${key.secret}` } }, { setHeader() {} }).id, key.id);
  assert.match(readyDocuments(reopened, agent.id)[0].extracted_text, /lunes/);
  assert.equal(restorePrompt(reopened, 'legacy', { version: 1, expected_version: 2 }, 'admin').content, 'Preservado');
});

test('Documents HTTP: every supported format, original download, authorization and safe replacements', async (t) => {
  const a = await start(t); const { agent } = agentFixture(a.db);
  const path = `/ai_agents/${agent.id}/documents`;
  const reader = await a.key(['resources:read']);
  const upload = (filename, bytes, id, revision, token, extra = {}) => a.request(id ? 'PUT' : 'POST', path + (id ? `/${id}` : ''), bytes, token,
    { 'Content-Type': 'application/octet-stream', 'X-Filename': encodeURIComponent(filename), ...(revision ? { 'If-Match': String(revision) } : {}), ...extra });
  for (const extension of ['txt', 'md', 'doc', 'docx', 'pdf']) {
    const original = readFileSync(new URL(`./fixtures/documents/business.${extension}`, import.meta.url));
    const result = await upload(`business.${extension}`, original);
    assert.equal(result.status, 201, JSON.stringify(result.data));
    assert.equal(result.data.status, 'ready', JSON.stringify(result.data));
    assert.match(result.data.extracted_text, /lunes a viernes/);
    const download = await a.request('GET', `${path}/${result.data.id}/download`, undefined, reader.secret);
    assert.equal(download.status, 200); assert.deepEqual(download.data, original);
    assert.match(download.headers.get('content-disposition'), /^attachment;/);
  }
  const listed = await a.request('GET', path, undefined, reader.secret);
  assert.equal(listed.status, 200); assert.equal(listed.data.items.length, 6);
  assert.ok(!JSON.stringify(listed.data).includes('extracted_text'));
  const first = listed.data.items.find((row) => row.filename === 'business.txt');
  assert.equal((await upload('denied.txt', Buffer.from('no'), undefined, undefined, reader.secret)).status, 403);
  assert.equal((await upload('denied.txt', Buffer.from('no'), undefined, undefined, undefined, { Origin: 'https://evil.test' })).status, 403);
  assert.equal((await a.request('GET', `${path}/${first.id}/download`, undefined, 'invalid')).status, 401);
  assert.equal((await a.request('GET', `${path}/${first.id}`, undefined, reader.secret)).status, 200);
  assert.equal((await upload('invalid.pdf', Buffer.from('not a PDF'), first.id, first.revision)).status, 422);
  assert.equal((await a.request('GET', `${path}/${first.id}`)).data.filename, 'business.txt');
  const replaced = await upload('nuevo.md', Buffer.from('# Horarios nuevos'), first.id, first.revision);
  assert.equal(replaced.status, 200); assert.equal(replaced.data.revision, 2);
  assert.equal((await upload('stale.txt', Buffer.from('stale'), first.id, first.revision)).status, 409);
  assert.equal((await a.request('DELETE', `${path}/${first.id}`, undefined, undefined, { 'If-Match': '1' })).status, 409);
  assert.equal((await a.request('DELETE', `${path}/${first.id}`, undefined, undefined, { 'If-Match': '2' })).status, 200);
  assert.equal((await a.request('GET', `${path}/${first.id}/download`)).status, 404);
  const failed = await upload('broken.pdf', Buffer.from('not a PDF'));
  assert.equal(failed.status, 201); assert.equal(failed.data.status, 'error'); assert.ok(failed.data.error);
  assert.deepEqual((await a.request('GET', `${path}/${failed.data.id}/download`)).data, Buffer.from('not a PDF'));
  assert.equal((await upload('empty.txt', Buffer.alloc(0))).status, 400);
  assert.equal((await upload('file.exe', Buffer.from('not allowed'))).status, 415);
  assert.equal((await upload('big.txt', Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await upload('../path.txt', Buffer.from('not allowed'))).status, 400);
  const invalidUTF8 = await upload('bad.txt', Buffer.from([0xff])); assert.equal(invalidUTF8.data.status, 'error');
  assert.equal((await upload('blank.txt', Buffer.from('   '))).data.status, 'error');
});

test('Documents: count/text quotas, concurrent replacement, restart recovery and original persistence', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'documents-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'test.sqlite'); let db = openDatabase(path); t.after(() => db.close());
  const agent = save(db, 'ai_agents', { name: 'Document agent' });
  let documents = createDocuments(db);
  const input = (text) => ({ filename: 'context.txt', extension: 'txt', media_type: 'text/plain', bytes: Buffer.from(text), size: Buffer.byteLength(text) });
  const first = await documents.upload(agent.id, input('a'.repeat(20000)));
  const tooMuch = await documents.upload(agent.id, input('b'.repeat(10001)));
  assert.equal(tooMuch.status, 'error'); assert.match(tooMuch.error, /30000/);
  assert.equal(readyDocuments(db, agent.id).length, 1);
  const excessive = await documents.upload(agent.id, input('b'.repeat(30001))); assert.equal(excessive.status, 'error');
  const replacing = documents.upload(agent.id, input('Replacement'), first.id, '1');
  await assert.rejects(documents.upload(agent.id, input('Concurrent')), /otro archivo/);
  db.prepare('UPDATE agent_documents SET revision=2 WHERE id=?').run(first.id);
  await assert.rejects(replacing, /cambió/);
  assert.equal(documents.get(agent.id, first.id).extracted_text, 'a'.repeat(20000));
  db.prepare("UPDATE agent_documents SET status='processing' WHERE id=?").run(tooMuch.id);
  db.close(); db = openDatabase(path); documents = createDocuments(db);
  assert.match(documents.get(agent.id, tooMuch.id).error, /interrumpió/);
  assert.deepEqual(Buffer.from(documents.get(agent.id, first.id, true).original), Buffer.from('a'.repeat(20000)));
  for (let i = 3; i < 10; i++) await documents.upload(agent.id, input(`File ${i}`));
  await assert.rejects(documents.upload(agent.id, input('Extra')), /10 documentos/);
  remove(db, 'ai_agents', agent.id);
  assert.equal(db.prepare('SELECT count(*) n FROM agent_documents').get().n, 0);
});

test('Migration 006 preserves legacy business context as a downloadable TXT', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'legacy-context-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'test.sqlite'); const old = new DatabaseSync(path);
  old.exec('CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)');
  for (const name of ['001-platform.sql', '002-auth.sql', '003-integrations.sql', '004-message-revisions.sql', '005-agent-workbench.sql']) {
    old.exec(readFileSync(new URL(`../backend/migrations/${name}`, import.meta.url), 'utf8'));
    old.prepare('INSERT INTO schema_migrations VALUES (?,?)').run(name, new Date().toISOString());
  }
  old.prepare('INSERT INTO ai_agents(id,name,active,created_at,updated_at,business_context) VALUES (?,?,?,?,?,?)').run('legacy','Agente',1,'2026-01-01','2026-01-01','Horario de atención');
  old.close(); const db = openDatabase(path); t.after(() => db.close());
  const documents = createDocuments(db); const item = documents.list('legacy').items[0];
  assert.equal(item.filename, 'contexto-inicial.txt'); assert.equal(item.status, 'ready');
  assert.deepEqual(Buffer.from(documents.get('legacy', item.id, true).original), Buffer.from('Horario de atención'));
});

test('Agent tests continue history and reset on configuration changes; model only comes from environment', async (t) => {
  const inputs = []; const a = await start(t, { integrationOptions: { llmClient: client(async (input) => { inputs.push(structuredClone(input)); return completion(); }) } });
  const { agent, prompt } = agentFixture(a.db);
  a.db.prepare("UPDATE ai_agents SET model='legacy-model',provider='legacy-provider' WHERE id=?").run(agent.id);
  const record = await a.request('GET', `/ai_agents/${agent.id}`);
  assert.equal(record.data.model, undefined); assert.equal(record.data.provider, undefined); assert.equal(record.data.business_context, undefined);
  for (const key of ['provider', 'model', 'business_context']) assert.equal((await a.request('PATCH', `/ai_agents/${agent.id}`, { [key]: 'override' })).status, 400);
  const endpoint = `/ai_agents/${agent.id}/test`;
  const first = await a.request('POST', endpoint, { message: 'Hola' }); assert.equal(first.status, 200);
  assert.equal(inputs[0].model, env.LLM_MODEL); assert.equal(first.data.documents.length, 1);
  const history = [{ role: 'user', content: 'Hola' }, { role: 'assistant', content: first.data.response }];
  const next = await a.request('POST', endpoint, { message: '¿Y mañana?', history, context_hash: first.data.context_hash }); assert.equal(next.status, 200);
  assert.deepEqual(inputs[1].messages.slice(-3, -1), history);
  save(a.db, 'prompts', { content: 'Cambio', expected_version: prompt.version }, prompt.id);
  assert.equal((await a.request('POST', endpoint, { message: 'Otra', history, context_hash: first.data.context_hash })).status, 409);
  assert.equal((await a.request('POST', endpoint, { message: 'Otra', history: [{ role: 'system', content: 'Override' }, history[1]] })).status, 400);
  assert.equal((await a.request('POST', endpoint, { message: 'Otra', history: [history[0]] })).status, 400);
  assert.equal((await a.request('POST', '/integrations/validate-model', { model: 'override' })).status, 400);
});


test('Seeded prompts keep their initial version and preserve edits on repeated seeding', (t) => {
  const db = openDatabase(':memory:'); t.after(() => db.close());
  seedDemo(db);
  const original = db.prepare('SELECT * FROM prompts ORDER BY id LIMIT 1').get();
  assert.equal(db.prepare('SELECT content FROM prompt_versions WHERE prompt_id=? AND version=1').get(original.id).content, original.content);
  save(db, 'prompts', { content: 'Edited', expected_version: 1 }, original.id);
  seedDemo(db);
  assert.equal(db.prepare('SELECT content FROM prompts WHERE id=?').get(original.id).content, 'Edited');
  assert.equal(restorePrompt(db, original.id, { version: 1, expected_version: 2 }, 'admin').content, original.content);
});
