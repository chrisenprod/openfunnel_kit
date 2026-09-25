import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../backend/server.js';
const env = {
  admin_user: 'admin',
  admin_pass: 'test-only-long-password',
  APP_ORIGIN: 'http://localhost:5173',
};
async function start(t, options = {}) {
  const app = await createApp({ databasePath: ':memory:', env, ...options });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  let cookie = '';
  let stopped = false;
  async function stop() {
    if (stopped) return;
    stopped = true;
    app.server.closeAllConnections();
    await new Promise((resolve) => app.server.close(resolve));
    app.db.close();
  }
  t.after(stop);
  const request = async (method, path, body, extra = {}) => {
    const r = await fetch(
      `http://127.0.0.1:${app.server.address().port}${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          Origin: env.APP_ORIGIN,
          Cookie: cookie,
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    const cookies = r.headers.getSetCookie();
    if (cookies.length) cookie = cookies.map((x) => x.split(';')[0]).join('; ');
    return { status: r.status, data: await r.json(), headers: r.headers };
  };
  const login = () =>
    request('POST', '/api/login', {
      username: (options.env || env).admin_user,
      password: (options.env || env).admin_pass,
    });
  const create = async (table, data) => {
    const r = await request('POST', `/api/${table}`, data);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data;
  };
  return {
    ...app,
    request,
    login,
    create,
    stop,
    getCookie: () => cookie,
    setCookie: (value) => (cookie = value),
  };
}
test('Auth: cookie privada, rutas cerradas, origen, logout y expiración', async (t) => {
  const a = await start(t);
  assert.equal((await a.request('GET', '/api/health')).status, 200);
  for (const table of [
    'contacts',
    'users',
    'channels',
    'conversations',
    'messages',
    'pipelines',
    'pipeline_stages',
    'tickets',
    'prompts',
    'tools',
    'ai_agents',
  ]) {
    assert.equal((await a.request('GET', `/api/${table}`)).status, 401);
    assert.equal((await a.request('POST', `/api/${table}`, {})).status, 401);
  }
  assert.equal(
    (
      await a.request('POST', '/api/login', {
        username: 'admin',
        password: 'incorrect',
      })
    ).status,
    401,
  );
  const r = await a.login();
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { user: { name: 'admin' } });
  assert.match(r.headers.get('set-cookie'), /httponly/i);
  assert.match(r.headers.get('set-cookie'), /samesite=lax/i);
  const cookie = a.getCookie();
  assert.equal((await a.request('GET', '/api/session')).status, 200);
  assert.equal(
    (
      await a.request(
        'POST',
        '/api/contacts',
        { name: 'Rejected' },
        { Origin: 'https://evil.test' },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await a.request(
        'POST',
        '/api/contacts',
        { name: 'Rejected' },
        { Origin: '' },
      )
    ).status,
    403,
  );
  for (const path of [
    '/api/auth/sign-up/email',
    '/api/auth/change-password',
    '/api/auth/sign-in/email',
    '/api/auth/get-session',
    '/api/auth_user',
    '/api/auth_session',
  ])
    assert.equal((await a.request('POST', path, {})).status, 404);
  await a.create('users', { name: 'Other', email: 'other@example.com' });
  assert.equal(
    (
      await a.request('POST', '/api/login', {
        username: 'Other',
        password: env.admin_pass,
      })
    ).status,
    401,
  );
  assert.equal((await a.request('POST', '/api/logout', {})).status, 200);
  a.setCookie(cookie);
  assert.equal((await a.request('GET', '/api/contacts')).status, 401);
  await a.login();
  a.db.prepare('UPDATE auth_session SET expiresAt=?').run(Date.now() - 10000);
  assert.equal((await a.request('GET', '/api/contacts')).status, 401);
  assert.equal((await a.request('GET', '/missing')).status, 404);
  assert.equal((await a.request('POST', '/api/health', {})).status, 404);
});
test('Auth: ausencia de configuración y limitación de intentos', async (t) => {
  const empty = await start(t, { env: {} });
  assert.equal((await empty.request('GET', '/api/session')).status, 503);
  assert.equal((await empty.request('GET', '/api/health')).status, 200);
  const a = await start(t);
  for (let i = 0; i < 10; i++)
    assert.equal(
      (
        await a.request('POST', '/api/login', {
          username: 'bad',
          password: 'bad',
        })
      ).status,
      401,
    );
  const limited = await a.login();
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.get('retry-after'));
});
test('Persistencia y rotación: una identidad, hash y sesiones revocadas', async (t) => {
  const temp = mkdtempSync(join(tmpdir(), 'openfunnel-test-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const databasePath = join(temp, 'test.sqlite');
  const a = await start(t, { databasePath });
  await a.login();
  const cookie = a.getCookie();
  const contact = await a.create('contacts', { name: 'Persistent' });
  assert.notEqual(
    a.db.prepare('SELECT password FROM auth_account').get().password,
    env.admin_pass,
  );
  await a.stop();
  const b = await start(t, { databasePath });
  b.setCookie(cookie);
  assert.equal(
    (await b.request('GET', `/api/contacts/${contact.id}`)).status,
    200,
  );
  await b.stop();
  const rotated = {
    ...env,
    admin_user: 'new-admin',
    admin_pass: 'new-test-only-password',
  };
  const c = await start(t, { databasePath, env: rotated });
  c.setCookie(cookie);
  assert.equal((await c.request('GET', '/api/contacts')).status, 401);
  assert.equal((await c.login()).status, 200);
  assert.equal(c.db.prepare('SELECT count(*) n FROM auth_user').get().n, 1);
  assert.equal(
    (await c.request('GET', `/api/contacts/${contact.id}`)).data.name,
    'Persistent',
  );
  assert.equal(
    c.db.prepare('SELECT count(*) n FROM schema_migrations').get().n,
    9,
  );
});
test('CRUD: validación, filtros, paginación y límites', async (t) => {
  const a = await start(t);
  await a.login();
  const user = await a.create('users', {
    name: 'Person',
    email: 'PERSON@EXAMPLE.COM',
  });
  assert.equal(user.email, 'person@example.com');
  assert.equal(
    (
      await a.request('POST', '/api/users', {
        name: 'Repeated',
        email: 'person@example.com',
      })
    ).status,
    409,
  );
  assert.equal(
    (await a.request('POST', '/api/contacts', { name: '', unknown: true }))
      .status,
    400,
  );
  assert.equal(
    (
      await a.request('POST', '/api/contacts', {
        name: 'Bad email',
        email: 'bad',
      })
    ).status,
    400,
  );
  const c = await a.create('contacts', {
    name: 'Alpha',
    phone: '+56912345678',
  });
  await a.create('contacts', { name: 'Beta' });
  assert.equal(
    (await a.request('GET', '/api/contacts?q=12345678')).data.items[0].id,
    c.id,
  );
  const page = await a.request('GET', '/api/contacts?pageSize=1&page=2');
  assert.equal(page.data.total, 2);
  assert.equal(page.data.items.length, 1);
  for (const query of ['page=0', 'pageSize=101', 'x=1', 'page=abc', 'q=a&q=b'])
    assert.equal(
      (await a.request('GET', `/api/contacts?${query}`)).status,
      400,
    );
  assert.equal(
    (await a.request('PATCH', `/api/contacts/${c.id}`, { name: 'Changed' }))
      .data.name,
    'Changed',
  );
  assert.equal(
    (await a.request('DELETE', `/api/contacts/${c.id}`)).status,
    200,
  );
  assert.equal((await a.request('GET', `/api/contacts/${c.id}`)).status, 404);
  assert.equal(
    (await a.request('POST', '/api/contacts', { name: 'x'.repeat(129 * 1024) }))
      .status,
    413,
  );
});
test('Conversaciones, mensajes, tickets y stages: relaciones y rollback', async (t) => {
  const a = await start(t);
  await a.login();
  const contact = await a.create('contacts', { name: 'Client' });
  const other = await a.create('contacts', { name: 'Other' });
  const channel = await a.create('channels', {
    name: 'Manual',
    kind: 'manual',
  });
  const user = await a.create('users', { name: 'Owner' });
  const conv = await a.create('conversations', {
    title: 'Case',
    contact_id: contact.id,
    channel_id: channel.id,
    assigned_user_id: user.id,
  });
  await a.request('PATCH', `/api/users/${user.id}`, { active: false });
  assert.equal(
    (
      await a.request('PATCH', `/api/conversations/${conv.id}`, {
        title: 'Preserved',
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await a.request('POST', '/api/conversations', {
        title: 'No',
        contact_id: contact.id,
        channel_id: channel.id,
        assigned_user_id: user.id,
      })
    ).status,
    400,
  );
  const msg = await a.create('messages', {
    conversation_id: conv.id,
    body: '<script>text only</script>',
    direction: 'incoming',
    occurred_at: '2026-09-01T10:00:00Z',
  });
  assert.equal(
    (await a.request('PATCH', `/api/messages/${msg.id}`, { body: 'Corrected' }))
      .status,
    200,
  );
  assert.equal(
    (await a.request('GET', `/api/messages?conversation_id=${conv.id}`)).data
      .total,
    1,
  );
  const p = await a.create('pipelines', {
    name: 'Attention',
    stages: [{ name: 'New' }, { name: 'Working' }],
  });
  const p2 = await a.create('pipelines', {
    name: 'Other',
    stages: [{ name: 'Only' }],
  });
  const ticket = await a.create('tickets', {
    title: 'Work',
    contact_id: contact.id,
    conversation_id: conv.id,
    pipeline_id: p.id,
    stage_id: p.stages[0].id,
  });
  assert.equal(
    (
      await a.request('POST', '/api/tickets', {
        title: 'Duplicate',
        contact_id: contact.id,
        conversation_id: conv.id,
        pipeline_id: p.id,
        stage_id: p.stages[0].id,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await a.request('PATCH', `/api/tickets/${ticket.id}`, {
        contact_id: other.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await a.request('PATCH', `/api/tickets/${ticket.id}`, {
        stage_id: p2.stages[0].id,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await a.request('PATCH', `/api/conversations/${conv.id}`, {
        contact_id: other.id,
      })
    ).status,
    409,
  );
  const reverse = p.stages
    .slice()
    .reverse()
    .map(({ id, name }) => ({ id, name }));
  const reordered = await a.request('PATCH', `/api/pipelines/${p.id}`, {
    stages: reverse,
  });
  assert.equal(reordered.status, 200);
  assert.equal(reordered.data.stages[0].id, reverse[0].id);
  assert.equal(
    (
      await a.request('PATCH', `/api/pipelines/${p.id}`, {
        name: 'Must rollback',
        stages: [{ id: p.stages[1].id, name: 'Working' }],
      })
    ).status,
    409,
  );
  assert.equal(
    (await a.request('GET', `/api/pipelines/${p.id}`)).data.name,
    'Attention',
  );
  assert.equal(
    (await a.request('DELETE', `/api/pipeline_stages/${p2.stages[0].id}`))
      .status,
    409,
  );
  for (const [table, id] of [
    ['contacts', contact.id],
    ['channels', channel.id],
    ['users', user.id],
    ['conversations', conv.id],
    ['pipelines', p.id],
  ])
    assert.equal(
      (await a.request('DELETE', `/api/${table}/${id}`)).status,
      409,
    );
  assert.equal(
    (
      await a.request('PATCH', `/api/tickets/${ticket.id}`, {
        pipeline_id: p2.id,
        stage_id: p2.stages[0].id,
        status: 'closed',
      })
    ).status,
    200,
  );
  assert.equal(
    (await a.request('GET', `/api/conversations/${conv.id}`)).data.status,
    'open',
  );
  await a.request('DELETE', `/api/tickets/${ticket.id}`);
  await a.request('DELETE', `/api/messages/${msg.id}`);
  assert.equal(
    (await a.request('DELETE', `/api/conversations/${conv.id}`)).status,
    200,
  );
  assert.equal(
    (await a.request('DELETE', `/api/pipelines/${p.id}`)).status,
    200,
  );
});
test('Agentes, prompts y tools: asociaciones ordenadas y referencias', async (t) => {
  const a = await start(t);
  await a.login();
  const p1 = await a.create('prompts', {
    name: 'First',
    content: 'Instructions',
  });
  const p2 = await a.create('prompts', {
    name: 'Second',
    content: 'More instructions',
  });
  assert.equal(
    (
      await a.request('POST', '/api/tools', {
        name: 'Invalid',
        kind: 'http',
        description: 'Test',
        input_schema: '[]',
      })
    ).status,
    400,
  );
  const tool = await a.create('tools', {
    name: 'Lookup',
    kind: 'http',
    description: 'Definition only',
    input_schema: '{"type":"object"}',
  });
  const agent = await a.create('ai_agents', {
    name: 'Assistant',
    prompt_ids: [p2.id, p1.id],
    tool_ids: [tool.id],
  });
  assert.deepEqual(agent.prompt_ids, [p2.id, p1.id]);
  assert.equal(
    (await a.request('GET', `/api/ai_agents?prompt_id=${p1.id}`)).data.items[0]
      .id,
    agent.id,
  );
  assert.equal(
    (await a.request('GET', `/api/ai_agents?tool_id=${tool.id}`)).data.total,
    1,
  );
  assert.equal(
    (await a.request('DELETE', `/api/prompts/${p1.id}`)).status,
    409,
  );
  assert.equal(
    (await a.request('DELETE', `/api/tools/${tool.id}`)).status,
    409,
  );
  assert.equal(
    (
      await a.request('PATCH', `/api/ai_agents/${agent.id}`, {
        prompt_ids: [p1.id, p1.id],
      })
    ).status,
    400,
  );
  await a.request('PATCH', `/api/prompts/${p1.id}`, { active: false, expected_version: p1.version });
  assert.equal(
    (
      await a.request('PATCH', `/api/ai_agents/${agent.id}`, {
        prompt_ids: [p1.id, p2.id],
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await a.request('POST', '/api/ai_agents', {
        name: 'Invalid',
        prompt_ids: [p1.id],
      })
    ).status,
    400,
  );
  assert.equal(
    (await a.request('DELETE', `/api/ai_agents/${agent.id}`)).status,
    200,
  );
  assert.equal(
    (await a.request('DELETE', `/api/prompts/${p1.id}`)).status,
    200,
  );
  assert.equal(
    (await a.request('DELETE', `/api/tools/${tool.id}`)).status,
    200,
  );
});

test('Validaciones adicionales: booleanos, stages por API y salud fallida', async (t) => {
  const a = await start(t);
  await a.login();
  assert.equal(
    (await a.request('POST', '/api/users', { name: 'Invalid', active: null }))
      .status,
    400,
  );
  const p = await a.create('pipelines', {
    name: 'Stages API',
    stages: [{ name: 'First' }],
  });
  const stage = await a.create('pipeline_stages', {
    pipeline_id: p.id,
    name: 'Second',
    position: 1,
  });
  assert.equal(
    (
      await a.request('PATCH', `/api/pipeline_stages/${stage.id}`, {
        position: 0,
      })
    ).status,
    200,
  );
  assert.equal(
    (await a.request('GET', `/api/pipelines/${p.id}`)).data.stages[0].id,
    stage.id,
  );
  assert.equal(
    (await a.request('DELETE', `/api/pipeline_stages/${stage.id}`)).status,
    200,
  );
  const originalPrepare = a.db.prepare;
  a.db.prepare = () => {
    throw new Error('simulated SQLite error');
  };
  const health = await a.request('GET', '/api/health');
  assert.equal(health.status, 503);
  assert.deepEqual(health.data, { ok: false });
  a.db.prepare = originalPrepare;
});

test('Bandeja: canal real, filtros combinados, paginación e historial inactivo', async (t) => {
  const a = await start(t);
  await a.login();
  const contact = await a.create('contacts', { name: 'Contacto de prueba' });
  const instagram = await a.create('channels', { name: 'Cuenta WhatsApp', kind: 'instagram', active: true });
  const whatsapp = await a.create('channels', { name: 'Cuenta Instagram', kind: 'whatsapp', active: true });
  for (const channel of [instagram, whatsapp]) {
    for (const status of ['open', 'closed']) {
      await a.create('conversations', { title: 'Consulta compartida', contact_id: contact.id, channel_id: channel.id, status });
    }
  }
  await a.request('PATCH', `/api/channels/${whatsapp.id}`, { active: false });
  const all = await a.request('GET', '/api/conversations?pageSize=1');
  assert.equal(all.data.total, 4);
  assert.equal(all.data.items.length, 1);
  for (const channel of [instagram, whatsapp]) {
    const filtered = await a.request('GET', `/api/conversations?channel_id=${channel.id}&q=Consulta&status=open`);
    assert.equal(filtered.status, 200);
    assert.equal(filtered.data.total, 1);
    assert.equal(filtered.data.items[0].channel_id, channel.id);
    assert.equal(filtered.data.items[0].channel_kind, channel.kind);
    const detail = await a.request('GET', `/api/conversations/${filtered.data.items[0].id}`);
    assert.equal(detail.data.channel_kind, channel.kind);
  }
  const empty = await a.request('GET', '/api/conversations?channel_id=missing');
  assert.equal(empty.data.total, 0);
});
