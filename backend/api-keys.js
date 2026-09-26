import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpError } from './resources.js';

export const keyScopes = ['resources:read', 'prompts:write', 'agents:write', 'channels:assign', 'agents:test'];
const digest = (value) => createHash('sha256').update(value).digest('hex');
const publicKey = ({ secret_hash, scopes, ...key }) => ({ ...key, scopes: JSON.parse(scopes) });
export function objectBody(body, fields) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some((key) => !fields.includes(key)))
    throw new HttpError(400, 'Campos de solicitud inválidos.');
}
export function createKeyAccess(db) {
  const windows = new Map();
  function limit(identity, maximum, res) {
    const now = Date.now();
    for (const [key, value] of windows) if (value.until <= now) windows.delete(key);
    const entry = windows.get(identity) || { count: 0, until: now + 60000 };
    windows.set(identity, entry);
    if (++entry.count > maximum) {
      res.setHeader('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
      throw new HttpError(429, 'Demasiadas solicitudes. Espera antes de reintentar.');
    }
  }
  function authenticate(req, res) {
    if (req.headers.cookie) throw new HttpError(400, 'Usa solo Bearer o sesión, sin mezclarlos.');
    const token = /^Bearer (of_[A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
    const key = token && db.prepare('SELECT * FROM api_keys WHERE secret_hash=?').get(digest(token));
    if (!key || key.revoked_at || key.expires_at <= new Date().toISOString())
      throw new HttpError(401, 'Clave de API inválida o vencida.');
    limit(`key:${key.id}`, 120, res);
    db.prepare('UPDATE api_keys SET last_used_at=? WHERE id=?').run(new Date().toISOString(), key.id);
    return publicKey(key);
  }
  function create(body) {
    objectBody(body, ['name', 'scopes', 'expires_in_days']);
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80 ||
        !Number.isInteger(body.expires_in_days) || body.expires_in_days < 1 || body.expires_in_days > 365 ||
        !Array.isArray(body.scopes) || !body.scopes.length || body.scopes.length > keyScopes.length ||
        new Set(body.scopes).size !== body.scopes.length || body.scopes.some((scope) => !keyScopes.includes(scope)))
      throw new HttpError(400, 'Indica nombre, permisos válidos y vencimiento entre 1 y 365 días.');
    if (db.prepare('SELECT count(*) n FROM api_keys').get().n >= 100)
      throw new HttpError(409, 'Se alcanzó el límite de 100 claves de esta instalación.');
    const secret = `of_${randomBytes(32).toString('base64url')}`;
    const id = randomUUID(), now = new Date().toISOString();
    db.prepare('INSERT INTO api_keys(id,name,prefix,secret_hash,scopes,created_at,expires_at) VALUES (?,?,?,?,?,?,?)')
      .run(id, body.name.trim(), secret.slice(0, 11), digest(secret), JSON.stringify(body.scopes), now,
        new Date(Date.now() + body.expires_in_days * 86400000).toISOString());
    return { ...publicKey(db.prepare('SELECT * FROM api_keys WHERE id=?').get(id)), secret };
  }
  function revoke(id) {
    if (!db.prepare('SELECT 1 FROM api_keys WHERE id=?').get(id))
      throw new HttpError(404, 'Clave no encontrada.');
    db.prepare('UPDATE api_keys SET revoked_at=COALESCE(revoked_at,?) WHERE id=?')
      .run(new Date().toISOString(), id);
    return { ok: true };
  }
  return { authenticate, limit, create, revoke,
    list: () => ({ items: db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC,id').all().map(publicKey) }) };
}
