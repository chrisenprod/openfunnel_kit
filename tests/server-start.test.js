import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const [host, cloud] of [[undefined, false], ['0.0.0.0', false], [undefined, true]]) {
  test(`Server startup: ${host || 'default loopback'}${cloud ? ' cloud' : ''} and graceful SIGTERM`, { timeout: 15000 }, async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'openfunnel-start-'));
    const child = spawn(process.execPath, ['backend/server.js'], {
      env: {
        PATH: process.env.PATH,
        PORT: '0',
        DATABASE_PATH: join(directory, 'test.sqlite'),
        ...(cloud ? { APP_MODE: 'cloud', CLOUD_DATA_DIR: join(directory, 'cloud'), CLOUD_OWNER_EMAIL: 'owner@example.com', BETTER_AUTH_SECRET: 's'.repeat(48), PROVIDER_ENCRYPTION_KEY: 'ab'.repeat(32), RESEND_API_KEY: 'synthetic-unused', RESEND_FROM: 'test@example.com' } : {}),
        ...(host ? { HOST: host } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const exited = once(child, 'exit');
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.resume();
    t.after(async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await exited;
      await rm(directory, { recursive: true, force: true });
    });
    const deadline = Date.now() + 10000;
    while (!output.includes('API:') && Date.now() < deadline && child.exitCode === null)
      await new Promise(resolve => setTimeout(resolve, 30));
    const match = output.match(/API: http:\/\/([^:]+):(\d+)/);
    assert.ok(match, 'Server announced its listener');
    assert.equal(match[1], host || '127.0.0.1');
    const response = await fetch(`http://127.0.0.1:${match[2]}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    if (cloud) assert.equal((await (await fetch(`http://127.0.0.1:${match[2]}/api/public-config`)).json()).mode, 'cloud');
    child.kill('SIGTERM');
    assert.deepEqual(await exited, [0, null]);
  });
}
