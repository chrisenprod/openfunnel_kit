import { createHash, randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { authOptions } from './auth.js';
import { createCloudMail } from './cloud-mail.js';
import { HttpError } from './resources.js';
import { transaction } from './migrate.js';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
export function createCloudAuth(db, env, request) {
  const origin = new URL(env.APP_ORIGIN || 'http://localhost:5173').origin;
  const owner = normalizeEmail(env.CLOUD_OWNER_EMAIL);
  const secret = env.BETTER_AUTH_SECRET;
  const mail = createCloudMail(env, request);
  if (!emailPattern.test(owner) || !secret || secret.length < 32 || !mail.configured)
    throw new Error('Cloud requiere CLOUD_OWNER_EMAIL, BETTER_AUTH_SECRET y Resend configurados.');
  const maxAccounts = Number(env.CLOUD_MAX_ACCOUNTS || 100);
  if (!Number.isInteger(maxAccounts) || maxAccounts < 1 || maxAccounts > 500)
    throw new Error('CLOUD_MAX_ACCOUNTS debe estar entre 1 y 500.');
  // Owner changes require an explicit migration, not an extra privileged account.
  const previous = db.prepare("SELECT u.email FROM cloud_accounts c JOIN auth_user u ON u.id=c.user_id WHERE role='superadmin'").get();
  if (previous && normalizeEmail(previous.email) !== owner)
    throw new Error('El dueño ya está asignado. Transfiere la propiedad antes de cambiar CLOUD_OWNER_EMAIL.');
  async function sendMail(kind, { user, token }) {
    const email = normalizeEmail(user.email);
    db.prepare('DELETE FROM cloud_mail_tokens WHERE expires_at<?').run(Date.now());
    db.prepare('INSERT OR IGNORE INTO cloud_mail_tokens(digest,kind,email,expires_at) VALUES (?,?,?,?)')
      .run(digest(token), kind, email, Date.now() + 3600000);
    try { await mail.send({ email, token, kind }); }
    catch (error) {
      db.prepare('DELETE FROM cloud_mail_tokens WHERE digest=? AND used=0').run(digest(token));
      throw error;
    }
  }
  const options = authOptions(db, secret, origin);
  options.plugins = [];
  options.emailAndPassword = {
    enabled: true, minPasswordLength: 12, maxPasswordLength: 128,
    requireEmailVerification: true, autoSignIn: false, revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 3600, sendResetPassword: data => sendMail('reset', data),
  };
  options.emailVerification = {
    sendOnSignUp: true, sendOnSignIn: false, autoSignInAfterVerification: false,
    expiresIn: 3600, sendVerificationEmail: data => sendMail('verify', data),
  };
  const auth = betterAuth(options);
  function limit(key, max, duration, res) {
    const timestamp = Date.now();
    db.prepare('DELETE FROM cloud_limits WHERE expires_at<=?').run(timestamp);
    const row = db.prepare(`INSERT INTO cloud_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count,expires_at`).get(digest(key), timestamp + duration);
    if (row.count > max) {
      res?.setHeader('Retry-After', String(Math.ceil((row.expires_at - timestamp) / 1000)));
      throw new HttpError(429, 'Demasiados intentos. Espera antes de volver a intentar.');
    }
  }
  function account(user) {
    if (!user.emailVerified) throw new HttpError(403, 'Verifica tu correo para continuar.');
    let row = db.prepare('SELECT * FROM cloud_accounts WHERE user_id=?').get(user.id);
    if (!row) {
      transaction(db, () => {
        if (db.prepare('SELECT count(*) AS n FROM cloud_accounts').get().n >= maxAccounts)
          throw new HttpError(503, 'La instancia alcanzó su capacidad de cuentas.');
        db.prepare('INSERT INTO cloud_accounts VALUES (?,?,?,?,?)').run(user.id, randomUUID(), normalizeEmail(user.email) === owner ? 'superadmin' : 'client', 'active', new Date().toISOString());
      });
      row = db.prepare('SELECT * FROM cloud_accounts WHERE user_id=?').get(user.id);
    }
    if (row.status !== 'active') throw new HttpError(403, 'Tu cuenta está suspendida. Contacta al administrador.');
    return row;
  }
  async function session(req) {
    const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!result) return null;
    return { ...result, account: account(result.user) };
  }
  function consume(token, kind) {
    if (typeof token !== 'string' || token.length > 4096) throw new HttpError(400, 'Enlace inválido o vencido.');
    const row = db.prepare('UPDATE cloud_mail_tokens SET used=1 WHERE digest=? AND kind=? AND used=0 AND expires_at>? RETURNING email').get(digest(token), kind, Date.now());
    if (!row) throw new HttpError(400, 'Enlace inválido, usado o vencido. Solicita otro.');
    return row;
  }
  async function handle(path, body, req, res) {
    const allowed = {
      register: ['name','email','password'], login: ['email','password'],
      resend: ['email'], recover: ['email'], verify: ['token'], reset: ['token','password'],
    }[path];
    if (!allowed || !body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(k => !allowed.includes(k)))
      throw new HttpError(400, 'Solicitud inválida.');
    limit('auth:global', 120, 60000, res);
    limit(`auth:${path}:${req.socket.remoteAddress}`, path === 'login' ? 20 : 10, 60000, res);
    const email = normalizeEmail(body.email);
    if (allowed.includes('email') && (!emailPattern.test(email) || email.length > 254)) throw new HttpError(400, 'Introduce un correo válido.');
    if (allowed.includes('password') && (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128)) throw new HttpError(400, 'La contraseña debe tener entre 12 y 128 caracteres.');
    if (['register','resend','recover'].includes(path)) limit(`mail:${email}`, 1, 60000, res);
    if (path === 'register') {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80) throw new HttpError(400, 'Introduce tu nombre (hasta 80 caracteres).');
      if (db.prepare('SELECT count(*) AS n FROM auth_user').get().n >= maxAccounts) throw new HttpError(503, 'La instancia alcanzó su capacidad de cuentas.');
    }
    const headers = fromNodeHeaders(req.headers);
    let response;
    try {
      if (path === 'register') response = await auth.api.signUpEmail({ body: { email, password: body.password, name: body.name.trim() }, headers, asResponse: true });
      if (path === 'login') response = await auth.api.signInEmail({ body: { email, password: body.password }, headers, asResponse: true });
      if (path === 'resend') response = await auth.api.sendVerificationEmail({ body: { email }, headers, asResponse: true });
      if (path === 'recover') response = await auth.api.requestPasswordReset({ body: { email }, headers, asResponse: true });
      if (path === 'verify') {
        const verification = consume(body.token, 'verify');
        response = await auth.api.verifyEmail({ query: { token: body.token }, headers, asResponse: true });
        if (response.ok) {
          const user = db.prepare('SELECT id,email,emailVerified FROM auth_user WHERE email=?').get(verification.email);
          if (user) account(user);
        }
      }
      if (path === 'reset') {
        consume(body.token, 'reset');
        response = await auth.api.resetPassword({ body: { token: body.token, newPassword: body.password }, headers, asResponse: true });
      }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'No se pudo completar la solicitud. Inténtalo de nuevo.');
    }
    if (!response?.ok) {
      if (path === 'login') throw new HttpError(401, 'Correo o contraseña incorrectos, o correo sin verificar.');
      throw new HttpError(400, 'No se pudo completar la solicitud. Revisa los datos o solicita otro enlace.');
    }
    if (path === 'login') {
      const result = await response.json();
      const member = account(result.user);
      res.setHeader('Set-Cookie', response.headers.getSetCookie());
      return { user: { name: result.user.name, email: result.user.email, role: member.role, workspaceId: member.workspace_id } };
    }
    return { ok: true };
  }
  return { auth, origin, configured: true, session, handle, limit };
}
