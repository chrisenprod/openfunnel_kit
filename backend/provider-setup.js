import { HttpError, publicError } from './resources.js';
import { objectBody } from './api-keys.js';

export function createProviderSetup(db, connections, integrations) {
  const running = new Set();
  const key = provider => `provider_setup:${provider}`;
  function metadata(provider) {
    const current = connections.metadata(provider);
    const integration = integrations.status();
    const ready = provider === 'llm' ? integration.llm.validated : integration.zernio.webhookRegistered;
    const stored = db.prepare('SELECT value FROM integration_settings WHERE key=?').get(key(provider));
    const failure = stored ? JSON.parse(stored.value) : null;
    const error = failure?.version === current.version ? failure.error : null;
    return { ...current, setup: {
      status: !current.configured ? 'unconfigured' : running.has(provider) ? 'running' : ready ? 'ready' : error ? 'failed' : 'pending',
      error: !ready && current.configured ? error : null,
    } };
  }
  function available(provider) {
    if (running.has(provider)) throw new HttpError(409, 'La conexión se está preparando. Espera a que termine.');
  }
  async function prepare(provider) {
    const version = connections.metadata(provider).version;
    running.add(provider);
    db.prepare('DELETE FROM integration_settings WHERE key=?').run(key(provider));
    try {
      if (provider === 'llm') await integrations.validateModel();
      else await integrations.registerWebhook();
    } catch (error) {
      if (connections.metadata(provider).version === version) {
        db.prepare('INSERT INTO integration_settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
          .run(key(provider), JSON.stringify({ version, error: publicError(error).message }));
      }
    } finally { running.delete(provider); }
    return metadata(provider);
  }
  return {
    metadata,
    async save(provider, body) {
      available(provider);
      connections.save(provider, body);
      return prepare(provider);
    },
    async retry(provider, body) {
      available(provider);
      objectBody(body, ['expected_version']);
      const current = metadata(provider);
      if (body.expected_version !== current.version) throw new HttpError(409, 'La conexión cambió. Recarga antes de reintentar.');
      if (!current.configured) throw new HttpError(400, 'Guarda primero los datos de conexión.');
      if (current.setup.status === 'ready') return current;
      return prepare(provider);
    },
    remove(provider, body) {
      available(provider);
      connections.remove(provider, body);
      db.prepare('DELETE FROM integration_settings WHERE key=?').run(key(provider));
      return metadata(provider);
    },
  };
}
