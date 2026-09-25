import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { HttpError } from './resources.js';
import { transaction } from './migrate.js';
import { providerURL, providerFetch } from './provider-network.js';

const fields = { zernio: { apiKey: 'ZERNIO_API_KEY' }, llm: { apiKey: 'LLM_API_KEY', baseURL: 'LLM_BASE_URL', model: 'LLM_MODEL' } };
export function encryptionKey(env) {
  if (!/^[a-f\d]{64}$/i.test(env.PROVIDER_ENCRYPTION_KEY || '')) throw new HttpError(503, 'Configura PROVIDER_ENCRYPTION_KEY (32 bytes hexadecimales) en el servidor.');
  return Buffer.from(env.PROVIDER_ENCRYPTION_KEY, 'hex');
}
export function invalidateConnections(db, reason = 'La conexión cambió. Revisa antes de reactivar.') {
  db.exec('DELETE FROM model_validations; DELETE FROM connection_attempts;');
  db.prepare("UPDATE channels SET automation_enabled=0,inbox_verified_at=NULL").run();
  db.prepare("UPDATE conversations SET automation_mode='manual',revision=revision+1,pause_reason=?").run(reason);
  db.prepare("UPDATE messages SET delivery_status='cancelled' WHERE id IN (SELECT message_id FROM outbound_messages WHERE status='pending')").run();
  db.prepare("UPDATE outbound_messages SET status='cancelled',error=? WHERE status='pending'").run(reason);
  db.prepare("UPDATE agent_runs SET status='cancelled',error=? WHERE status IN ('pending','running')").run(reason);
}
export function createProviderConnections(db, env, workspace = 'self-hosted') {
  const cloud = env.APP_MODE === 'cloud';
  const cache = new Map();
  function read(provider) {
    const row = db.prepare('SELECT * FROM provider_connections WHERE provider=?').get(provider);
    if (!row) return { version: 0, data: {} };
    if (cache.get(provider)?.version === row.version) return cache.get(provider);
    try {
      const [iv, tag, body] = row.ciphertext.split('.').map(s => Buffer.from(s, 'base64'));
      const decipher = createDecipheriv('aes-256-gcm', encryptionKey(env), iv);
      decipher.setAAD(Buffer.from(`${workspace}:${provider}:${row.version}`));
      decipher.setAuthTag(tag);
      const result = { version: row.version, data: JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString()) };
      cache.set(provider, result);
      return result;
    } catch { throw new HttpError(503, 'No se pudo abrir la conexión cifrada. Revisa la clave maestra del servidor.'); }
  }
  function serverValue(provider, field) {
    if (cloud) return '';
    const name = fields[provider][field];
    return env[name] || (provider === 'llm' ? env[name.replace('LLM_', 'OPENAI_')] : '') || '';
  }
  function effective(provider) {
    const saved = read(provider);
    return Object.fromEntries(Object.keys(fields[provider]).map(field => [field, serverValue(provider, field) || saved.data[field] || '']));
  }
  function metadata(provider) {
    if (!fields[provider]) throw new HttpError(404, 'Conexión no encontrada.');
    const current = effective(provider);
    const locked = Object.keys(fields[provider]).filter(field => !!serverValue(provider,field));
    let safeURL = '';
    try { const url = new URL(current.baseURL); safeURL = `${url.origin}${url.pathname}`; } catch {}
    return { provider, version: read(provider).version, configured: Object.values(current).every(Boolean), locked,
      ...(provider === 'llm' ? { baseURL: safeURL, model: current.model } : {}),
      hasKey: !!current.apiKey, editable: locked.length !== Object.keys(fields[provider]).length,
      storageReady: /^[a-f\d]{64}$/i.test(env.PROVIDER_ENCRYPTION_KEY || ''),
    };
  }
  function save(provider, body) {
    if (!fields[provider]) throw new HttpError(404, 'Conexión no encontrada.');
    const key = encryptionKey(env);
    if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(k => ![...Object.keys(fields[provider]),'expected_version'].includes(k))) throw new HttpError(400, 'Datos de conexión inválidos.');
    const old = read(provider);
    if (!Number.isInteger(body.expected_version) || body.expected_version !== old.version) throw new HttpError(409, 'La conexión cambió. Recarga antes de guardar.');
    const next = { ...old.data };
    for (const field of Object.keys(fields[provider])) {
      if (body[field] === undefined) continue;
      if (serverValue(provider,field)) throw new HttpError(409, 'Ese campo está definido en el servidor.');
      if (typeof body[field] !== 'string' || !body[field].trim() || body[field].length > (field === 'apiKey' ? 4096 : field === 'model' ? 160 : 2048) || /[\r\n\0]/.test(body[field])) throw new HttpError(400, 'Completa los datos de conexión.');
      next[field] = body[field].trim();
    }
    const complete = Object.fromEntries(Object.keys(fields[provider]).map(field => [field, serverValue(provider,field) || next[field] || '']));
    if (Object.values(complete).some(v => !v)) throw new HttpError(400, 'Completa los datos de conexión.');
    if (provider === 'llm') {
      providerURL(complete.baseURL, env);
      if (effective(provider).baseURL && complete.baseURL !== effective(provider).baseURL && !body.apiKey)
        throw new HttpError(400, 'Introduce una nueva API key al cambiar la URL.');
    }
    const version = old.version + 1;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(Buffer.from(`${workspace}:${provider}:${version}`));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(next)), cipher.final()]);
    const ciphertext = [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('base64')).join('.');
    transaction(db, () => {
      db.prepare('INSERT INTO provider_connections VALUES (?,?,?,?) ON CONFLICT(provider) DO UPDATE SET version=excluded.version,ciphertext=excluded.ciphertext,updated_at=excluded.updated_at').run(provider,version,ciphertext,new Date().toISOString());
      invalidateConnections(db);
      if (provider === 'zernio') db.prepare("DELETE FROM integration_settings WHERE key IN ('webhook_id','webhook_fingerprint')").run();
    });
    cache.delete(provider);
    return metadata(provider);
  }
  const network = providerFetch(env);
  function remove(provider, body) {
    if (!fields[provider]) throw new HttpError(404, 'Conexión no encontrada.');
    if (!body || Object.keys(body).some(k => k !== 'expected_version') || body.expected_version !== read(provider).version) throw new HttpError(409, 'La conexión cambió. Recarga antes de eliminarla.');
    const version = read(provider).version + 1;
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(env), iv);
    cipher.setAAD(Buffer.from(`${workspace}:${provider}:${version}`));
    const encrypted = Buffer.concat([cipher.update('{}'),cipher.final()]);
    transaction(db, () => {
      db.prepare('INSERT INTO provider_connections VALUES (?,?,?,?) ON CONFLICT(provider) DO UPDATE SET version=excluded.version,ciphertext=excluded.ciphertext,updated_at=excluded.updated_at').run(provider,version,[iv,cipher.getAuthTag(),encrypted].map(b=>b.toString('base64')).join('.'),new Date().toISOString());
      invalidateConnections(db);
    });
    cache.delete(provider);
    return metadata(provider);
  }
  const resolvedEnv = new Proxy(env, { get(target, name) {
    if (name === 'LLM_CONNECTION_VERSION') return read('llm').version;
    if (name === 'ZERNIO_CONNECTION_VERSION') return read('zernio').version;
    if (name === 'LLM_FETCH') return cloud || read('llm').version ? network : undefined;
    for (const [provider, mapping] of Object.entries(fields)) for (const [field, variable] of Object.entries(mapping)) if (name === variable) return effective(provider)[field];
    if (cloud && ['OPENAI_API_KEY','OPENAI_BASE_URL','OPENAI_MODEL'].includes(name)) return undefined;
    return target[name];
  } });
  // Fail closed on restart with missing or incorrect encryption keys.
  for (const provider of Object.keys(fields)) read(provider);
  return { metadata, save, remove, env: resolvedEnv };
}

// Offline migration only: change encryption key or workspace binding on a copy.
export function rebindConnections(db, oldKey, newKey, fromWorkspace, toWorkspace) {
  transaction(db, () => {
    for (const row of db.prepare('SELECT * FROM provider_connections').all()) {
      const [iv,tag,body] = row.ciphertext.split('.').map(value => Buffer.from(value,'base64'));
      const decipher = createDecipheriv('aes-256-gcm',oldKey,iv);
      decipher.setAAD(Buffer.from(`${fromWorkspace}:${row.provider}:${row.version}`));
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(body),decipher.final()]);
      const nonce = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm',newKey,nonce);
      cipher.setAAD(Buffer.from(`${toWorkspace}:${row.provider}:${row.version}`));
      const encrypted = Buffer.concat([cipher.update(plaintext),cipher.final()]);
      plaintext.fill(0);
      db.prepare('UPDATE provider_connections SET ciphertext=? WHERE provider=?').run([nonce,cipher.getAuthTag(),encrypted].map(value => value.toString('base64')).join('.'),row.provider);
    }
  });
}
