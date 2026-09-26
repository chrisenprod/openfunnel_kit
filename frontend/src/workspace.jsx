import { ProviderConnection } from './cloud.jsx';
import { Icon } from './icons.jsx';
import { LoadState, useData } from './components.jsx';

export function SetupGuide({ version, navigate }) {
  const state = useData('/setup', version, { preserve: true, pollMs: 10000 });
  const data = state.data;
  if (data && !state.error && data.llm && data.channel && data.agent && data.tested) return null;
  const steps = data ? [
    ['Conectar IA', data.llm, '/settings/llm'],
    ['Conectar canal', data.channel, '/channels'],
    ['Preparar agente', data.agent, data.channel_id ? `/channels/${data.channel_id}` : '/ai_agents'],
    ['Probar respuesta', data.tested, data.agent_id ? `/ai_agents/${data.agent_id}` : '/ai_agents'],
  ] : [];
  return <section className="setup-guide" aria-label="Primeros pasos"><LoadState state={state}>{data && <>
    <div className="section-heading"><div><h2>Prepara tu primera conversación</h2><p className="muted">{steps.filter(([, done]) => done).length} de 4 pasos completos · La IA se activa desde el canal.</p></div></div>
    <ol>{steps.map(([label, done, path], index) => <li key={label}><button className={done ? 'is-complete' : ''} onClick={() => navigate(path)}><span className="step-number">{done ? <Icon name="check"/> : index + 1}</span><span>{label}<small>{done ? 'Listo' : 'Continuar →'}</small></span></button></li>)}</ol>
  </>}</LoadState></section>;
}

export function ConnectionSummary({ provider, version, navigate }) {
  const state = useData(`/connections/${provider}`, version, { preserve: true });
  const data = state.data;
  return <div className="connection-brief"><LoadState state={state}>{data && <>
    <div><strong>{provider === 'llm' ? 'Conexión IA' : 'Conexión Zernio'}</strong><p className="muted">{data.setup?.status === 'ready' ? provider === 'llm' ? `Modelo comprobado · ${data.model}` : 'Recepción de mensajes preparada' : data.setup?.error || (data.configured ? 'Preparación pendiente' : 'Falta conectar tu proveedor')}</p></div>
    <button className={`button ${data.setup?.status === 'ready' ? 'quiet' : 'primary'}`} onClick={() => navigate(`/settings/${provider}`)}>{data.setup?.status === 'ready' ? 'Gestionar conexión' : 'Configurar conexión'}</button>
  </>}</LoadState></div>;
}

export function SettingsPage({ section, session, mode, navigate, refresh, setDirty, confirm }) {
  if (['llm', 'zernio'].includes(section)) return <><button className="back-link" onClick={() => navigate('/settings')}>← Ajustes</button><h1>{section === 'llm' ? 'Conexión IA' : 'Conexión Zernio'}</h1><ProviderConnection key={section} provider={section} onSaved={refresh} setDirty={setDirty} confirm={confirm}/></>;
  const links = [
    ['ai_agents', 'Conexión IA', 'Proveedor y modelo compartidos por tus agentes.', '/settings/llm'],
    ['channels', 'Conexión Zernio', 'Tu cuenta para conectar canales y recibir mensajes.', '/settings/zernio'],
    ['api_keys', 'Claves API', 'Acceso para tus aplicaciones e integraciones.', '/api_keys'],
    ['users', 'Responsables', 'Directorio para asignar conversaciones; no concede acceso.', '/users'],
    ...(mode === 'cloud' ? [['billing', 'Facturación', 'Plan, créditos y pagos.', '/billing']] : []),
    ...(session.role === 'superadmin' ? [['cloud_accounts', 'Administración', 'Cuentas y cobros de esta instancia.', '/cloud_accounts']] : []),
  ];
  return <><div className="page-heading"><div><h1 tabIndex="-1">Ajustes</h1><p className="muted">Tu cuenta y las conexiones de tu espacio.</p></div></div>
    <section className="settings-account"><Icon name="users"/><div><h2>{session.name}</h2>{session.email && <p className="muted">{session.email}</p>}<p className="muted">{session.role === 'superadmin' ? 'Dueño de la instancia' : 'Tu cuenta'}</p></div></section>
    <div className="settings-links">{links.map(([icon, title, description, path]) => <button key={path} onClick={() => navigate(path)}><Icon name={icon}/><span><strong>{title}</strong><small>{description}</small></span><span aria-hidden="true">→</span></button>)}</div>
  </>;
}
