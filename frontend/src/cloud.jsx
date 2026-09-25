import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Notice, LoadState, useData } from './components.jsx';
import { Icon } from './icons.jsx';
import zernioLogoDark from './assets/zernio/logo-dark.svg';
import zernioLogoWhite from './assets/zernio/logo-white.svg';

function CloudPasswordField({ view }) {
  const [visible, setVisible] = useState(false);
  const [length, setLength] = useState(0);
  const isNew = view !== 'login';
  const meetsMinimum = length >= 12;
  return <div className="field">
    <label htmlFor="cloud-password">Contraseña</label>
    <div className="password-field">
      <input id="cloud-password" name="password" type={visible ? 'text' : 'password'} autoComplete={isNew ? 'new-password' : 'current-password'} minLength={12} maxLength={128} required aria-describedby={isNew ? 'cloud-password-requirements' : undefined} onInput={event => setLength(event.currentTarget.value.length)}/>
      <button type="button" className="text-button" aria-controls="cloud-password" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
    </div>
    {isNew && <ul id="cloud-password-requirements" className="password-requirements" aria-live="polite" aria-atomic="true">
      <li className={meetsMinimum ? 'is-met' : 'is-pending'}><span aria-hidden="true">{meetsMinimum ? '✓' : '○'}</span> Mínimo 12 caracteres<span className="sr-only">: {meetsMinimum ? 'cumplido' : 'pendiente'}</span></li>
    </ul>}
  </div>;
}

export function CloudLogin({ onLogin, error: initialError, theme, toggleTheme }) {
  const initial = window.location.hash.slice(2).split('?')[0];
  const [view, setView] = useState(['register','verify','recover','reset'].includes(initial) ? initial : 'login');
  const [token] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] || '').get('token') || '');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()),1000); return () => clearInterval(timer); },[]);
  const titles = {login:'Bienvenido a OpenFunnel',register:'Crea tu cuenta',pending:'Revisa tu correo',verify:'Verifica tu correo',recover:'Recupera tu acceso',reset:'Elige una nueva contraseña'};
  function change(next) { setView(next); setError(''); setNotice(''); history.replaceState(null,'',`#/${next}`); }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (['verify','reset'].includes(view)) data.token = token;
    const action = view === 'pending' ? 'resend' : view;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(action === 'login' ? '/login' : `/auth/${action}`,{method:'POST',body:data});
      if (view === 'login') { history.replaceState(null,'','#/conversations'); onLogin(result.user); return; }
      if (view === 'register') { setEmail(data.email); setView('pending'); setWaitUntil(Date.now()+60000); }
      else if (view === 'pending') { setNotice('Si tu cuenta necesita verificación, recibirás un nuevo enlace.'); setWaitUntil(Date.now()+60000); }
      else if (view === 'recover') setNotice('Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso.');
      else { history.replaceState(null,'','#/login'); setView('login'); setNotice(view === 'verify' ? 'Correo verificado. Ya puedes entrar.' : 'Contraseña actualizada. Vuelve a entrar.'); }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="login-page cloud-login"><header><div className="app-brand"><span className="brand-mark" aria-hidden="true"/><span>OpenFunnel</span></div><button className="button quiet" onClick={toggleTheme}>Tema {theme === 'light' ? 'oscuro':'claro'}</button></header>
    <div className="login-layout"><section className="login-panel" aria-labelledby="cloud-login-title">
      <h1 id="cloud-login-title">{titles[view]}</h1>
      <p className="muted">{view === 'pending' ? `Enviamos un enlace a ${email}. Revisa también spam.` : view === 'verify' ? 'Confirma tu correo para acceder a tu espacio.' : 'Tu espacio de trabajo, con tus propias conexiones.'}</p>
      <Notice error>{error || initialError}</Notice><Notice>{notice}</Notice>
      <form name={view === 'login' ? 'login' : view} method="post" autoComplete="on" onSubmit={submit}><fieldset disabled={busy}>
        <legend className="sr-only">{titles[view]}</legend>
        {view === 'register' && <div className="field"><label htmlFor="cloud-name">Nombre</label><input id="cloud-name" name="name" autoComplete="name" required maxLength={80}/></div>}
        {['login','register','recover','pending'].includes(view) && <div className="field"><label htmlFor="cloud-email">Correo electrónico</label><input id="cloud-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck="false" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></div>}
        {['login','register','reset'].includes(view) && <CloudPasswordField key={view} view={view}/>}
        <button className="button primary" disabled={busy || (view === 'pending' && now < waitUntil) || (['verify','reset'].includes(view) && !token)}>{busy ? 'Un momento…' : view === 'pending' ? now < waitUntil ? `Reenviar en ${Math.ceil((waitUntil-now)/1000)} s`:'Reenviar enlace' : {login:'Entrar',register:'Crear cuenta',verify:'Verificar correo',recover:'Enviar enlace',reset:'Guardar contraseña'}[view]}</button>
      </fieldset></form>
      <div className="inline-actions auth-links">{view === 'login' ? <><button className="text-button" onClick={()=>change('register')}>Crear cuenta</button><button className="text-button" onClick={()=>change('recover')}>Olvidé mi contraseña</button><button className="text-button" onClick={()=>change('pending')}>Reenviar verificación</button></> : <button className="text-button" onClick={()=>change('login')}>Volver al acceso</button>}</div>
      <a href="./docs/" target="_blank" rel="noreferrer">Documentación</a>
      <p className="muted"><a href="./docs/terminos.html" target="_blank" rel="noreferrer">Términos de servicio</a>{' · '}<a href="./docs/privacidad.html" target="_blank" rel="noreferrer">Política de privacidad</a></p>
    </section></div></main>;
}

const llmProviders = {
  openai: { name: 'OpenAI', baseURL: 'https://api.openai.com/v1', models: 'https://platform.openai.com/docs/models' },
  openrouter: { name: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', models: 'https://openrouter.ai/models' },
};
function llmPreset(baseURL) {
  return Object.keys(llmProviders).find(key => llmProviders[key].baseURL === baseURL?.replace(/\/+$/, '')) || (baseURL ? 'custom' : '');
}
function LLMConnectionFields({ current, markDirty }) {
  const [baseURL, setBaseURL] = useState(current.baseURL || '');
  const [preset, setPreset] = useState(llmPreset(current.baseURL));
  const keyInput = useRef();
  const destinationChanged = !!current.baseURL && baseURL !== current.baseURL;
  function updateURL(value) {
    if (value !== baseURL && keyInput.current) keyInput.current.value = '';
    setBaseURL(value);
    markDirty();
  }
  function chooseProvider(key) {
    updateURL(key === 'custom' ? (preset === 'custom' ? baseURL : '') : llmProviders[key].baseURL);
    setPreset(key);
  }
  return <>
    {!current.locked.includes('baseURL') && <>
      <div className="llm-presets" role="group" aria-label="Completar URL del proveedor">
        {['openai','openrouter','custom'].map(key => <button key={key} type="button" className={`button ${preset === key ? 'selected' : 'secondary'}`} aria-pressed={preset === key} onClick={() => chooseProvider(key)}><Icon name={key === 'custom' ? 'tools' : key === 'openrouter' ? 'channels' : 'ai_agents'}/>{llmProviders[key]?.name || 'Otro / Azure'}</button>)}
      </div>
      <div className="field"><label htmlFor="provider-url">URL base</label><input id="provider-url" name="baseURL" type="url" value={baseURL} onChange={event => {updateURL(event.target.value); setPreset(llmPreset(event.target.value));}} placeholder={preset === 'custom' ? 'https://tu-proveedor.com/v1' : 'https://api.openai.com/v1'} required maxLength={2048} aria-describedby="provider-url-help"/><small id="provider-url-help" className="muted">{preset === 'custom' ? 'API compatible con Chat Completions. Azure: endpoint terminado en /openai/v1/.' : 'Cada proveedor usa su propia URL y API key.'}</small></div>
    </>}
    {!current.locked.includes('apiKey') && <div className="field"><label htmlFor="provider-llm-key">{current.hasKey ? destinationChanged ? 'Nueva API key para este proveedor' : 'Nueva API key (vacío conserva la actual)' : 'API key'}</label><input ref={keyInput} id="provider-llm-key" name="apiKey" type="password" autoComplete="off" required={!current.hasKey || destinationChanged} maxLength={4096}/></div>}
    {!current.locked.includes('model') && <div className="field"><div className="model-label"><label htmlFor="provider-model">Modelo o deployment</label>{llmProviders[preset] && <a href={llmProviders[preset].models} target="_blank" rel="noopener noreferrer">Ver modelos <Icon name="arrow_out"/><span className="sr-only"> (abre en otra pestaña)</span></a>}</div><input id="provider-model" name="model" defaultValue={current.model} required maxLength={160} aria-describedby="provider-model-help"/><small id="provider-model-help" className="muted">ID exacto de un modelo con soporte de herramientas. En Azure, usa el nombre del deployment.</small></div>}
  </>;
}

export function ProviderConnection({ provider, onSaved, onConfigured, setDirty = () => {}, confirm }) {
  const state = useData(`/connections/${provider}`);
  const [editing,setEditing] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [changed,setChanged] = useState(false);
  const current = state.data;
  useEffect(() => { if (current) onConfigured?.(current.configured); }, [current?.configured, onConfigured]);
  function markDirty() { setDirty(true); setChanged(true); }
  async function toggleEditing() {
    if (editing && changed && confirm && !(await confirm('Descartar cambios', 'Los datos de conexión sin guardar se perderán.', 'Descartar'))) return;
    setEditing(!editing); setError(''); setNotice('');
    if (editing) { setDirty(false); setChanged(false); }
  }
  async function submit(event) {
    event.preventDefault(); if(busy) return;
    const form = event.currentTarget;
    const body = Object.fromEntries([...new FormData(form)].filter(([,value])=>value !== ''));
    body.expected_version = current.version;
    setBusy(true); setError('');
    try { await api(`/connections/${provider}`,{method:'PUT',body}); form.reset(); setEditing(false); setDirty(false); setChanged(false); setNotice(provider === 'zernio' ? 'API key guardada.' : 'Proveedor guardado. Valida el modelo desde tu agente antes de activar la IA.'); state.retry(); onSaved?.(); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  const isZernio = provider === 'zernio';
  const selectedProvider = llmProviders[llmPreset(current?.baseURL)]?.name || 'Proveedor compatible';
  return <section className={`integration-panel provider-connection provider-setup ${isZernio ? 'zernio-setup' : 'llm-setup'}`} aria-label={isZernio ? 'Configurar canales con Zernio':'Configurar proveedor de IA'}><LoadState state={state}>{current && <>
    {isZernio && <div className="zernio-brand-row">
      <span className="zernio-brand"><img className="zernio-logo-light" src={zernioLogoDark} alt="Zernio"/><img className="zernio-logo-dark" src={zernioLogoWhite} alt="Zernio"/></span>
      <a href="https://zernio.com" target="_blank" rel="noopener noreferrer">Ir a zernio.com <span aria-hidden="true">↗</span><span className="sr-only"> (abre en otra pestaña)</span></a>
    </div>}
    {!isZernio && <div className="llm-brand-row"><span className="llm-brand"><Icon name="ai_agents"/> Proveedor de IA</span><div className="llm-provider-links"><a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer">OpenAI Platform <Icon name="arrow_out"/><span className="sr-only"> (abre en otra pestaña)</span></a><a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer">OpenRouter <Icon name="arrow_out"/><span className="sr-only"> (abre en otra pestaña)</span></a></div></div>}
    <div className="section-heading"><div>
      <h2>{isZernio ? 'Configurar canales con Zernio' : 'Configurar proveedor de IA'}</h2>
      <p className="muted">{isZernio
        ? current.configured ? 'API key guardada. Ya puedes conectar o sincronizar tus canales.' : 'Conecta Instagram y WhatsApp usando tu cuenta de Zernio. Para empezar, guarda tu API key.'
        : current.configured ? 'Una conexión compartida por todos los agentes de tu espacio.' : 'Elige dónde se ejecutan tus agentes. Guarda la URL, la API key y el modelo una sola vez para tu espacio.'}</p>
      {!isZernio && current.configured && <p className="llm-saved-model"><Icon name="ai_agents"/><span>{selectedProvider} · {current.model}</span></p>}
      {current.configured && !current.editable && <small className="muted">Configurada en el servidor.</small>}
    </div>{current.editable && <button className={`button ${!current.configured && !editing ? 'primary' : 'secondary'}`} onClick={toggleEditing} disabled={busy} aria-expanded={editing}>{editing ? 'Cerrar':current.configured ? isZernio ? 'Cambiar API key':'Cambiar proveedor':isZernio ? 'Configurar Zernio':'Configurar proveedor de IA'}</button>}</div>
    <Notice error>{error}</Notice><Notice>{notice}</Notice>
    {editing && <form onSubmit={submit} onChange={markDirty}><fieldset disabled={busy || !current.storageReady}><legend className="sr-only">Configurar conexión</legend>
      {isZernio && <p className="muted">Copia la API key de tu cuenta de Zernio y pégala aquí. Se guardará cifrada para tu espacio.</p>}
      {!current.storageReady && <Notice error>El administrador debe habilitar el almacenamiento cifrado. Consulta la documentación.</Notice>}
      {!isZernio && <LLMConnectionFields current={current} markDirty={markDirty}/>}
      {isZernio && !current.locked.includes('apiKey') && <div className="field"><label htmlFor="provider-zernio-key">{current.hasKey ? 'Nueva API key (vacío conserva la actual)':'API key'}</label><input id="provider-zernio-key" name="apiKey" type="password" autoComplete="off" required={!current.hasKey} maxLength={4096}/></div>}
      <button className="button primary" disabled={busy}>{busy ? 'Guardando…':isZernio ? 'Guardar API key':'Guardar proveedor'}</button>
    </fieldset></form>}
  </>}</LoadState></section>;
}

export function CloudAccounts({ confirm }) {
  const [page,setPage] = useState(1);
  const state = useData(`/admin/accounts?page=${page}`);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  async function toggle(account) {
    const status = account.status === 'active' ? 'suspended':'active';
    if (status === 'suspended' && !(await confirm('Suspender cuenta',`Se bloquearán el acceso y los agentes de ${account.email}.`,'Suspender'))) return;
    setBusy(true);setError('');
    try { await api(`/admin/accounts/${account.id}`,{method:'PATCH',body:{status}});state.retry(); } catch(e){setError(e.message);} finally{setBusy(false);}
  }
  return <><div className="page-heading"><div><h2>Cuentas</h2></div></div><Notice error>{error}</Notice><LoadState state={state}>{state.data && <><div className="table-scroll cloud-accounts-table"><table><thead><tr><th>Cuenta</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{state.data.items.map(account=><tr key={account.id}><td>{account.name}<br/><small>{account.email}</small></td><td>{account.role === 'superadmin' ? 'Dueño':'Cliente'}</td><td>{account.status === 'active' ? 'Activa':'Suspendida'}</td><td>{account.role !== 'superadmin' && <button className="button secondary" disabled={busy} onClick={()=>toggle(account)}>{account.status === 'active' ? 'Suspender':'Reactivar'}</button>}</td></tr>)}</tbody></table></div><div className="inline-actions"><button className="button secondary" disabled={page===1} onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page}</span><button className="button secondary" disabled={page*25>=state.data.total} onClick={()=>setPage(page+1)}>Siguiente</button></div></>}</LoadState></>;
}
