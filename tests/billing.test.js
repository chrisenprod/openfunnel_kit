import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { Webhook } from 'standardwebhooks';
import { openDatabase } from '../backend/db.js';
import { createBilling } from '../backend/billing.js';
import { createLLM } from '../backend/llm.js';
import { createAgentTester } from '../backend/agent-workbench.js';
import { save } from '../backend/resources.js';

const secret='whsec_'+Buffer.from('synthetic-secret-for-polar-test-32').toString('base64');
const now=()=>new Date().toISOString();
const start=new Date(Date.now()-3600000).toISOString(), end=new Date(Date.now()+86400000*30).toISOString();
const product={id:'plan-a',name:'Example plan',is_recurring:true,recurring_interval:'month',recurring_interval_count:1,prices:[{amount_type:'fixed',price_amount:2500,price_currency:'usd',tax_behavior:null}]};
function fixture(t,overrides={}) {
  const db=openDatabase(':memory:');t.after(()=>db.close());
  for(const id of ['a','b']) {
    db.prepare('INSERT INTO auth_user(id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,1,?,?)').run(id,id,`${id}@example.com`,now(),now());
    db.prepare('INSERT INTO cloud_accounts VALUES (?,?,?,\'active\',?)').run(id,`workspace-${id}`,'client',now());
  }
  const env={BILLING_ENABLED:'true',POLAR_TOKEN:'synthetic-private-token',POLAR_WEBHOOK_SECRET:secret,POLAR_SERVER:'sandbox',APP_ORIGIN:'https://app.example.com',...overrides};
  const subscription={id:'sub-a',product_id:'plan-a',customer_id:'customer-a',customer:{external_id:'workspace-a'},status:'active',current_period_start:start,current_period_end:end,cancel_at_period_end:false,modified_at:now()};
  const calls=[];let remoteSubscriptions=[];let failed=false;
  const fetcher=async(url,options)=>{
    calls.push({url,options});assert.equal(options.headers['Polar-Version'],'2026-04');assert.ok(url.startsWith('https://sandbox-api.polar.sh/v1/'));
    if(failed) return Response.json({error:'PRIVATE provider detail'}, {status:503});
    const path=new URL(url).pathname;
    if(path==='/v1/products/') return Response.json({items:[product,{...product,id:'one-off',is_recurring:false}],pagination:{max_page:1}});
    if(path==='/v1/products/plan-a') return Response.json(product);
    if(path==='/v1/subscriptions/') return Response.json({items:remoteSubscriptions});
    if(path==='/v1/subscriptions/sub-a') return Response.json(subscription);
    if(path==='/v1/checkouts/') return Response.json({id:'checkout-a',url:'https://sandbox.polar.sh/checkout/test',expires_at:end});
    if(path==='/v1/customer-sessions/') return Response.json({customer_portal_url:'https://sandbox.polar.sh/portal/test'});
    throw new Error(`Unexpected test path ${path}`);
  };
  const billing=createBilling(db,env,fetcher);
  async function setup(credits=10) {await billing.syncProducts('owner');billing.savePlan(product.id,{credits,published:true,expected_version:1},'owner');}
  let sequence=0;
  async function deliver(type,data,id=`event-${++sequence}`,key=secret,timestamp=new Date()) {
    const raw=JSON.stringify({type,data});const stream=Readable.from([Buffer.from(raw)]);
    stream.headers={'webhook-id':id,'webhook-timestamp':String(Math.floor(timestamp.getTime()/1000)),'webhook-signature':new Webhook(key).sign(id,timestamp,raw)};
    return billing.receive(stream);
  }
  function paid(extra={}) {return {id:'order-a',subscription_id:subscription.id,customer_id:subscription.customer_id,product_id:product.id,customer:subscription.customer,paid:true,billing_reason:'subscription_create',subscription:{current_period_start:subscription.current_period_start,current_period_end:subscription.current_period_end},created_at:now(),...extra};}
  async function grant(credits=10) {await setup(credits);await deliver('order.paid',paid());await billing.processPending();assert.equal(billing.summary('workspace-a').period?.credits,credits);}
  return {db,billing,env,fetcher,subscription,calls,setup,deliver,paid,grant,fail:()=>{failed=true;},remote:items=>{remoteSubscriptions=items;}};
}

test('Owner exemption requires explicit flag, verified active role and preserves customer billing', async t => {
  const f=fixture(t,{BILLING_OWNER_EXEMPT:'true'});
  f.db.prepare("UPDATE cloud_accounts SET role='superadmin' WHERE workspace_id='workspace-a'").run();
  const meter=f.billing.meter('workspace-a');
  assert.equal(f.billing.summary('workspace-a').owner_exempt,true);
  assert.equal(f.billing.summary('workspace-a').period,null);
  assert.equal(await meter.run('llm','owner-call','validation',()=>42),42);
  assert.equal(meter.runSync('tool','owner-tool','validation',()=>12),12);
  assert.deepEqual(f.billing.summary('workspace-a').exempt_usage,{consumed:2,reserved:0});
  assert.equal(f.billing.history('workspace-a',1).items.every(row=>row.exempt===1),true);
  assert.equal(f.db.prepare('SELECT count(*) n FROM billing_operations').get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM billing_subscriptions').get().n,0);
  await assert.rejects(f.billing.checkout('workspace-a',{product_id:'plan-a'}),{status:409});
  assert.deepEqual(f.calls,[]);
  await assert.rejects(f.billing.meter('workspace-b').run('llm','client','test',()=>assert.fail('Must not call provider')),{status:402});
  assert.equal(f.billing.summary('workspace-b').owner_exempt,false);
  assert.equal(f.billing.history('workspace-b',1).total,0);
  f.db.prepare("UPDATE cloud_accounts SET status='suspended' WHERE workspace_id='workspace-a'").run();
  assert.throws(()=>meter.runSync('tool','blocked','agent',()=>assert.fail('Suspended owner')),{status:403});
  assert.equal(f.billing.summary('workspace-a').owner_exempt,false);
  f.db.prepare("UPDATE cloud_accounts SET status='active' WHERE workspace_id='workspace-a'").run();
  f.db.prepare("UPDATE auth_user SET emailVerified=0 WHERE id='a'").run();
  assert.throws(()=>meter.runSync('tool','unverified','agent',()=>assert.fail('Unverified owner')),{status:402});
  f.db.prepare("UPDATE auth_user SET emailVerified=1 WHERE id='a'").run();
  for(const flag of [undefined,'false']) {
    const paid=createBilling(f.db,{...f.env,BILLING_OWNER_EXEMPT:flag},f.fetcher);
    assert.equal(paid.summary('workspace-a').owner_exempt,false);
    assert.throws(()=>paid.meter('workspace-a').runSync('tool','needs-plan','agent',()=>1),{status:402});
    assert.equal(paid.history('workspace-a',1).total,2);
  }
  assert.throws(()=>createBilling(f.db,{...f.env,BILLING_OWNER_EXEMPT:'yes'},f.fetcher),/BILLING_OWNER_EXEMPT/);
});

test('Exempt usage releases failures, prevents duplicate reservations and recovers on restart', async t => {
  const f=fixture(t,{BILLING_OWNER_EXEMPT:'true'});
  f.db.prepare("UPDATE cloud_accounts SET role='superadmin' WHERE workspace_id='workspace-a'").run();
  const meter=f.billing.meter('workspace-a');
  let release;
  const pending=meter.run('llm','pending','agent',()=>new Promise(resolve=>{release=resolve;}));
  assert.equal(f.billing.summary('workspace-a').exempt_usage.reserved,1);
  await assert.rejects(meter.run('llm','pending','agent',()=>1),{status:409});
  release(1);await pending;
  await meter.run('llm','pending','agent',()=>2);
  assert.equal(f.billing.summary('workspace-a').exempt_usage.consumed,1);
  await assert.rejects(meter.run('llm','failure','test',()=>{throw new Error('Failure');}));
  assert.throws(()=>meter.runSync('tool','tool-failure','test',()=>{throw new Error('Failure');}));
  assert.equal(f.billing.history('workspace-a',1).items.filter(row=>row.status==='released').length,2);
  f.db.prepare("UPDATE billing_exempt_operations SET status='reserved' WHERE operation_key='failure'").run();
  const restarted=createBilling(f.db,f.env,f.fetcher);
  assert.equal(restarted.summary('workspace-a').exempt_usage.reserved,0);
  await restarted.meter('workspace-a').run('llm','failure','test',()=>1);
  assert.equal(restarted.summary('workspace-a').exempt_usage.consumed,2);
  const otherEnvironment=createBilling(f.db,{...f.env,POLAR_SERVER:'production'},f.fetcher);
  assert.equal(otherEnvironment.history('workspace-a',1).total,0);
});

test('Exempt owner validates model without paid period and records all three uses', async t => {
  const f=fixture(t,{BILLING_OWNER_EXEMPT:'true'});
  f.db.prepare("UPDATE cloud_accounts SET role='superadmin' WHERE workspace_id='workspace-a'").run();
  let calls=0;
  const client={chat:{completions:{create:async body=>{calls++;return {choices:[{finish_reason:body.tool_choice?'tool_calls':'stop',message:body.tool_choice?{tool_calls:[{id:'probe',function:{name:'connection_probe',arguments:'{}'}}]}:{content:'OK'}}]};}}}};
  const llm=createLLM({LLM_BASE_URL:'https://api.example.test/v1',LLM_API_KEY:'mock',LLM_MODEL:'test',BILLING_METER:f.billing.meter('workspace-a')},client);
  await llm.validate('test');
  assert.equal(calls,2);
  assert.deepEqual(f.billing.summary('workspace-a').exempt_usage,{consumed:3,reserved:0});
  assert.equal(f.billing.history('workspace-a',1).items.filter(row=>row.source==='validation').length,3);
  assert.equal(f.billing.summary('workspace-a').period,null);
});

test('Switching exemption never double-counts an existing paid or exempt operation', async t => {
  const f=fixture(t);await f.grant(1);
  f.db.prepare("UPDATE cloud_accounts SET role='superadmin' WHERE workspace_id='workspace-a'").run();
  f.billing.meter('workspace-a').runSync('tool','paid','agent',()=>1);
  const free=createBilling(f.db,{...f.env,BILLING_OWNER_EXEMPT:'true'},f.fetcher);
  free.meter('workspace-a').runSync('tool','paid','agent',()=>1);
  free.meter('workspace-a').runSync('tool','exempt','agent',()=>1);
  assert.equal(free.summary('workspace-a').period.available,0);
  assert.equal(free.summary('workspace-a').exempt_usage.consumed,1);
  assert.equal(free.history('workspace-a',1).total,2);
  f.billing.meter('workspace-a').runSync('tool','exempt','agent',()=>1);
  assert.equal(f.billing.summary('workspace-a').period.consumed,1);
  assert.throws(()=>f.billing.meter('workspace-a').runSync('tool','new','agent',()=>1),{status:402});
  assert.equal(f.billing.summary('workspace-a').subscription.status,'active');
});

test('Polar catalog, optimistic plans, sanitization and environment isolation',async t=>{
  const f=fixture(t);await f.setup();
  assert.equal(f.billing.admin().plans[0].credits,10);
  assert.equal(f.billing.admin().plans.length,1);
  assert.throws(()=>f.billing.savePlan('plan-a',{credits:2,published:true,expected_version:1},'owner'),{status:409});
  assert.throws(()=>f.billing.savePlan('plan-a',{credits:-1,published:true,expected_version:2},'owner'),{status:400});
  assert.equal(createBilling(f.db,{...f.env,POLAR_SERVER:'production'}).admin().plans.length,0);
  assert.ok(!JSON.stringify(f.billing.admin()).includes('synthetic-private-token'));
  f.fail();await assert.rejects(f.billing.syncProducts('owner'),e=>e.status===502 && !e.message.includes('PRIVATE'));
  assert.equal(f.billing.admin().plans[0].published,1);
});

test('Checkout uses trusted workspace and selected price, prevents duplicate subscription and reuses pending checkout',async t=>{
  const f=fixture(t);await f.setup();
  await assert.rejects(f.billing.checkout('workspace-a',{product_id:'plan-a',workspace:'workspace-b'}),{status:400});
  await assert.rejects(f.billing.checkout('workspace-a',{product_id:'not-published'}),{status:400});
  const result=await f.billing.checkout('workspace-a',{product_id:'plan-a'});
  assert.ok(result.url.includes('polar.sh'));
  const sent=JSON.parse(f.calls.find(c=>c.url.endsWith('/checkouts/')).options.body);
  assert.equal(sent.external_customer_id,'workspace-a');assert.equal(sent.customer_email,'a@example.com');
  assert.equal(sent.success_url,'https://app.example.com/#/billing?checkout=success');assert.equal(sent.allow_trial,false);
  assert.equal(f.billing.summary('workspace-a').period,null);
  await f.billing.checkout('workspace-a',{product_id:'plan-a'});
  assert.equal(f.calls.filter(c=>c.url.endsWith('/checkouts/')).length,1);
  f.remote([{status:'active'}]);await assert.rejects(f.billing.checkout('workspace-a',{product_id:'plan-a'}),{status:409});
  await f.billing.portal('workspace-b');
  assert.equal(JSON.parse(f.calls.at(-1).options.body).external_customer_id,'workspace-b');
});

test('Verified webhooks grant one period, survive replay and preserve credit snapshot',async t=>{
  const f=fixture(t);await f.grant(6);
  await f.deliver('order.paid',f.paid(),'duplicate-order');
  await f.deliver('order.paid',f.paid(),'duplicate-order');
  await f.billing.processPending();
  assert.equal(f.db.prepare('SELECT count(*) n FROM billing_periods').get().n,1);
  f.billing.savePlan('plan-a',{credits:20,published:true,expected_version:2},'owner');
  assert.equal(f.billing.summary('workspace-a').period.credits,6);
  assert.equal(f.billing.summary('workspace-b').period,null);
  await assert.rejects(f.deliver('order.paid',f.paid(),'bad','whsec_'+Buffer.from('wrong').toString('base64')),{status:403});
  await assert.rejects(f.deliver('order.paid',f.paid(),'stale',secret,new Date(Date.now()-600000)),{status:403});
  const old=new Webhook(Buffer.from(secret).toString('base64'));
  const raw=JSON.stringify({type:'subscription.updated',data:{id:'sub-a'}}), timestamp=new Date();
  const stream=Readable.from([Buffer.from(raw)]);stream.headers={'webhook-id':'legacy','webhook-timestamp':String(Math.floor(timestamp/1000)),'webhook-signature':old.sign('legacy',timestamp,raw)};
  await f.billing.receive(stream);
});

test('Cancellation preserves paid period, revocation stops use; late events query current state',async t=>{
  const f=fixture(t);await f.grant();
  f.subscription.cancel_at_period_end=true;f.subscription.modified_at=now();
  await f.deliver('subscription.updated',{id:'sub-a'});await f.billing.processPending();
  assert.ok(f.billing.summary('workspace-a').period);
  f.subscription.status='canceled';f.subscription.modified_at=now();
  await f.deliver('subscription.updated',{id:'sub-a'});await f.billing.processPending();
  assert.equal(f.billing.summary('workspace-a').period,null);
  await f.deliver('subscription.active',{id:'sub-a'});await f.billing.processPending();
  assert.equal(f.billing.summary('workspace-a').period,null);
  assert.throws(()=>f.billing.meter('workspace-a').runSync('tool','cannot-use','agent',()=>1),{status:402});
});

test('Full refunds revoke credits even when delivered before paid; partial refunds preserve entitlement',async t=>{
  const f=fixture(t);await f.grant();
  await f.deliver('order.refunded',{id:'order-a',net_amount:2500,refunded_amount:1000});await f.billing.processPending();
  assert.ok(f.billing.summary('workspace-a').period);
  await f.deliver('order.refunded',{id:'order-a',net_amount:2500,refunded_amount:2500});await f.billing.processPending();
  assert.equal(f.billing.summary('workspace-a').period,null);
  await f.deliver('order.refunded',{id:'order-b',net_amount:2500,refunded_amount:2500});
  f.subscription.current_period_start=new Date(Date.now()-1000).toISOString();
  await f.deliver('order.paid',f.paid({id:'order-b'}));await f.billing.processPending();
  assert.equal(f.billing.summary('workspace-a').period,null);
});

test('Atomic last credit, release on error, retry deduplication and restart recovery',async t=>{
  const f=fixture(t);await f.grant(1);const meter=f.billing.meter('workspace-a');
  let release;const blocked=new Promise(r=>{release=r;});
  const first=meter.run('llm','one','agent',()=>blocked);
  assert.equal(f.billing.summary('workspace-a').period.reserved,1);
  await assert.rejects(meter.run('llm','two','agent',()=>1),{status:402});
  release('ok');await first;
  assert.equal(f.billing.summary('workspace-a').period.consumed,1);
  await meter.run('llm','one','agent',()=>2);
  assert.equal(f.billing.summary('workspace-a').period.consumed,1);
  await assert.rejects(f.billing.meter('workspace-b').run('llm','one','test',()=>1),{status:402});
  f.db.exec("UPDATE billing_operations SET status='released'");
  await assert.rejects(meter.run('llm','error','test',()=>{throw new Error('provider failure');}));
  assert.equal(f.billing.summary('workspace-a').period.available,1);
  f.db.exec("UPDATE billing_operations SET status='reserved' WHERE operation_key='error'");
  const recovered=createBilling(f.db,f.env,f.fetcher);
  assert.equal(recovered.summary('workspace-a').period.available,1);
});

test('Monthly renewal does not roll over; errors retry persistently without granting',async t=>{
  const f=fixture(t);await f.grant(8);
  f.db.prepare('UPDATE billing_periods SET ends_at=?').run(new Date(Date.now()-1000).toISOString());
  f.subscription.current_period_start=new Date(Date.now()-500).toISOString();f.subscription.modified_at=now();
  await f.deliver('order.paid',f.paid({id:'order-renewal',billing_reason:'subscription_cycle'}));await f.billing.processPending();
  assert.equal(f.billing.summary('workspace-a').period.credits,8);
  assert.equal(f.db.prepare('SELECT count(*) n FROM billing_periods').get().n,2);
  f.fail();await f.deliver('subscription.updated',{id:'sub-a'},'retry-me');await f.billing.processPending();
  assert.equal(f.billing.admin().events.find(e=>e.id==='retry-me').status,'pending');
  assert.equal(f.billing.admin().events.find(e=>e.id==='retry-me').attempts,1);
  f.billing.retry('retry-me','owner');assert.equal(f.billing.admin().events.find(e=>e.id==='retry-me').attempts,0);
});

test('LLM wrapper meters real calls, rejects before provider when empty, refunds provider errors and counts validation',async t=>{
  const f=fixture(t);await f.grant(3);let count=0,failed=false;
  const llmEnv={LLM_BASE_URL:'https://api.openai.com/v1',LLM_API_KEY:'mock',LLM_MODEL:'test',BILLING_METER:f.billing.meter('workspace-a')};
  const client={chat:{completions:{create:async body=>{count++;if(failed)throw Error('secret provider response');return {choices:[{finish_reason:'stop',message:body.tool_choice?{tool_calls:[{id:'probe',function:{name:'connection_probe',arguments:'{}'}}]}:{content:'OK'}}]};}}}};
  const llm=createLLM(llmEnv,client);
  failed=true;await assert.rejects(llm.complete('test',[]));assert.equal(f.billing.summary('workspace-a').period.available,3);
  failed=false;await llm.validate('test');assert.equal(f.billing.summary('workspace-a').period.consumed,3);
  assert.equal(count,3);
  await assert.rejects(llm.complete('test',[]),{status:402});assert.equal(count,3);
});

test('Agent playground meters LLM and simulated tools; disabled instance needs no subscription',async t=>{
  const f=fixture(t);await f.grant(3);
  const agent=save(f.db,'ai_agents',{name:'Test'});
  const tool=save(f.db,'tools',{name:'Contact',description:'Read contact',kind:'get_contact',active:true});
  f.db.prepare('INSERT INTO agent_tools(ai_agent_id,tool_id) VALUES (?,?)').run(agent.id,tool.id);
  let n=0;const client={chat:{completions:{create:async()=>({choices:[{finish_reason:'stop',message:++n===1?{tool_calls:[{id:'tool',function:{name:'get_contact',arguments:'{}'}}]}:{content:'OK'}}]})}}};
  const run=createAgentTester(f.db,{LLM_BASE_URL:'https://api.openai.com/v1',LLM_API_KEY:'mock',LLM_MODEL:'test',BILLING_METER:f.billing.meter('workspace-a')},client);
  await run(agent.id,{message:'hello',prompt:'Test prompt'});
  assert.equal(f.billing.summary('workspace-a').period.consumed,3);
  assert.equal(f.billing.history('workspace-a',1).items.filter(x=>x.kind==='tool').length,1);
  const free=createBilling(f.db,{...f.env,BILLING_ENABLED:'false'},f.fetcher);
  assert.equal(await free.meter('workspace-b').run('llm','no-plan','test',()=>4),4);
});

test('A checkout preserves its accepted credits if the owner changes the plan before payment',async t=>{
  const f=fixture(t);await f.setup(20);
  await f.billing.checkout('workspace-a',{product_id:'plan-a'});
  f.billing.savePlan('plan-a',{credits:10,published:true,expected_version:2},'owner');
  await f.deliver('order.paid',f.paid({checkout_id:'checkout-a'}));await f.billing.processPending();
  assert.equal(f.billing.summary('workspace-a').period.credits,20);
  assert.equal(JSON.parse(f.calls.find(c=>c.url.endsWith('/checkouts/')).options.body).prices['plan-a'][0].tax_behavior,'exclusive');
});
