import { randomUUID, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from './resources.js';
import { transaction } from './migrate.js';
import { createZernio, contract, externalId, accountRecord, supportedPlatforms } from './zernio.js';
import { createLLM, hash, functionTool, toolRegistry, agentMessages } from './llm.js';
import { integrationStore, now } from './integration-store.js';
const pathId = encodeURIComponent;
const events = [
  'message.received',
  'message.sent',
  'message.edited',
  'message.deleted',
  'message.delivered',
  'message.read',
  'message.failed',
  'conversation.started',
  'conversation.control_changed',
  'account.connected',
  'account.disconnected',
];
const publicProblem = (error) =>
  error instanceof HttpError
    ? error.message
    : 'No se pudo procesar la integración. Revisa el contrato del proveedor.';
export function createIntegrations(db, env, options = {}) {
  const zernio = createZernio(env, options.fetch);
  const llm = createLLM(env, options.llmClient);
  const s = integrationStore(db);
  let stopped = false,
    working = false,
    timer;
  let nextSweep = Date.now() + 300000;
  function requireRecord(table, id) {
    const row = s.get(table, id);
    if (!row) throw new HttpError(404, 'Registro no encontrado.');
    return row;
  }
  function publicBase() {
    let url;
    try {
      url = new URL(env.PUBLIC_BASE_URL);
    } catch {
      throw new HttpError(503, 'Configura PUBLIC_BASE_URL con una URL pública HTTPS.');
    }
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new HttpError(503, 'PUBLIC_BASE_URL debe ser un origen HTTPS sin ruta.');
    return url.origin;
  }
  const validated = (model) =>
    !!db.prepare('SELECT 1 FROM model_validations WHERE fingerprint=?').get(llm.fingerprint(model));
  const webhookFingerprint = () =>
    hash(JSON.stringify([env.PUBLIC_BASE_URL, env.ZERNIO_WEBHOOK_SECRET]));
  const webhookReady = () =>
    !!(
      env.ZERNIO_WEBHOOK_SECRET &&
      env.PUBLIC_BASE_URL &&
      s.setting('webhook_id') &&
      s.setting('webhook_fingerprint') === webhookFingerprint()
    );
  function ensureAgent(context) {
    const { agent } = context;
    const model = llm.config.model;
    if (!agent?.active) throw new HttpError(409, 'Selecciona un agente activo.');
    if (!llm.config.configured || !model || !validated(model))
      throw new HttpError(409, 'Valida primero el modelo del agente en Agentes IA.');
    if (!context.prompts.length)
      throw new HttpError(409, 'Asocia al menos un prompt activo al agente.');
    return model;
  }
  function sendable(c) {
    const channel = requireRecord('channels', c.channel_id);
    if (
      db
        .prepare("SELECT 1 FROM webhook_events WHERE conversation_id=? AND status='failed'")
        .get(c.id)
    )
      throw new HttpError(409, 'Hay eventos pendientes de revisión en esta conversación.');
    if (
      !c.external_id ||
      channel.provider !== 'zernio' ||
      channel.connection_status !== 'connected' ||
      !channel.active ||
      !channel.inbox_verified_at
    )
      throw new HttpError(409, 'El canal no tiene una conexión de mensajes verificada.');
    if (c.status !== 'open' || c.is_group || c.thread_control !== 'app')
      throw new HttpError(409, 'La conversación está cerrada o controlada externamente.');
    const age = Date.now() - Date.parse(c.last_incoming_at);
    if (!Number.isFinite(age) || age < -60000 || age >= 86400000)
      throw new HttpError(409, 'La ventana de respuesta de 24 horas está cerrada.');
    return channel;
  }
  function status() {
    const failed = db
      .prepare(
        "SELECT id,event,status,error,received_at FROM webhook_events WHERE status='failed' ORDER BY received_at DESC LIMIT 10",
      )
      .all();
    const jobs = db
      .prepare(
        'SELECT id,channel_id,status,error,updated_at FROM sync_jobs ORDER BY updated_at DESC LIMIT 20',
      )
      .all();
    return {
      zernio: {
        configured: !!env.ZERNIO_API_KEY,
        webhookConfigured: !!(env.ZERNIO_WEBHOOK_SECRET && env.PUBLIC_BASE_URL),
        webhookRegistered: webhookReady(),
        lastSync: s.setting('accounts_synced_at'),
        error: s.setting('accounts_error') || null,
      },
      llm: {
        configured: llm.config.configured,
        model: llm.config.model || null,
        validated: !!llm.config.model && validated(llm.config.model),
      },
      failedEvents: failed,
      syncJobs: jobs,
      unsupported: JSON.parse(s.setting('unsupported_accounts') || '[]'),
      tools: Object.entries(toolRegistry).map(([name, tool]) => ({
        name,
        ...tool,
      })),
    };
  }
  async function profiles() {
    const items = [];
    for (let skip = 0; skip < 10000; skip += 100) {
      const d = await zernio('/profiles', { query: { limit: 100, skip } });
      contract(Array.isArray(d.profiles));
      for (const p of d.profiles) {
        contract(externalId(p._id) && typeof p.name === 'string');
        items.push({ id: p._id, name: p.name });
      }
      if (d.profiles.length < 100) return { items };
    }
    throw new HttpError(502, 'Demasiados perfiles para sincronizar.');
  }
  async function createProfile(body) {
    if (
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      body.name.length > 100 ||
      !externalId(body.request_id)
    )
      throw new HttpError(400, 'Nombre e identificador de solicitud requeridos.');
    const d = await zernio('/profiles', {
      method: 'POST',
      body: { name: body.name.trim() },
      idempotencyKey: body.request_id,
    });
    contract(externalId(d.profile?._id));
    return { id: d.profile._id, name: d.profile.name };
  }
  async function accounts(query = {}) {
    const rows = [];
    for (let page = 1; page <= 100; page++) {
      const d = await zernio('/accounts', {
        query: { ...query, page, limit: 100 },
      });
      contract(Array.isArray(d.accounts));
      rows.push(...d.accounts.map(accountRecord));
      if (d.accounts.length < 100) return rows;
    }
    throw new HttpError(502, 'Demasiadas cuentas para sincronizar.');
  }
  function scheduleChannel(id) {
    db.prepare(
      "INSERT INTO sync_jobs (id,channel_id,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET status=CASE WHEN status='done' OR status='failed' THEN 'pending' ELSE status END,error=NULL,updated_at=excluded.updated_at",
    ).run(`channel:${id}`, id, now());
  }
  function scheduleConversation(c) {
    db.prepare(
      "INSERT INTO sync_jobs (id,channel_id,conversation_id,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=CASE WHEN status='done' OR status='failed' THEN 'pending' ELSE status END,error=NULL,updated_at=excluded.updated_at",
    ).run(`conversation:${c.id}`, c.channel_id, c.id, now());
  }
  async function syncAccounts() {
    try {
      const all = await accounts();
      const healthy = await accounts({ status: 'connected' });
      const healthyIds = new Set(healthy.map((a) => a.accountId));
      transaction(db, () => {
        for (const raw of all.filter((a) => supportedPlatforms.includes(a.platform)))
          scheduleChannel(s.upsertAccount(raw, healthyIds.has(raw.accountId)).id);
        // A missing account cannot continue automatic sends with stale authorization.
        for (const old of db.prepare("SELECT * FROM channels WHERE provider='zernio'").all())
          if (!all.some((a) => a.accountId === old.external_account_id))
            s.upsertAccount(
              {
                accountId: old.external_account_id,
                profileId: old.external_profile_id,
                platform: old.kind,
                name: old.name,
              },
              false,
            );
      });
      s.setSetting(
        'unsupported_accounts',
        JSON.stringify(
          all
            .filter((a) => !supportedPlatforms.includes(a.platform))
            .map((a) => ({ platform: a.platform, name: a.name })),
        ),
      );
      s.setSetting('accounts_synced_at', now());
      s.setSetting('accounts_error', '');
      return {
        count: all.filter((a) => supportedPlatforms.includes(a.platform)).length,
      };
    } catch (error) {
      s.setSetting('accounts_error', publicProblem(error));
      throw error;
    }
  }
  async function connect(body, sessionId) {
    if (!supportedPlatforms.includes(body.platform) || !externalId(body.profile_id))
      throw new HttpError(400, 'Plataforma o perfil inválido.');
    const available = await profiles();
    if (!available.items.some((p) => p.id === body.profile_id))
      throw new HttpError(400, 'El perfil no es accesible.');
    let channel = null;
    if (body.channel_id) {
      channel = requireRecord('channels', body.channel_id);
      if (
        channel.provider !== 'zernio' ||
        channel.kind !== body.platform ||
        channel.external_profile_id !== body.profile_id
      )
        throw new HttpError(400, 'El canal no coincide con el perfil o plataforma.');
    }
    if (body.platform === 'whatsapp' && !['api', 'business_app'].includes(body.onboarding))
      throw new HttpError(400, 'Elige Cloud API o coexistencia.');
    const nonce = randomBytes(32).toString('hex');
    const redirect = `${publicBase()}${env.WORKSPACE_PATH || '/api'}/integrations/zernio/callback?attempt=${nonce}`;
    const d = await zernio(`/connect/${body.platform}`, {
      query: {
        profileId: body.profile_id,
        redirect_url: redirect,
        ...(body.platform === 'instagram'
          ? { loginMethod: 'instagram_login' }
          : {
              signup: 'hosted',
              onboarding: body.onboarding,
              language: 'es',
              brandName: 'OpenFunnel',
            }),
      },
    });
    let auth;
    try {
      auth = new URL(d.authUrl);
    } catch {
      throw new HttpError(502, 'Zernio no devolvió una URL válida.');
    }
    contract(
      auth.protocol === 'https:' &&
        !auth.username &&
        !auth.password &&
        [
          'zernio.com',
          'www.zernio.com',
          'www.facebook.com',
          'facebook.com',
          'www.instagram.com',
          'instagram.com',
        ].includes(auth.hostname),
    );
    db.prepare('INSERT INTO connection_attempts VALUES (?,?,?,?,?,?)').run(
      hash(nonce),
      hash(sessionId),
      body.platform,
      body.profile_id,
      channel?.id || null,
      new Date(Date.now() + 900000).toISOString(),
    );
    return { authUrl: auth.href };
  }
  async function callback(query, sessionId) {
    const attempt = db
      .prepare('SELECT * FROM connection_attempts WHERE nonce=?')
      .get(hash(query.get('attempt') || ''));
    if (!attempt || attempt.session_hash !== hash(sessionId) || attempt.expires_at < now())
      throw new HttpError(400, 'Intento de conexión inválido o vencido. Vuelve a Canales.');
    db.prepare('DELETE FROM connection_attempts WHERE nonce=?').run(attempt.nonce);
    if (query.has('error'))
      throw new HttpError(
        409,
        'La conexión fue cancelada o el proveedor requiere completar su configuración. Vuelve a Canales.',
      );
    if (
      query.get('profileId') !== attempt.profile_id ||
      query.get('connected') !== attempt.platform
    )
      throw new HttpError(400, 'La conexión no coincide con el intento.');
    const rows = await accounts({
      profileId: attempt.profile_id,
      status: 'connected',
    });
    const account = rows.find(
      (a) => a.accountId === query.get('accountId') && a.platform === attempt.platform,
    );
    if (!account) throw new HttpError(409, 'No se pudo verificar la cuenta conectada.');
    if (
      attempt.channel_id &&
      requireRecord('channels', attempt.channel_id).external_account_id !== account.accountId
    )
      throw new HttpError(409, 'Se autorizó otra cuenta. Conéctala como un canal nuevo.');
    const channel = s.upsertAccount(account, true);
    scheduleChannel(channel.id);
    return channel.id;
  }
  async function registerWebhook() {
    const version = env.ZERNIO_CONNECTION_VERSION;
    const fingerprint = webhookFingerprint();
    if (!env.ZERNIO_WEBHOOK_SECRET || env.ZERNIO_WEBHOOK_SECRET.length < 32)
      throw new HttpError(503, 'Configura ZERNIO_WEBHOOK_SECRET con al menos 32 caracteres.');
    const url = `${publicBase()}${env.WORKSPACE_PATH || '/api'}/integrations/zernio/webhook`;
    const d = await zernio('/webhooks/settings');
    contract(Array.isArray(d.webhooks));
    const old =
      d.webhooks.find((w) => w._id === s.setting('webhook_id')) ||
      d.webhooks.find((w) => w.url === url && w.name === 'OpenFunnel inbox');
    const body = {
      name: 'OpenFunnel inbox',
      url,
      secret: env.ZERNIO_WEBHOOK_SECRET,
      events,
      isActive: true,
    };
    const saved = await zernio('/webhooks/settings', {
      method: old ? 'PUT' : 'POST',
      body: old ? { ...body, webhookId: old._id } : body,
    });
    const id = saved.webhook?._id || old?._id;
    contract(externalId(id));
    if (version !== env.ZERNIO_CONNECTION_VERSION || fingerprint !== webhookFingerprint())
      throw new HttpError(409, 'La conexión cambió durante la operación.');
    s.setSetting('webhook_id', id);
    s.setSetting('webhook_fingerprint', webhookFingerprint());
    return { ok: true };
  }
  function receive(raw, signature) {
    if (!env.ZERNIO_WEBHOOK_SECRET || env.ZERNIO_WEBHOOK_SECRET.length < 32)
      throw new HttpError(503, 'Configura ZERNIO_WEBHOOK_SECRET con al menos 32 caracteres.');
    if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature))
      throw new HttpError(401, 'Firma inválida.');
    const expected = createHmac('sha256', env.ZERNIO_WEBHOOK_SECRET).update(raw).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex')))
      throw new HttpError(401, 'Firma inválida.');
    let body;
    try {
      body = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new HttpError(400, 'JSON inválido.');
    }
    if (!externalId(body?.id) || typeof body.event !== 'string')
      throw new HttpError(400, 'Evento sin identificador o tipo.');
    const channel = db
      .prepare("SELECT * FROM channels WHERE provider='zernio' AND external_account_id=?")
      .get(body.account?.accountId || body.account?.id || '');
    const ignored = !events.includes(body.event);
    db.prepare(
      'INSERT OR IGNORE INTO webhook_events (id,event,payload,channel_id,status,received_at) VALUES (?,?,?,?,?,?)',
    ).run(
      body.id,
      body.event,
      ignored ? null : JSON.stringify(body),
      channel?.id || null,
      ignored ? 'ignored' : 'pending',
      now(),
    );
    return { ok: true };
  }
  async function syncPage(job) {
    const channel = requireRecord('channels', job.channel_id);
    if (channel.connection_status !== 'connected') throw new HttpError(409, 'Canal desconectado.');
    const conversation = job.conversation_id
      ? requireRecord('conversations', job.conversation_id)
      : null;
    const d = await zernio(
      conversation
        ? `/inbox/conversations/${pathId(conversation.external_id)}/messages`
        : '/inbox/conversations',
      {
        query: {
          accountId: channel.external_account_id,
          limit: 100,
          cursor: job.cursor,
          ...(conversation ? { sortOrder: 'asc' } : {}),
        },
      },
    );
    contract(Array.isArray(conversation ? d.messages : d.data));
    if (d.meta?.accountsFailed || d.meta?.failedAccounts?.length)
      throw new HttpError(
        502,
        'Zernio no pudo consultar Inbox para este canal. Revisa permisos y conexión.',
      );
    const next = d.pagination?.hasMore ? d.pagination.nextCursor : null;
    contract(!d.pagination?.hasMore || (externalId(next) && next !== job.cursor));
    // Normalize each row before advancing the cursor; repeated partial pages are safe.
    for (const row of conversation ? d.messages : d.data) {
      if (conversation) s.upsertMessage(row, channel, conversation, 'imported');
      else scheduleConversation(s.upsertConversation(row, channel));
    }
    db.prepare('UPDATE sync_jobs SET cursor=?,status=?,error=NULL,updated_at=? WHERE id=?').run(
      next,
      next ? 'pending' : 'done',
      now(),
      job.id,
    );
    db.prepare(
      'UPDATE channels SET inbox_verified_at=?,last_synced_at=?,sync_error=NULL WHERE id=?',
    ).run(now(), now(), channel.id);
  }
  async function processEvent(event) {
    const body = JSON.parse(event.payload);
    let channel = s.get('channels', event.channel_id || '');
    if (body.event.startsWith('account.')) {
      await syncAccounts();
      return;
    }
    if (!channel) {
      await syncAccounts();
      channel = db
        .prepare("SELECT * FROM channels WHERE provider='zernio' AND external_account_id=?")
        .get(body.account?.accountId || body.account?.id || '');
    }
    if (!channel)
      throw new HttpError(409, 'La cuenta del evento no está sincronizada o no es compatible.');
    contract(body.account?.platform === channel.kind);
    const remoteId = body.conversation?.id;
    contract(externalId(remoteId));
    let c = db
      .prepare('SELECT * FROM conversations WHERE channel_id=? AND external_id=?')
      .get(channel.id, remoteId);
    if (!c) {
      const d = await zernio(`/inbox/conversations/${pathId(remoteId)}`, {
        query: { accountId: channel.external_account_id },
      });
      c = s.upsertConversation(d.data, channel);
    }
    db.prepare('UPDATE webhook_events SET channel_id=?,conversation_id=? WHERE id=?').run(
      channel.id,
      c.id,
      event.id,
    );
    if (
      body.metadata?.standby ||
      body.message?.source === 'meta_business_agent' ||
      body.event === 'conversation.control_changed'
    ) {
      const owner =
        body.control?.owner ||
        (body.metadata?.standby || body.message?.source === 'meta_business_agent'
          ? 'ai_agent'
          : 'other');
      contract(['app', 'ai_agent', 'other'].includes(owner));
      db.prepare('UPDATE conversations SET thread_control=? WHERE id=?').run(owner, c.id);
      if (owner !== 'app') s.pause(c.id, 'Otro controlador atiende esta conversación.');
    }
    if (['message.received', 'message.sent'].includes(body.event)) {
      const m = body.message;
      contract(
        m &&
          externalId(m.platformMessageId) &&
          m.platform === channel.kind &&
          m.direction === (body.event === 'message.received' ? 'incoming' : 'outgoing'),
      );
      const saved = s.upsertMessage(
        {
          id: m.platformMessageId,
          conversationId: c.external_id,
          accountId: channel.external_account_id,
          platform: channel.kind,
          message: m.text,
          direction: m.direction,
          createdAt: m.sentAt,
          attachments: m.attachments,
          metadata: { source: m.source },
          sentVia: m.sentVia,
        },
        channel,
        c,
        'remote',
      );
      c = s.get('conversations', c.id);
      if (
        body.event === 'message.received' &&
        !body.metadata?.standby &&
        c.thread_control === 'app'
      )
        s.enqueueRun(c, saved.row);
    } else if (
      [
        'message.edited',
        'message.deleted',
        'message.delivered',
        'message.read',
        'message.failed',
      ].includes(body.event)
    ) {
      const m = body.message;
      contract(externalId(m?.platformMessageId) && m.platform === channel.kind);
      s.upsertMessage(
        {
          id: m.platformMessageId,
          conversationId: c.external_id,
          accountId: channel.external_account_id,
          platform: channel.kind,
          message: m.text,
          direction: m.direction,
          createdAt: m.sentAt,
          attachments: m.attachments,
          isDeleted: body.event === 'message.deleted',
          editedAt: body.event === 'message.edited' ? body.editedAt || body.timestamp : undefined,
          deliveryStatus: {
            'message.delivered': 'delivered',
            'message.read': 'read',
            'message.failed': 'failed',
            'message.deleted': 'deleted',
          }[body.event],
        },
        channel,
        c,
        'remote',
      );
    }
    scheduleConversation(c);
  }
  function enqueueOutbound(conversation, body, requestId, run = null, configHash = null) {
    if (typeof body !== 'string' || !body.trim() || body.length > 1000)
      throw new HttpError(400, 'El mensaje debe tener entre 1 y 1000 caracteres.');
    if (!externalId(requestId) || requestId.length > 100)
      throw new HttpError(400, 'Identificador de envío inválido.');
    const existing = s.get('outbound_messages', requestId);
    if (existing) {
      const message = s.get('messages', existing.message_id);
      if (existing.conversation_id !== conversation.id || message.body !== body)
        throw new HttpError(409, 'El identificador ya corresponde a otro envío.');
      return existing;
    }
    sendable(conversation);
    if (!run && conversation.automation_mode !== 'manual')
      throw new HttpError(409, 'Toma control de la conversación antes de responder.');
    if (
      db
        .prepare(
          "SELECT 1 FROM outbound_messages WHERE conversation_id=? AND status IN ('uncertain','sending')",
        )
        .get(conversation.id)
    )
      throw new HttpError(409, 'Hay un envío incierto o en curso; revísalo antes de continuar.');
    const stamp = now();
    const messageId = randomUUID();
    transaction(db, () => {
      db.prepare(
        "INSERT INTO messages (id,conversation_id,body,direction,occurred_at,created_at,updated_at,source,delivery_status,agent_run_id) VALUES (?,?,?,'outgoing',?,?,?,?,'pending',?)",
      ).run(
        messageId,
        conversation.id,
        body,
        stamp,
        stamp,
        stamp,
        run ? 'ai' : 'human',
        run?.id || null,
      );
      db.prepare(
        'INSERT INTO outbound_messages (id,message_id,conversation_id,agent_run_id,revision,config_hash,available_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
      ).run(
        requestId,
        messageId,
        conversation.id,
        run?.id || null,
        conversation.revision,
        configHash,
        stamp,
        stamp,
        stamp,
      );
      if (!run)
        db.prepare('UPDATE conversations SET revision=revision+1 WHERE id=?').run(conversation.id);
    });
    return s.get('outbound_messages', requestId);
  }
  async function deliver(job) {
    if (stopped || (env.INTEGRATION_ACTIVE && !env.INTEGRATION_ACTIVE())) return;
    const c = requireRecord('conversations', job.conversation_id);
    const message = requireRecord('messages', job.message_id);
    try {
      const channel = sendable(c);
      if (job.agent_run_id) {
        const ctx = s.agentContext(c);
        ensureAgent(ctx);
        if (
          c.automation_mode !== 'automatic' ||
          !ctx.channel.automation_enabled ||
          c.revision !== job.revision ||
          ctx.configHash !== job.config_hash
        )
          throw new HttpError(
            409,
            'Respuesta cancelada por cambios en la conversación o el agente.',
          );
      }
      db.prepare(
        "UPDATE outbound_messages SET status='sending',attempts=attempts+1,updated_at=? WHERE id=?",
      ).run(now(), job.id);
      db.prepare("UPDATE messages SET delivery_status='sending' WHERE id=?").run(job.message_id);
      const d = await zernio(`/inbox/conversations/${pathId(c.external_id)}/messages`, {
        method: 'POST',
        idempotencyKey: job.id,
        body: {
          accountId: channel.external_account_id,
          message: message.body,
        },
      });
      contract(d.success === true && externalId(d.data?.messageId) && !d.data?.partialFailure);
      transaction(db, () => {
        const echo = db
          .prepare('SELECT id FROM messages WHERE conversation_id=? AND external_id=?')
          .get(c.id, d.data.messageId);
        if (echo && echo.id !== job.message_id)
          db.prepare('DELETE FROM messages WHERE id=?').run(echo.id);
        db.prepare(
          "UPDATE messages SET external_id=?,delivery_status='sent',updated_at=? WHERE id=?",
        ).run(d.data.messageId, now(), job.message_id);
        db.prepare(
          "UPDATE outbound_messages SET status='sent',error=NULL,updated_at=? WHERE id=?",
        ).run(now(), job.id);
      });
    } catch (error) {
      const current = s.get('outbound_messages', job.id);
      const retry = error.providerStatus === 429 && current.attempts < 3;
      const uncertain =
        current.status === 'sending' &&
        (error.providerStatus === 0 || error.providerStatus >= 500 || error.providerStatus == null);
      const state = retry
        ? 'pending'
        : uncertain
          ? 'uncertain'
          : current.status === 'sending'
            ? 'failed'
            : 'cancelled';
      db.prepare(
        'UPDATE outbound_messages SET status=?,error=?,available_at=?,updated_at=? WHERE id=?',
      ).run(
        state,
        publicProblem(error),
        new Date(Date.now() + (error.retryAfter || 60) * 1000).toISOString(),
        now(),
        job.id,
      );
      db.prepare('UPDATE messages SET delivery_status=? WHERE id=?').run(state, job.message_id);
      if (state === 'uncertain') {
        s.pause(c.id, 'Envío con resultado incierto. Revisa el historial antes de continuar.');
        scheduleConversation(c);
      }
    }
  }
  const hasPendingInput = (c) =>
    !!db
      .prepare(
        "SELECT 1 FROM webhook_events WHERE status='pending' AND json_extract(payload,'$.conversation.id')=? AND (channel_id=? OR json_extract(payload,'$.account.accountId')=? OR json_extract(payload,'$.account.id')=?)",
      )
      .get(
        c.external_id,
        c.channel_id,
        s.get('channels', c.channel_id).external_account_id,
        s.get('channels', c.channel_id).external_account_id,
      );
  async function runAgent(run) {
    let c = requireRecord('conversations', run.conversation_id);
    let ctx = s.agentContext(c);
    try {
      const model = ensureAgent(ctx);
      sendable(c);
      if (c.automation_mode !== 'automatic' || !ctx.channel.automation_enabled)
        throw new HttpError(409, 'La automatización está pausada.');
      const newer = db
        .prepare(
          "SELECT 1 FROM agent_runs WHERE conversation_id=? AND status='pending' AND created_at>? LIMIT 1",
        )
        .get(c.id, run.created_at);
      if (newer) {
        db.prepare("UPDATE agent_runs SET status='cancelled',updated_at=? WHERE id=?").run(
          now(),
          run.id,
        );
        return;
      }
      const revision = c.revision;
      const configHash = ctx.configHash;
      const prompt = ctx.prompts.map((p) => p.content).join('\n\n');
      if (prompt.length > 30000)
        throw new HttpError(
          409,
          'Los prompts activos superan el límite de contexto de 30000 caracteres.',
        );
      const history = db
        .prepare(
          "SELECT body,direction FROM messages WHERE conversation_id=? AND is_deleted=0 AND has_attachments=0 AND source!='manual' AND (direction='incoming' OR delivery_status IN ('sent','delivered','read')) ORDER BY occurred_at DESC,rowid DESC LIMIT 30",
        )
        .all(c.id)
        .reverse();
      let remaining = 18000;
      const bounded = [];
      for (const m of [...history].reverse()) {
        if (m.body.length > remaining) break;
        bounded.unshift({
          role: m.direction === 'incoming' ? 'user' : 'assistant',
          content: m.body,
        });
        remaining -= m.body.length;
      }
      if (!bounded.length)
        throw new HttpError(409, 'No hay mensajes compatibles dentro del límite de contexto.');
      const permitted = s.executableTools(ctx);
      const names = [...new Set(permitted.map((t) => t.kind))];
      const messages = [...agentMessages(prompt, ctx.documents), ...bounded];
      db.prepare(
        "UPDATE agent_runs SET status='running',model=?,prompt_snapshot=?,revision=?,config_hash=?,attempts=attempts+1,updated_at=? WHERE id=?",
      ).run(model, prompt, revision, configHash, now(), run.id);
      const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      let count = 0;
      const started = Date.now();
      const stillCurrent = () => {
        const latest = s.get('conversations', c.id);
        return (
          !stopped &&
          latest.automation_mode === 'automatic' &&
          latest.revision === revision &&
          s.agentContext(latest).configHash === configHash &&
          s.get('agent_runs', run.id).status === 'running' &&
          !hasPendingInput(c)
        );
      };
      for (let round = 0; round < 3; round++) {
        if (!stillCurrent())
          throw new HttpError(409, 'La conversación cambió durante la generación.');
        if (Date.now() - started > 60000)
          throw new HttpError(409, 'Se alcanzó el tiempo máximo de ejecución.');
        const result = await llm.complete(model, messages, names.map(functionTool), {}, {}, {key:`run:${run.id}:llm:${round}`,source:'agent'});
        if (result.usage) for (const k of Object.keys(usage)) usage[k] += result.usage[k] || 0;
        db.prepare('UPDATE agent_runs SET usage=?,updated_at=? WHERE id=?').run(
          JSON.stringify(usage),
          now(),
          run.id,
        );
        if (!stillCurrent())
          throw new HttpError(409, 'La conversación cambió durante la generación.');
        const calls = result.message.tool_calls;
        if (!calls?.length) {
          if (typeof result.message.content !== 'string' || !result.message.content.trim())
            throw new HttpError(502, 'El modelo no devolvió texto.');
          enqueueOutbound(c, result.message.content, run.id, run, configHash);
          db.prepare("UPDATE agent_runs SET status='completed',updated_at=? WHERE id=?").run(
            now(),
            run.id,
          );
          return;
        }
        messages.push(result.message);
        for (const call of calls) {
          if (++count > 5 || !externalId(call.id))
            throw new HttpError(409, 'Se alcanzó el límite de herramientas.');
          const name = call.function?.name;
          let args;
          try {
            args = JSON.parse(call.function?.arguments);
          } catch {
            args = null;
          }
          const valid =
            names.includes(name) &&
            args &&
            typeof args === 'object' &&
            !Array.isArray(args) &&
            Object.keys(args).every((k) => name === 'handoff_to_human' && k === 'reason') &&
            (name !== 'handoff_to_human' ||
              (typeof args.reason === 'string' && args.reason.trim() && args.reason.length <= 500));
          if (!valid) {
            db.prepare('INSERT INTO tool_runs VALUES (?,?,?,?,1,?,?,?,?)').run(
              randomUUID(),
              run.id,
              call.id,
              String(name || 'unknown').slice(0, 100),
              null,
              null,
              'rejected',
              now(),
            );
            throw new HttpError(409, 'Herramienta o argumentos no autorizados.');
          }
          if (!stillCurrent())
            throw new HttpError(409, 'La conversación cambió durante las herramientas.');
          const executeTool = () => {
          let output;
          if (name === 'get_contact') {
            const contact = s.get('contacts', c.contact_id);
            output = {
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              notes: contact.notes,
            };
          }
          if (name === 'get_ticket') {
            const ticket = db
              .prepare(
                'SELECT title,description,status,pipeline_id,stage_id FROM tickets WHERE conversation_id=? AND contact_id=?',
              )
              .get(c.id, c.contact_id);
            output = ticket || { found: false };
          }
          if (name === 'handoff_to_human') output = { handedOff: true };
          const serialized = JSON.stringify(output).slice(0, 10000);
          transaction(db, () => {
            db.prepare('INSERT INTO tool_runs VALUES (?,?,?,?,1,?,?,?,?)').run(
              randomUUID(),
              run.id,
              call.id,
              name,
              JSON.stringify(args),
              serialized,
              'completed',
              now(),
            );
            if (name === 'handoff_to_human') s.pause(c.id, args.reason);
          });
          return serialized;
          };
          const serialized = env.BILLING_METER ? env.BILLING_METER.runSync('tool',`run:${run.id}:tool:${round}:${count}`, 'agent', executeTool) : executeTool();
          if (name === 'handoff_to_human') {
            db.prepare("UPDATE agent_runs SET status='handed_off',updated_at=? WHERE id=?").run(
              now(),
              run.id,
            );
            return;
          }
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: serialized,
          });
        }
      }
      throw new HttpError(409, 'Se alcanzó el límite de rondas del modelo.');
    } catch (error) {
      const current = s.get('agent_runs', run.id);
      if (current.status === 'cancelled') return;
      const transient = error.providerStatus === 429 && current.attempts < 3;
      db.prepare(
        'UPDATE agent_runs SET status=?,error=?,available_at=?,updated_at=? WHERE id=?',
      ).run(
        transient ? 'pending' : error.status === 409 ? 'cancelled' : 'failed',
        publicProblem(error),
        new Date(Date.now() + 60000).toISOString(),
        now(),
        run.id,
      );
      // Preserve new pending input; a config/revision cancellation must not pause it.
      const latest = s.get('conversations', c.id);
      if (
        !transient &&
        latest.revision === current.revision &&
        latest.automation_mode === 'automatic' &&
        !hasPendingInput(latest)
      )
        s.pause(c.id, publicProblem(error));
    }
  }
  function automation(id, body) {
    const channel = requireRecord('channels', id);
    if (
      channel.provider !== 'zernio' ||
      typeof body.enabled !== 'boolean' ||
      (body.agent_id != null && typeof body.agent_id !== 'string')
    )
      throw new HttpError(400, 'Configuración de automatización inválida.');
    const agentId = body.agent_id || null;
    if (agentId) requireRecord('ai_agents', agentId);
    if (body.enabled) {
      if (
        channel.connection_status !== 'connected' ||
        !channel.inbox_verified_at ||
        !channel.active
      )
        throw new HttpError(409, 'Sincroniza y verifica primero los mensajes del canal.');
      const synthetic = { channel_id: id, ai_agent_id: agentId };
      ensureAgent(s.agentContext(synthetic));
      if (!webhookReady()) throw new HttpError(409, 'Registra primero el webhook de mensajes.');
    }
    transaction(db, () => {
      db.prepare(
        'UPDATE channels SET default_ai_agent_id=?,automation_enabled=?,automation_enabled_at=?,updated_at=? WHERE id=?',
      ).run(agentId, Number(body.enabled), body.enabled ? now() : null, now(), id);
      for (const c of db.prepare('SELECT id FROM conversations WHERE channel_id=?').all(id)) {
        db.prepare('UPDATE conversations SET revision=revision+1 WHERE id=?').run(c.id);
        db.prepare(
          "UPDATE agent_runs SET status='cancelled' WHERE conversation_id=? AND status='pending'",
        ).run(c.id);
      }
    });
    return { ok: true };
  }
  function mode(id, body) {
    const c = requireRecord('conversations', id);
    if (!c.external_id) throw new HttpError(409, 'Esta conversación es manual.');
    if (!['manual', 'automatic'].includes(body.mode)) throw new HttpError(400, 'Modo inválido.');
    if (body.mode === 'manual') s.pause(id, 'Control tomado por el administrador.');
    else {
      sendable(c);
      const ctx = s.agentContext(c);
      ensureAgent(ctx);
      if (!ctx.channel.automation_enabled)
        throw new HttpError(409, 'Activa primero la IA del canal.');
      db.prepare(
        "UPDATE conversations SET automation_mode='automatic',pause_reason=NULL,revision=revision+1 WHERE id=?",
      ).run(id);
    }
    return { ok: true };
  }
  async function validateModel(requestedModel) {
    const model = llm.config.model;
    if (requestedModel !== undefined && requestedModel !== model)
      throw new HttpError(400, 'El modelo se configura en LLM_MODEL del servidor.');
    if (typeof model !== 'string' || !model.trim() || model.length > 160)
      throw new HttpError(400, 'Indica el deployment/modelo.');
    const fingerprint = await llm.validate(model);
    db.prepare(
      'INSERT INTO model_validations VALUES (?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET validated_at=excluded.validated_at',
    ).run(fingerprint, model, now());
    return { ok: true, model };
  }
  async function validateAgent(id) {
    const agent = requireRecord('ai_agents', id);
    if (!agent.active) throw new HttpError(400, 'Activa el agente antes de validar su modelo.');
    return validateModel();
  }
  function activity(id) {
    const c = requireRecord('conversations', id);
    const context = s.agentContext(c);
    return {
      agent: context.agent ? { id: context.agent.id, name: context.agent.name } : null,
      channel: context.channel.name,
      mode: c.automation_mode,
      pauseReason: c.pause_reason,
      connected: !!c.external_id,
      runs: db
        .prepare(
          'SELECT id,status,model,usage,error,created_at,updated_at FROM agent_runs WHERE conversation_id=? ORDER BY created_at DESC LIMIT 20',
        )
        .all(id),
      tools: db
        .prepare(
          'SELECT t.id,t.name,t.status,t.created_at FROM tool_runs t JOIN agent_runs r ON r.id=t.agent_run_id WHERE r.conversation_id=? ORDER BY t.created_at DESC LIMIT 30',
        )
        .all(id),
      outbox: db
        .prepare(
          'SELECT id,message_id,status,error,created_at FROM outbound_messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 20',
        )
        .all(id),
    };
  }
  async function resolveOutbound(id, body) {
    const job = requireRecord('outbound_messages', id);
    if (job.status !== 'uncertain') throw new HttpError(409, 'Este envío no requiere revisión.');
    const c = requireRecord('conversations', job.conversation_id);
    if (body.action !== 'reviewed') throw new HttpError(400, 'Acción inválida.');
    // This acknowledges review, not a delivery confirmation or a resend.
    db.prepare("UPDATE outbound_messages SET status='reviewed',updated_at=? WHERE id=?").run(
      now(),
      id,
    );
    scheduleConversation(c);
    return { ok: true };
  }
  function agentStatus(id) {
    const agent = requireRecord('ai_agents', id);
    const model = llm.config.model;
    const tools = db
      .prepare(
        'SELECT t.id,t.name,t.kind FROM agent_tools a JOIN tools t ON t.id=a.tool_id WHERE a.ai_agent_id=? AND t.active=1',
      )
      .all(id);
    return {
      configured: llm.config.configured,
      model: model || null,
      has_instructions: !!db.prepare('SELECT 1 FROM agent_prompts a JOIN prompts p ON p.id=a.prompt_id WHERE a.ai_agent_id=? AND p.active=1 LIMIT 1').get(id),
      validated: !!model && validated(model),
      tools: tools.map((t) => ({
        ...t,
        executable: Object.hasOwn(toolRegistry, t.kind),
      })),
    };
  }
  async function tick() {
    if (stopped || working || (env.INTEGRATION_ACTIVE && !env.INTEGRATION_ACTIVE())) return;
    working = true;
    try {
      if (Date.now() >= nextSweep && env.ZERNIO_API_KEY) {
        nextSweep = Date.now() + 300000;
        await syncAccounts().catch(() => {});
      }
      const pending = db
        .prepare(
          "SELECT * FROM webhook_events WHERE status='pending' ORDER BY received_at LIMIT 20",
        )
        .all();
      for (const event of pending) {
        try {
          await processEvent(event);
          db.prepare(
            "UPDATE webhook_events SET status='done',error=NULL,processed_at=? WHERE id=?",
          ).run(now(), event.id);
        } catch (error) {
          const attempts = event.attempts + 1;
          const retry = [0, 429, 502, 503].includes(error.providerStatus) && attempts < 3;
          db.prepare('UPDATE webhook_events SET status=?,attempts=?,error=? WHERE id=?').run(
            retry ? 'pending' : 'failed',
            attempts,
            publicProblem(error),
            event.id,
          );
          const latest = s.get('webhook_events', event.id);
          if (!retry && latest.conversation_id)
            s.pause(
              latest.conversation_id,
              'Evento incompatible o no procesado. Revisa la integración.',
            );
          if (!retry && latest.channel_id)
            db.prepare('UPDATE channels SET sync_error=? WHERE id=?').run(
              publicProblem(error),
              latest.channel_id,
            );
        }
      }
      const job = db
        .prepare("SELECT * FROM sync_jobs WHERE status='pending' ORDER BY updated_at LIMIT 1")
        .get();
      if (job) {
        try {
          await syncPage(job);
        } catch (error) {
          db.prepare("UPDATE sync_jobs SET status='failed',error=?,updated_at=? WHERE id=?").run(
            publicProblem(error),
            now(),
            job.id,
          );
          db.prepare('UPDATE channels SET sync_error=?,inbox_verified_at=NULL WHERE id=?').run(
            publicProblem(error),
            job.channel_id,
          );
        }
      }
      const run = db
        .prepare(
          "SELECT * FROM agent_runs WHERE status='pending' AND available_at<=? ORDER BY created_at LIMIT 1",
        )
        .get(now());
      if (run) await runAgent(run);
      const out = db
        .prepare(
          "SELECT o.* FROM outbound_messages o JOIN conversations c ON c.id=o.conversation_id WHERE o.status='pending' AND o.available_at<=? AND NOT EXISTS (SELECT 1 FROM webhook_events e WHERE e.channel_id=c.channel_id AND e.status='pending') ORDER BY o.created_at LIMIT 1",
        )
        .get(now());
      if (out && !hasPendingInput(requireRecord('conversations', out.conversation_id)))
        await deliver(out);
      const week = new Date(Date.now() - 7 * 86400000).toISOString();
      const month = new Date(Date.now() - 30 * 86400000).toISOString();
      db.prepare(
        "UPDATE webhook_events SET payload=NULL WHERE payload IS NOT NULL AND ((status IN ('done','ignored') AND received_at<?) OR received_at<?)",
      ).run(week, month);
      db.prepare('UPDATE agent_runs SET prompt_snapshot=NULL WHERE updated_at<?').run(week);
      db.prepare('UPDATE tool_runs SET arguments=NULL,result=NULL WHERE created_at<?').run(week);
      db.prepare('DELETE FROM connection_attempts WHERE expires_at<?').run(now());
    } finally {
      working = false;
    }
  }
  function start() {
    if (timer && !stopped) return;
    stopped = false;
    db.exec(
      "UPDATE agent_runs SET status='pending' WHERE status='running'; UPDATE outbound_messages SET status='uncertain' WHERE status='sending'; UPDATE messages SET delivery_status='uncertain' WHERE id IN (SELECT message_id FROM outbound_messages WHERE status='uncertain');",
    );
    for (const row of db
      .prepare("SELECT DISTINCT conversation_id FROM outbound_messages WHERE status='uncertain'")
      .all())
      s.pause(
        row.conversation_id,
        'Envío interrumpido con resultado incierto. Revisa el historial.',
      );
    timer = setInterval(
      () => tick().catch(() => s.setSetting('worker_error', 'Error interno de procesamiento.')),
      1000,
    );
    timer.unref();
  }
  async function stop() {
    stopped = true;
    clearInterval(timer);
    while (working) await new Promise((resolve) => setTimeout(resolve, 25));
  }
  function retryEvent(id) {
    const event = requireRecord('webhook_events', id);
    if (event.status !== 'failed' || !event.payload)
      throw new HttpError(409, 'No hay carga disponible para reprocesar.');
    db.prepare("UPDATE webhook_events SET status='pending',attempts=0,error=NULL WHERE id=?").run(
      id,
    );
    return { ok: true };
  }
  return {
    status,
    profiles,
    createProfile,
    syncAccounts,
    connect,
    callback,
    registerWebhook,
    receive,
    automation,
    mode,
    validateAgent,
    validateModel,
    agentStatus,
    activity,
    resolveOutbound,
    retryEvent,
    tick,
    start,
    stop,
    store: s,
    syncConversation(id) {
      const c = requireRecord('conversations', id);
      if (!c.external_id) throw new HttpError(409, 'Conversación manual.');
      scheduleConversation(c);
      return { ok: true };
    },
    send(id, body) {
      return enqueueOutbound(requireRecord('conversations', id), body.message, body.request_id);
    },
  };
}
