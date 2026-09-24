import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, readlink, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const newSha = 'a'.repeat(40);
const oldSha = 'b'.repeat(40);
const worker = await readFile(new URL('../deploy/openfunnel-release.sh', import.meta.url), 'utf8');

// Run the actual shell control flow in a private directory. Only external systems
// (Docker, GitHub, systemd and the host lock) are replaced; no live data or network.
async function fixture(t, mode = 'success') {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'openfunnel-deploy-')));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const base = join(dir, 'app');
  const bin = join(dir, 'bin');
  await mkdir(bin);
  for (const sha of [newSha, oldSha]) {
    const release = join(base, 'releases', sha);
    await mkdir(join(release, 'backend', 'migrations'), { recursive: true });
    await writeFile(join(release, 'RELEASE'), `${sha}\n`);
    await writeFile(join(release, 'backend', 'migrate.js'), '// unchanged\n');
    await writeFile(join(release, 'backend', 'migrations', '001.sql'), 'SELECT 1;\n');
  }
  if (mode === 'migration') await writeFile(join(base, 'releases', newSha, 'backend', 'migrations', '002.sql'), 'ALTER TABLE x;');
  await symlink(join(base, 'releases', oldSha), join(base, 'current'));
  const stub = join(bin, 'stub.cjs');
  await writeFile(stub, `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const command = process.argv[2];
const args = process.argv.slice(3);
const mode = process.env.TEST_MODE;
const base = process.env.TEST_BASE;
fs.appendFileSync(process.env.TEST_LOG, JSON.stringify([command,...args])+'\\n');
if (command === 'git') {
  if (args.includes('diff') && mode !== 'unchanged') process.exit(1);
  if (args.includes('rev-parse')) console.log(mode === 'stale' ? '${oldSha}' : '${newSha}');
} else if (command === 'flock') {
  if (mode === 'locked') process.exit(1);
} else if (command === 'systemctl') {
  if (mode === 'backup-fail') process.exit(1);
  if (args.includes('show')) console.log('success');
} else if (command === 'docker') {
  const isNew = process.env.OPENFUNNEL_RELEASE === '${newSha}';
  if (args.includes('build') && mode === 'build-fail') process.exit(1);
  if (args.includes('up') && (mode === 'recovery-fail' || (mode === 'start-fail' && isNew))) process.exit(1);
} else if (command === 'curl') {
  if (args.some(x=>x.includes('api.github.com'))) {
    if (mode === 'github-fail') process.exit(22);
    console.log(JSON.stringify({repository:{full_name:'chrisenprod/openfunnel_kit'},head_repository:{full_name:mode==='fork'?'attacker/fork':'chrisenprod/openfunnel_kit'},head_sha:mode==='wrong-sha'?'${oldSha}':'${newSha}',head_branch:mode==='branch'?'feature':'main',path:mode==='workflow'?'.github/workflows/other.yml':'.github/workflows/ci.yml',event:mode==='pr'?'pull_request':'push',status:'completed',conclusion:mode==='ci-fail'?'failure':'success'}));
  } else {
    const isNew = fs.readlinkSync(path.join(base,'current')).endsWith('${newSha}');
    if (mode === 'health-fail' && isNew) process.exit(22);
    if (!args.includes('/dev/null')) console.log(JSON.stringify({ok:true}));
  }
} else if (command === 'mv') {
  // GNU mv -T replaces the symlink itself; emulate that behavior on macOS.
  if (args[0] === '-Tf') fs.renameSync(args[1], args[2]);
  else process.exit(cp.spawnSync('/bin/mv', args).status);
}
`, { mode: 0o700 });
  for (const command of ['git', 'flock', 'systemctl', 'docker', 'curl', 'mv']) {
    await writeFile(join(bin, command), `#!/bin/sh\nexec '${process.execPath}' -- '${stub}' '${command}' \"$@\"\n`, { mode: 0o700 });
  }
  await writeFile(join(bin, 'timeout'), '#!/bin/sh\nshift\nexec "$@"\n', { mode: 0o700 });
  let source = worker.replace('export PATH=/usr/sbin:/usr/bin:/sbin:/bin', '')
    .replace('$EUID -eq 0', '1 -eq 1')
    .replace('/srv/openfunnel-app', base)
    .replace('/run/lock/openfunnel-deploy.lock', join(dir, 'lock'));
  const script = join(dir, 'release.sh');
  await writeFile(script, source);
  const log = join(dir, 'calls');
  const result = spawnSync('bash', [script, newSha, '12345'], {
    encoding: 'utf8', timeout: 15000,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_BASE: base, TEST_MODE: mode, TEST_LOG: log },
  });
  const calls = (await readFile(log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  return { result, calls, current: await readlink(join(base, 'current')) };
}

for (const mode of ['fork', 'wrong-sha', 'branch', 'workflow', 'pr', 'ci-fail', 'github-fail', 'stale', 'locked', 'migration', 'build-fail', 'backup-fail']) {
  test(`deployment rejects ${mode} before replacing the running app`, async t => {
    const { result, calls, current } = await fixture(t, mode);
    assert.equal(result.status, { stale: 65, locked: 75, migration: 67, 'github-fail': 22 }[mode] ?? 1, result.stdout + result.stderr);
    assert.ok(current.endsWith(oldSha));
    assert.equal(calls.some(call => call[0] === 'docker' && call.includes('up')), false);
  });
}
for (const mode of ['start-fail', 'health-fail']) {
  test(`deployment restores previous code after ${mode}`, async t => {
    const { result, calls, current } = await fixture(t, mode);
    assert.notEqual(result.status, 0);
    assert.ok(current.endsWith(oldSha));
    assert.match(result.stderr, /Previous code restored; existing data preserved/);
    const replacements = calls.filter(call => call[0] === 'docker' && call.includes('up'));
    assert.equal(replacements.length, 2);
    assert.ok(replacements[0].some(arg => arg.includes(newSha)));
    assert.ok(replacements[1].some(arg => arg.includes(oldSha)));
    assert.equal(calls.some(call => call.includes('down') || call.includes('--volumes')), false);
  });
}
test('deployment reports a failed recovery instead of claiming success', async t => {
  const { result } = await fixture(t, 'recovery-fail');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RECOVERY FAILED/);
});
test('deployment backs up before replacement and checks internal and HTTPS health', async t => {
  const { result, calls, current } = await fixture(t);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(current.endsWith(newSha));
  const backup = calls.findIndex(call => call[0] === 'systemctl' && call.includes('start'));
  const replacement = calls.findIndex(call => call[0] === 'docker' && call.includes('up'));
  assert.ok(backup >= 0 && replacement > backup);
  assert.equal(calls.filter(call => call[0] === 'docker' && call.includes('up')).length, 1);
  for (const endpoint of ['http://127.0.0.1:8180/api/health', 'https://app.openfunnel.mocca.cl/api/health']) {
    assert.ok(calls.some(call => call[0] === 'curl' && call.includes(endpoint)));
  }
});
test('forced SSH command rejects shell, scp and command injection', () => {
  for (const command of ['', 'bash', 'scp -t /tmp/file', `deploy ${newSha} 123; id`, `deploy ${newSha} 123\nid`, `deploy --help 123`]) {
    const result = spawnSync('bash', [resolve('deploy/openfunnel-deploy-ssh.sh')], {
      encoding: 'utf8', env: { ...process.env, SSH_ORIGINAL_COMMAND: command },
    });
    assert.equal(result.status, 64, command);
  }
});

 test('app preserves containers for changes outside its build inputs', async t => {
  const { result, calls, current } = await fixture(t, 'unchanged');
  assert.equal(result.status, 0, result.stderr);
  assert.ok(current.endsWith(oldSha));
  assert.equal(calls.some(call => call[0] === 'docker' || call[0] === 'systemctl'), false);
  const diff = calls.find(call => call[0] === 'git' && call.includes('diff'));
  assert.ok(diff.includes('landing/brand.css'));
  assert.ok(diff.includes('landing/assets/images/openfunnel-mark.webp'));
  assert.equal(diff.includes('landing'), false);
});
