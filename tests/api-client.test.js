import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../frontend/src/api.js';

test('Cliente API: errores del proxy sin JSON y respuestas inválidas', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch');
  for (const body of ['', '<html>Bad gateway</html>', 'null']) {
    fetch.mock.mockImplementation(async () => new Response(body, { status: 502 }));
    await assert.rejects(api('/session'), (error) =>
      error.status === 502 && error.message.includes('servidor no está disponible'));
  }
  fetch.mock.mockImplementation(async () => new Response('', { status: 200 }));
  await assert.rejects(api('/session'), /respuesta inválida/);
});

test('Cliente API: conserva datos y errores de campo; distingue red y cancelación', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch');
  fetch.mock.mockImplementation(async () => Response.json({ user: { name: 'admin' } }));
  assert.deepEqual(await api('/session'), { user: { name: 'admin' } });
  fetch.mock.mockImplementation(async () => Response.json(
    { error: 'Nombre requerido.', fields: { name: 'Requerido.' } }, { status: 400 }));
  await assert.rejects(api('/contacts'), (error) =>
    error.status === 400 && error.fields.name === 'Requerido.' && error.message === 'Nombre requerido.');
  fetch.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(api('/session'), /No se pudo conectar/);
  const abort = new DOMException('Cancelled', 'AbortError');
  fetch.mock.mockImplementation(async () => { throw abort; });
  await assert.rejects(api('/session'), (error) => error === abort);
});
