import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fromNodeHeaders } from 'better-auth/node';
import { openDatabase } from './db.js';
import { createCloudAuth } from './cloud-auth.js';
import { encryptionKey, invalidateConnections } from './provider-connections.js';
import { HttpError, publicError } from './resources.js';
import { transaction } from './migrate.js';
import { createBilling } from './billing.js';

export async function createCloudApp({ databasePath, env, integrationOptions = {}, createWorkspace, readBody, send }) {
  const root = resolve(env.CLOUD_DATA_DIR || 'backend/data/cloud');
  const controlPath = databasePath || join(root, 'control.sqlite');
  const workspaceRoot = databasePath ? join(dirname(resolve(databasePath)), 'workspaces') : join(root, 'workspaces');
  const db = openDatabase(controlPath);
  let state, key, billing;
  try {
    if (db.prepare("SELECT 1 FROM auth_user WHERE id='openfunnel-admin'").get() || db.prepare('SELECT 1 FROM contacts LIMIT 1').get())
      throw new Error('Cloud necesita una base de control separada. Usa el procedimiento de migración.');
    key = encryptionKey(env);
    state = createCloudAuth(db, env, integrationOptions.mailFetch);
    billing = createBilling(db, env, integrationOptions.polarFetch);
  } catch (error) { db.close(); throw error; }
  const children = new Map();
  const opening = new Map();
  const sessions = new WeakMap();
  let running = false;
  function active(id) { return db.prepare("SELECT 1 FROM cloud_accounts WHERE workspace_id=? AND status='active'").get(id) !== undefined; }
  async function workspace(id) {
    if (children.has(id)) return children.get(id);
    if (opening.has(id)) return opening.get(id);
    if (!/^[a-f\d-]{36}$/.test(id) || !active(id)) throw new HttpError(403, 'Espacio no disponible.');
    const pending = createWorkspace({ databasePath: join(workspaceRoot, `${id}.sqlite`), env: {
      ...env, APP_MODE: 'cloud', APP_ORIGIN: state.origin,
      WORKSPACE_PATH: `/api/workspaces/${id}`,
      ZERNIO_WEBHOOK_SECRET: createHmac('sha256', key).update(`webhook:${id}`).digest('hex'),
      INTEGRATION_ACTIVE: () => active(id),
      BILLING_METER: billing.meter(id),
    }, integrationOptions, tenant: { id, session: req => active(id) ? sessions.get(req) : null } }).then(app => {
      children.set(id, app);
      if (running) app.integrations.start();
      return app;
    }).finally(() => opening.delete(id));
    opening.set(id, pending);
    return pending;
  }
  // Recover every active workspace, including accounts that never log in after restart.
  try { for (const row of db.prepare("SELECT workspace_id FROM cloud_accounts WHERE status='active'").all()) await workspace(row.workspace_id); }
  catch (error) { for (const app of children.values()) app.db.close(); db.close(); throw error; }
  const integrations = {
    start() { if (running) return; running = true; billing.start(); for (const app of children.values()) app.integrations.start(); },
    async stop() { running = false; await billing.stop(); await Promise.all([...children.values()].map(app => app.integrations.stop())); for (const app of children.values()) app.db.close(); children.clear(); },
  };
  const server = createServer(async (req,res) => {
    try {
      const url = new URL(req.url, state.origin);
      const path = url.pathname;
      if (req.method === 'GET' && path === '/api/health') {
        try { return send(res,200,{ok: db.prepare('SELECT 1 AS ok').get().ok === 1}); }
        catch { return send(res,503,{ok:false}); }
      }
      if (req.method === 'POST' && path === '/api/billing/polar/webhook') return send(res,202,await billing.receive(req));
      if (req.method === 'GET' && path === '/api/public-config') return send(res,200,{mode:'cloud'});
      const webhook = path.match(/^\/api\/workspaces\/([a-f\d-]{36})\/integrations\/zernio\/(webhook|callback)$/);
      if (webhook) {
        if (!active(webhook[1])) throw new HttpError(404, 'Ruta no encontrada.');
        if (webhook[2] === 'callback') {
          const session = await state.session(req);
          if (!session || session.account.workspace_id !== webhook[1]) throw new HttpError(403,'Conexión no autorizada.');
          sessions.set(req, session);
        } else if (req.method !== 'POST') throw new HttpError(404,'Ruta no encontrada.');
        req.url = `/api/integrations/zernio/${webhook[2]}${url.search}`;
        const app = await workspace(webhook[1]);
        return app.server.emit('request',req,res);
      }
      if (req.method !== 'GET' && !req.headers.authorization && req.headers.origin !== state.origin) throw new HttpError(403,'Origen de solicitud no permitido.');
      const authRoute = path === '/api/login' ? 'login' : path.match(/^\/api\/auth\/(register|resend|recover|verify|reset)$/)?.[1];
      if (authRoute) {
        if (req.method !== 'POST' || req.headers.authorization) throw new HttpError(404,'Ruta no encontrada.');
        return send(res,200,await state.handle(authRoute,await readBody(req),req,res));
      }
      if (path.startsWith('/api/auth/')) throw new HttpError(404,'Ruta no encontrada.');
      let session, member;
      if (req.headers.authorization !== undefined) {
        if (req.headers.cookie) throw new HttpError(400, 'No combines sesión y API key.');
        const id = req.headers['x-openfunnel-workspace'];
        if (typeof id !== 'string' || !/^[a-f\d-]{36}$/.test(id) || !active(id)) throw new HttpError(401,'API key o espacio no válido.');
        member = { workspace_id: id };
      } else {
        session = await state.session(req);
        if (!session) throw new HttpError(401,'Inicia sesión para continuar.');
        member = session.account;
        sessions.set(req,session);
      }
      if (path === '/api/session' && req.method === 'GET' && session) return send(res,200,{user:{name:session.user.name,email:session.user.email,role:member.role,workspaceId:member.workspace_id},expiresAt:session.session.expiresAt});
      if (path === '/api/logout' && req.method === 'POST' && session) {
        const response = await state.auth.api.signOut({headers:fromNodeHeaders(req.headers),asResponse:true});
        res.setHeader('Set-Cookie',response.headers.getSetCookie());
        return send(res,200,{ok:true});
      }
      if (['/api/session','/api/logout'].includes(path)) throw new HttpError(403,'Operación no permitida.');
      if (path === '/api/billing' || path.startsWith('/api/billing/')) {
        if (!session) throw new HttpError(403,'La facturación requiere una sesión de usuario.');
        const page = Math.max(1,Math.min(10000,Math.floor(Number(url.searchParams.get('page')) || 1)));
        if (path === '/api/billing' && req.method === 'GET') return send(res,200,billing.summary(member.workspace_id));
        if (path === '/api/billing/history' && req.method === 'GET') return send(res,200,billing.history(member.workspace_id,page));
        if (path === '/api/billing/checkout' && req.method === 'POST') return send(res,200,await billing.checkout(member.workspace_id,await readBody(req)));
        if (path === '/api/billing/portal' && req.method === 'POST') return send(res,200,await billing.portal(member.workspace_id));
        throw new HttpError(404,'Ruta no encontrada.');
      }
      if (path.startsWith('/api/admin/')) {
        if (!session || member.role !== 'superadmin') throw new HttpError(403,'Solo el dueño puede administrar cuentas.');
        if (path.startsWith('/api/admin/billing')) {
          const page = Math.max(1,Math.min(10000,Math.floor(Number(url.searchParams.get('page')) || 1)));
          if(path === '/api/admin/billing' && req.method === 'GET') return send(res,200,billing.admin(page));
          if(path === '/api/admin/billing/sync' && req.method === 'POST') return send(res,200,await billing.syncProducts(session.user.id));
          const plan = path.match(/^\/api\/admin\/billing\/plans\/([\w-]+)$/);
          if(plan && req.method === 'PUT') return send(res,200,billing.savePlan(plan[1],await readBody(req),session.user.id));
          const retry = path.match(/^\/api\/admin\/billing\/events\/([^/]+)\/retry$/);
          if(retry && req.method === 'POST') return send(res,200,billing.retry(decodeURIComponent(retry[1]),session.user.id));
          throw new HttpError(404,'Ruta no encontrada.');
        }
        if (path === '/api/admin/accounts' && req.method === 'GET') {
          const page = Math.max(1,Math.min(10000,Number(url.searchParams.get('page')) || 1));
          return send(res,200,{items:db.prepare('SELECT c.user_id AS id,u.name,u.email,c.role,c.status,c.created_at FROM cloud_accounts c JOIN auth_user u ON u.id=c.user_id ORDER BY c.created_at,c.user_id LIMIT 25 OFFSET ?').all((Math.floor(page)-1)*25), total:db.prepare('SELECT count(*) AS n FROM cloud_accounts').get().n,page:Math.floor(page),pageSize:25});
        }
        const target = path.match(/^\/api\/admin\/accounts\/([\w-]+)$/);
        if (!target || req.method !== 'PATCH') throw new HttpError(404,'Ruta no encontrada.');
        const body = await readBody(req);
        if (!body || Object.keys(body).length !== 1 || !['active','suspended'].includes(body.status)) throw new HttpError(400,'Estado inválido.');
        const account = db.prepare('SELECT * FROM cloud_accounts WHERE user_id=?').get(target[1]);
        if (!account) throw new HttpError(404,'Cuenta no encontrada.');
        if (account.role === 'superadmin') throw new HttpError(409,'No puedes suspender al dueño.');
        transaction(db, () => {
          db.prepare('UPDATE cloud_accounts SET status=? WHERE user_id=?').run(body.status,account.user_id);
          db.prepare('DELETE FROM auth_session WHERE userId=?').run(account.user_id);
          db.prepare('INSERT INTO cloud_audit VALUES (?,?,?,?,?)').run(randomUUID(),session.user.id,account.user_id,body.status,new Date().toISOString());
        });
        const app = children.get(account.workspace_id);
        if (body.status === 'suspended' && app) { invalidateConnections(app.db,'Cuenta suspendida.'); await app.integrations.stop(); }
        if (body.status === 'active') { const resumed = await workspace(account.workspace_id); if (running) resumed.integrations.start(); }
        return send(res,200,{ok:true});
      }
      const app = await workspace(member.workspace_id);
      return app.server.emit('request',req,res);
    } catch(error) {
      const problem = publicError(error);
      if (!res.headersSent) send(res,problem.status,{error:problem.message}); else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return { server, db, integrations, billing, configured:true };
}
