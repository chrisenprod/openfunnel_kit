import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHmac, randomBytes } from 'node:crypto';
import { mkdtemp, writeFile, readdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';

const exec = promisify(execFile);
const root = process.cwd();
assert.equal(root, resolve(import.meta.dirname, '..'), 'Run from the repository root');
const directory = await mkdtemp(join(tmpdir(), 'openfunnel-docker-'));
const project = `openfunnel-test-${randomBytes(6).toString('hex')}`;
const keep = process.argv.includes('--keep');
const cliEnv = { ...process.env };
// Keep Docker connectivity settings, but never inherit application settings.
for (const key of Object.keys(cliEnv))
  if (/^COMPOSE_|^DOCKER_(APP_|ADMIN_|HTTP_|BETTER_|ZERNIO_|PUBLIC_|LLM_)/.test(key)) delete cliEnv[key];
const run = async (args, { logOutput = false, combineOutput = false, ...options } = {}) => {
  const operation = args[0] === 'compose' ? `compose ${args[5]}` : args[0];
  console.log(`Docker command: ${operation}`);
  try {
    const result = exec('docker', args, { cwd: root, env: cliEnv, timeout: 240000, maxBuffer: 16 * 1024 * 1024, ...options });
    // Only builds opt in: configuration and runtime inspection can contain secrets.
    if (logOutput) {
      result.child.stdout.pipe(process.stdout);
      result.child.stderr.pipe(process.stderr);
    }
    const output = await result;
    return (output.stdout + (combineOutput ? output.stderr : '')).trim();
  } catch (error) {
    // Arguments/config may contain synthetic credentials: do not echo them.
    throw Object.assign(new Error(`Docker command failed (${operation}, exit ${error.code}, signal ${error.signal || 'none'}). ${error.stderr?.slice(-1800) || ''}`), { code: error.code, killed: error.killed });
  }
};
const envFile = join(directory, 'test.env');
const compose = (...args) => run(['compose', '--env-file', envFile, '-p', project, ...args]);
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const password = randomBytes(24).toString('hex');
const secret = randomBytes(32).toString('hex');
const config = `DOCKER_HTTP_PORT=${port}\nDOCKER_APP_ORIGIN=${base}\nDOCKER_ADMIN_USER=container-test\nDOCKER_ADMIN_PASS=${password}\nDOCKER_ZERNIO_WEBHOOK_SECRET=${secret}\n`;
await writeFile(envFile, config, { mode: 0o600 });
let cookie = '', success = false;
const sentinels = [join(root, `.env.${project}`), join(root, 'backend', `${project}.sqlite`)];
async function request(path, method = 'GET', body, headers = {}) {
  return fetch(base + path, {
    method, signal: AbortSignal.timeout(10000),
    headers: { Origin: base, 'Content-Type': 'application/json', Cookie: cookie, ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body) }),
  });
}
async function login() {
  const response = await request('/api/login', 'POST', { username: 'container-test', password });
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie();
  assert(cookies.some(c => /httponly/i.test(c) && /samesite=lax/i.test(c)));
  cookie = cookies.map(c => c.split(';')[0]).join('; ');
}
async function health() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try { const r = await request('/api/health'); if (r.ok && (await r.json()).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Health did not recover through proxy');
}
const sql = query => compose('exec', '-T', 'api', 'node', '--input-type=module', '-e',
  `import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync('/app/data/app.sqlite',{readOnly:true}); console.log(JSON.stringify(db.prepare(${JSON.stringify(query)}).all())); db.close();`);
try {
  console.log('Docker: checking isolated configuration and building images…');
  const missing = join(directory, 'missing.env');
  await writeFile(missing, config.replace(/^DOCKER_ADMIN_PASS=.*\n/m, ''), { mode: 0o600 });
  await assert.rejects(run(['compose', '--env-file', missing, '-p', project, 'config', '--quiet']));
  const resolved = JSON.parse(await compose('config', '--format', 'json'));
  assert.equal(resolved.services.api.environment.ZERNIO_API_KEY, '');
  assert.equal(resolved.services.api.environment.LLM_API_KEY, '');
  assert.equal(resolved.services.api.environment.DATABASE_PATH, '/app/data/app.sqlite');
  assert.equal(resolved.services.api.ports, undefined);
  assert.equal(resolved.services.web.ports[0].host_ip, '127.0.0.1');
  await run(['compose', '--env-file', envFile, '-p', project, 'build'], {
    logOutput: true, timeout: 10 * 60 * 1000,
  });

  console.log('Docker: inspecting allowed build context with harmless sentinels…');
  for (const path of sentinels) await writeFile(path, 'not-a-secret-context-sentinel', { flag: 'wx' });
  // The alternate Dockerfile shares the root .dockerignore and exports only context.
  const contextFile = join(directory, 'Context.Dockerfile');
  const exported = join(directory, 'exported');
  await writeFile(contextFile, 'FROM scratch\nCOPY . /context\n');
  await run(['build', '--file', contextFile, '--output', `type=local,dest=${exported}`, '.']);
  const paths = await readdir(join(exported, 'context'), { recursive: true });
  assert(!paths.some(p => /(^|\/)(\.env|\.git|\.codex|node_modules|data|backups|dist)(\/|\.|$)|\.sqlite/.test(p)), 'Private/build files excluded');
  assert(paths.includes('backend/server.js'));
  assert(paths.includes('docs/site/index.md'));
  assert(!paths.some(p => p.startsWith('docs/qa/') || p.startsWith('docs/deploy/') || p.startsWith('docs/referencias-visuales/')));
  assert(paths.includes('frontend/src/main.jsx'));
  assert(paths.includes('landing/assets/images/openfunnel-mark.webp'));
  for (const path of sentinels) await rm(path);

  console.log('Docker: starting services and checking proxy/authentication…');
  await compose('up', '-d', '--wait', '--wait-timeout', '90');
  await health();
  for (const service of ['api', 'web']) {
    assert.notEqual(await compose('exec', '-T', service, 'id', '-u'), '0');
    const [container] = JSON.parse(await run(['inspect', await compose('ps', '-q', service)]));
    assert.equal(container.State.Health.Status, 'healthy');
    assert.equal(container.HostConfig.ReadonlyRootfs, true);
    assert(container.HostConfig.CapDrop.includes('ALL'));
    if (service === 'api') assert.equal(Object.keys(container.HostConfig.PortBindings || {}).length, 0);
  }
  const page = await request('/');
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.match(page.headers.get('permissions-policy'), /camera=\(\)/);
  const html = await page.text();
  assert(html.includes('<div id="root">'));
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g))
    assert.equal((await request(match[1])).status, 200);
  const cssPath = [...html.matchAll(/href="(\/assets\/[^"]+\.css)"/g)][0][1];
  const css = await (await request(cssPath)).text();
  for (const [, url] of css.matchAll(/url\(["']?([^)'"]+)["']?\)/g)) {
    if (url.startsWith('data:')) continue;
    const asset = new URL(url, base + cssPath);
    assert.equal((await request(asset.pathname)).status, 200, `CSS asset ${url}`);
  }
  for (const path of ['/.env', '/.git/config', '/backend/server.js', '/data/app.sqlite', '/missing.js'])
    assert.equal((await request(path)).status, 404, path);
  for (const path of ['/api', '/api/no-such-route']) {
    const response = await request(path); assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type'), /application\/json/);
  }
  assert.equal((await request('/api/contacts')).status, 401);
  const docsPage = await request('/docs/');
  assert.equal(docsPage.status, 200);
  assert.match(await docsPage.text(), /Un motor conversacional abierto/);
  assert.equal((await request('/docs/site.js')).status, 200);
  await login();
  const agent = await (await request('/api/ai_agents', 'POST', { name: 'Document test' })).json();
  let document;
  for (const extension of ['doc', 'docx', 'pdf']) {
    const original = await readFile(join(root, 'tests/fixtures/documents', `business.${extension}`));
    const uploaded = await request(`/api/ai_agents/${agent.id}/documents`, 'POST', original,
      { 'Content-Type': 'application/octet-stream', 'X-Filename': `business.${extension}` });
    assert.equal(uploaded.status, 201);
    document = await uploaded.json(); assert.equal(document.status, 'ready', document.error);
    const downloaded = await request(`/api/ai_agents/${agent.id}/documents/${document.id}/download`);
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), original);
  }
  const large = Buffer.from('Horario de atención.\n' + ' '.repeat(2 * 1024 * 1024));
  const largeResponse = await request(`/api/ai_agents/${agent.id}/documents`, 'POST', large,
    { 'Content-Type': 'application/octet-stream', 'X-Filename': 'larger-than-1MiB.txt' });
  assert.equal(largeResponse.status, 201);
  assert.equal((await largeResponse.json()).status, 'ready');

  assert.equal((await request('/api/contacts', 'POST', { name: 'Wrong origin' }, { Origin: 'https://invalid.example' })).status, 403);
  const created = await request('/api/contacts', 'POST', { name: 'Container persistence test' });
  assert.equal(created.status, 201);
  const contact = await created.json();
  const event = JSON.stringify({ id: 'container-event', event: 'comment.received', message: 'x'.repeat(150000) });
  const sign = value => createHmac('sha256', secret).update(value).digest('hex');
  const webhook = '/api/integrations/zernio/webhook';
  assert.equal((await request(webhook, 'POST', event, { 'x-zernio-signature': '0'.repeat(64) })).status, 401);
  for (let i = 0; i < 2; i++) assert.equal((await request(webhook, 'POST', event, { 'x-zernio-signature': sign(event) })).status, 200);
  assert.equal(JSON.parse(await sql('SELECT count(*) AS total FROM webhook_events'))[0].total, 1);
  assert.equal((await request(webhook, 'POST', 'x'.repeat(1024 * 1024 + 1), { 'x-zernio-signature': sign('x') })).status, 413);
  assert.equal((await request('/api/contacts', 'POST', { name: 'x'.repeat(140000) })).status, 413);
  await request('/api/logout', 'POST', {});
  assert.equal((await request('/api/contacts')).status, 401);

  console.log('Docker: checking shutdown, API outage and data persistence…');
  const firstApi = await compose('ps', '-q', 'api');
  await compose('stop', 'api');
  const [stopped] = JSON.parse(await run(['inspect', firstApi]));
  assert.equal(stopped.State.ExitCode, 0, 'Graceful SIGTERM');
  const logMarker = 'do-not-log-query-token';
  assert([502, 504].includes((await request(`/api/health?token=${logMarker}`)).status), 'Proxy reports unavailable API');
  assert(!(await compose('logs', '--no-color', 'web')).includes(logMarker), 'Proxy logs omit query tokens even during upstream failure');
  assert.equal((await request('/')).status, 200, 'UI alone is not API health');
  await compose('up', '-d', '--wait', '--wait-timeout', '90', '--force-recreate', 'api');
  assert.notEqual(await compose('ps', '-q', 'api'), firstApi);
  await health(); await login();
  assert.equal((await (await request(`/api/contacts/${contact.id}`)).json()).name, contact.name);
  await compose('down');
  await compose('up', '-d', '--wait', '--wait-timeout', '90');
  await health(); await login();
  assert.equal((await request(`/api/ai_agents/${agent.id}/documents/${document.id}/download`)).status, 200);
  assert.equal((await (await request(`/api/contacts/${contact.id}`)).json()).id, contact.id);
  assert.deepEqual(JSON.parse(await sql('PRAGMA integrity_check')), [{ integrity_check: 'ok' }]);
  assert.deepEqual(JSON.parse(await sql('PRAGMA foreign_key_check')), []);

  // Stop the sole worker before checking a read-only mount of this test volume.
  await compose('stop', 'api');
  const readonlyName = `${project}-readonly`;
  const runtimeEnv = join(directory, 'readonly.env');
  await writeFile(runtimeEnv, Object.entries(resolved.services.api.environment)
    .map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
  try {
    // An explicit engine mount avoids version-dependent Compose run volume merging.
    await run(['run', '-d', '--name', readonlyName, '--network', 'none', '--init',
      '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
      '--mount', `type=volume,source=${project}_app-data,target=/app/data,readonly`,
      '--env-file', runtimeEnv, stopped.Config.Image]);
    const [readonly] = JSON.parse(await run(['inspect', readonlyName]));
    assert.equal(readonly.Mounts.find(m => m.Destination === '/app/data').RW, false);
    assert.equal(await run(['wait', readonlyName], { timeout: 30000 }), '1',
      'The API must fail to start with a read-only database');
    const failure = await run(['logs', readonlyName], { combineOutput: true });
    assert.match(failure, /ERR_SQLITE_ERROR/);
    // WAL initialization can report CANTOPEN when it cannot create its sidecars.
    assert.match(failure, /readonly database|unable to open database file/);
  } finally {
    await run(['rm', '--force', readonlyName]).catch(() => {});
  }
  await compose('up', '-d', '--wait', '--wait-timeout', '90');
  await health();
  assert.equal((await compose('ps', '-q', 'api')).split('\n').length, 1);
  success = true;
  console.log(`Docker: all checks passed. ${base}`);
  if (keep) console.log(`Kept synthetic installation: project=${project}, envFile=${envFile}`);
} finally {
  for (const path of sentinels) await rm(path, { force: true });
  if (!keep || !success) {
    // This project name and volume are generated by this script, never user data.
    await compose('down', '--volumes', '--remove-orphans').catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
}
