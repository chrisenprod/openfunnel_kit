export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('No se pudo conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.');
  }
  let data;
  try {
    data = await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    // El proxy puede responder sin JSON cuando la API no está disponible.
  }
  const validData = data !== null && typeof data === 'object' && !Array.isArray(data);
  if (!response.ok) {
    const message = validData && typeof data.error === 'string' && data.error
      ? data.error
      : response.status >= 500
        ? 'El servidor no está disponible. Inténtalo de nuevo en unos momentos.'
        : 'No se pudo completar la operación.';
    const error = Object.assign(new Error(message), {
      status: response.status,
      fields: validData ? data.fields : undefined,
    });
    if (response.status === 401 && path !== '/login' && path !== '/session')
      window.dispatchEvent(new Event('session-expired'));
    throw error;
  }
  if (!validData)
    throw Object.assign(new Error('El servidor devolvió una respuesta inválida. Inténtalo de nuevo.'), {
      status: response.status,
    });
  return data;
}
export async function allRecords(resource, filters = {}, signal) {
  const records = [];
  let page = 1;
  while (true) {
    const query = new URLSearchParams({ ...filters, page: String(page++), pageSize: '100' });
    const data = await api(`/${resource}?${query}`, { signal });
    records.push(...data.items);
    if (records.length >= data.total || !data.items.length) return records;
  }
}
