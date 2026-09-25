import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { detail, HttpError } from './resources.js';

export const documentLimits = { bytes: 5 * 1024 * 1024, count: 10, characters: 30000 };
const types = { txt: 'text/plain', md: 'text/markdown', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pdf: 'application/pdf' };
const columns = 'id,ai_agent_id,filename,media_type,size,status,error,revision,created_at,updated_at,length(extracted_text) AS characters';
export function readyDocuments(db, agentId) {
  return db.prepare("SELECT id,filename,revision,extracted_text FROM agent_documents WHERE ai_agent_id=? AND status='ready' ORDER BY created_at,id").all(agentId);
}
function extract(bytes, extension) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./document-extractor.js', import.meta.url), {
      workerData: { bytes, extension }, resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16 },
    });
    let finished = false;
    const finish = (error, text) => {
      if (finished) return;
      finished = true; clearTimeout(timer);
      worker.terminate().then(() => error ? reject(new HttpError(422, error)) : resolve(text));
    };
    const timer = setTimeout(() => finish('El archivo tardó demasiado en procesarse. Prueba con un documento más pequeño.'), 15000);
    worker.once('message', (result) => finish(result.error, result.text));
    worker.once('error', () => finish('No se pudo procesar el archivo dentro del límite de memoria.'));
    worker.once('exit', () => { if (!finished) finish('El procesamiento del archivo se interrumpió.'); });
  });
}
export async function readUpload(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/octet-stream')
    throw new HttpError(415, 'Sube el archivo como application/octet-stream.');
  if (Number(req.headers['content-length']) > documentLimits.bytes) throw new HttpError(413, 'El archivo supera 5 MiB.');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > documentLimits.bytes) throw new HttpError(413, 'El archivo supera 5 MiB.');
    chunks.push(chunk);
  }
  let filename;
  try { filename = decodeURIComponent(req.headers['x-filename'] || ''); } catch {}
  if (!filename || filename.length > 180 || /[\x00-\x1f\x7f/\\]/.test(filename)) throw new HttpError(400, 'Nombre de archivo inválido (máximo 180 caracteres).');
  const extension = filename.split('.').pop().toLowerCase();
  if (!Object.hasOwn(types, extension)) throw new HttpError(415, 'Formatos permitidos: TXT, MD, DOC, DOCX y PDF.');
  if (!size) throw new HttpError(400, 'El archivo está vacío.');
  return { filename, extension, bytes: Buffer.concat(chunks), size, media_type: types[extension] };
}
export function createDocuments(db) {
  db.prepare("UPDATE agent_documents SET status='error',error='El procesamiento se interrumpió. Reemplaza el archivo para volver a intentarlo.' WHERE status='processing'").run();
  let running = false;
  function get(agentId, id, original = false) {
    const row = db.prepare(`SELECT ${columns},${original ? 'original' : 'extracted_text'} FROM agent_documents WHERE ai_agent_id=? AND id=?`).get(agentId, id);
    if (!row) throw new HttpError(404, 'Documento no encontrado.');
    return row;
  }
  function checkRevision(row, revision) {
    if (revision !== String(row.revision)) throw new HttpError(409, 'El documento cambió. Actualiza la lista e inténtalo de nuevo.');
  }
  function list(agentId) {
    detail(db, 'ai_agents', agentId);
    return { items: db.prepare(`SELECT ${columns} FROM agent_documents WHERE ai_agent_id=? ORDER BY created_at,id`).all(agentId), limits: documentLimits };
  }
  async function upload(agentId, input, id, revision) {
    detail(db, 'ai_agents', agentId);
    if (id) checkRevision(get(agentId, id), revision);
    else if (list(agentId).items.length >= documentLimits.count) throw new HttpError(409, 'Este agente ya tiene 10 documentos. Elimina uno antes de subir otro.');
    if (running) throw new HttpError(409, 'Hay otro archivo procesándose. Espera a que termine.');
    running = true;
    const documentId = id || randomUUID(), stamp = new Date().toISOString();
    try {
      if (!id) db.prepare("INSERT INTO agent_documents (id,ai_agent_id,filename,media_type,size,original,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'processing',?,?)")
        .run(documentId, agentId, input.filename, input.media_type, input.size, input.bytes, stamp, stamp);
      const text = await extract(input.bytes, input.extension);
      const current = get(agentId, documentId);
      if (id) checkRevision(current, revision);
      const used = db.prepare("SELECT coalesce(sum(length(extracted_text)),0) AS n FROM agent_documents WHERE ai_agent_id=? AND id<>? AND status='ready'").get(agentId, documentId).n;
      if (used + [...text].length > documentLimits.characters) throw new HttpError(422, 'El texto disponible del agente superaría 30000 caracteres. Reduce o elimina documentos.');
      // No await between revision/quota checks and this atomic update.
      db.prepare("UPDATE agent_documents SET filename=?,media_type=?,size=?,original=?,extracted_text=?,status='ready',error=NULL,revision=revision+?,updated_at=? WHERE id=?")
        .run(input.filename, input.media_type, input.size, input.bytes, text, id ? 1 : 0, new Date().toISOString(), documentId);
      return get(agentId, documentId);
    } catch (error) {
      if (id) throw error;
      db.prepare("UPDATE agent_documents SET status='error',error=?,updated_at=? WHERE id=?")
        .run(error instanceof HttpError ? error.message : 'No se pudo procesar el documento.', new Date().toISOString(), documentId);
      return get(agentId, documentId);
    } finally { running = false; }
  }
  function remove(agentId, id, revision) {
    checkRevision(get(agentId, id), revision);
    db.prepare('DELETE FROM agent_documents WHERE ai_agent_id=? AND id=?').run(agentId, id);
    return { ok: true };
  }
  return { get, list, upload, remove };
}
