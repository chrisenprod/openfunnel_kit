import { createHash } from 'node:crypto';
import { HttpError } from './resources.js';

const escape = value => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function createCloudMail(env, request = fetch) {
  const origin = new URL(env.APP_ORIGIN || 'http://localhost:5173').origin;
  const from = env.RESEND_FROM || '';
  const configured = !!env.RESEND_API_KEY && from.length <= 254 && !/[\r\n]/.test(from) && /^(?:[^<>]+<)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/.test(from);
  return {
    configured,
    async send({ email, token, kind }) {
      if (!configured) throw new HttpError(503, 'Configura Resend y el remitente verificado en el servidor.');
      if (!['verify', 'reset'].includes(kind) || typeof token !== 'string' || !token || token.length > 4096 || typeof email !== 'string' || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))
        throw new HttpError(400, 'Solicitud de correo inválida.');
      const link = `${origin}/#/${kind}?token=${encodeURIComponent(token)}`;
      const title = kind === 'verify' ? 'Verifica tu correo en OpenFunnel' : 'Restablece tu contraseña de OpenFunnel';
      const description = kind === 'verify' ? 'Confirma tu correo para acceder a tu espacio de trabajo.' : 'Elige una nueva contraseña para tu cuenta.';
      try {
        const result = await request('https://api.resend.com/emails', {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
          headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': createHash('sha256').update(JSON.stringify([email, kind, token])).digest('hex') },
          body: JSON.stringify({ from, to: [email], subject: title,
            text: `${title}\n\n${description}\n\n${link}\n\nEste enlace caduca y es personal. Si no solicitaste este correo, puedes ignorarlo.`,
            html: `<h1>${title}</h1><p>${description}</p><p><a href="${escape(link)}">${kind === 'verify' ? 'Verificar correo' : 'Restablecer contraseña'}</a></p><p>Este enlace caduca y es personal. Si no solicitaste este correo, puedes ignorarlo.</p>` }),
        });
        if (!result.ok || typeof (await result.json()).id !== 'string') throw new Error('mail_delivery');
      } catch { throw new HttpError(502, 'No se pudo enviar el correo. Inténtalo de nuevo más tarde.'); }
    },
  };
}
