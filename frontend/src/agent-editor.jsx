import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { AgentKnowledge } from './agent-knowledge.jsx';
import { AgentTestPanel, PromptHistory } from './agent-workbench.jsx';
import { Icon } from './icons.jsx';
import { LoadState, Notice, useData } from './components.jsx';

export function AgentEditor({ record, version, refresh, open, confirm, setDirty, error, information, associations }) {
  const [mobileTest, setMobileTest] = useState(false);
  const [showInformation, setShowInformation] = useState(false);
  const [showAssociations, setShowAssociations] = useState(false);
  const [instructionsPending, setInstructionsPending] = useState(false);
  const [configurationPending, setConfigurationPending] = useState(false);
  const [testRevision, setTestRevision] = useState(0);
  const trigger = useRef();
  const testPane = useRef();
  const dirty = useRef({});
  const report = useCallback((key, value) => {
    dirty.current[key] = value;
    setDirty(Object.values(dirty.current).some(Boolean));
    setConfigurationPending(Object.entries(dirty.current).some(([name, changed]) => name !== 'test' && changed));
  }, [setDirty]);
  const instructionsDirty = useCallback(value => { report('instructions', value); setInstructionsPending(value); }, [report]);
  const toolsDirty = useCallback(value => report('tools', value), [report]);
  const knowledgeDirty = useCallback(value => report('knowledge', value), [report]);
  const infoDirty = useCallback(value => report('information', value), [report]);
  const associationDirty = useCallback(value => report('associations', value), [report]);
  const testDirty = useCallback(value => report('test', value), [report]);
  useEffect(() => () => setDirty(false), [setDirty]);
  function changed() { setTestRevision(value => value + 1); refresh(); }
  const previousMobileTest = useRef(false);
  useLayoutEffect(() => {
    if (mobileTest) testPane.current?.querySelector('#test-message')?.focus();
    else if (previousMobileTest.current) trigger.current?.focus();
    previousMobileTest.current = mobileTest;
  }, [mobileTest]);
  function closeTest() { setMobileTest(false); }
  return <>
    <div className="page-heading agent-heading"><div><h1 tabIndex="-1">{record.name}</h1><p className="muted">{record.active ? 'Agente disponible' : 'Agente inactivo'} · <button className="text-button" onClick={() => setShowInformation(true)}>Editar nombre y disponibilidad</button></p></div>
      <button ref={trigger} className="button primary mobile-test-toggle" onClick={() => setMobileTest(true)}><Icon name="play"/>Probar</button>
    </div>
    <Notice error>{error}</Notice>
    {showInformation && <section className="agent-information">{information(infoDirty, () => setShowInformation(false))}</section>}
    <div className={`agent-studio ${mobileTest ? 'show-test' : ''}`}>
      <div className="agent-authoring">
        <DirectInstructions id={record.id} version={version} refresh={changed} open={open} confirm={confirm} setDirty={instructionsDirty}/>
        <section className="agent-section"><h2>Contexto del negocio</h2><AgentKnowledge id={record.id} confirm={confirm} setDirty={knowledgeDirty} onChanged={changed}/></section>
        <NativeTools record={record} version={version} refresh={changed} setDirty={toolsDirty}/>
        <div className="agent-library"><button className="text-button" disabled={instructionsPending} onClick={() => setShowAssociations(true)}>Reutilizar instrucciones de la biblioteca</button><button className="text-button" onClick={() => open('prompts', '')}>Ver biblioteca</button></div>
        {showAssociations && <section className="agent-section"><h2>Instrucciones reutilizables</h2>{associations(associationDirty, () => { setShowAssociations(false); changed(); })}</section>}
      </div>
      <aside ref={testPane} tabIndex="-1" className="agent-test-pane" aria-label="Prueba del agente" onKeyDown={event => { if (event.key === 'Escape' && mobileTest) closeTest(); }}>
        <button className="button secondary mobile-test-toggle" onClick={closeTest}>← Volver al editor</button>
        {configurationPending && <p className="notice">Hay cambios pendientes. La prueba usa la configuración guardada.</p>}
        <AgentTestPanel id={record.id} setDirty={testDirty} configurationVersion={testRevision}/>
      </aside>
    </div>
  </>;
}

function DirectInstructions({ id, version, refresh, open, confirm, setDirty }) {
  const state = useData(`/ai_agents/${id}/instructions`, version, { preserve: true });
  const [snapshot, setSnapshot] = useState(null);
  const [draft, setDraft] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [historyId, setHistoryId] = useState(null);
  const modified = useRef(false);
  useEffect(() => {
    if (state.data && !modified.current) {
      setSnapshot(state.data);
      setDraft(state.data.prompts.length ? state.data.prompts.map(p => p.content) : ['']);
    }
  }, [state.data]);
  useEffect(() => () => setDirty(false), [setDirty]);
  function edit(index, value) {
    const next = draft.map((content, i) => i === index ? value : content);
    setDraft(next); setNotice('');
    modified.current = next.some((content, i) => content !== (snapshot.prompts[i]?.content || ''));
    setDirty(modified.current);
  }
  async function save(event) {
    event.preventDefault(); if (busy || !modified.current) return;
    const others = [...new Set(snapshot.prompts.flatMap(p => p.agents.filter(a => a.id !== id).map(a => a.name)))];
    if (others.length && !(await confirm('Guardar instrucciones compartidas', `También se actualizarán en: ${others.join(', ')}.`, 'Guardar'))) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await api(`/ai_agents/${id}/instructions`, { method: 'PUT', body: {
        expected_ids: snapshot.agent.prompt_ids,
        prompts: draft.map((content, i) => ({ id: snapshot.prompts[i]?.id || null, expected_version: snapshot.prompts[i]?.version, content })),
      } });
      modified.current = false; setDirty(false); setSnapshot(saved); setDraft(saved.prompts.map(p => p.content));
      setNotice('Instrucciones guardadas.'); state.retry(); refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function reload() {
    if (modified.current && !(await confirm('Recargar instrucciones', 'Se descartará este borrador para cargar la versión guardada.', 'Recargar'))) return;
    modified.current = false; setDirty(false); setError(''); state.retry();
  }
  return <section className="agent-section direct-instructions">
    <div className="section-heading"><h2>Instrucciones</h2>{snapshot?.prompts.length > 0 && <button className="text-button" disabled={busy || modified.current} onClick={() => setHistoryId(historyId ? null : snapshot.prompts[0].id)}>Versiones</button>}</div>
    {error && <Notice error>{error} <button className="text-button" onClick={reload}>Recargar versión guardada</button></Notice>}<Notice>{notice}</Notice>
    <LoadState state={state}>{snapshot && <form onSubmit={save}><fieldset disabled={busy}><legend className="sr-only">Instrucciones del agente</legend>
      {draft.map((content, index) => { const prompt = snapshot.prompts[index]; const others = prompt?.agents.filter(a => a.id !== id) || []; return <div className="field" key={prompt?.id || 'new'}>
        <label className={draft.length === 1 ? 'sr-only' : undefined} htmlFor={`instructions-${index}`}>{draft.length > 1 ? `${index + 1}. ${prompt.name}` : 'Instrucciones para responder'}{prompt && !prompt.active && ' · Inactivas (no se usan)'}</label>
        {prompt && !prompt.active && <p className="notice">Estas instrucciones están inactivas y no se usan al responder. <button type="button" className="text-button" onClick={() => open('prompts', prompt.id)}>Gestionar prompt</button></p>}
        {others.length > 0 && <p className="field-hint">Compartidas con {others.map(a => a.name).join(', ')}.</p>}
        <textarea id={`instructions-${index}`} rows={draft.length > 1 ? 8 : 10} maxLength={20000} required value={content} onChange={event => edit(index, event.target.value)} placeholder="Ayudas a nuestros clientes a…"/>
        {draft.length > 1 && <button type="button" className="text-button" disabled={modified.current} onClick={() => setHistoryId(prompt.id)}>Ver versiones</button>}
      </div>; })}
      <div className="form-actions"><button className="button primary" disabled={!modified.current}>{busy ? 'Guardando…' : 'Guardar instrucciones'}</button><span className="muted" role="status">{modified.current ? 'Cambios sin guardar' : snapshot?.prompts.length ? 'Guardado' : 'Sin instrucciones'}</span></div>
    </fieldset></form>}</LoadState>
    {historyId && <PromptHistory id={historyId} version={version} refresh={() => { state.retry(); refresh(); }} confirm={confirm}/>}
  </section>;
}

function NativeTools({ record, version, refresh, setDirty }) {
  const state = useData('/tools?pageSize=100', version, { preserve: true });
  const [selected, setSelected] = useState(record.tool_ids);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const modified = useRef(false);
  useEffect(() => { if (!modified.current) setSelected(record.tool_ids); }, [record.tool_ids]);
  useEffect(() => () => setDirty(false), [setDirty]);
  function toggle(id, checked) {
    const next = checked ? [...selected, id] : selected.filter(key => key !== id);
    setSelected(next); modified.current = JSON.stringify([...next].sort()) !== JSON.stringify([...record.tool_ids].sort()); setDirty(modified.current); setNotice('');
  }
  async function save(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await api(`/ai_agents/${record.id}`, { method: 'PATCH', body: { tool_ids: selected } }); modified.current = false; setDirty(false); setNotice('Herramientas guardadas.'); refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="agent-section"><h2>Herramientas</h2><p className="muted">Elige qué acciones puede realizar este agente.</p><Notice error>{error}</Notice><Notice>{notice}</Notice>
    <LoadState state={state}><form onSubmit={save}><fieldset disabled={busy} className="native-tool-options"><legend className="sr-only">Herramientas nativas disponibles</legend>
      {state.data?.items.filter(tool => tool.id.startsWith('builtin_') || selected.includes(tool.id)).map(tool => <label key={tool.id}><input type="checkbox" checked={selected.includes(tool.id)} onChange={event => toggle(tool.id, event.target.checked)}/><span><strong>{tool.name}</strong><small>{tool.description}{!tool.active && ' · Inactiva'}</small></span></label>)}
      <button className="button secondary" disabled={!modified.current}>{busy ? 'Guardando…' : 'Guardar herramientas'}</button>
    </fieldset></form></LoadState>
  </section>;
}
