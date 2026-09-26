import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createApp} from '../backend/server.js';
import {createProviderSetup} from '../backend/provider-setup.js';
import {HttpError,save} from '../backend/resources.js';

async function fixture(t) {
  const state={llmFail:false,webhookFail:false,paid:true,gate:null,calls:[],usage:[],webhooks:[]};
  const env={admin_user:'admin',admin_pass:'synthetic-password-123',APP_ORIGIN:'http://localhost:5173',PUBLIC_BASE_URL:'https://app.example.test',PROVIDER_ENCRYPTION_KEY:'ab'.repeat(32),ZERNIO_WEBHOOK_SECRET:'synthetic-webhook-secret-32-characters',BILLING_METER:{
    async run(kind,key,source,fn){if(!state.paid)throw new HttpError(402,'Necesitas una suscripción pagada vigente. Revisa Facturación.');const result=await fn();state.usage.push({kind,source});return result;},
    runSync(kind,key,source,fn){if(!state.paid)throw new HttpError(402,'Necesitas una suscripción pagada vigente. Revisa Facturación.');const result=fn();state.usage.push({kind,source});return result;},
  }};
  const app=await createApp({databasePath:':memory:',env,integrationOptions:{
    llmClient:{chat:{completions:{create:async body=>{
      state.calls.push('llm');if(state.gate)await state.gate();if(state.llmFail)throw Error('private-provider-secret');
      return {choices:[{finish_reason:body.tool_choice?'tool_calls':'stop',message:body.tool_choice?{role:'assistant',tool_calls:[{id:'probe',function:{name:'connection_probe',arguments:'{}'}}]}:{role:'assistant',content:'OK'}}]};
    }}}},
    fetch:async(url,options)=>{
      assert.equal(new URL(url).pathname,'/api/v1/webhooks/settings');state.calls.push(options.method);
      if(state.webhookFail)return Response.json({message:'private-provider-secret'},{status:403});
      if(options.method==='GET')return Response.json({webhooks:state.webhooks});
      const body=JSON.parse(options.body);assert.equal(body.url,'https://app.example.test/api/integrations/zernio/webhook');
      assert.ok(body.events.includes('message.received'));assert.equal(body.isActive,true);
      state.webhooks=[{...body,_id:body.webhookId||'native-webhook'}];return Response.json({webhook:{_id:'native-webhook'}});
    },
  }});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(async()=>{await app.integrations.stop();app.server.closeAllConnections();await new Promise(resolve=>app.server.close(resolve));app.db.close();});
  let cookie='';
  async function request(method,path,body,headers={}){
    const response=await fetch(`http://127.0.0.1:${app.server.address().port}/api${path}`,{method,headers:{Origin:env.APP_ORIGIN,'Content-Type':'application/json',Cookie:cookie,...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(response.headers.getSetCookie().length)cookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
    return {status:response.status,data:await response.json()};
  }
  assert.equal((await request('POST','/login',{username:env.admin_user,password:env.admin_pass})).status,200);
  return {...app,state,request};
}
const llm={expected_version:0,apiKey:'private-model-key',baseURL:'https://api.openai.com/v1',model:'synthetic-model'};
const zernio={expected_version:0,apiKey:'private-zernio-key'};

test('Saving providers prepares them automatically and preserves the other provider readiness',async t=>{
  const a=await fixture(t);
  const model=await a.request('PUT','/connections/llm',llm);assert.equal(model.status,200);assert.equal(model.data.setup.status,'ready');
  assert.deepEqual(a.state.usage.map(row=>row.kind),['llm','tool','llm']);
  const hook=await a.request('PUT','/connections/zernio',zernio);assert.equal(hook.status,200);assert.equal(hook.data.setup.status,'ready');
  assert.equal((await a.request('GET','/connections/llm')).data.setup.status,'ready');
  const channel=save(a.db,'channels',{name:'Synthetic',kind:'instagram'});
  a.db.prepare("UPDATE channels SET provider='zernio',inbox_verified_at='verified',automation_enabled=1 WHERE id=?").run(channel.id);
  const rotated=await a.request('PUT','/connections/llm',{expected_version:1,model:'another-model'});assert.equal(rotated.data.setup.status,'ready');
  assert.equal((await a.request('GET','/connections/zernio')).data.setup.status,'ready');
  assert.equal(a.db.prepare('SELECT inbox_verified_at FROM channels WHERE id=?').get(channel.id).inbox_verified_at,'verified');
  assert.equal(a.db.prepare('SELECT automation_enabled FROM channels WHERE id=?').get(channel.id).automation_enabled,0);
  const before=a.state.calls.length;
  await a.request('GET','/connections/zernio');await a.request('GET','/connections/llm');
  assert.equal((await a.request('POST','/connections/llm',{expected_version:2})).data.setup.status,'ready');
  assert.equal((await a.request('POST','/connections/zernio',{expected_version:1})).data.setup.status,'ready');
  assert.equal(a.state.calls.length,before);
  assert.equal((await a.request('PUT','/connections/zernio',{expected_version:1,apiKey:'rotated-key'})).data.setup.status,'ready');
  assert.equal(a.state.webhooks.length,1);assert.equal(a.state.calls.filter(method=>method==='POST').length,1);assert.equal(a.state.calls.filter(method=>method==='PUT').length,1);
  assert.equal((await a.request('GET','/connections/llm')).data.setup.status,'ready');
  assert.equal(JSON.stringify([model,hook,rotated]).includes('private-'),false);
});

test('Failed setup keeps encrypted credentials and persists safe errors; retry does not resave',async t=>{
  const a=await fixture(t);a.state.webhookFail=true;
  const result=await a.request('PUT','/connections/zernio',zernio);
  assert.equal(result.status,200);assert.equal(result.data.configured,true);assert.equal(result.data.setup.status,'failed');assert.ok(result.data.setup.error);
  assert.ok(!JSON.stringify(result).includes('private-'));
  const ciphertext=a.db.prepare("SELECT ciphertext FROM provider_connections WHERE provider='zernio'").get().ciphertext;
  assert.ok(!ciphertext.includes(zernio.apiKey));
  const reopened=createProviderSetup(a.db,a.connections,a.integrations);
  assert.equal(reopened.metadata('zernio').setup.status,'failed');
  assert.equal((await a.request('POST','/connections/zernio',{expected_version:0})).status,409);
  a.state.webhookFail=false;
  const retry=await a.request('POST','/connections/zernio',{expected_version:1});assert.equal(retry.data.setup.status,'ready');assert.equal(retry.data.version,1);
  assert.equal(a.db.prepare("SELECT ciphertext FROM provider_connections WHERE provider='zernio'").get().ciphertext,ciphertext);
  assert.equal((await a.request('POST','/connections/zernio',{expected_version:1,apiKey:'unexpected'})).status,400);
  a.state.llmFail=true;
  assert.equal((await a.request('PUT','/connections/llm',llm)).data.setup.status,'failed');
  a.state.llmFail=false;
  assert.equal((await a.request('POST','/connections/llm',{expected_version:1})).data.setup.status,'ready');
  assert.equal((await a.request('DELETE','/connections/zernio',{expected_version:1})).data.setup.status,'unconfigured');
  assert.equal((await a.request('GET','/connections/llm')).data.setup.status,'ready');
});

test('Automatic validation respects billing and retry authorization',async t=>{
  const a=await fixture(t);a.state.paid=false;
  const result=await a.request('PUT','/connections/llm',llm);
  assert.equal(result.data.setup.status,'failed');assert.match(result.data.setup.error,/suscripción/);assert.deepEqual(a.state.calls,[]);
  assert.equal((await a.request('POST','/connections/llm',{expected_version:1},{Origin:'https://attacker.example'})).status,403);
  const key=await a.request('POST','/api-keys',{name:'Read',scopes:['resources:read','agents:test','agents:write'],expires_in_days:1});
  assert.equal((await a.request('POST','/connections/llm',{expected_version:1},{Cookie:'',Authorization:`Bearer ${key.data.secret}`})).status,403);
  a.state.paid=true;
  assert.equal((await a.request('POST','/connections/llm',{expected_version:1})).data.setup.status,'ready');
  assert.equal(a.state.calls.length,2);assert.equal(a.state.usage.length,3);
});

test('Concurrent setup rejects saves/deletion/retry and exposes running state',async t=>{
  const a=await fixture(t);let release,started;
  const begin=new Promise(resolve=>started=resolve);
  a.state.gate=()=>{started();return new Promise(resolve=>release=resolve);};
  const saving=a.request('PUT','/connections/llm',llm);await begin;
  assert.equal((await a.request('GET','/connections/llm')).data.setup.status,'running');
  for(const method of ['PUT','POST','DELETE'])assert.equal((await a.request(method,'/connections/llm',{expected_version:1})).status,409);
  a.state.gate=null;release();assert.equal((await saving).data.setup.status,'ready');
  assert.equal(a.state.calls.length,2);
});
