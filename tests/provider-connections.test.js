import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../backend/db.js';
import { createProviderConnections } from '../backend/provider-connections.js';
import { publicAddress, providerURL, providerFetch } from '../backend/provider-network.js';
import { createLLM } from '../backend/llm.js';
const env = { PROVIDER_ENCRYPTION_KEY: 'ab'.repeat(32) };
test('Provider secrets are authenticated, scoped, versioned and survive reopening',t=>{
  const db=openDatabase(':memory:');t.after(()=>db.close());
  const store=createProviderConnections(db,env,'one');
  assert.equal(store.metadata('zernio').configured,false);
  store.save('zernio',{expected_version:0,apiKey:'private-zernio-key'});
  assert.equal(store.env.ZERNIO_API_KEY,'private-zernio-key');
  assert.ok(!JSON.stringify(db.prepare('SELECT * FROM provider_connections').all()).includes('private-zernio-key'));
  assert.ok(!JSON.stringify(store.metadata('zernio')).includes('private-zernio-key'));
  assert.equal(createProviderConnections(db,env,'one').env.ZERNIO_API_KEY,'private-zernio-key');
  assert.throws(()=>store.save('zernio',{expected_version:0,apiKey:'stale'}),{status:409});
  assert.throws(()=>createProviderConnections(db,{PROVIDER_ENCRYPTION_KEY:'cd'.repeat(32)},'one'),{status:503});
  assert.throws(()=>createProviderConnections(db,env,'two'),{status:503});
  assert.throws(()=>createProviderConnections(db,{},'one'),{status:503});
  store.save('zernio',{expected_version:1,apiKey:'rotated'});
  assert.equal(store.env.ZERNIO_API_KEY,'rotated');
  assert.throws(()=>store.remove('zernio',{expected_version:1}),{status:409});
  assert.equal(store.remove('zernio',{expected_version:2}).hasKey,false);
  assert.equal(store.metadata('zernio').version,3);
  assert.throws(()=>store.save('zernio',{expected_version:0,apiKey:'stale'}),{status:409});
});
test('Environment precedence, cloud isolation and new secret when changing destination',t=>{
  const db=openDatabase(':memory:');t.after(()=>db.close());
  const configured={...env,ZERNIO_API_KEY:'global-key',LLM_API_KEY:'global-llm',LLM_BASE_URL:'https://api.openai.com/v1',LLM_MODEL:'server-model'};
  const self=createProviderConnections(db,configured);
  assert.equal(self.metadata('llm').editable,false);
  assert.throws(()=>self.save('llm',{expected_version:0,apiKey:'override'}),{status:409});
  const cloud=createProviderConnections(db,{...configured,APP_MODE:'cloud'},'cloud');
  assert.equal(cloud.env.ZERNIO_API_KEY,'');
  assert.equal(cloud.metadata('llm').configured,false);
  cloud.save('llm',{expected_version:0,apiKey:'customer-key',baseURL:'https://api.openai.com/v1',model:'customer-model'});
  assert.throws(()=>cloud.save('llm',{expected_version:1,baseURL:'https://other.openai.azure.com/openai/v1'}),{status:400});
  assert.equal(cloud.env.LLM_API_KEY,'customer-key');
  assert.equal(cloud.env.LLM_MODEL,'customer-model');
});
test('LLM destinations reject local networks, metadata, mapped IPv6 and unsafe URLs',()=>{
  for(const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','172.16.1.1','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1','fe80::1','fc00::1','2001:db8::1','2002:7f00:1::']) assert.equal(publicAddress(ip),false,ip);
  for(const ip of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111']) assert.equal(publicAddress(ip),true,ip);
  for(const url of ['http://api.openai.com','https://user:secret@api.openai.com','https://api.openai.com?key=secret','https://api.openai.com:8443','https://127.0.0.1','https://api.openai.com.attacker.example']) assert.throws(()=>providerURL(url,{}),{status:400});
  assert.equal(providerURL('https://custom.example/v1',{LLM_ALLOWED_HOSTS:'custom.example'}).hostname,'custom.example');
});
test('OpenRouter uses encrypted shared configuration and respects explicit destination policies',t=>{
  const db=openDatabase(':memory:');t.after(()=>db.close());
  const store=createProviderConnections(db,{...env,APP_MODE:'cloud'},'router-space');
  store.save('llm',{expected_version:0,apiKey:'synthetic-router-secret',baseURL:'https://openrouter.ai/api/v1',model:'vendor/model'});
  assert.equal(store.env.LLM_BASE_URL,'https://openrouter.ai/api/v1');
  assert.equal(store.env.LLM_MODEL,'vendor/model');
  assert.equal(createProviderConnections(db,{...env,APP_MODE:'cloud'},'router-space').env.LLM_API_KEY,'synthetic-router-secret');
  assert.ok(!JSON.stringify(store.metadata('llm')).includes('synthetic-router-secret'));
  assert.ok(!JSON.stringify(db.prepare('SELECT * FROM provider_connections').all()).includes('synthetic-router-secret'));
  assert.throws(()=>store.save('llm',{expected_version:1,baseURL:'https://api.openai.com/v1'}),{status:400});
  assert.throws(()=>providerURL('https://openrouter.ai/api/v1',{LLM_ALLOWED_HOSTS:'api.openai.com'}),{status:400});
  for(const url of ['https://openrouter.ai.attacker.example/api/v1','https://sub.openrouter.ai/api/v1','http://openrouter.ai/api/v1']) assert.throws(()=>providerURL(url,{}),{status:400});
});
test('Rotation during LLM calls rejects obsolete results and creates a fresh client configuration',async t=>{
  const db=openDatabase(':memory:');t.after(()=>db.close());
  const store=createProviderConnections(db,env);
  store.save('llm',{expected_version:0,apiKey:'first',baseURL:'https://api.openai.com/v1',model:'model'});
  let resolve;
  const llm=createLLM(store.env,{chat:{completions:{create:()=>new Promise(r=>resolve=r)}}});
  const result=llm.complete('model',[]);
  store.save('llm',{expected_version:1,apiKey:'second'});
  resolve({choices:[{finish_reason:'stop',message:{content:'old'}}]});
  await assert.rejects(result,{status:409});
  assert.equal(llm.config.apiKey,'second');
});

test('The socket refuses private DNS results even for an allowed provider hostname',async()=>{
  let lookups=0;
  const request=providerFetch({LLM_ALLOWED_HOSTS:'provider.example'}, {resolveHost(host, options, callback) {
    lookups++;assert.equal(host,'provider.example');assert.equal(options.all,true);
    callback(null,[{address:'127.0.0.1',family:4}]);
  }});
  await assert.rejects(request('https://provider.example/v1',{method:'POST',headers:{Authorization:'Bearer synthetic-secret'},body:'{}',signal:AbortSignal.timeout(1000)}),/Destination unavailable/);
  assert.equal(lookups,1);
});
