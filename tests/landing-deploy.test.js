import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink, readlink, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const next = 'c'.repeat(40), old = 'd'.repeat(40);
const worker = await readFile(new URL('../deploy/openfunnel-landing-release.sh', import.meta.url), 'utf8');
async function run(t, mode = 'success') {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'landing-deploy-')));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const root = join(dir, 'public'), state = join(dir, 'state'), bin = join(dir, 'bin');
  await mkdir(join(root, 'releases', old, 'assets'), { recursive: true });
  await mkdir(state); await mkdir(bin);
  await writeFile(join(root, 'releases', old, 'index.html'), '<html>previous</html>');
  await writeFile(join(root, 'releases', old, 'assets', 'old.css'), 'body{}');
  await symlink(join(root, 'releases', old), join(root, 'current'));
  await writeFile(join(state, 'deployed-sha'), old);
  const config = join(dir, 'config');
  await writeFile(config, `DEPLOY_REPOSITORY=student/course\nDEPLOY_BRANCH=main\nLANDING_ORIGIN=https://landing.example.test\nLANDING_ROOT=${root}\nLANDING_STATE_ROOT=${state}\nLANDING_NODE_IMAGE=node@sha256:${'e'.repeat(64)}\n`, { mode: 0o600 });
  const stub = join(bin, 'stub.cjs');
  await writeFile(stub, `
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const command=process.argv[2],args=process.argv.slice(3),mode=process.env.TEST_MODE,root=process.env.TEST_ROOT;
fs.appendFileSync(process.env.TEST_LOG,JSON.stringify([command,...args])+'\\n');
if(command==='stat')console.log('0');
else if(command==='git'){
 if(args.includes('fetch')&&mode==='fetch-fail')process.exit(1);
 if(args.includes('diff'))process.exit(mode==='unchanged'?0:1);
 if(args.includes('rev-parse'))console.log(mode==='stale'?'${old}':'${next}');
 if(args.includes('archive')){const source=path.join(process.env.TEST_STATE,'source');fs.mkdirSync(source);fs.writeFileSync(path.join(source,'package.json'),'{}');process.stdout.write(cp.spawnSync('tar',['-c','-C',source,'.']).stdout);}
}else if(command==='curl'){
 if(args.some(a=>a.includes('api.github.com'))){console.log(JSON.stringify({repository:{full_name:'student/course'},head_repository:{full_name:mode==='fork'?'attacker/fork':'student/course'},head_sha:'${next}',head_branch:'main',path:'.github/workflows/ci.yml',event:mode==='pr'?'pull_request':'push',status:'completed',conclusion:mode==='ci-fail'?'failure':'success'}));}
 else{
  const current=fs.readlinkSync(path.join(root,'current'));
  if(mode==='health-fail'&&current.endsWith('${next}'))process.exit(22);
  const output=args[args.indexOf('-o')+1];fs.copyFileSync(path.join(current,'index.html'),output);
 }
}else if(command==='docker'&&args[0]==='run'){
 if(mode==='build-fail')process.exit(1);
 const mount=args[args.indexOf('--mount')+1];const source=mount.match(/src=([^,]+)/)[1];
 const out=path.join(source,'dist','landing');fs.mkdirSync(path.join(out,'assets'),{recursive:true});fs.writeFileSync(path.join(out,'index.html'),'<html>new</html>');fs.writeFileSync(path.join(out,'assets','new.css'),'body{color:blue}');
 if(mode==='symlink')fs.symlinkSync('/etc/passwd',path.join(out,'leak'));
 if(mode==='hidden')fs.writeFileSync(path.join(out,'.env'),'not-a-real-secret');
}else if(command==='mv'){
 if(args[0]==='-Tf')fs.renameSync(args[1],args[2]);else process.exit(cp.spawnSync('/bin/mv',args).status);
}
`);
  for (const command of ['git','curl','docker','stat','chown','flock','mv']) {
    await writeFile(join(bin,command),`#!/bin/sh\nexec '${process.execPath}' -- '${stub}' '${command}' "$@"\n`,{mode:0o700});
  }
  await writeFile(join(bin,'timeout'),'#!/bin/sh\nshift\nexec "$@"\n',{mode:0o700});
  const script=join(dir,'worker.sh');
  await writeFile(script,worker.replace('export PATH=/usr/sbin:/usr/bin:/sbin:/bin','')
    .replace('$EUID -eq 0','1 -eq 1').replace('/etc/openfunnel/landing-deploy.env',config)
    .replace('/run/lock/openfunnel-deploy.lock',join(dir,'lock')));
  const log=join(dir,'calls');
  const result=spawnSync('bash',[script,next,'123'],{encoding:'utf8',timeout:15000,env:{...process.env,PATH:`${bin}:${process.env.PATH}`,TEST_MODE:mode,TEST_ROOT:root,TEST_STATE:state,TEST_LOG:log}});
  const calls=(await readFile(log,'utf8')).trim().split('\n').map(JSON.parse);
  return {result,calls,current:await readlink(join(root,'current')),root,state};
}
for(const mode of ['fork','pr','ci-fail','stale','fetch-fail','build-fail','symlink','hidden']){
 test(`landing rejects ${mode} and preserves current`,async t=>{
  const x=await run(t,mode);
  assert.equal(x.result.status,{stale:65,'fetch-fail':65,symlink:67,hidden:67}[mode]??1,x.result.stderr);
  assert.ok(x.current.endsWith(old));
  assert.equal(await readFile(join(x.state,'deployed-sha'),'utf8'),old);
 });
}
test('landing switches only static files, retains old assets and limits its builder',async t=>{
 const x=await run(t);assert.equal(x.result.status,0,x.result.stderr);assert.ok(x.current.endsWith(next));
 assert.equal((await readFile(join(x.state,'deployed-sha'),'utf8')).trim(),next);
 assert.equal(await readFile(join(x.current,'assets','old.css'),'utf8'),'body{}');
 const build=x.calls.find(c=>c[0]==='docker'&&c[1]==='run');
 for(const arg of ['--memory','1g','--cpus','1','--read-only','--cap-drop','--pids-limit'])assert.ok(build.includes(arg));
 assert.equal(x.calls.some(c=>c.includes('compose')||c.includes('restart')||c.includes('reload')),false);
});
test('landing rolls back after failed HTTPS validation and reports failure',async t=>{
 const x=await run(t,'health-fail');assert.notEqual(x.result.status,0);assert.ok(x.current.endsWith(old));
 assert.match(x.result.stderr,/Previous landing restored/);
 assert.equal(await readFile(join(x.state,'deployed-sha'),'utf8'),old);
});
test('unchanged landing skips construction and publication',async t=>{
 const x=await run(t,'unchanged');assert.equal(x.result.status,0,x.result.stderr);assert.ok(x.current.endsWith(old));
 assert.equal(x.calls.some(c=>c[0]==='docker'&&c[1]==='run'),false);
});
