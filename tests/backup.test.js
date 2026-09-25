import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const source = await readFile(new URL('../deploy/openfunnel-backup.sh', import.meta.url), 'utf8');

// Execute the real backup flow and SQLite verification against synthetic files.
// Docker and service operations are simulated so no running application is touched.
for (const mode of ['success', 'copy-fail', 'corrupt']) {
  test(`Cloud backup preserves all databases and restarts the API: ${mode}`, async t => {
    const root = await mkdtemp(join(tmpdir(), 'openfunnel-backup-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const bin = join(root, 'bin'), app = join(root, 'app'), data = join(root, 'data'), backups = join(root, 'backups');
    for (const path of [bin, app, backups, join(data, 'cloud', 'workspaces')]) await mkdir(path, { recursive: true });
    await writeFile(join(app, 'RELEASE'), 'synthetic-release');
    for (const path of ['app.sqlite', 'cloud/control.sqlite', 'cloud/workspaces/client.sqlite']) {
      const db = new DatabaseSync(join(data, path));
      db.exec("CREATE TABLE sample(value TEXT); INSERT INTO sample VALUES ('preserved');");
      db.close();
    }
    if (mode === 'corrupt') await writeFile(join(data, 'cloud/control.sqlite'), 'invalid sqlite');
    const log = join(root, 'calls');
    const stub = join(bin, 'docker.cjs');
    await writeFile(stub, `
const fs=require('node:fs'),cp=require('node:child_process');
const args=process.argv.slice(2);
fs.appendFileSync(process.env.TEST_LOG,JSON.stringify(args)+'\\n');
if(args[0]==='compose') {
  if(args.includes('exec'))process.stdout.write('cloud');
  if(args.includes('ps'))process.stdout.write('synthetic-container');
} else if(args[0]==='inspect') process.stdout.write('synthetic-image');
else if(args[0]==='cp') {
  if(process.env.TEST_MODE==='copy-fail')process.exit(1);
  fs.cpSync(process.env.TEST_DATA,args[2],{recursive:true});
} else if(args[0]==='run') {
  const mount=args[args.indexOf('--mount')+1].match(/src=([^,]+)/)[1];
  const input=fs.readFileSync(0,'utf8').replaceAll('/snapshot',mount);
  const result=cp.spawnSync(process.execPath,['--input-type=module','-'],{input,encoding:'utf8'});
  process.stdout.write(result.stdout);process.stderr.write(result.stderr);process.exit(result.status);
}
`);
    await writeFile(join(bin, 'docker'), `#!/bin/sh\nexec '${process.execPath}' -- '${stub}' "$@"\n`, { mode: 0o700 });
    await writeFile(join(bin, 'flock'), '#!/bin/sh\nexit 0\n', { mode: 0o700 });
    const script = join(root, 'backup.sh');
    await writeFile(script, source.replaceAll('/srv/openfunnel-app/current', app)
      .replaceAll('/var/backups/openfunnel', backups).replaceAll('/run/lock/openfunnel-backup.lock', join(root, 'lock')));
    const result = spawnSync('sh', [script], { encoding: 'utf8', timeout: 20000,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_LOG: log, TEST_DATA: data, TEST_MODE: mode } });
    const rawCalls = await readFile(log, 'utf8').catch(() => { throw new Error(result.stdout + result.stderr); });
    const calls = rawCalls.trim().split('\n').map(JSON.parse);
    const stopped = calls.findIndex(x => x.includes('stop'));
    const copied = calls.findIndex(x => x[0] === 'cp');
    const restarted = calls.findIndex(x => x.includes('start'));
    assert.ok(stopped >= 0 && copied > stopped && restarted > copied);
    assert.equal(calls.some(x => x.includes('down') || x.includes('--volumes')), false);
    const archives = (await readdir(backups)).filter(x => x.endsWith('.tar.gz'));
    if (mode === 'success') {
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Verified cloud backup databases: 3/);
      assert.equal(archives.length, 1);
      const list = spawnSync('tar', ['-tzf', join(backups, archives[0])], { encoding: 'utf8' });
      for (const path of ['app.sqlite', 'cloud/control.sqlite', 'cloud/workspaces/client.sqlite']) assert.ok(list.stdout.includes(path));
    } else {
      assert.notEqual(result.status, 0);
      assert.equal(archives.length, 0);
    }
    assert.equal((await readdir(backups)).some(x => x.startsWith('.cloud-')), false);
  });
}
