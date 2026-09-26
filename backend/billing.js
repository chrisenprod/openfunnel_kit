import { randomUUID } from 'node:crypto';
import { HttpError } from './resources.js';
import { transaction } from './migrate.js';
import { createPolar } from './polar.js';

const stamp = () => new Date().toISOString();
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const object = (body, fields) => {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !fields.includes(k))) throw new HttpError(400, 'Datos de facturación inválidos.');
};
export function createBilling(db, env, fetcher) {
  const polar = createPolar(env, fetcher);
  const scope = polar.environment;
  const enabled = env.BILLING_ENABLED === 'true';
  if (env.BILLING_ENABLED && !['true','false'].includes(env.BILLING_ENABLED)) throw new Error('BILLING_ENABLED debe ser true o false.');
  const ownerExemption = env.BILLING_OWNER_EXEMPT === 'true';
  if (env.BILLING_OWNER_EXEMPT && !['true','false'].includes(env.BILLING_OWNER_EXEMPT)) throw new Error('BILLING_OWNER_EXEMPT debe ser true o false.');
  const origin = new URL(env.APP_ORIGIN || 'http://localhost:5173').origin;
  const webhookURL = `${env.PUBLIC_BASE_URL || origin}/api/billing/polar/webhook`.replace(/([^:]\/)\//g, '$1');
  let timer, processing, stopped = true;
  const locks = new Set();
  // A single API/worker owns the control database. Interrupted operations favor the customer.
  db.prepare("UPDATE billing_operations SET status='released',updated_at=? WHERE status='reserved'").run(stamp());
  db.prepare("UPDATE billing_exempt_operations SET status='released',updated_at=? WHERE status='reserved'").run(stamp());
  const plan = id => db.prepare('SELECT * FROM billing_plans WHERE environment=? AND product_id=?').get(scope,id);
  const plans = () => db.prepare('SELECT * FROM billing_plans WHERE environment=? ORDER BY amount,product_id').all(scope);
  const subscriptions = workspace => db.prepare('SELECT * FROM billing_subscriptions WHERE environment=? AND workspace_id=? ORDER BY period_end DESC').all(scope,workspace);
  const periods = workspace => db.prepare(`SELECT p.* FROM billing_periods p JOIN billing_subscriptions s ON s.environment=p.environment AND s.id=p.subscription_id
    WHERE p.environment=? AND p.workspace_id=? AND p.revoked=0 AND p.starts_at<=? AND p.ends_at>? AND s.status IN ('active','past_due') ORDER BY p.starts_at DESC`).all(scope,workspace,stamp(),stamp());
  function counts(id) {
    const rows = db.prepare('SELECT status,count(*) n FROM billing_operations WHERE period_id=? GROUP BY status').all(id);
    return { consumed: rows.find(r=>r.status==='consumed')?.n || 0, reserved: rows.find(r=>r.status==='reserved')?.n || 0 };
  }
  function account(workspace) {
    return db.prepare('SELECT c.*,u.email,u.name,u.emailVerified FROM cloud_accounts c JOIN auth_user u ON u.id=c.user_id WHERE workspace_id=?').get(workspace);
  }
  function exempt(workspace) {
    const member = account(workspace);
    return enabled && ownerExemption && member?.role === 'superadmin' && member.status === 'active' && member.emailVerified === 1;
  }
  function exemptUsage(workspace) {
    const rows = db.prepare('SELECT status,count(*) n FROM billing_exempt_operations WHERE environment=? AND workspace_id=? GROUP BY status').all(scope,workspace);
    return { consumed: rows.find(r=>r.status==='consumed')?.n || 0, reserved: rows.find(r=>r.status==='reserved')?.n || 0 };
  }
  function summary(workspace) {
    const period = periods(workspace)[0];
    const usage = period ? counts(period.id) : {consumed:0,reserved:0};
    return { enabled, owner_exempt:exempt(workspace), exempt_usage:exemptUsage(workspace), configured:polar.configured && polar.webhookConfigured, environment:scope,
      subscription: subscriptions(workspace)[0] || null,
      period:period ? {...period,...usage,available:Math.max(0,period.credits-usage.consumed-usage.reserved)} : null,
      plans:plans().filter(p=>p.published && p.eligible) };
  }
  function reserve(workspace, key, kind, source) {
    if (!enabled) return false;
    return transaction(db,()=>{
      if (account(workspace)?.status !== 'active') throw new HttpError(403, 'Cuenta suspendida.');
      const owner = exempt(workspace);
      const previous = db.prepare(`SELECT status FROM billing_operations WHERE environment=? AND workspace_id=? AND operation_key=?
        UNION ALL SELECT status FROM billing_exempt_operations WHERE environment=? AND workspace_id=? AND operation_key=?`).all(scope,workspace,key,scope,workspace,key);
      if (previous.some(row=>row.status==='reserved')) throw new HttpError(409, 'La operación ya está en curso.');
      const period = owner ? null : periods(workspace)[0];
      if (!owner && !period) throw new HttpError(402, 'Necesitas una suscripción pagada vigente. Revisa Facturación.');
      if (previous.some(row=>row.status==='consumed')) return false;
      if (owner) {
        db.prepare(`INSERT INTO billing_exempt_operations VALUES (?,?,?,?,?,'reserved',?,?) ON CONFLICT(environment,workspace_id,operation_key)
          DO UPDATE SET status='reserved',updated_at=excluded.updated_at`).run(scope,workspace,key,kind,source,stamp(),stamp());
        return 'billing_exempt_operations';
      }
      const used=counts(period.id);
      if (used.consumed + used.reserved >= period.credits) throw new HttpError(402, 'No quedan créditos disponibles. Revisa Facturación.');
      db.prepare(`INSERT INTO billing_operations VALUES (?,?,?,?,?,?,'reserved',?,?) ON CONFLICT(environment,workspace_id,operation_key)
        DO UPDATE SET period_id=excluded.period_id,status='reserved',updated_at=excluded.updated_at`).run(scope,workspace,key,period.id,kind,source,stamp(),stamp());
      return 'billing_operations';
    });
  }
  function finish(workspace,key,status,table) {
    if (!['billing_operations','billing_exempt_operations'].includes(table)) throw new Error('Invalid usage ledger.');
    db.prepare(`UPDATE ${table} SET status=?,updated_at=? WHERE environment=? AND workspace_id=? AND operation_key=? AND status='reserved'`).run(status,stamp(),scope,workspace,key);
  }
  function meter(workspace) {
    return {
      async run(kind,key,source,callback) {
        const held=reserve(workspace,key,kind,source);
        try { const value=await callback(); if (held) finish(workspace,key,'consumed',held); return value; }
        catch (error) { if (held) finish(workspace,key,'released',held); throw error; }
      },
      runSync(kind,key,source,callback) {
        const held=reserve(workspace,key,kind,source);
        try { const value=callback(); if (held) finish(workspace,key,'consumed',held); return value; }
        catch (error) { if (held) finish(workspace,key,'released',held); throw error; }
      },
    };
  }
  function normalizeProduct(p) {
    const prices=(p.prices || []).filter(v=>!v.is_archived);
    const price=prices[0];
    const eligible=!p.is_archived && p.is_recurring && p.recurring_interval==='month' && (p.recurring_interval_count ?? 1)===1 &&
      !p.trial_interval && prices.length===1 && price?.amount_type==='fixed' && Number.isSafeInteger(price.price_amount) && price.price_amount>0 &&
      typeof price.price_currency==='string' && !['inclusive','location'].includes(price.tax_behavior);
    return {product_id:p.id,name:String(p.name || 'Producto').slice(0,200),amount:price?.price_amount || 0,currency:price?.price_currency || 'usd',eligible:eligible?1:0};
  }
  async function syncProducts(actor) {
    const found=[];
    for(let page=1;page<=20;page++) {
      const data=await polar.request(`/products/?limit=100&page=${page}`);
      if (!Array.isArray(data.items)) throw new HttpError(502,'Polar devolvió un catálogo inválido.');
      found.push(...data.items.filter(p=>identifier(p.id) && (p.is_recurring || plan(p.id))).map(normalizeProduct));
      if(page >= (data.pagination?.max_page || 1)) break;
      if(page===20) throw new HttpError(502,'El catálogo supera el máximo de 2000 productos.');
    }
    transaction(db,()=>{
      db.prepare('UPDATE billing_plans SET eligible=0 WHERE environment=?').run(scope);
      for(const p of found) db.prepare(`INSERT INTO billing_plans(environment,product_id,name,amount,currency,eligible,synced_at) VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(environment,product_id) DO UPDATE SET name=excluded.name,amount=excluded.amount,currency=excluded.currency,eligible=excluded.eligible,synced_at=excluded.synced_at,version=billing_plans.version+1`).run(scope,p.product_id,p.name,p.amount,p.currency,p.eligible,stamp());
      audit(actor,'catalog','billing.catalog.sync');
    });
    return admin();
  }
  function audit(actor,subject,action) { db.prepare('INSERT INTO cloud_audit VALUES (?,?,?,?,?)').run(randomUUID(),actor,subject,action,stamp()); }
  function savePlan(id,body,actor) {
    object(body,['credits','published','expected_version']);
    if(!Number.isSafeInteger(body.credits)||body.credits<1||body.credits>100000000||typeof body.published!=='boolean') throw new HttpError(400,'Indica entre 1 y 100.000.000 créditos y el estado del plan.');
    return transaction(db,()=>{
      const p=plan(id);
      if(!p) throw new HttpError(404,'Sincroniza el producto desde Polar primero.');
      if(body.expected_version!==p.version) throw new HttpError(409,'El plan cambió. Recarga antes de guardar.');
      if(body.published && !p.eligible) throw new HttpError(400,'Usa un producto mensual de precio fijo, sin prueba gratuita e impuestos exclusivos.');
      db.prepare('UPDATE billing_plans SET credits=?,published=?,version=version+1 WHERE environment=? AND product_id=?').run(body.credits,body.published?1:0,scope,id);
      audit(actor,id,'billing.plan.update');
      return plan(id);
    });
  }
  function admin(page=1) {
    return {enabled,environment:scope,tokenConfigured:polar.configured,webhookConfigured:polar.webhookConfigured,webhookURL,plans:plans(),
      events:db.prepare("SELECT id,type,status,attempts,error,received_at FROM billing_events WHERE environment=? ORDER BY CASE status WHEN 'failed' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,received_at DESC LIMIT 20").all(scope),
      accounts:db.prepare(`SELECT c.workspace_id,u.email,u.name FROM cloud_accounts c JOIN auth_user u ON u.id=c.user_id ORDER BY c.created_at LIMIT 25 OFFSET ?`).all((page-1)*25).map(a=>({...a,...summary(a.workspace_id),plans:undefined})),
      total:db.prepare('SELECT count(*) n FROM cloud_accounts').get().n,page};
  }
  async function checkout(workspace,body) {
    object(body,['product_id']);
    if(!identifier(body.product_id)) throw new HttpError(400,'Selecciona un plan válido.');
    if(!enabled || !polar.webhookConfigured) throw new HttpError(503,'La facturación aún no está habilitada.');
    if(exempt(workspace)) throw new HttpError(409,'El dueño está exento de suscripción en esta instancia.');
    if(locks.has(workspace)) throw new HttpError(409,'Ya se está preparando tu checkout.');
    const p=plan(body.product_id);
    if(!p?.published || !p.eligible || !p.credits) throw new HttpError(400,'Plan no disponible.');
    locks.add(workspace);
    try {
      const member=account(workspace);
      const remote=await polar.request(`/subscriptions/?external_customer_id=${encodeURIComponent(workspace)}&limit=100`);
      if(!Array.isArray(remote.items)) throw new HttpError(502,'No se pudo verificar la suscripción.');
      if(remote.items.some(s=>['active','trialing','past_due','incomplete','unpaid'].includes(s.status))) throw new HttpError(409,'Ya tienes una suscripción. Adminístrala desde el portal de pagos.');
      const current=db.prepare('SELECT * FROM billing_checkouts WHERE environment=? AND workspace_id=?').get(scope,workspace);
      if(current && Date.parse(current.expires_at)>Date.now()) {
        if(current.product_id!==p.product_id) throw new HttpError(409,'Ya tienes un checkout pendiente para otro plan. Complétalo o espera a que venza.');
        return {url:current.url};
      }
      const fresh=normalizeProduct(await polar.request(`/products/${encodeURIComponent(p.product_id)}`));
      if(!fresh.eligible || fresh.amount!==p.amount || fresh.currency!==p.currency) throw new HttpError(409,'El precio cambió en Polar. El administrador debe sincronizar los planes.');
      const result=await polar.request('/checkouts/',{products:[p.product_id],external_customer_id:workspace,customer_email:member.email,
        customer_name:member.name,allow_trial:false,allow_discount_codes:false,require_billing_address:true,currency:p.currency,success_url:`${origin}/#/billing?checkout=success`,return_url:`${origin}/#/billing`,
        metadata:{openfunnel_workspace:workspace},
        prices:{[p.product_id]:[{amount_type:'fixed',price_amount:fresh.amount,price_currency:fresh.currency,tax_behavior:'exclusive'}]}});
      const url=polarURL(result.url);
      const expires=date(result.expires_at);
      if(!identifier(result.id)||!expires) throw new HttpError(502,'Polar devolvió un checkout inválido.');
      transaction(db,()=>{
        db.prepare('INSERT OR REPLACE INTO billing_checkouts VALUES (?,?,?,?,?,?)').run(scope,workspace,p.product_id,result.id,url,expires);
        db.prepare('INSERT OR IGNORE INTO billing_offers VALUES (?,?,?,?,?,?)').run(scope,result.id,workspace,p.product_id,p.credits,stamp());
      });
      return {url};
    } finally {locks.delete(workspace);}
  }
  function polarURL(value) {
    let url; try {url=new URL(value);} catch {}
    if(!url || url.protocol!=='https:' || url.username || url.password || !(url.hostname==='polar.sh'||url.hostname.endsWith('.polar.sh'))) throw new HttpError(502,'Polar devolvió un enlace inválido.');
    return url.href;
  }
  async function portal(workspace) {
    const value=await polar.request('/customer-sessions/',{external_customer_id:workspace,return_url:`${origin}/#/billing`});
    return {url:polarURL(value.customer_portal_url)};
  }
  function storeSubscription(s) {
    const workspace=s.customer?.external_id;
    if(!identifier(s.id)||!identifier(s.product_id)||!account(workspace)) return null;
    const start=date(s.current_period_start), end=date(s.current_period_end);
    if(!start||!end||end<=start) throw new HttpError(502,'La suscripción no contiene un período válido.');
    const modified=date(s.modified_at)||date(s.created_at)||stamp();
    db.prepare(`INSERT INTO billing_subscriptions VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(environment,id) DO UPDATE SET
      status=excluded.status,period_start=excluded.period_start,period_end=excluded.period_end,cancel_at_period_end=excluded.cancel_at_period_end,
      product_id=excluded.product_id,updated_at=excluded.updated_at WHERE excluded.updated_at>=billing_subscriptions.updated_at`).run(
      scope,s.id,workspace,s.customer_id,s.product_id,s.status,start,end,s.cancel_at_period_end?1:0,modified);
    return workspace;
  }
  function compact(event) {
    const d=event.data || {};
    return {id:d.id,checkout_id:d.checkout_id,subscription_id:d.subscription_id,product_id:d.product_id,customer_id:d.customer_id,
      customer:{external_id:d.customer?.external_id},billing_reason:d.billing_reason,paid:d.paid,total_amount:d.total_amount,
      net_amount:d.net_amount,refunded_amount:d.refunded_amount,refunded_tax_amount:d.refunded_tax_amount,
      created_at:d.created_at,subscription:d.subscription ? {current_period_start:d.subscription.current_period_start,current_period_end:d.subscription.current_period_end}:null};
  }
  async function receive(req) {
    let bytes=0;const chunks=[];
    for await(const chunk of req) {bytes+=chunk.length;if(bytes>512*1024) throw new HttpError(413,'Webhook demasiado grande.');chunks.push(chunk);}
    const event=polar.verify(Buffer.concat(chunks),req.headers);
    const id=req.headers['webhook-id'];
    if(typeof id!=='string'||id.length>200||typeof event?.type!=='string'||!identifier(event.data?.id)) throw new HttpError(400,'Evento de Polar inválido.');
    const supported=event.type==='order.paid'||event.type==='order.refunded'||event.type.startsWith('subscription.');
    db.prepare(`INSERT OR IGNORE INTO billing_events(environment,id,type,payload,status,received_at,available_at) VALUES (?,?,?,?,?,?,?)`).run(scope,id,event.type,JSON.stringify(compact(event)),supported?'pending':'ignored',stamp(),stamp());
    return {ok:true};
  }
  async function processEvent(row) {
    const d=JSON.parse(row.payload);
    if(row.type==='order.refunded') {
      if(d.refunded_amount>=d.net_amount && d.net_amount>0) db.prepare('UPDATE billing_periods SET revoked=1 WHERE environment=? AND order_id=?').run(scope,d.id);
      return;
    }
    const sid=row.type.startsWith('subscription.')?d.id:d.subscription_id;
    if(!identifier(sid)) return;
    const s=await polar.request(`/subscriptions/${encodeURIComponent(sid)}`);
    if(s.id!==sid) throw new HttpError(502,'Suscripción inesperada.');
    const workspace=storeSubscription(s);
    if(!workspace) return;
    if(row.type!=='order.paid'||!d.paid||!['subscription_create','subscription_cycle'].includes(d.billing_reason)) return;
    if(d.customer?.external_id!==workspace || d.customer_id!==s.customer_id) throw new HttpError(409,'El pago no corresponde al espacio de la suscripción.');
    const p=plan(d.product_id);
    if(!p || !p.credits) throw new HttpError(409,'Configura los créditos del producto antes de procesar este pago.');
    const start=date(d.subscription?.current_period_start),end=date(d.subscription?.current_period_end);
    if(!start||!end||end<=start) throw new HttpError(409,'El pago no contiene su período. Revisa la entrega en Polar.');
    // Never grant the current period for an old order whose subscription snapshot advanced.
    const created=date(d.created_at);
    if(!created || created<new Date(Date.parse(start)-86400000).toISOString() || created>=end) throw new HttpError(409,'El período del pago requiere revisión en Polar.');
    const offer=d.billing_reason==='subscription_create' && d.checkout_id ? db.prepare('SELECT credits FROM billing_offers WHERE environment=? AND checkout_id=? AND workspace_id=? AND product_id=?').get(scope,d.checkout_id,workspace,p.product_id) : null;
    transaction(db,()=>{
      const refund=db.prepare("SELECT payload FROM billing_events WHERE environment=? AND type='order.refunded'").all(scope).some(r=>{const v=JSON.parse(r.payload);return v.id===d.id && v.net_amount>0 && v.refunded_amount>=v.net_amount;});
      db.prepare('INSERT OR IGNORE INTO billing_periods VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),scope,workspace,sid,d.id,p.product_id,start,end,offer?.credits || p.credits,refund?1:0,stamp());
      db.prepare('DELETE FROM billing_checkouts WHERE environment=? AND workspace_id=?').run(scope,workspace);
    });
  }
  function processPending() {
    if(processing) return processing;
    processing=(async()=>{
      const rows=db.prepare("SELECT * FROM billing_events WHERE environment=? AND status='pending' AND available_at<=? ORDER BY received_at LIMIT 20").all(scope,stamp());
      for(const row of rows) {
        try {
          await processEvent(row);
          db.prepare("UPDATE billing_events SET status='processed',attempts=attempts+1,error=NULL WHERE environment=? AND id=?").run(scope,row.id);
        } catch(error) {
          const attempts=row.attempts+1;
          db.prepare('UPDATE billing_events SET status=?,attempts=?,error=?,available_at=? WHERE environment=? AND id=?').run(attempts>=8?'failed':'pending',attempts,error instanceof HttpError?error.message:'No se pudo procesar el evento.',new Date(Date.now()+Math.min(3600000,10000*2**attempts)).toISOString(),scope,row.id);
        }
      }
    })().finally(()=>{processing=null;});
    return processing;
  }
  function retry(id,actor) {
    const changed=db.prepare("UPDATE billing_events SET status='pending',attempts=0,error=NULL,available_at=? WHERE environment=? AND id=? AND status IN ('failed','pending')").run(stamp(),scope,id);
    if(!changed.changes) throw new HttpError(404,'Evento no reintentable.');
    audit(actor,id,'billing.event.retry'); return {ok:true};
  }
  function history(workspace,page) {
    const query = `SELECT operation_key,kind,source,status,created_at,0 AS exempt FROM billing_operations WHERE environment=? AND workspace_id=?
      UNION ALL SELECT operation_key,kind,source,status,created_at,1 AS exempt FROM billing_exempt_operations WHERE environment=? AND workspace_id=?`;
    return {items:db.prepare(`SELECT * FROM (${query}) ORDER BY created_at DESC,operation_key,exempt LIMIT 25 OFFSET ?`).all(scope,workspace,scope,workspace,(page-1)*25),
      total:db.prepare(`SELECT count(*) n FROM (${query})`).get(scope,workspace,scope,workspace).n,page};
  }
  return {enabled,summary,admin,syncProducts,savePlan,checkout,portal,receive,processPending,retry,history,meter,
    start(){stopped=false;timer=setInterval(()=>{if(!stopped) void processPending();},2000);timer.unref();void processPending();},
    async stop(){stopped=true;clearInterval(timer);await processing;},
  };
}
