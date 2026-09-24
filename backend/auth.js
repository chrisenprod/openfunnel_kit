import { randomBytes } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { fromNodeHeaders } from 'better-auth/node';
import { transaction } from './migrate.js';

export const ADMIN_ID = 'openfunnel-admin';
export function authOptions(db, secret, origin) {
  return {
    database: db,
    secret,
    baseURL: origin,
    basePath: '/api/auth',
    trustedOrigins: [origin],
    emailAndPassword: { enabled: true, disableSignUp: true },
    user: { modelName: 'auth_user' },
    account: { modelName: 'auth_account' },
    verification: { modelName: 'auth_verification' },
    session: {
      modelName: 'auth_session',
      expiresIn: 8 * 3600,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    plugins: [
      username({
        minUsernameLength: 1,
        maxUsernameLength: 80,
        usernameNormalization: false,
        usernameValidator: () => true,
      }),
    ],
    advanced: {
      useSecureCookies: origin.startsWith('https:'),
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
    },
    telemetry: { enabled: false },
    logger: { disabled: true },
  };
}
export async function createAuth(db, env = process.env) {
  const origin = new URL(env.APP_ORIGIN || 'http://localhost:5173').origin;
  if (!/^https?:/.test(origin)) throw new Error('APP_ORIGIN debe ser una URL HTTP o HTTPS.');
  const user = env.admin_user;
  const pass = env.admin_pass;
  const stored = db.prepare('SELECT secret FROM auth_settings WHERE id=1').get();
  const secret = env.BETTER_AUTH_SECRET || stored?.secret || randomBytes(48).toString('base64url');
  if (secret.length < 32) throw new Error('BETTER_AUTH_SECRET debe tener al menos 32 caracteres.');
  db.prepare(
    'INSERT INTO auth_settings(id,secret) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET secret=excluded.secret',
  ).run(secret);
  const auth = betterAuth(authOptions(db, secret, origin));
  if (!user || !pass) {
    db.exec('DELETE FROM auth_session');
    return { auth, origin, configured: false };
  }
  if (user.trim() !== user || user.length > 80 || pass.length < 12 || pass.length > 128) {
    throw new Error(
      'Configura admin_user (1–80 caracteres, sin espacios exteriores) y admin_pass (12–128 caracteres).',
    );
  }
  const existing = db.prepare('SELECT username FROM auth_user WHERE id=?').get(ADMIN_ID);
  const account = db
    .prepare('SELECT password FROM auth_account WHERE userId=? AND providerId=?')
    .get(ADMIN_ID, 'credential');
  const samePassword =
    account?.password && (await verifyPassword({ hash: account.password, password: pass }));
  const changed = existing?.username !== user || !samePassword;
  if (changed) {
    const password = await hashPassword(pass);
    transaction(db, () => {
      const now = Date.now();
      db.exec('DELETE FROM auth_session');
      db.prepare(
        'INSERT INTO auth_user(id,name,email,emailVerified,createdAt,updatedAt,username,displayUsername) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,username=excluded.username,displayUsername=excluded.displayUsername,updatedAt=excluded.updatedAt',
      ).run(ADMIN_ID, user, 'admin@openfunnel.invalid', 1, now, now, user, user);
      db.prepare(
        'INSERT INTO auth_account(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET password=excluded.password,updatedAt=excluded.updatedAt',
      ).run('admin-credential', ADMIN_ID, 'credential', ADMIN_ID, password, now, now);
    });
  }
  return { auth, origin, configured: true };
}
export async function getAdminSession(state, req) {
  if (!state.configured) return null;
  const session = await state.auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user.id === ADMIN_ID ? session : null;
}
