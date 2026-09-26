import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { LoadState, Notice, useData } from './components.jsx';
const size = (bytes) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
const accept = '.txt,.md,.doc,.docx,.pdf';
const labels = { ready: 'Disponible', processing: 'Procesando…', error: 'No disponible' };

export function AgentKnowledge({ id, confirm, setDirty, onChanged }) {
  const [version, setVersion] = useState(0);
  const state = useData(`/ai_agents/${id}/documents`, version, { pollMs: 3000, preserve: true });
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(null);
  const [preview, setPreview] = useState(null);
  const [target, setTarget] = useState(null);
  const input = useRef();
  const replacement = useRef();
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; setDirty(false); }; }, [setDirty]);
  async function upload(files, old) {
    if (busy || !files.length) return;
    setBusy(true); setDirty(true); setError('');
    const queue = [...files].map((file, index) => ({ file, key: `${Date.now()}-${index}`, state: 'En espera' }));
    setJobs(queue);
    for (const job of queue) {
      if (!alive.current) break;
      const update = (values) => setJobs((items) => items.map((item) => item.key === job.key ? { ...item, ...values } : item));
      try {
        if (job.file.size > 5 * 1024 * 1024) throw new Error('El archivo supera 5 MiB.');
        update({ state: 'Subiendo y procesando…' });
        const row = await api(`/ai_agents/${id}/documents${old ? `/${old.id}` : ''}`, {
          method: old ? 'PUT' : 'POST', body: job.file,
          headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': encodeURIComponent(job.file.name), ...(old ? { 'If-Match': String(old.revision) } : {}) },
        });
        if (!alive.current) break;
        setJobs((items) => items.filter((item) => item.key !== job.key));
        setVersion((v) => v + 1); onChanged?.();
        if (opened === row.id) { setPreview(row); }
      } catch (e) { if (alive.current) update({ state: 'No se pudo cargar', error: e.message }); }
    }
    if (alive.current) { setBusy(false); setDirty(false); }
  }
  async function open(row) {
    if (opened === row.id) { setOpened(null); return; }
    setOpened(row.id); setPreview(null); setError('');
    try { setPreview(await api(`/ai_agents/${id}/documents/${row.id}`)); }
    catch (e) { setError(e.message); setOpened(null); }
  }
  async function erase(row) {
    if (!(await confirm('Eliminar documento', `«${row.filename}» dejará de estar disponible para este agente. Se eliminarán el archivo original y su texto.`, 'Eliminar'))) return;
    setBusy(true); setError('');
    try {
      await api(`/ai_agents/${id}/documents/${row.id}`, { method: 'DELETE', headers: { 'If-Match': String(row.revision) } });
      if (opened === row.id) setOpened(null);
      setVersion((v) => v + 1); onChanged?.();
    } catch (e) { setError(e.message); setVersion((v) => v + 1); onChanged?.(); }
    finally { setBusy(false); }
  }
  return <section className="related-section knowledge-panel" aria-label="Contexto del agente">
    <div className={`document-dropzone ${busy ? 'is-busy' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files); }}>
      <button className="button secondary" disabled={busy} onClick={() => input.current.click()}>Subir archivos</button>
      <input ref={input} type="file" accept={accept} multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
      <p className="muted">TXT, MD, DOC, DOCX y PDF con texto · Hasta 5 MiB por archivo</p>
    </div>
    <p className="muted">{state.data?.items.length || 0}/10 archivos · {(state.data?.items.reduce((n, row) => n + (row.status === 'ready' ? row.characters : 0), 0) || 0).toLocaleString('es-CL')}/30.000 caracteres disponibles</p>
    <Notice error>{error}</Notice>
    <div aria-live="polite">{jobs.map((job) => <div className="workbench-row" key={job.key}><div><strong>{job.file.name}</strong><p>{job.state}</p>{job.error && <p className="field-error">{job.error}</p>}</div>{job.error && <button className="text-button" onClick={() => setJobs((rows) => rows.filter((row) => row.key !== job.key))}>Descartar aviso</button>}</div>)}</div>
    <LoadState state={state}>
      {state.data?.items.length === 0 && <p className="empty">Aún no has subido archivos.</p>}
      {state.data?.items.map((row) => <article className="document-row" key={row.id}>
        <div className="workbench-row"><div><h3>{row.status === 'ready' ? <button className="record-link" aria-expanded={opened === row.id} onClick={() => open(row)}>{row.filename}</button> : row.filename}</h3><p className="muted">{size(row.size)} · {new Date(row.updated_at).toLocaleDateString('es-CL')} · {labels[row.status]}</p>{row.error && <p className="field-error">{row.error}</p>}</div>
          <div className="inline-actions">
            <a className="button secondary" href={`/api/ai_agents/${id}/documents/${row.id}/download`}>Descargar</a>
            <details className="record-actions"><summary className="button quiet" aria-label={`Más acciones para ${row.filename}`}>Más</summary><div className="record-actions-menu">
            <button className="text-button" disabled={busy || row.status === 'processing'} onClick={(e) => { e.currentTarget.closest('details').open = false; setTarget(row); replacement.current.click(); }}>Reemplazar</button>
            <button className="text-button danger-text" disabled={busy || row.status === 'processing'} onClick={(e) => { e.currentTarget.closest('details').open = false; erase(row); }}>Eliminar</button>
            </div></details>
          </div>
        </div>
        {opened === row.id && <div className="document-preview"><p className="muted">Texto que recibe el agente</p><pre className="workbench-output">{preview?.id === row.id ? preview.extracted_text : 'Cargando texto…'}</pre></div>}
      </article>)}
    </LoadState>
    <input ref={replacement} type="file" accept={accept} hidden onChange={(e) => { upload(e.target.files, target); e.target.value = ''; }} />
    <details className="knowledge-note"><summary>Cómo usa el agente estos archivos</summary><p className="muted">Guardamos el original y extraemos su texto una vez. Los documentos disponibles se incluyen al generar cada respuesta y consumen tokens. No se leen imágenes ni se aplica OCR. <a href="./docs/conocimiento.html" target="_blank" rel="noreferrer">Ver documentación</a></p></details>
  </section>;
}
