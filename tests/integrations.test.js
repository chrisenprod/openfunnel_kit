import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { openDatabase } from '../backend/db.js';
import { createIntegrations } from '../backend/integrations.js';
import { save, remove } from '../backend/resources.js';
import { createLLM } from '../backend/llm.js';
import { createBilling } from '../backend/billing.js';
import { createApp } from '../backend/server.js';
import { syncNativeTools } from '../backend/native-tools.js';
import { once } from 'node:events';
const env = {
  ZERNIO_API_KEY: 'test-zernio-secret',
  ZERNIO_WEBHOOK_SECRET: 'test-signing-secret-32-characters-long',
  PUBLIC_BASE_URL: 'https://app.example.test',
  LLM_BASE_URL: 'https://model.example.test/openai/v1/',
  LLM_API_KEY: 'test-llm-secret',
  LLM_MODEL: 'test-deployment',
};
const stamp = () => new Date().toISOString();
function fixture(t, { platform = 'instagram', sendMode = 'ok', complete, active, billingMeter } = {}) {
  const db = openDatabase(':memory:');
  let serial = 0;
  const account = {
    _id: 'account-1',
    platform,
    profileId: { _id: 'profile-1' },
    displayName: 'Test channel',
    isActive: true,
  };
  const conversation = {
    id: 'opaque:thread/1',
    accountId: account._id,
    platform,
    participantId: 'participant-1',
    participantName: 'Test contact',
    status: 'active',
  };
  const remote = [];
  const requests = [];
  const fetcher = async (url, options) => {
    const u = new URL(url),
      path = decodeURIComponent(u.pathname);
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({
      path,
      query: u.searchParams,
      method: options.method,
      body,
      key: options.headers['Idempotency-Key'],
    });
    let value;
    if (path.endsWith('/accounts')) value = { accounts: [account] };
    else if (path.endsWith('/profiles') && options.method === 'GET')
      value = { profiles: [{ _id: 'profile-1', name: 'Tests' }] };
    else if (path.endsWith('/profiles')) value = { profile: { _id: 'profile-2', name: body.name } };
    else if (path.includes('/connect/')) value = { authUrl: 'https://zernio.com/connect/test' };
    else if (path.endsWith('/webhooks/settings') && options.method === 'GET')
      value = { webhooks: [] };
    else if (path.endsWith('/webhooks/settings')) value = { webhook: { _id: 'webhook-1' } };
    else if (path.endsWith('/inbox/conversations'))
      value = { data: [conversation], pagination: { hasMore: false } };
    else if (path.endsWith('/messages') && options.method === 'POST') {
      if (sendMode === 'timeout') throw new Error('secret raw exception');
      if (sendMode === '429')
        return new Response(JSON.stringify({ code: 'rate_limited' }), {
          status: 429,
          headers: { 'retry-after': '90' },
        });
      const id = `outgoing-${++serial}`;
      remote.push({
        id,
        conversationId: conversation.id,
        accountId: account._id,
        platform,
        message: body.message,
        direction: 'outgoing',
        createdAt: stamp(),
        deliveryStatus: 'sent',
      });
      value = { success: true, data: { messageId: id } };
    } else if (path.endsWith('/messages'))
      value = { messages: remote, pagination: { hasMore: false } };
    else if (path.includes('/inbox/conversations/')) value = { data: conversation };
    else throw new Error(`Unexpected path ${path}`);
    return new Response(JSON.stringify(value), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const client = {
    chat: {
      completions: {
        create: async (input) => {
          if (complete) return complete(input);
          if (input.tool_choice)
            return {
              choices: [
                {
                  finish_reason: 'tool_calls',
                  message: {
                    role: 'assistant',
                    content: null,
                    tool_calls: [
                      {
                        id: 'probe',
                        type: 'function',
                        function: { name: 'connection_probe', arguments: '{}' },
                      },
                    ],
                  },
                },
              ],
            };
          return {
            choices: [
              {
                finish_reason: 'stop',
                message: { role: 'assistant', content: 'Respuesta de prueba' },
              },
            ],
            usage: { total_tokens: 12, prompt_tokens: 8, completion_tokens: 4 },
          };
        },
      },
    },
  };
  const i = createIntegrations(db, { ...env, BILLING_METER: billingMeter, ...(active ? { INTEGRATION_ACTIVE: active } : {}) }, { fetch: fetcher, llmClient: client });
  t.after(async () => {
    await i.stop();
    db.close();
  });
  const incoming = (id = 'incoming-1', extra = {}) => ({
    id,
    event: 'message.received',
    account: { id: account._id, accountId: account._id, platform },
    conversation: { id: conversation.id },
    message: {
      id: `internal-${id}`,
      platformMessageId: id,
      platform,
      direction: 'incoming',
      text: 'Hola',
      sentAt: stamp(),
      attachments: [],
      ...extra,
    },
    timestamp: stamp(),
  });
  const receive = (body) => {
    const raw = Buffer.from(JSON.stringify(body));
    return i.receive(
      raw,
      createHmac('sha256', env.ZERNIO_WEBHOOK_SECRET).update(raw).digest('hex'),
    );
  };
  const get = (table) => db.prepare(`SELECT * FROM ${table}`).all();
  async function setup() {
    await i.syncAccounts();
    await i.tick();
    await i.tick();
    return get('channels')[0];
  }
  async function agent() {
    const prompt = save(db, 'prompts', {
      name: 'Instructions',
      content: 'Ayuda al contacto.',
      active: true,
    });
    const agent = save(db, 'ai_agents', {
      name: 'Test agent',
      active: true,
      prompt_ids: [prompt.id],
    });
    await i.validateAgent(agent.id);
    await i.registerWebhook();
    i.automation(get('channels')[0].id, { agent_id: agent.id, enabled: true });
    return agent;
  }
  return {
    db,
    i,
    requests,
    remote,
    account,
    conversation,
    receive,
    incoming,
    get,
    setup,
    agent,
    fetcher,
    client,
  };
}
test('Mapping: stable IDs, imported history, identity scope and protected remote CRUD', async (t) => {
  const a = fixture(t);
  a.remote.push({
    id: 'historical-1',
    conversationId: a.conversation.id,
    accountId: 'account-1',
    platform: 'instagram',
    message: 'Antes',
    direction: 'incoming',
    createdAt: stamp(),
  });
  await a.setup();
  const ids = ['channels', 'conversations', 'contacts', 'messages'].map((x) => a.get(x)[0].id);
  await a.i.syncAccounts();
  await a.i.tick();
  await a.i.tick();
  assert.deepEqual(
    ['channels', 'conversations', 'contacts', 'messages'].map((x) => a.get(x)[0].id),
    ids,
  );
  assert.equal(a.get('agent_runs').length, 0);
  assert.throws(() => save(a.db, 'messages', { body: 'Changed' }, ids[3]), /externos/);
  assert.throws(() => remove(a.db, 'messages', ids[3]), /externo/);
  assert.throws(
    () =>
      save(a.db, 'messages', {
        conversation_id: ids[1],
        body: 'Fake send',
        direction: 'outgoing',
        occurred_at: stamp(),
      }),
    /Enviar/,
  );
  assert.throws(
    () => save(a.db, 'conversations', { automation_mode: 'automatic' }, ids[1]),
    /desconocido/,
  );
});
test('Webhooks: signature, duplicates, comments and contract drift', async (t) => {
  const a = fixture(t);
  await a.setup();
  assert.throws(() => a.i.receive(Buffer.from('{}'), 'a'.repeat(64)), /Firma/);
  assert.equal(a.get('webhook_events').length, 0);
  const event = a.incoming();
  a.receive(event);
  a.receive(event);
  await a.i.tick();
  assert.equal(a.get('messages').length, 1);
  assert.equal(a.get('webhook_events').length, 1);
  a.receive({ ...a.incoming('comment'), event: 'comment.received' });
  await a.i.tick();
  assert.equal(a.get('messages').length, 1);
  a.receive(a.incoming('bad', { platformMessageId: undefined }));
  await a.i.tick();
  assert.equal(a.get('webhook_events').find((x) => x.id === 'bad').status, 'failed');
  assert.equal(a.get('conversations')[0].automation_mode, 'manual');
  assert.equal(a.get('messages').length, 1);
});
test('Connection callback: session, expiry, profile and remote account verification', async (t) => {
  const a = fixture(t);
  const body = { platform: 'instagram', profile_id: 'profile-1' };
  await a.i.connect(body, 'session-1');
  const request = a.requests.find((r) => r.path.endsWith('/connect/instagram'));
  const callback = new URL(request.query.get('redirect_url'));
  const q = callback.searchParams;
  q.set('connected', 'instagram');
  q.set('profileId', 'profile-1');
  q.set('accountId', 'account-1');
  await assert.rejects(() => a.i.callback(q, 'wrong-session'), /inválido/);
  assert.equal(a.get('channels').length, 0);
  const id = await a.i.callback(q, 'session-1');
  assert.equal(a.get('channels')[0].id, id);
  assert.equal(a.get('channels')[0].automation_enabled, 0);
  await assert.rejects(() => a.i.callback(q, 'session-1'), /inválido/);
});
for (const platform of ['instagram', 'whatsapp'])
  test(`Runtime: ${platform} receives, replies once and pauses for human`, async (t) => {
    const a = fixture(t, { platform });
    await a.setup();
    await a.agent();
    a.receive(a.incoming());
    await a.i.tick();
    assert.equal(a.get('agent_runs')[0].status, 'completed');
    assert.equal(a.get('outbound_messages')[0].status, 'sent');
    assert.equal(
      a.requests.filter((x) => x.method === 'POST' && x.path.endsWith('/messages')).length,
      1,
    );
    const c = a.get('conversations')[0];
    a.i.mode(c.id, { mode: 'manual' });
    a.receive(a.incoming('next'));
    await a.i.tick();
    assert.equal(a.get('agent_runs').length, 1);
    const request_id = randomUUID();
    a.i.send(c.id, { message: 'Respuesta humana', request_id });
    a.i.send(c.id, { message: 'Respuesta humana', request_id });
    await a.i.tick();
    assert.equal(a.get('outbound_messages').length, 2);
  });
test('Delivery: timeout becomes uncertain, blocks blind retry and survives restart', async (t) => {
  const a = fixture(t, { sendMode: 'timeout' });
  await a.setup();
  a.receive(a.incoming());
  await a.i.tick();
  const c = a.get('conversations')[0];
  a.i.mode(c.id, { mode: 'manual' });
  a.i.send(c.id, { message: 'Hi', request_id: 'request-1' });
  await a.i.tick();
  assert.equal(a.get('outbound_messages')[0].status, 'uncertain');
  assert.throws(() => a.i.send(c.id, { message: 'Again', request_id: 'request-2' }), /incierto/);
  assert.ok(!JSON.stringify(a.i.activity(c.id)).includes('secret raw'));
  a.i.start();
  await a.i.stop();
  assert.equal(a.get('outbound_messages')[0].status, 'uncertain');
});
test('Delivery: 429 waits, window expiration and attachments do not trigger sending', async (t) => {
  const a = fixture(t, { sendMode: '429' });
  await a.setup();
  await a.agent();
  a.receive(
    a.incoming('attachment', {
      attachments: [{ type: 'image', url: 'https://example.test/private' }],
    }),
  );
  await a.i.tick();
  assert.equal(a.get('agent_runs').length, 0);
  const c = a.get('conversations')[0];
  a.i.send(c.id, { message: 'Hi', request_id: 'request-1' });
  await a.i.tick();
  const job = a.get('outbound_messages')[0];
  assert.equal(job.status, 'pending');
  assert.ok(Date.parse(job.available_at) > Date.now() + 60000);
  a.db
    .prepare('UPDATE conversations SET last_incoming_at=? WHERE id=?')
    .run('2020-01-01T00:00:00.000Z', c.id);
  assert.throws(() => a.i.send(c.id, { message: 'Hi', request_id: 'request-2' }), /24 horas/);
});
test('Tools: authorized context and recorded execution, unknown function rejected', async (t) => {
  let mode = 'probe';
  let calls = 0;
  const a = fixture(t, {
    complete: async (input) => {
      if (input.tool_choice)
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'probe',
                    type: 'function',
                    function: { name: 'connection_probe', arguments: '{}' },
                  },
                ],
              },
            },
          ],
        };
      if (mode === 'probe')
        return {
          choices: [
            {
              finish_reason: 'stop',
              message: { role: 'assistant', content: 'OK' },
            },
          ],
        };
      if (calls++ === 0)
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'read',
                    type: 'function',
                    function: { name: mode, arguments: '{}' },
                  },
                ],
              },
            },
          ],
        };
      assert.equal(JSON.parse(input.messages.at(-1).content).name, 'Test contact');
      return {
        choices: [
          {
            finish_reason: 'stop',
            message: { role: 'assistant', content: 'Gracias' },
          },
        ],
      };
    },
  });
  await a.setup();
  const agent = await a.agent();
  const tool = save(a.db, 'tools', {
    name: 'Contact',
    description: 'Read current contact',
    kind: 'get_contact',
    active: true,
  });
  save(a.db, 'ai_agents', { tool_ids: [tool.id] }, agent.id);
  mode = 'get_contact';
  a.receive(a.incoming());
  await a.i.tick();
  assert.equal(a.get('tool_runs')[0].status, 'completed');
  mode = 'execute_sql';
  calls = 0;
  a.receive(a.incoming('unsafe'));
  await a.i.tick();
  assert.equal(a.get('tool_runs').at(-1).status, 'rejected');
  assert.equal(a.get('outbound_messages').length, 1);
});
test('Native handoff pauses only its conversation and prevents further AI replies', async t => {
  let live = false, calls = 0;
  const a = fixture(t, { complete: async input => {
    if (!live && !input.tool_choice) return { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'Ready' } }] };
    const name = live ? 'handoff_to_human' : 'connection_probe';
    if (live) {
      calls++;
      assert.ok(input.tools.some(tool => tool.function.name === 'handoff_to_human'));
    }
    return { choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', tool_calls: [
      { id: 'handoff', type: 'function', function: { name, arguments: JSON.stringify(live ? { reason: 'Quiere hablar con una persona.' } : {}) } },
    ] } }] };
  } });
  syncNativeTools(a.db);
  await a.setup();
  const agent = await a.agent();
  save(a.db, 'ai_agents', { tool_ids: ['builtin_handoff_to_human'] }, agent.id);
  const contact = save(a.db, 'contacts', { name: 'Another contact' });
  const channel = save(a.db, 'channels', { name: 'Other channel', kind: 'manual' });
  const other = save(a.db, 'conversations', { title: 'Unrelated', contact_id: contact.id, channel_id: channel.id });
  const before = a.db.prepare('SELECT * FROM conversations WHERE id=?').get(other.id);
  live = true;
  a.receive(a.incoming());
  await a.i.tick();
  const current = a.get('conversations').find(row => row.external_id === a.conversation.id);
  assert.equal(current.automation_mode, 'manual');
  assert.equal(current.pause_reason, 'Quiere hablar con una persona.');
  assert.equal(a.get('agent_runs')[0].status, 'handed_off');
  assert.equal(a.get('tool_runs')[0].name, 'handoff_to_human');
  assert.equal(a.get('tool_runs')[0].status, 'completed');
  assert.deepEqual(a.db.prepare('SELECT * FROM conversations WHERE id=?').get(other.id), before);
  a.receive(a.incoming('after-handoff'));
  await a.i.tick();
  assert.equal(calls, 1);
  assert.equal(a.get('outbound_messages').length, 0);
  assert.equal(a.requests.filter(request => request.method === 'POST' && request.path.endsWith('/messages')).length, 0);
});

test('Concurrency: human takeover while model is generating prevents send', async (t) => {
  let release,
    started,
    live = false;
  const waiting = new Promise((r) => (started = r));
  const a = fixture(t, {
    complete: async (input) => {
      if (input.tool_choice)
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'probe',
                    type: 'function',
                    function: { name: 'connection_probe', arguments: '{}' },
                  },
                ],
              },
            },
          ],
        };
      if (live) {
        started();
        await new Promise((r) => (release = r));
      }
      return {
        choices: [
          {
            finish_reason: 'stop',
            message: { role: 'assistant', content: 'OK' },
          },
        ],
      };
    },
  });
  await a.setup();
  await a.agent();
  live = true;
  a.receive(a.incoming());
  const processing = a.i.tick();
  await waiting;
  a.i.mode(a.get('conversations')[0].id, { mode: 'manual' });
  release();
  await processing;
  assert.equal(a.get('outbound_messages').length, 0);
  assert.equal(a.get('agent_runs')[0].status, 'cancelled');
});
test('LLM validation rejects text-only compatibility and redacts provider errors', async () => {
  const llm = createLLM(env, {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ finish_reason: 'stop', message: { content: 'No tools' } }],
        }),
      },
    },
  });
  await assert.rejects(() => llm.validate('test'), /tool calling/);
  const broken = createLLM(env, {
    chat: {
      completions: {
        create: async () => {
          throw Object.assign(new Error(env.LLM_API_KEY), { status: 401 });
        },
      },
    },
  });
  await assert.rejects(
    () => broken.validate('test'),
    (e) => !e.message.includes(env.LLM_API_KEY) && e.status === 502,
  );
});
test('HTTP: integration administration requires session/origin and webhooks require signature', async (t) => {
  const a = await createApp({
    databasePath: ':memory:',
    env: {
      admin_user: 'admin',
      admin_pass: 'test-password-long',
      APP_ORIGIN: 'http://localhost:5173',
      ...env,
    },
    integrationOptions: { fetch: async () => new Response('{}') },
  });
  a.server.listen(0, '127.0.0.1');
  await once(a.server, 'listening');
  t.after(async () => {
    a.server.closeAllConnections();
    await new Promise((r) => a.server.close(r));
    await a.integrations.stop();
    a.db.close();
  });
  const base = `http://127.0.0.1:${a.server.address().port}`;
  assert.equal((await fetch(base + '/api/integrations')).status, 401);
  assert.equal(
    (
      await fetch(base + '/api/integrations/sync', {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + '/api/integrations/zernio/webhook', {
        method: 'POST',
        body: '{}',
      })
    ).status,
    401,
  );
});

test('Webhook: weak configuration rejects even correctly signed events without persistence', async (t) => {
  const weakSecret = 'short-secret';
  const a = await createApp({
    databasePath: ':memory:',
    env: { ...env, ZERNIO_WEBHOOK_SECRET: weakSecret },
  });
  a.server.listen(0, '127.0.0.1');
  await once(a.server, 'listening');
  t.after(async () => {
    a.server.closeAllConnections();
    await new Promise((resolve) => a.server.close(resolve));
    await a.integrations.stop();
    a.db.close();
  });
  const raw = JSON.stringify({ id: 'weak-config-event', event: 'message.received' });
  const response = await fetch(
    `http://127.0.0.1:${a.server.address().port}/api/integrations/zernio/webhook`,
    {
      method: 'POST',
      headers: { 'x-zernio-signature': createHmac('sha256', weakSecret).update(raw).digest('hex') },
      body: raw,
    },
  );
  assert.equal(response.status, 503);
  assert.equal(a.db.prepare('SELECT count(*) AS n FROM webhook_events').get().n, 0);
  assert(!(await response.text()).includes(weakSecret));
});

test('Mapping: additional fields tolerated, empty content represented and stale history cannot restore edits/deletions', async (t) => {
  const a = fixture(t);
  const channel = await a.setup();
  const conversation = a.get('conversations')[0];
  const raw = {
    id: 'empty',
    accountId: 'account-1',
    conversationId: conversation.external_id,
    platform: 'instagram',
    direction: 'incoming',
    message: '',
    attachments: [],
    createdAt: stamp(),
    futureField: { unrecognized: true },
  };
  const first = a.i.store.upsertMessage(raw, channel, conversation);
  assert.equal(first.row.body, '[Contenido no compatible]');
  assert.equal(first.row.has_attachments, 1);
  const edited = a.i.store.upsertMessage(
    { ...raw, id: 'editable', message: 'Edited', editedAt: '2030-01-01T00:00:00Z' },
    channel,
    conversation,
  );
  a.i.store.upsertMessage({ ...raw, id: 'editable', message: 'Old' }, channel, conversation);
  assert.equal(
    a.db.prepare('SELECT body FROM messages WHERE id=?').get(edited.row.id).body,
    'Edited',
  );
  a.i.store.upsertMessage({ ...raw, id: 'editable', isDeleted: true }, channel, conversation);
  a.i.store.upsertMessage({ ...raw, id: 'editable', message: 'Old' }, channel, conversation);
  assert.equal(
    a.db.prepare('SELECT body FROM messages WHERE id=?').get(edited.row.id).body,
    '[Mensaje eliminado]',
  );
});
test('Queue: new input during generation invalidates response and processes latest context', async (t) => {
  let release,
    started,
    live = false,
    wait = true;
  const waiting = new Promise((r) => (started = r));
  const a = fixture(t, {
    complete: async (input) => {
      if (input.tool_choice)
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'probe',
                    type: 'function',
                    function: { name: 'connection_probe', arguments: '{}' },
                  },
                ],
              },
            },
          ],
        };
      if (live && wait) {
        started();
        await new Promise((r) => (release = r));
        wait = false;
      }
      return {
        choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'OK' } }],
      };
    },
  });
  await a.setup();
  await a.agent();
  live = true;
  a.receive(a.incoming());
  const processing = a.i.tick();
  await waiting;
  a.receive(a.incoming('new-input'));
  release();
  await processing;
  assert.equal(a.get('outbound_messages').length, 0);
  await a.i.tick();
  assert.equal(a.get('outbound_messages').length, 1);
  assert.equal(a.get('conversations')[0].automation_mode, 'automatic');
});
test('Delivery events update immediately and never downgrade confirmed read state', async (t) => {
  const a = fixture(t);
  await a.setup();
  const event = { ...a.incoming('sent'), event: 'message.sent' };
  event.message.direction = 'outgoing';
  a.receive(event);
  await a.i.tick();
  a.receive({ ...event, id: 'read-event', event: 'message.read' });
  await a.i.tick();
  assert.equal(a.get('messages')[0].delivery_status, 'read');
  a.receive({ ...event, id: 'delivery-event', event: 'message.delivered' });
  await a.i.tick();
  assert.equal(a.get('messages')[0].delivery_status, 'read');
  assert.equal(a.get('agent_runs').length, 0);
});
test('Agent reassignment during generation and external thread control block AI', async (t) => {
  let release,
    started,
    live = false;
  const waiting = new Promise((r) => (started = r));
  const a = fixture(t, {
    complete: async (input) => {
      if (input.tool_choice)
        return {
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'probe',
                    type: 'function',
                    function: { name: 'connection_probe', arguments: '{}' },
                  },
                ],
              },
            },
          ],
        };
      if (live) {
        started();
        await new Promise((r) => (release = r));
      }
      return {
        choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'OK' } }],
      };
    },
  });
  const channel = await a.setup();
  const agent = await a.agent();
  live = true;
  a.receive(a.incoming());
  const processing = a.i.tick();
  await waiting;
  a.i.automation(channel.id, { enabled: false, agent_id: agent.id });
  release();
  await processing;
  assert.equal(a.get('outbound_messages').length, 0);
  a.receive({ ...a.incoming('standby'), metadata: { standby: true } });
  await a.i.tick();
  assert.equal(a.get('conversations')[0].thread_control, 'ai_agent');
  assert.equal(a.get('conversations')[0].automation_mode, 'manual');
});

test('LLM: Azure resource root uses v1, explicit compatible endpoints remain unchanged', async () => {
  const { llmConfiguration } = await import('../backend/llm.js');
  const root = llmConfiguration({
    LLM_BASE_URL: 'https://resource.openai.azure.com/',
    LLM_API_KEY: 'test',
  });
  assert.equal(root.baseURL, 'https://resource.openai.azure.com/openai/v1/');
  assert.equal(
    llmConfiguration({
      LLM_BASE_URL: 'https://resource.services.ai.azure.com',
      LLM_API_KEY: 'test',
    }).baseURL,
    'https://resource.services.ai.azure.com/openai/v1/',
  );
  assert.equal(
    llmConfiguration({ LLM_BASE_URL: 'https://compatible.example.test/v1/', LLM_API_KEY: 'test' })
      .baseURL,
    'https://compatible.example.test/v1/',
  );
  assert.equal(
    llmConfiguration({ LLM_BASE_URL: 'http://resource.openai.azure.com', LLM_API_KEY: 'test' })
      .configured,
    false,
  );
});

for (const field of ['prompt', 'document']) {
  test(`Workbench: ${field} update during generation invalidates response`, async (t) => {
    let live = false, release, started;
    const waiting = new Promise((resolve) => { started = resolve; });
    const seen = [];
    const a = fixture(t, { complete: async (input) => {
      if (input.tool_choice) return { choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', tool_calls: [{ id: 'probe', type: 'function', function: { name: 'connection_probe', arguments: '{}' } }] } }] };
      if (live) { seen.push(input); started(); await new Promise((resolve) => { release = resolve; }); }
      return { choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'Respuesta' } }] };
    } });
    await a.setup(); const agent = await a.agent();
    a.db.prepare("INSERT INTO agent_documents (id,ai_agent_id,filename,media_type,size,original,extracted_text,status,created_at,updated_at) VALUES ('reference',?,'horarios.txt','text/plain',26,?,'Horario: lunes a viernes.','ready','2026-01-01','2026-01-01')").run(agent.id, Buffer.from('Horario: lunes a viernes.'));
    live = true; a.receive(a.incoming()); const processing = a.i.tick(); await waiting;
    assert.match(seen[0].messages[1].content, /lunes a viernes/);
    if (field === 'prompt') {
      const prompt = a.get('prompts')[0];
      save(a.db, 'prompts', { content: 'Instrucciones nuevas', expected_version: prompt.version }, prompt.id);
    } else a.db.prepare("UPDATE agent_documents SET extracted_text='Horario actualizado.',revision=revision+1 WHERE id='reference'").run();
    release(); await processing;
    assert.equal(a.get('outbound_messages').length, 0);
    assert.equal(a.get('agent_runs')[0].status, 'cancelled');
    assert.equal(a.requests.filter((r) => r.method === 'POST' && r.path.endsWith('/messages')).length, 0);
  });
}

test('Cloud suspension during model execution prevents tools and delivery', async t => {
  let active=true, live=false, release, started;
  const waiting=new Promise(resolve=>started=resolve);
  const a=fixture(t,{active:()=>active,complete:async input=>{
    if(input.tool_choice) return {choices:[{finish_reason:'tool_calls',message:{role:'assistant',tool_calls:[{id:'probe',type:'function',function:{name:'connection_probe',arguments:'{}'}}]}}]};
    if(live){started();await new Promise(resolve=>release=resolve);}
    return {choices:[{finish_reason:'stop',message:{role:'assistant',content:'Pending reply'}}]};
  }});
  await a.setup();await a.agent();live=true;
  a.receive(a.incoming());const processing=a.i.tick();await waiting;
  active=false;release();await processing;
  assert.equal(a.get('outbound_messages').length,0);
  assert.equal(a.remote.length,0);
  const count=a.requests.length;await a.i.tick();assert.equal(a.requests.length,count);
});


test('Worker reserves actual credits for model and tools and stops before a call when exhausted', async t => {
  for (const allowance of [5,6]) {
    const control = openDatabase(':memory:');
    t.after(()=>control.close());
    const start=new Date(Date.now()-1000).toISOString(),end=new Date(Date.now()+86400000).toISOString();
    control.prepare('INSERT INTO auth_user(id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,1,?,?)').run('billing-user','Test','test@example.com',start,start);
    control.prepare("INSERT INTO cloud_accounts VALUES ('billing-user','space','client','active',?)").run(start);
    control.prepare("INSERT INTO billing_subscriptions VALUES ('production','sub','space','customer','product','active',?,?,0,?)").run(start,end,start);
    control.prepare("INSERT INTO billing_periods VALUES ('period','production','space','sub','order','product',?,?,?,0,?)").run(start,end,allowance,start);
    const billing=createBilling(control,{BILLING_ENABLED:'true'});
    let calls=0;
    const a=fixture(t,{billingMeter:billing.meter('space'),complete:async input=>{
      if(input.tool_choice) return {choices:[{finish_reason:'tool_calls',message:{tool_calls:[{id:'probe',function:{name:'connection_probe',arguments:'{}'}}]}}]};
      if(input.messages.at(-1).role==='tool') return {choices:[{finish_reason:'stop',message:{content:'OK'}}]};
      calls++;
      return {choices:[{finish_reason:'tool_calls',message:{tool_calls:[{id:'contact',function:{name:'get_contact',arguments:'{}'}}]}}]};
    }});
    await a.setup();const agent=await a.agent();
    const tool=save(a.db,'tools',{name:'Contact',description:'Read current contact',kind:'get_contact',active:true});
    save(a.db,'ai_agents',{tool_ids:[tool.id]},agent.id);
    a.receive(a.incoming());await a.i.tick();
    assert.equal(a.get('tool_runs')[0].status,'completed');
    assert.equal(billing.summary('space').period.consumed,allowance);
    assert.equal(a.get('outbound_messages').length,allowance===6?1:0);
    if(allowance===5) assert.match(a.get('agent_runs')[0].error,/créditos/);
    assert.equal(calls,1);
  }
});
