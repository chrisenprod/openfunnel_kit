import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import { LoadState, Notice, Pagination, useData } from './components.jsx';
const scopes = [
  ['resources:read', 'Leer recursos'],
  ['prompts:write', 'Editar y restaurar prompts'],
  ['agents:test', 'Probar agentes'],
];
const date = (value) => value ? new Date(value).toLocaleString('es-CL') : 'Sin uso';

export function ApiKeysPage({ confirm, setDirty }) {
  const [version, setVersion] = useState(0);
  const state = useData('/api-keys', version);
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState('');
  const [days, setDays] = useState(90);
  const [selected, setSelected] = useState(['resources:read']);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);
  const secretRef = useRef();
  const nameRef = useRef();
  const triggerRef = useRef();
  const closing = useRef(false);
  useEffect(() => { setDirty(changed || !!secret); }, [changed, secret, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);
  useEffect(() => { if (opened) nameRef.current?.focus(); }, [opened]);
  function reset() {
    setOpened(false); setName(''); setDays(90); setSelected(['resources:read']);
    setSecret(''); setChanged(false); setError('');
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  async function close() {
    if (busy || closing.current) return;
    closing.current = true;
    try {
      if (secret && !(await confirm('¿Guardaste la clave?', 'Al cerrar, esta clave no volverá a mostrarse.', 'Ya la guardé'))) return;
      if (!secret && changed && !(await confirm('Descartar cambios', 'La clave todavía no se ha creado.', 'Descartar'))) return;
      reset();
    } finally { closing.current = false; }
  }
  async function create(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const key = await api('/api-keys', { method: 'POST', body: { name, scopes: selected, expires_in_days: Number(days) } });
      setSecret(key.secret); setChanged(false); setVersion((v) => v + 1);
      requestAnimationFrame(() => secretRef.current?.focus());
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function revoke(key) {
    if (busy || !(await confirm('Revocar clave', `«${key.name}» dejará de acceder inmediatamente.`, 'Revocar'))) return;
    setBusy(true); setError('');
    try {
      await api(`/api-keys/${key.id}/revoke`, { method: 'POST', body: {} });
      setVersion((v) => v + 1);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <>
    <div className="page-heading"><div><h1 tabIndex="-1">Claves API</h1><p className="muted">Un acceso seguro para cada integración.</p></div>
      <button ref={triggerRef} className="button primary" disabled={opened || busy} onClick={() => { setError(''); setOpened(true); }}><Icon name="plus" />Crear clave</button>
    </div>
    {!opened && <Notice error>{error}</Notice>}
    <div className={`keys-workspace ${opened ? 'with-panel' : ''}`}>
      <section className="keys-list" aria-label="Claves de esta instalación">
        <div className="list-caption"><span>Integraciones</span><span>{state.data?.items.length ?? '—'} claves</span></div>
        <LoadState state={state}>
          {state.data?.items.length === 0 && <div className="keys-empty">
            <span className="empty-symbol"><Icon name="api_keys" /></span>
            <h2>Conecta tu primera integración</h2>
            <p className="muted">Crea una clave para que tus aplicaciones accedan a OpenFunnel.<br />Tú eliges los permisos y cuándo vence.</p>
            <button className="text-button" disabled={opened} onClick={() => setOpened(true)}>Crear mi primera clave <span aria-hidden="true">→</span></button>
          </div>}
          {state.data?.items.map((key) => <article className="key-row" key={key.id}>
            <span className="row-symbol"><Icon name="api_keys" /></span>
            <div className="key-info"><h3>{key.name}</h3><p className="key-prefix">{key.prefix}••••••••</p>
              <div className="key-scopes">{key.scopes.map((s) => <span key={s}>{scopes.find(([id]) => s === id)?.[1] || s}</span>)}</div>
              <p className="muted key-dates">Último uso: {date(key.last_used_at)} · Vence: {date(key.expires_at)}</p>
            </div>
            {key.revoked_at ? <span className="badge">Revocada</span> : new Date(key.expires_at) <= new Date() ? <span className="badge">Vencida</span> : <div className="key-actions"><span className="availability"><span />Activa</span><button className="text-button danger-text" disabled={busy} onClick={() => revoke(key)}>Revocar</button></div>}
          </article>)}
        </LoadState>
        <p className="keys-footnote"><Icon name="lock" />Las claves son personales. Puedes revocar su acceso en cualquier momento.</p>
      </section>
      {opened && <aside className="creation-panel" aria-labelledby="key-panel-title" onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>
        <div className="section-heading"><div><p className="eyebrow">NUEVA INTEGRACIÓN</p><h2 id="key-panel-title">{secret ? 'Tu clave está lista' : 'Crear clave API'}</h2></div><button className="button icon-button quiet" aria-label="Cerrar creación de clave" disabled={busy} onClick={close}><Icon name="close" /></button></div>
        <Notice error>{error}</Notice>
        {secret ? <div className="key-secret"><span className="empty-symbol"><Icon name="check" /></span><p>Guárdala en un lugar seguro.<br />Solo podrás verla esta vez.</p><label htmlFor="new-api-key">Clave de {name}</label><textarea ref={secretRef} id="new-api-key" readOnly value={secret} rows={3} onFocus={(e) => e.target.select()} autoComplete="off" /><button className="button primary" onClick={reset}>Ya la guardé · Ocultar</button></div> : <form onSubmit={create} aria-busy={busy}>
          <p className="muted panel-description">Dale un nombre y define qué podrá hacer.</p>
          <fieldset disabled={busy}><legend className="sr-only">Datos de la clave</legend>
            <div className="field"><label htmlFor="key-name">Nombre de la integración</label><input ref={nameRef} id="key-name" placeholder="Ej. Mi tienda" value={name} maxLength={80} required onChange={(e) => { setName(e.target.value); setChanged(true); }} /></div>
            <div className="field"><label htmlFor="key-days">Vigencia</label><div className="input-suffix"><input id="key-days" type="number" min="1" max="365" required value={days} onChange={(e) => { setDays(e.target.value); setChanged(true); }} /><span>días</span></div><span className="field-hint">Entre 1 y 365 días desde su creación.</span></div>
            <fieldset className="permission-list"><legend>Permisos</legend>{scopes.map(([key, label], index) => <label key={key}><input type="checkbox" checked={selected.includes(key)} onChange={(e) => { setSelected((s) => e.target.checked ? [...s, key] : s.filter((v) => v !== key)); setChanged(true); }} /><span><strong>{label}</strong><small>{['Consultar datos de esta instalación.', 'Actualizar instrucciones y recuperar versiones.', 'Ejecutar pruebas que consumen tokens.'][index]}</small></span></label>)}</fieldset>
            <div className="form-actions"><button className="button primary" disabled={!selected.length}>{busy ? 'Creando…' : 'Crear clave'}</button><button type="button" className="button quiet" onClick={close}>Cancelar</button></div>
          </fieldset>
        </form>}
      </aside>}
    </div>
  </>;
}

export function PromptHistory({ id, version, refresh, confirm }) {
  const [page, setPage] = useState(1);
  const state = useData(`/prompts/${id}/versions?page=${page}`, version);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function restore(snapshot) {
    const expected = state.data.current_version;
    const affected = state.data.agents.map((a) => a.name).join(', ') || 'Ningún agente asociado';
    if (!(await confirm('Restaurar prompt', `Se creará una nueva versión desde la v${snapshot.version}. Afecta a: ${affected}.`, 'Restaurar'))) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await api(`/prompts/${id}/restore`, { method: 'POST', body: { version: snapshot.version, expected_version: expected } });
      setNotice(`Restaurado como versión ${saved.version}.`); setPage(1); refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="related-section"><h2>Versiones del prompt</h2>
    <Notice error>{error}</Notice><Notice>{notice}</Notice>
    <LoadState state={state}>{state.data && <>
      <p className="muted">Versión actual: {state.data.current_version}. Agentes afectados: {state.data.agents.map((a) => a.name).join(', ') || 'ninguno'}.</p>
      {state.data.items.map((snapshot) => <details className="prompt-version" key={snapshot.version}>
        <summary>Versión {snapshot.version} · {date(snapshot.created_at)} · {snapshot.actor === 'admin' ? 'Administrador' : snapshot.actor === 'migration' ? 'Versión inicial' : snapshot.actor}</summary>
        <h3>{snapshot.name}</h3><p>{snapshot.description}</p><p className="muted">{snapshot.active ? 'Activo' : 'Inactivo'}</p><pre className="workbench-output">{snapshot.content}</pre>
        {snapshot.version !== state.data.current_version && <button className="button secondary" disabled={busy} onClick={() => restore(snapshot)}>Restaurar versión {snapshot.version}</button>}
      </details>)}
      <Pagination page={page} pageSize={20} total={state.data.total} onPage={setPage} />
    </>}</LoadState>
  </section>;
}

export function AgentTestPanel({ id, setDirty }) {
  const [message, setMessage] = useState('');
  const [candidate, setCandidate] = useState('');
  const [custom, setCustom] = useState(false);
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef();
  const transcript = useRef();
  useEffect(() => () => { controller.current?.abort(); setDirty(false); }, [setDirty]);
  useEffect(() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }, [history, busy]);
  async function run(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    controller.current = new AbortController();
    try {
      const data = await api(`/ai_agents/${id}/test`, { method: 'POST', body: {
        message, history, ...(result ? { context_hash: result.context_hash } : {}), ...(custom ? { prompt: candidate } : {}),
      }, signal: controller.current.signal });
      setHistory((items) => [...items, { role: 'user', content: message }, { role: 'assistant', content: data.response }]);
      setResult(data); setMessage(''); setDirty(true);
    } catch (e) { if (e.name !== 'AbortError') setError(e.message); } finally { setBusy(false); }
  }
  const full = history.length > 20 || history.reduce((n, item) => n + item.content.length, 0) > 18000;
  return <section className="related-section agent-test"><div className="section-heading"><h2>Probar agente</h2>
    <button className="button secondary" disabled={busy || (!history.length && !error)} onClick={() => { setHistory([]); setResult(null); setError(''); setMessage(''); setDirty(custom); }}>Reiniciar</button>
    </div>
    <p className="muted">Chat temporal · Consume tokens · Sin envíos reales.</p>
    <Notice error>{error}</Notice>
    <form onSubmit={run} aria-busy={busy}><fieldset disabled={busy}><legend className="sr-only">Prueba del agente</legend>
      <details className="candidate-instructions"><summary>Opciones de prueba</summary><p className="muted">Las herramientas se simulan. El historial se pierde al salir del agente.</p>
        <label className="scope-options"><input type="checkbox" disabled={!!history.length} checked={custom} onChange={(e) => { setCustom(e.target.checked); setDirty(true); }} />Probar otras instrucciones sin guardarlas</label>
        {custom && <div className="field"><label htmlFor="test-prompt">Sustituyen los prompts activos solo en esta prueba</label><textarea id="test-prompt" value={candidate} disabled={!!history.length} required maxLength={20000} rows={6} onChange={(e) => { setCandidate(e.target.value); setDirty(true); }} /></div>}
        {!!history.length && <p className="muted">Reinicia la conversación para cambiar las instrucciones.</p>}
      </details>
      <div ref={transcript} className="test-transcript" role="log" aria-label="Conversación de prueba" aria-live="polite">
        {!history.length && <p className="muted">Escribe como lo haría un cliente para comprobar las respuestas.</p>}
        {history.map((item, index) => <article className={`test-message ${item.role}`} key={index}><strong>{item.role === 'user' ? 'Tú' : 'Agente'}</strong><p className="preserve-text">{item.content}</p></article>)}
        {busy && <p className="muted">Esperando al modelo…</p>}
      </div>
      {full && <p className="notice">Esta prueba alcanzó el límite de historial. Reinicia para continuar.</p>}
      <div className="field"><label htmlFor="test-message">Mensaje de prueba</label><textarea id="test-message" value={message} required maxLength={4000} rows={3} onChange={(e) => { setMessage(e.target.value); setDirty(true); }} /></div>
      <button className="button primary" disabled={full}>{busy ? 'Probando…' : 'Enviar prueba'}</button>
    </fieldset></form>
    {result && <details className="test-result"><summary>Detalles de la última respuesta</summary>
      <p className="muted">{(result.duration_ms / 1000).toFixed(1)} s · {result.usage ? `${result.usage.total_tokens} tokens` : 'Consumo no informado'} · {result.candidate ? 'Instrucciones candidatas' : 'Prompts guardados'}</p>
      <p>Documentos incluidos: {result.documents.map((item) => `${item.filename} (v${item.revision})`).join(', ') || 'ninguno'}.</p>
      {result.tools.length > 0 && <><h3>Herramientas simuladas</h3>{result.tools.map((tool, index) => <details key={index}><summary>{tool.name} · Simulada</summary><pre className="workbench-output">{JSON.stringify(tool, null, 2)}</pre></details>)}</>}
    </details>}
  </section>;
}
