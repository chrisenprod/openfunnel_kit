import { readyDocuments } from './documents.js';
import { randomUUID } from 'node:crypto';
import { transaction } from './migrate.js';
import { conversationRecord, messageRecord, contract } from './zernio.js';
import { hash, toolRegistry } from './llm.js';
export const now = () => new Date().toISOString();
export function integrationStore(db) {
  const get = (table, id) => db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
  const setting = (key) =>
    db.prepare('SELECT value FROM integration_settings WHERE key=?').get(key)?.value;
  const setSetting = (key, value) =>
    db
      .prepare(
        'INSERT INTO integration_settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      )
      .run(key, String(value));
  function pause(id, reason) {
    db.prepare(
      "UPDATE conversations SET automation_mode='manual',pause_reason=?,revision=revision+1 WHERE id=?",
    ).run(reason, id);
    db.prepare(
      "UPDATE agent_runs SET status='cancelled',updated_at=? WHERE conversation_id=? AND status IN ('pending','running')",
    ).run(now(), id);
    const pending = db
      .prepare(
        "SELECT message_id FROM outbound_messages WHERE conversation_id=? AND agent_run_id IS NOT NULL AND status='pending'",
      )
      .all(id);
    for (const row of pending)
      db.prepare("UPDATE messages SET delivery_status='cancelled' WHERE id=?").run(row.message_id);
    db.prepare(
      "UPDATE outbound_messages SET status='cancelled',updated_at=? WHERE conversation_id=? AND agent_run_id IS NOT NULL AND status='pending'",
    ).run(now(), id);
  }
  function upsertAccount(raw, connected = raw.connected) {
    const old = db
      .prepare("SELECT * FROM channels WHERE provider='zernio' AND external_account_id=?")
      .get(raw.accountId);
    contract(!old || old.kind === raw.platform);
    const id = old?.id || randomUUID();
    const stamp = now();
    if (old)
      db.prepare(
        'UPDATE channels SET name=?,external_profile_id=?,connection_status=?,updated_at=? WHERE id=?',
      ).run(raw.name, raw.profileId, connected ? 'connected' : 'disconnected', stamp, id);
    else
      db.prepare(
        "INSERT INTO channels (id,name,kind,active,created_at,updated_at,provider,external_profile_id,external_account_id,connection_status) VALUES (?,?,?,1,?,?,'zernio',?,?,?)",
      ).run(
        id,
        raw.name,
        raw.platform,
        stamp,
        stamp,
        raw.profileId,
        raw.accountId,
        connected ? 'connected' : 'disconnected',
      );
    if (!connected) {
      db.prepare('UPDATE channels SET automation_enabled=0,inbox_verified_at=NULL WHERE id=?').run(
        id,
      );
      for (const c of db.prepare('SELECT id FROM conversations WHERE channel_id=?').all(id))
        pause(c.id, 'Canal desconectado.');
    }
    return get('channels', id);
  }
  function upsertConversation(raw, channel) {
    const item = conversationRecord(raw, channel);
    return transaction(db, () => {
      let old = db
        .prepare('SELECT * FROM conversations WHERE channel_id=? AND external_id=?')
        .get(channel.id, item.externalId);
      let identity = db
        .prepare('SELECT contact_id FROM contact_identities WHERE channel_id=? AND external_id=?')
        .get(channel.id, item.participantId);
      if (!identity) {
        const id = randomUUID();
        const stamp = now();
        db.prepare('INSERT INTO contacts (id,name,created_at,updated_at) VALUES (?,?,?,?)').run(
          id,
          item.name,
          stamp,
          stamp,
        );
        db.prepare('INSERT INTO contact_identities VALUES (?,?,?,?)').run(
          randomUUID(),
          id,
          channel.id,
          item.participantId,
        );
        identity = { contact_id: id };
      }
      if (!old) {
        const id = randomUUID();
        const stamp = now();
        db.prepare(
          "INSERT INTO conversations (id,title,contact_id,channel_id,status,created_at,updated_at,external_id,automation_mode,is_group,thread_control) VALUES (?,?,?,?,'open',?,?,?,'automatic',?,?)",
        ).run(
          id,
          item.name,
          identity.contact_id,
          channel.id,
          stamp,
          stamp,
          item.externalId,
          Number(item.isGroup),
          item.control || 'app',
        );
        old = get('conversations', id);
      }
      if (old.contact_id !== identity.contact_id) throw new Error('identity_conflict');
      db.prepare(
        'UPDATE conversations SET thread_control=COALESCE(?,thread_control),is_group=? WHERE id=?',
      ).run(item.control, Number(item.isGroup), old.id);
      if (item.isGroup || (item.control && item.control !== 'app'))
        pause(old.id, 'El hilo requiere atención externa o es un grupo.');
      return get('conversations', old.id);
    });
  }
  function upsertMessage(raw, channel, conversation, source = 'imported') {
    const item = messageRecord(raw, channel, conversation);
    return transaction(db, () => {
      let old = db
        .prepare('SELECT * FROM messages WHERE conversation_id=? AND external_id=?')
        .get(conversation.id, item.externalId);
      const id = old?.id || randomUUID();
      const stamp = now();
      if (!old)
        db.prepare(
          'INSERT INTO messages (id,conversation_id,body,direction,occurred_at,created_at,updated_at,external_id,source,delivery_status,is_deleted,has_attachments) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        ).run(
          id,
          conversation.id,
          item.body,
          item.direction,
          item.occurredAt,
          stamp,
          stamp,
          item.externalId,
          source,
          item.status,
          Number(item.deleted),
          Number(item.attachments),
        );
      else {
        // Deletions and confirmed delivery must not regress on stale imports.
        const deleted = old.is_deleted || item.deleted;
        const ranks = { sent: 1, delivered: 2, read: 3 };
        const status =
          (ranks[old.delivery_status] || 0) > (ranks[item.status] || 0)
            ? old.delivery_status
            : item.status;
        db.prepare(
          'UPDATE messages SET body=?,delivery_status=?,is_deleted=?,has_attachments=?,updated_at=? WHERE id=?',
        ).run(
          deleted
            ? '[Mensaje eliminado]'
            : old.external_updated_at && old.external_updated_at > item.updatedAt
              ? old.body
              : item.body,
          deleted ? 'deleted' : status,
          Number(deleted),
          Number(item.attachments),
          stamp,
          id,
        );
      }
      db.prepare(
        'UPDATE messages SET external_updated_at=CASE WHEN external_updated_at IS NULL OR external_updated_at<? THEN ? ELSE external_updated_at END WHERE id=?',
      ).run(item.updatedAt, item.updatedAt, id);
      if (item.direction === 'incoming')
        db.prepare(
          'UPDATE conversations SET last_incoming_at=CASE WHEN last_incoming_at IS NULL OR last_incoming_at<? THEN ? ELSE last_incoming_at END WHERE id=?',
        ).run(item.occurredAt, item.occurredAt, conversation.id);
      if (!old || old.body !== item.body || !!old.is_deleted !== item.deleted)
        db.prepare('UPDATE conversations SET revision=revision+1,updated_at=? WHERE id=?').run(
          stamp,
          conversation.id,
        );
      if (source === 'remote' && (item.attachments || item.human))
        pause(
          conversation.id,
          item.attachments
            ? 'Contenido no compatible; requiere atención humana.'
            : 'Una persona respondió desde el canal.',
        );
      return { row: get('messages', id), created: !old };
    });
  }
  function agentContext(conversation) {
    const channel = get('channels', conversation.channel_id);
    const agent = get('ai_agents', conversation.ai_agent_id || channel.default_ai_agent_id || '');
    if (!agent) return { channel, agent: null };
    const prompts = db
      .prepare(
        'SELECT p.id,p.content,p.version,p.updated_at FROM agent_prompts a JOIN prompts p ON p.id=a.prompt_id WHERE a.ai_agent_id=? AND p.active=1 ORDER BY a.position',
      )
      .all(agent.id);
    const tools = db
      .prepare(
        'SELECT t.* FROM agent_tools a JOIN tools t ON t.id=a.tool_id WHERE a.ai_agent_id=? AND t.active=1 ORDER BY t.id',
      )
      .all(agent.id);
    const documents = readyDocuments(db, agent.id);
    return {
      channel,
      agent,
      documents,
      prompts,
      tools,
      configHash: hash(
        JSON.stringify([
          channel.default_ai_agent_id,
          channel.automation_enabled_at,
          agent,
          prompts,
          tools,
          documents,
        ]),
      ),
    };
  }
  function enqueueRun(conversation, message) {
    const context = agentContext(conversation);
    if (
      !context.channel.automation_enabled ||
      !context.agent?.active ||
      conversation.automation_mode !== 'automatic' ||
      conversation.status !== 'open' ||
      message.is_deleted ||
      message.has_attachments ||
      message.direction !== 'incoming' ||
      message.occurred_at < context.channel.automation_enabled_at
    )
      return;
    const stamp = now();
    db.prepare(
      'INSERT OR IGNORE INTO agent_runs (id,conversation_id,trigger_message_id,ai_agent_id,revision,available_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
    ).run(
      randomUUID(),
      conversation.id,
      message.id,
      context.agent.id,
      conversation.revision,
      stamp,
      stamp,
      stamp,
    );
  }
  function executableTools(context) {
    return context.tools.filter((t) => Object.hasOwn(toolRegistry, t.kind));
  }
  return {
    get,
    setting,
    setSetting,
    pause,
    upsertAccount,
    upsertConversation,
    upsertMessage,
    agentContext,
    enqueueRun,
    executableTools,
  };
}
