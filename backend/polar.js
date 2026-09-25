import { Webhook } from 'standardwebhooks';
import { HttpError } from './resources.js';

export function createPolar(env, fetcher = fetch) {
  const environment = env.POLAR_SERVER || 'production';
  if (!['production', 'sandbox'].includes(environment)) throw new Error('POLAR_SERVER debe ser production o sandbox.');
  const token = env.POLAR_TOKEN || '';
  const secret = env.POLAR_WEBHOOK_SECRET || '';
  const base = environment === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
  async function request(path, body) {
    if (!token) throw new HttpError(503, 'Configura POLAR_TOKEN en el servidor.');
    try {
      const response = await fetcher(`${base}/v1${path}`, {
        method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(12000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Polar-Version': '2026-04' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) throw new HttpError(response.status === 401 || response.status === 403 ? 503 : 502,
        response.status === 401 || response.status === 403 ? 'Polar rechazó el token o sus permisos.' : 'Polar no pudo completar la operación. Inténtalo de nuevo.');
      const chunks=[];let bytes=0;
      for await (const chunk of response.body) {
        bytes+=chunk.length;
        if (bytes>4*1024*1024) throw new Error('response_limit');
        chunks.push(Buffer.from(chunk));
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'No se pudo conectar con Polar. Inténtalo de nuevo.');
    }
  }
  function verify(raw, headers) {
    if (!secret) throw new HttpError(503, 'Webhook de Polar sin configurar.');
    for (const key of [secret, Buffer.from(secret).toString('base64')]) {
      try { return new Webhook(key).verify(raw, headers); } catch {}
    }
    throw new HttpError(403, 'Firma de Polar inválida o vencida.');
  }
  return { environment, configured: !!token, webhookConfigured: !!secret, request, verify };
}
