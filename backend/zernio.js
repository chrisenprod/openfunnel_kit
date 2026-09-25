import { HttpError } from './resources.js';
export const supportedPlatforms = ['instagram', 'whatsapp'];
export class ProviderError extends HttpError {
  constructor(status, code = 'request_failed', retryAfter = 60) {
    const label =
      status === 401 || status === 403
        ? 'Revisa la clave, permisos y acceso a Inbox.'
        : status === 429
          ? 'Límite temporal del proveedor; espera antes de reintentar.'
          : 'No se pudo completar la operación con Zernio.';
    super(
      502,
      `${label} (${status || 'red'} · ${/^[a-z_]{1,60}$/.test(code) ? code : 'request_failed'})`,
    );
    this.providerStatus = status;
    this.retryAfter = Math.min(3600, Math.max(10, Number(retryAfter) || 60));
  }
}
export function contract(condition) {
  if (!condition)
    throw new HttpError(
      502,
      'Zernio devolvió datos incompatibles. Revisa la integración antes de continuar.',
    );
}
export const externalId = (value) =>
  typeof value === 'string' && value.length > 0 && value.length <= 1024;
export function accountRecord(raw) {
  const profile = typeof raw?.profileId === 'object' ? raw.profileId?._id : raw?.profileId;
  contract(
    externalId(raw?._id) &&
      externalId(profile) &&
      typeof raw.platform === 'string' &&
      typeof raw.isActive === 'boolean',
  );
  return {
    accountId: raw._id,
    profileId: profile,
    platform: raw.platform,
    name: String(raw.displayName || raw.username || raw.platform).slice(0, 160),
    connected: raw.isActive,
  };
}
export function conversationRecord(raw, channel) {
  contract(
    externalId(raw?.id) &&
      raw.accountId === channel.external_account_id &&
      raw.platform === channel.kind &&
      externalId(raw.participantId),
  );
  contract(['active', 'archived'].includes(raw.status));
  contract(raw.threadControl == null || ['app', 'ai_agent', 'other'].includes(raw.threadControl));
  contract(raw.isGroup == null || typeof raw.isGroup === 'boolean');
  return {
    externalId: raw.id,
    participantId: raw.participantId,
    name: String(raw.participantName || raw.participantId).slice(0, 160),
    control: raw.threadControl || null,
    isGroup: !!raw.isGroup,
  };
}
export function messageRecord(raw, channel, conversation) {
  contract(
    externalId(raw?.id) &&
      raw.conversationId === conversation.external_id &&
      raw.accountId === channel.external_account_id &&
      raw.platform === channel.kind,
  );
  contract(
    ['incoming', 'outgoing'].includes(raw.direction) && Number.isFinite(Date.parse(raw.createdAt)),
  );
  contract(raw.message == null || typeof raw.message === 'string');
  contract(raw.attachments == null || Array.isArray(raw.attachments));
  contract(
    raw.deliveryStatus == null ||
      ['sent', 'delivered', 'read', 'failed', 'deleted'].includes(raw.deliveryStatus),
  );
  contract(raw.isDeleted == null || typeof raw.isDeleted === 'boolean');
  const updatedAt = raw.editedAt || raw.createdAt;
  contract(Number.isFinite(Date.parse(updatedAt)));
  const deleted = raw.isDeleted === true || raw.deliveryStatus === 'deleted';
  const attachments = !!raw.attachments?.length || (!deleted && !raw.message?.trim());
  return {
    externalId: raw.id,
    updatedAt: new Date(updatedAt).toISOString(),
    body: deleted ? '[Mensaje eliminado]' : raw.message || '[Contenido no compatible]',
    direction: raw.direction,
    occurredAt: new Date(raw.createdAt).toISOString(),
    deleted,
    attachments,
    status: raw.deliveryStatus || (raw.direction === 'outgoing' ? 'sent' : 'received'),
    human: raw.sentVia === 'human' || raw.metadata?.source === 'whatsapp_business_app',
  };
}
export function createZernio(env, request = fetch) {
  return async function zernio(path, { method = 'GET', body, query = {}, idempotencyKey } = {}) {
    if (env.INTEGRATION_ACTIVE && !env.INTEGRATION_ACTIVE()) throw new HttpError(403, 'Cuenta suspendida.');
    const key = env.ZERNIO_API_KEY;
    const version = env.ZERNIO_CONNECTION_VERSION;
    if (!env.ZERNIO_API_KEY) throw new HttpError(503, 'Configura ZERNIO_API_KEY en el servidor.');
    const url = new URL(`https://zernio.com/api/v1${path}`);
    for (const [key, value] of Object.entries(query))
      if (value != null && value !== '') url.searchParams.set(key, String(value));
    let response;
    try {
      response = await request(url, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ProviderError(0);
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ProviderError(response.ok ? 502 : response.status);
    }
    if (!response.ok || data?.success === false)
      throw new ProviderError(response.status, data?.code, response.headers.get('retry-after'));
    contract(data && typeof data === 'object' && !Array.isArray(data));
    if (key !== env.ZERNIO_API_KEY || version !== env.ZERNIO_CONNECTION_VERSION || (env.INTEGRATION_ACTIVE && !env.INTEGRATION_ACTIVE())) throw new HttpError(409, 'La conexión cambió durante la operación.');
    return data;
  };
}
