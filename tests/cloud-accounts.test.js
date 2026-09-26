import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createHmac } from 'node:crypto';
import { openDatabase } from '../backend/db.js';
import { save } from '../backend/resources.js';
import { createApp } from '../backend/server.js';

const password = 'synthetic-password-123';
const origin = 'http://localhost:5173';
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(),'openfunnel-cloud-'));
  const emails = [];
  const providerCalls = [];
  const env = {APP_MODE:'cloud',CLOUD_DATA_DIR:dir, APP_ORIGIN:origin, CLOUD_OWNER_EMAIL:'owner@example.com', BETTER_AUTH_SECRET:'a'.repeat(48), PROVIDER_ENCRYPTION_KEY:'ab'.repeat(32), RESEND_API_KEY:'test-only', RESEND_FROM:'test@example.com', PUBLIC_BASE_URL:'https://app.example.com'};
  const app = await createApp({env,integrationOptions:{fetch:async (...args)=>{providerCalls.push(args);throw new Error('Unexpected provider request');},llmClient:{chat:{completions:{create:async (...args)=>{providerCalls.push(args);throw new Error('Unexpected LLM request');}}}},mailFetch:async(url,options)=>{emails.push(JSON.parse(options.body));return Response.json({id:'test'});}}});
  app.server.listen(0,'127.0.0.1'); await once(app.server,'listening');
  t.after(async()=>{await app.integrations.stop(); await new Promise(resolve=>app.server.close(resolve)); app.db.close(); await rm(dir,{recursive:true,force:true});});
  const base = `http://127.0.0.1:${app.server.address().port}`;
  async function request(path,method='GET',body,cookie,headers={}) {
    const response=await fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{cookie}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,body:await response.json(),cookie:response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ')};
  }
  const token = email => new URL(emails.findLast(m=>m.to.includes(email)).text.match(/http[^\s]+/)[0]).hash.split('token=')[1];
  async function signup(email) {
    assert.equal((await request('/api/auth/register','POST',{name:'Test',email,password})).status,200);
    const raw=decodeURIComponent(token(email));
    assert.equal((await request('/api/auth/verify','POST',{token:raw})).status,200);
    const login=await request('/api/login','POST',{email,password});
    assert.equal(login.status,200,JSON.stringify(login.body));
    return login;
  }
  return {app,request,signup,token,emails,env,dir,base,providerCalls};
}

test('API keys provision agents and assign paused channels without login or external effects across tenants', async t => {
  const { request, signup, dir, providerCalls } = await fixture(t);
  const a = await signup('a@example.com'), b = await signup('b@example.com');
  const scopes = ['resources:read', 'prompts:write', 'agents:write', 'channels:assign'];
  const makeKey = async (user, granted = scopes) => {
    const result = await request('/api/api-keys', 'POST', { name: 'Provisioning', scopes: granted, expires_in_days: 1 }, user.cookie);
    assert.equal(result.status, 201);
    return { key: result.body, headers: { Authorization: `Bearer ${result.body.secret}`, 'X-OpenFunnel-Workspace': user.body.user.workspaceId } };
  };
  const ka = await makeKey(a), kb = await makeKey(b), read = await makeKey(a, ['resources:read']);
  const api = (path, method = 'GET', body, headers = ka.headers) => request(`/api${path}`, method, body, null, headers);
  const tools = await api('/tools');
  assert.equal(tools.status, 200);
  assert.deepEqual(tools.body.items.map(row => row.kind).sort(), ['get_contact', 'get_ticket', 'handoff_to_human']);
  const tool = tools.body.items.find(row => row.kind === 'handoff_to_human');
  const prompt = await api('/prompts', 'POST', { name: 'Instructions', content: 'Deriva a una persona si te lo piden.' });
  assert.equal(prompt.status, 201, JSON.stringify(prompt.body));
  assert.equal(prompt.body.version, 1);
  const agent = await api('/ai_agents', 'POST', { name: 'Assistant' });
  assert.equal(agent.status, 201);
  const updated = await api(`/ai_agents/${agent.body.id}`, 'PATCH', { prompt_ids: [prompt.body.id], tool_ids: [tool.id] });
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.body.prompt_ids, [prompt.body.id]);
  assert.deepEqual(updated.body.tool_ids, [tool.id]);
  assert.equal((await api('/ai_agents', 'POST', { name: 'Combined', prompt_ids: [prompt.body.id], tool_ids: [tool.id] })).status, 201);
  const history = await api(`/prompts/${prompt.body.id}/versions`);
  assert.equal(history.body.items[0].actor, `api_key:${ka.key.id}`);

  const db = openDatabase(join(dir, 'workspaces', `${a.body.user.workspaceId}.sqlite`));
  t.after(() => db.close());
  const channel = save(db, 'channels', { name: 'Synthetic connected channel', kind: 'instagram' });
  const contact = save(db, 'contacts', { name: 'Synthetic contact' });
  const conversation = save(db, 'conversations', { title: 'Synthetic thread', contact_id: contact.id, channel_id: channel.id });
  db.prepare("UPDATE channels SET provider='zernio',external_account_id='synthetic',automation_enabled=1 WHERE id=?").run(channel.id);
  const message = save(db, 'messages', { conversation_id: conversation.id, body: 'Synthetic', direction: 'incoming', occurred_at: new Date().toISOString() });
  db.prepare("INSERT INTO agent_runs (id,conversation_id,trigger_message_id,revision,status,available_at,created_at,updated_at) VALUES ('pending',?,?,0,'pending',?,?,?)").run(conversation.id, message.id, ...Array(3).fill(new Date().toISOString()));
  for (const body of [{ agent_id: agent.body.id, enabled: true }, {}, null, [], { agent_id: 12 }])
    assert.equal((await api(`/channels/${channel.id}/agent`, 'PUT', body)).status, 400);
  assert.equal(db.prepare('SELECT automation_enabled FROM channels WHERE id=?').get(channel.id).automation_enabled, 1);
  assert.equal((await api(`/channels/${channel.id}/agent`, 'PUT', { agent_id: agent.body.id })).status, 200);
  const assigned = await api(`/channels/${channel.id}`);
  assert.equal(assigned.body.default_ai_agent_id, agent.body.id);
  assert.equal(assigned.body.automation_enabled, 0);
  assert.equal(db.prepare("SELECT status FROM agent_runs WHERE id='pending'").get().status, 'cancelled');

  for (const [path, method, body] of [
    ['/prompts', 'POST', { name: 'Denied', content: 'No' }],
    ['/ai_agents', 'POST', { name: 'Denied' }],
    [`/ai_agents/${agent.body.id}`, 'PATCH', { name: 'Denied' }],
    [`/channels/${channel.id}/agent`, 'PUT', { agent_id: agent.body.id }],
  ]) assert.equal((await api(path, method, body, read.headers)).status, 403, path);
  for (const [path, method, body] of [
    ['/api-keys', 'POST', {}], ['/connections/llm', 'PUT', {}],
    [`/channels/${channel.id}/automation`, 'POST', { enabled: true, agent_id: agent.body.id }],
    [`/channels/${channel.id}`, 'PATCH', { default_ai_agent_id: agent.body.id }],
    [`/conversations/${conversation.id}/send`, 'POST', { body: 'No' }],
    [`/ai_agents/${agent.body.id}`, 'DELETE'], ['/tools', 'POST', {}],
    [`/tools/${tool.id}`, 'PATCH', { active: false }], [`/tools/${tool.id}`, 'DELETE'],
  ]) assert.equal((await api(path, method, body)).status, 403, path);
  const other = await api('/ai_agents', 'POST', { name: 'Other' }, kb.headers);
  assert.equal((await api('/ai_agents', 'POST', { name: 'Cross prompt', prompt_ids: [prompt.body.id] }, kb.headers)).status, 400);
  assert.equal((await api(`/ai_agents/${other.body.id}`, 'PATCH', { name: 'Cross agent' })).status, 404);
  assert.equal((await api(`/channels/${channel.id}/agent`, 'PUT', { agent_id: other.body.id })).status, 404);
  assert.equal((await api(`/channels/${channel.id}/agent`, 'PUT', { agent_id: other.body.id }, kb.headers)).status, 404);
  assert.equal((await api('/tools', 'GET', undefined, { ...ka.headers, 'X-OpenFunnel-Workspace': b.body.user.workspaceId })).status, 401);
  assert.equal((await request(`/api/api-keys/${ka.key.id}/revoke`, 'POST', {}, a.cookie)).status, 200);
  assert.equal((await api('/ai_agents', 'POST', { name: 'Revoked' })).status, 401);
  assert.deepEqual(providerCalls, []);
});

test('Cloud verified registration, instance owner, tenant isolation, keys and suspension',async t=>{
  const {app,request,signup,token}=await fixture(t);
  assert.deepEqual((await request('/api/public-config')).body,{mode:'cloud'});
  assert.equal((await request('/api/auth/sign-up/email','POST',{})).status,404);
  assert.equal((await request('/api/auth/register','POST',{name:'Bad',email:'bad@example.com',password,role:'superadmin'})).status,400);
  const a=await signup('a@example.com');
  const owner=await signup('owner@example.com');
  const b=await signup('b@example.com');
  assert.equal(owner.body.user.role,'superadmin');
  assert.equal(a.body.user.role,'client');
  assert.equal((await request('/api/auth/verify','POST',{token:decodeURIComponent(token('a@example.com'))})).status,400);
  const contact=await request('/api/contacts','POST',{name:'Private A'},a.cookie);
  assert.equal(contact.status,201,JSON.stringify(contact.body));
  const id=contact.body.id;
  assert.equal((await request(`/api/contacts/${id}`,'GET',undefined,b.cookie)).status,404);
  assert.equal((await request(`/api/contacts/${id}`,'PATCH',{name:'Stolen'},b.cookie)).status,404);
  assert.equal((await request(`/api/contacts/${id}`,'DELETE',undefined,owner.cookie)).status,404);
  assert.equal((await request('/api/contacts','GET',undefined,b.cookie,{'x-openfunnel-workspace':a.body.user.workspaceId})).body.total,0);
  assert.equal((await request('/api/admin/accounts','GET',undefined,a.cookie)).status,403);
  assert.equal((await request('/api/connections/zernio','PUT',{expected_version:0,apiKey:'a-private-key'},a.cookie)).status,200);
  assert.equal((await request('/api/connections/zernio','GET',undefined,b.cookie)).body.hasKey,false);
  assert.ok(!JSON.stringify((await request('/api/connections/zernio','GET',undefined,a.cookie)).body).includes('a-private-key'));
  const createdKey=await request('/api/api-keys','POST',{name:'read',scopes:['resources:read'],expires_in_days:30},a.cookie);
  assert.equal(createdKey.status,201,JSON.stringify(createdKey.body));
  const secret=createdKey.body.key || createdKey.body.secret;
  const headers={Authorization:`Bearer ${secret}`,'x-openfunnel-workspace':a.body.user.workspaceId};
  assert.equal((await request('/api/contacts','GET',undefined,null,headers)).status,200);
  assert.equal((await request('/api/contacts','GET',undefined,null,{...headers,'x-openfunnel-workspace':b.body.user.workspaceId})).status,401);
  assert.equal((await request('/api/connections/zernio','GET',undefined,null,headers)).status,403);
  const accounts=(await request('/api/admin/accounts','GET',undefined,owner.cookie)).body.items;
  const aId=accounts.find(row=>row.email==='a@example.com').id;
  const ownerId=accounts.find(row=>row.role==='superadmin').id;
  assert.equal((await request(`/api/admin/accounts/${ownerId}`,'PATCH',{status:'suspended'},owner.cookie)).status,409);
  assert.equal((await request(`/api/admin/accounts/${aId}`,'PATCH',{status:'suspended'},owner.cookie)).status,200);
  assert.equal((await request('/api/contacts','GET',undefined,a.cookie)).status,401);
  assert.equal((await request('/api/contacts','GET',undefined,null,headers)).status,401);
  assert.equal((await request('/api/login','POST',{email:'a@example.com',password})).status,403);
  assert.equal((await request('/api/contacts','GET',undefined,b.cookie)).status,200);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM cloud_audit').get().n,1);
});

test('Unverified access is denied and reset revokes sessions without leaking accounts',async t=>{
  const {app,request,signup,token,emails}=await fixture(t);
  assert.equal((await request('/api/auth/register','POST',{name:'Pending',email:'pending@example.com',password})).status,200);
  assert.equal((await request('/api/login','POST',{email:'pending@example.com',password})).status,401);
  assert.equal((await request('/api/auth/resend','POST',{email:'pending@example.com'})).status,429);
  const a=await signup('a@example.com');
  app.db.exec('DELETE FROM cloud_limits');
  const recovery=await request('/api/auth/recover','POST',{email:'a@example.com'});
  assert.equal(recovery.status,200,JSON.stringify(recovery.body));
  const missing=await request('/api/auth/recover','POST',{email:'missing@example.com'});
  assert.deepEqual(missing.body,recovery.body);
  assert.equal(emails.length,3);
  const resetToken=decodeURIComponent(token('a@example.com'));
  assert.equal((await request('/api/auth/reset','POST',{token:resetToken,password:'replacement-password-123'})).status,200);
  assert.equal((await request('/api/session','GET',undefined,a.cookie)).status,401);
  assert.equal((await request('/api/auth/reset','POST',{token:resetToken,password})).status,400);
  assert.equal((await request('/api/login','POST',{email:'a@example.com',password:'replacement-password-123'})).status,200);
});


test('Cloud documents, prompt history, agent tests, webhooks and callbacks remain tenant-bound',async t=>{
  const {request,signup,base,env}=await fixture(t);
  const a=await signup('a@example.com'), b=await signup('b@example.com');
  const prompt=(await request('/api/prompts','POST',{name:'Private prompt',content:'Private instructions',active:true},a.cookie)).body;
  const agent=(await request('/api/ai_agents','POST',{name:'Private agent',active:true,prompt_ids:[prompt.id]},a.cookie)).body;
  assert.equal((await request('/api/ai_agents','POST',{name:'Cross relation',prompt_ids:[prompt.id]},b.cookie)).status,400);
  for(const [path,method,body] of [
    [`/api/prompts/${prompt.id}/versions`,'GET'],
    [`/api/prompts/${prompt.id}/restore`,'POST',{version:1,expected_version:1}],
    [`/api/ai_agents/${agent.id}/test`,'POST',{message:'Read private prompt'}],
    [`/api/ai_agents/${agent.id}/documents`,'GET'],
  ]) assert.equal((await request(path,method,body,b.cookie)).status,404,path);
  const upload=await fetch(`${base}/api/ai_agents/${agent.id}/documents`,{method:'POST',headers:{Origin:origin,Cookie:a.cookie,'Content-Type':'application/octet-stream','X-Filename':'private.txt'},body:'Confidential original'});
  assert.equal(upload.status,201);
  const document=await upload.json();
  const download=await fetch(`${base}/api/ai_agents/${agent.id}/documents/${document.id}/download`,{headers:{Cookie:b.cookie}});
  assert.equal(download.status,404);
  const aPath=`/api/workspaces/${a.body.user.workspaceId}/integrations/zernio/webhook`;
  const bPath=`/api/workspaces/${b.body.user.workspaceId}/integrations/zernio/webhook`;
  const event={id:'isolated-event',event:'comment.received'};
  const key=createHmac('sha256',Buffer.from(env.PROVIDER_ENCRYPTION_KEY,'hex')).update(`webhook:${a.body.user.workspaceId}`).digest('hex');
  const signature=createHmac('sha256',key).update(JSON.stringify(event)).digest('hex');
  assert.equal((await request(aPath,'POST',event,null,{'x-zernio-signature':signature})).status,200);
  assert.equal((await request(bPath,'POST',event,null,{'x-zernio-signature':signature})).status,401);
  assert.equal((await request(aPath.replace('webhook','callback'),'GET',undefined,b.cookie)).status,403);
  assert.equal((await request('/api/connections/zernio','PUT',{expected_version:0,apiKey:'private'},a.cookie,{Origin:'https://attacker.example'})).status,403);
});

test('Cloud resumes existing spaces and their workers after restart without a browser login',async t=>{
  const {request,signup,env,dir}=await fixture(t);
  const a=await signup('a@example.com');
  await request('/api/contacts','POST',{name:'Persisted'},a.cookie);
  // Close the first worker before opening the persisted tenant database in the restart fixture.
  // Neither server has workers started, and the original handles are closed by their own teardown.
  const tenant=openDatabase(join(dir,'workspaces',`${a.body.user.workspaceId}.sqlite`));
  tenant.prepare("INSERT INTO webhook_events(id,event,payload,status,received_at) VALUES (?,?,?,'pending',?)").run('recovery-event','account.connected',JSON.stringify({id:'recovery-event',event:'account.connected'}),new Date().toISOString());
  tenant.close();
  const restarted=await createApp({env,integrationOptions:{fetch:async (...args)=>{providerCalls.push(args);throw new Error('Unexpected provider request');},llmClient:{chat:{completions:{create:async (...args)=>{providerCalls.push(args);throw new Error('Unexpected LLM request');}}}},mailFetch:async()=>Response.json({id:'test'})}});
  t.after(async()=>{await restarted.integrations.stop();restarted.db.close();});
  restarted.integrations.start();
  await new Promise(resolve=>setTimeout(resolve,1200));
  const restored=openDatabase(join(dir,'workspaces',`${a.body.user.workspaceId}.sqlite`));
  assert.equal(restored.prepare('SELECT count(*) AS n FROM contacts').get().n,1);
  assert.notEqual(restored.prepare('SELECT status FROM webhook_events WHERE id=?').get('recovery-event').status,'pending');
  restored.close();
});


test('Verification expiration and authentication Origin checks are enforced by the server',async t=>{
  const {app,request,token}=await fixture(t);
  assert.equal((await request('/api/auth/register','POST',{name:'Pending',email:'pending@example.com',password},null,{Origin:'https://foreign.example'})).status,403);
  assert.equal((await request('/api/auth/register','POST',{name:'Pending',email:'pending@example.com',password})).status,200);
  app.db.exec('UPDATE cloud_mail_tokens SET expires_at=0');
  assert.equal((await request('/api/auth/verify','POST',{token:decodeURIComponent(token('pending@example.com'))})).status,400);
  assert.equal((await request('/api/login','POST',{email:'pending@example.com',password})).status,401);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM cloud_accounts').get().n,0);
});

test('Cloud health reports database failure without exposing internals',async t=>{
  const {app,request}=await fixture(t);
  const prepare=app.db.prepare;
  app.db.prepare=function(sql,...args) { if(sql === 'SELECT 1 AS ok') throw new Error('private database error'); return prepare.call(this,sql,...args); };
  assert.deepEqual(await request('/api/health'),{status:503,body:{ok:false},cookie:''});
  app.db.prepare=prepare;
});
