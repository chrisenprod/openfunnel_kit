import { request as httpsRequest } from 'node:https';
import { lookup } from 'node:dns';
import { BlockList, isIP } from 'node:net';
import { HttpError } from './resources.js';

const blocked = new BlockList();
for (const [ip, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) blocked.addSubnet(ip, prefix, 'ipv4');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
for (const [ip, prefix] of [['2001::',23],['2001:db8::',32],['2002::',16]]) blocked.addSubnet(ip,prefix,'ipv6');
export function publicAddress(address) {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  return family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}
export function providerURL(value, env) {
  let url;
  try { url = new URL(value); } catch { throw new HttpError(400, 'Introduce una URL HTTPS válida.'); }
  const hosts = (env.LLM_ALLOWED_HOSTS || 'api.openai.com,openrouter.ai,*.openai.azure.com,*.services.ai.azure.com').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  const allowed = hosts.some(host => host.startsWith('*.') ? url.hostname.endsWith(host.slice(1)) && url.hostname !== host.slice(2) : url.hostname === host);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.port && url.port !== '443') || isIP(url.hostname.replace(/^\[|\]$/g,'')) || !allowed)
    throw new HttpError(400, 'El destino LLM no está autorizado. Configura un host HTTPS permitido por la instancia.');
  return url;
}
// DNS is validated at the socket connection, not just when saving the URL.
export function providerFetch(env, { resolveHost = lookup } = {}) {
  return async (input, init = {}) => {
    if (env.INTEGRATION_ACTIVE && !env.INTEGRATION_ACTIVE()) throw new HttpError(403, 'Cuenta suspendida.');
    const url = providerURL(typeof input === 'string' || input instanceof URL ? String(input) : input.url, env);
    return new Promise((resolve, reject) => {
      const req = httpsRequest(url, {
        method: init.method || 'GET', headers: Object.fromEntries(new Headers(init.headers)),
        signal: init.signal, agent: false,
        lookup(host, options, callback) {
          resolveHost(host, { all: true, verbatim: true }, (error, addresses) => {
            if (error || !addresses?.length || addresses.some(a => !publicAddress(a.address)) || (env.INTEGRATION_ACTIVE && !env.INTEGRATION_ACTIVE())) return callback(new Error('Destination unavailable'));
            if (options.all) callback(null, addresses);
            else callback(null, addresses[0].address, addresses[0].family);
          });
        },
      }, response => {
        if (response.statusCode >= 300 && response.statusCode < 400) { response.destroy(); reject(new Error('Redirect forbidden')); return; }
        let size = 0;
        const chunks = [];
        response.on('data', chunk => { size += chunk.length; if (size > 4 * 1024 * 1024) response.destroy(new Error('Response too large')); else chunks.push(chunk); });
        response.on('error', reject);
        response.on('end', () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(response.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          resolve(new Response([204,205,304].includes(response.statusCode) ? null : Buffer.concat(chunks), { status: response.statusCode, headers }));
        });
      });
      req.setTimeout(30000, () => req.destroy(new Error('Provider timeout')));
      req.on('error', reject);
      req.end(init.body);
    });
  };
}
