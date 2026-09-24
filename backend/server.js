import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { fromNodeHeaders } from 'better-auth/node';
import { openDatabase } from './db.js';
import { createAuth, getAdminSession } from './auth.js';
import { detail, list, save, remove, HttpError, publicError } from './resources.js';
import { resources } from '../shared/resources.js';
import { createIntegrations } from './integrations.js';

async function readBody(req) {
  if (!req.headers['content-type']?.startsWith('application/json'))
    throw new HttpError(415, 'Se requiere application/json.');
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 128 * 1024) throw new HttpError(413, 'La solicitud es demasiado grande.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}
function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}
export async function createApp({ databasePath, env = process.env, integrationOptions = {} } = {}) {
  const db = openDatabase(databasePath);
  let state;
  try {
    state = await createAuth(db, env);
  } catch (error) {
    db.close();
    throw error;
  }
  const integrations = createIntegrations(db, env, integrationOptions);
  let attempts = 0;
  let windowEnd = 0;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, state.origin);
      const path = url.pathname;
      if (req.method === 'GET' && path === '/api/health') {
        try {
          return send(res, 200, {
            ok: db.prepare('SELECT 1 AS ok').get().ok === 1,
          });
        } catch {
          return send(res, 503, { ok: false });
        }
      }
      if (req.method === 'POST' && path === '/api/integrations/zernio/webhook') {
        let bytes = 0;
        const chunks = [];
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 1024 * 1024) throw new HttpError(413, 'Evento demasiado grande.');
          chunks.push(chunk);
        }
        return send(
          res,
          200,
          integrations.receive(Buffer.concat(chunks), req.headers['x-zernio-signature']),
        );
      }
      if (req.method === 'GET' && path === '/api/integrations/zernio/callback') {
        let destination = '/channels?connection=failed';
        try {
          const session = await getAdminSession(state, req);
          if (session)
            destination = `/channels/${await integrations.callback(url.searchParams, session.session.id)}`;
        } catch {
          /* Return to a clean URL without provider tokens or query values. */
        }
        res.writeHead(303, {
          Location: `${state.origin}/#${destination}`,
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        });
        return res.end();
      }
      const integrationRoute = path.match(
        /^\/api\/(?:integrations(?:\/([a-z_-]+))?|channels\/([\w-]+)\/(automation)|conversations\/([\w-]+)\/(mode|send|sync|activity)|ai_agents\/([\w-]+)\/(validate|integration)|outbound\/([\w-]+)\/(review)|events\/([\w-]+)\/(retry))$/,
      );
      const authPath = ['/api/login', '/api/logout', '/api/session'].includes(path);
      const match = path.match(/^\/api\/([a-z_]+)(?:\/([\w-]+))?$/);
      const known = match && Object.hasOwn(resources, match[1]);
      const validMethod =
        known && (match[2] ? ['GET', 'PATCH', 'DELETE'] : ['GET', 'POST']).includes(req.method);
      if (!authPath && !validMethod && !integrationRoute)
        return send(res, 404, { error: 'Ruta no encontrada' });
      if (authPath && req.method !== (path === '/api/session' ? 'GET' : 'POST'))
        return send(res, 404, { error: 'Ruta no encontrada' });
      if (req.method !== 'GET' && req.headers.origin !== state.origin)
        throw new HttpError(403, 'Origen de solicitud no permitido.');
      if (!state.configured)
        throw new HttpError(503, 'Configura el acceso del administrador en el servidor.');
      if (path === '/api/login') {
        if (Date.now() >= windowEnd) {
          attempts = 0;
          windowEnd = Date.now() + 60000;
        }
        if (++attempts > 10) {
          res.setHeader('Retry-After', String(Math.ceil((windowEnd - Date.now()) / 1000)));
          throw new HttpError(429, 'Demasiados intentos. Espera un minuto.');
        }
        const body = await readBody(req);
        if (
          !body ||
          typeof body.username !== 'string' ||
          typeof body.password !== 'string' ||
          body.username.length > 80 ||
          body.password.length > 128
        )
          throw new HttpError(401, 'Usuario o contraseña incorrectos.');
        let response;
        try {
          response = await state.auth.api.signInUsername({
            body: { username: body.username, password: body.password },
            headers: fromNodeHeaders(req.headers),
            asResponse: true,
          });
        } catch {
          throw new HttpError(401, 'Usuario o contraseña incorrectos.');
        }
        if (!response.ok) throw new HttpError(401, 'Usuario o contraseña incorrectos.');
        res.setHeader('Set-Cookie', response.headers.getSetCookie());
        return send(res, 200, { user: { name: env.admin_user } });
      }
      const session = await getAdminSession(state, req);
      if (!session) throw new HttpError(401, 'Inicia sesión para continuar.');
      if (path === '/api/session')
        return send(res, 200, {
          user: { name: session.user.name },
          expiresAt: session.session.expiresAt,
        });
      if (path === '/api/logout') {
        const response = await state.auth.api.signOut({
          headers: fromNodeHeaders(req.headers),
          asResponse: true,
        });
        res.setHeader('Set-Cookie', response.headers.getSetCookie());
        return send(res, 200, { ok: true });
      }
      if (integrationRoute) {
        const [
          ,
          action,
          channelId,
          channelAction,
          conversationId,
          conversationAction,
          agentId,
          agentAction,
          outboundId,
          outboundAction,
          eventId,
        ] = integrationRoute;
        const get = req.method === 'GET';
        if (get && !action && !channelId && !conversationId && !agentId && !outboundId && !eventId)
          return send(res, 200, integrations.status());
        if (get && action === 'profiles') return send(res, 200, await integrations.profiles());
        if (get && conversationAction === 'activity')
          return send(res, 200, integrations.activity(conversationId));
        if (get && agentAction === 'integration')
          return send(res, 200, integrations.agentStatus(agentId));
        if (req.method !== 'POST') throw new HttpError(404, 'Ruta no encontrada.');
        const body = await readBody(req);
        if (!body || typeof body !== 'object' || Array.isArray(body))
          throw new HttpError(400, 'Se requiere un objeto JSON.');
        let result;
        if (action === 'sync') result = await integrations.syncAccounts();
        else if (action === 'profiles') result = await integrations.createProfile(body);
        else if (action === 'connect')
          result = await integrations.connect(body, session.session.id);
        else if (action === 'validate-model') result = await integrations.validateModel(body.model);
        else if (action === 'webhook') result = await integrations.registerWebhook();
        else if (channelAction) result = integrations.automation(channelId, body);
        else if (conversationAction === 'mode') result = integrations.mode(conversationId, body);
        else if (conversationAction === 'send') result = integrations.send(conversationId, body);
        else if (conversationAction === 'sync')
          result = integrations.syncConversation(conversationId);
        else if (agentAction === 'validate') result = await integrations.validateAgent(agentId);
        else if (outboundAction) result = await integrations.resolveOutbound(outboundId, body);
        else if (eventId) result = integrations.retryEvent(eventId);
        else throw new HttpError(404, 'Ruta no encontrada.');
        return send(res, 200, result);
      }
      const [, table, id] = match;
      if (req.method === 'GET')
        return send(res, 200, id ? detail(db, table, id) : list(db, table, url.searchParams));
      if (req.method === 'DELETE') {
        remove(db, table, id);
        return send(res, 200, { ok: true });
      }
      return send(res, id ? 200 : 201, save(db, table, await readBody(req), id));
    } catch (error) {
      const problem = publicError(error);
      if (!res.headersSent)
        send(res, problem.status, {
          error: problem.message,
          ...(problem.fields ? { fields: problem.fields } : {}),
        });
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return { server, db, integrations, configured: state.configured };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, db, integrations, configured } = await createApp();
  integrations.start();
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '127.0.0.1';
  server.listen(port, host, () => {
    console.log(`API: http://${host}:${server.address().port}`);
    if (!configured) console.log('Acceso deshabilitado: configura admin_user y admin_pass.');
  });
  async function shutdown() {
    await integrations.stop();
    server.close(() => {
      db.close();
      process.exit(0);
    });
    server.closeIdleConnections();
  }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
