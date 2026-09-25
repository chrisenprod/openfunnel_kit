import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../backend/server.js';
import { Webhook } from 'standardwebhooks';

test('Billing HTTP enforces owner/session/CSRF and accepts only signed public webhooks',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'openfunnel-billing-http-'));const emails=[];let calls=0;
  const origin='http://localhost:5173',password='synthetic-password-123',secret='whsec_'+Buffer.from('synthetic-webhook-secret-32-bytes').toString('base64');
  const app=await createApp({env:{APP_MODE:'cloud',CLOUD_DATA_DIR:dir,APP_ORIGIN:origin,CLOUD_OWNER_EMAIL:'owner@example.com',BETTER_AUTH_SECRET:'x'.repeat(40),PROVIDER_ENCRYPTION_KEY:'ab'.repeat(32),RESEND_API_KEY:'synthetic',RESEND_FROM:'test@example.com',POLAR_TOKEN:'private-test-key',POLAR_WEBHOOK_SECRET:secret,POLAR_SERVER:'sandbox',BILLING_ENABLED:'true'},integrationOptions:{mailFetch:async(u,o)=>{emails.push(JSON.parse(o.body));return Response.json({id:'test'});},polarFetch:async()=>{calls++;return Response.json({items:[],pagination:{max_page:1}});}}});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base=`http://127.0.0.1:${app.server.address().port}`;
  t.after(async()=>{await app.integrations.stop();await new Promise(r=>app.server.close(r));app.db.close();await rm(dir,{recursive:true,force:true});});
  async function req(path,{method='GET',body,cookie,headers={}}={}) {
    const r=await fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
    return {status:r.status,data:await r.json(),cookie:r.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ')};
  }
  async function signup(email) {
    assert.equal((await req('/api/auth/register',{method:'POST',body:{email,password,name:'Test'}})).status,200);
    const token=new URL(emails.at(-1).text.match(/http[^\s]+/)[0]).hash.split('token=')[1];
    assert.equal((await req('/api/auth/verify',{method:'POST',body:{token:decodeURIComponent(token)}})).status,200);
    return req('/api/login',{method:'POST',body:{email,password}});
  }
  const owner=await signup('owner@example.com'),client=await signup('client@example.com');
  assert.equal((await req('/api/admin/billing')).status,401);
  assert.equal((await req('/api/admin/billing',{cookie:client.cookie})).status,403);
  assert.equal((await req('/api/admin/billing/sync',{method:'POST',body:{},cookie:client.cookie})).status,403);assert.equal(calls,0);
  assert.equal((await req('/api/admin/billing/sync',{method:'POST',body:{},cookie:owner.cookie,headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await req('/api/admin/billing/sync',{method:'POST',body:{},cookie:owner.cookie})).status,200);assert.equal(calls,1);
  const overview=await req('/api/admin/billing',{cookie:owner.cookie});assert.ok(!JSON.stringify(overview.data).includes('private-test-key'));
  const mine=await req('/api/billing',{cookie:client.cookie});assert.equal(mine.status,200);assert.equal(mine.data.period,null);
  assert.equal((await req('/api/billing/checkout',{method:'POST',body:{product_id:'bad',workspace_id:owner.data.user.workspaceId},cookie:client.cookie})).status,400);
  const createdKey=await req('/api/api-keys',{method:'POST',body:{name:'read',scopes:['resources:read'],expires_in_days:30},cookie:client.cookie});
  const headers={Authorization:`Bearer ${createdKey.data.key || createdKey.data.secret}`,'X-OpenFunnel-Workspace':client.data.user.workspaceId};
  assert.equal((await req('/api/billing',{headers})).status,403);
  assert.equal((await req('/api/admin/billing',{headers})).status,403);
  const data={type:'order.paid',data:{id:'example-order'}},raw=JSON.stringify(data),stamp=new Date(),id='webhook-test';
  assert.equal((await req('/api/billing/polar/webhook',{method:'POST',body:data,headers:{Origin:''}})).status,403);
  assert.equal((await req('/api/billing/polar/webhook',{method:'POST',body:data,headers:{Origin:'','webhook-id':id,'webhook-timestamp':String(Math.floor(stamp/1000)),'webhook-signature':new Webhook(secret).sign(id,stamp,raw)}})).status,202);
  assert.equal(app.db.prepare('SELECT count(*) n FROM billing_events').get().n,1);
  assert.equal((await req('/api/billing/history',{cookie:client.cookie})).data.total,0);
});
