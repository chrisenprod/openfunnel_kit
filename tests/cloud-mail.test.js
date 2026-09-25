import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudMail } from '../backend/cloud-mail.js';
const env = { APP_ORIGIN: 'https://app.example.com', RESEND_API_KEY: 'synthetic-secret', RESEND_FROM: 'OpenFunnel <noreply@example.com>' };

test('Cloud mail uses server-only credentials, fixed origin, safe links and idempotency', async () => {
  const requests = [];
  const mail = createCloudMail(env, async (url, options) => { requests.push({ url, ...options }); return Response.json({ id: 'synthetic-email' }); });
  assert.equal(mail.configured, true);
  for (const kind of ['verify', 'verify', 'reset']) await mail.send({ email: 'user@example.com', token: 'one&two<>"', kind });
  assert.equal(requests[0].url, 'https://api.resend.com/emails');
  assert.equal(requests[0].redirect, 'error');
  assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key']);
  assert.notEqual(requests[0].headers['Idempotency-Key'], requests[2].headers['Idempotency-Key']);
  const body = JSON.parse(requests[0].body);
  assert.ok(body.text.includes('https://app.example.com/#/verify?token=one%26two%3C%3E%22'));
  assert.ok(!requests[0].body.includes(env.RESEND_API_KEY));
  assert.ok(!body.html.includes('<>'));
});

test('Cloud mail rejects invalid configuration and hides provider errors', async () => {
  const disabled = createCloudMail({ ...env, RESEND_API_KEY: '' });
  assert.equal(disabled.configured, false);
  await assert.rejects(disabled.send({}), { status: 503 });
  assert.equal(createCloudMail({ ...env, RESEND_FROM: 'x@example.com\nBcc: hidden@example.com' }).configured, false);
  const mail = createCloudMail(env, async () => { throw new Error('raw provider credential synthetic-secret'); });
  await assert.rejects(mail.send({ email: 'user@example.com', token: 'test-token', kind: 'verify' }), error => error.status === 502 && !error.message.includes('synthetic-secret'));
  await assert.rejects(mail.send({ email: 'x\n@example.com', token: 'test-token', kind: 'verify' }), { status: 400 });
});
