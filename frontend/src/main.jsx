import { StrictMode, useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../landing/brand.css';
import './style.css';
import { api } from './api.js';
import { ApiKeysPage } from './agent-workbench.jsx';
import { CloudLogin, ProviderConnection } from './cloud.jsx';
import { BillingPage, CloudAdmin } from './billing.jsx';
import { Icon } from './icons.jsx';
import { resources, resourceEntries } from '../../shared/resources.js';
import { Notice, useConfirm } from './components.jsx';
import { ConversationInbox, RecordDetail, RecordForm, ResourceList } from './records.jsx';
function getRoute() {
  const raw = window.location.hash.slice(1) || '/conversations';
  const [path, query = ''] = raw.split('?');
  const [, resource, id] = path.split('/');
  if ((resource === 'channels' || resources[resource]?.readOnly) && id === 'new') {
    history.replaceState(null, '', `#/${resource}`);
    return { raw: `/${resource}`, resource, id: undefined, query: '' };
  }
  return {
    raw,
    resource:
      Object.hasOwn(resources, resource) || ['api_keys','cloud_accounts','billing'].includes(resource) ? resource : 'conversations',
    id,
    query,
  };
}
function App() {
  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState(null);
  const [startupError, setStartupError] = useState('');
  const [retry, setRetry] = useState(0);
  const [route, setRoute] = useState(getRoute);
  const routeRef = useRef(route);
  routeRef.current = route;
  const [version, setVersion] = useState(0);
  const [menu, setMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('openfunnel-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [navHint, setNavHint] = useState(null);
  function toggleSidebar() {
    setNavHint(null);
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('openfunnel-sidebar-collapsed', String(next));
      } catch {
        /* Navigation works without persistent storage. */
      }
      return next;
    });
  }
  function showNavHint(event, label) {
    if (sidebarCollapsed && matchMedia('(min-width: 1200px)').matches)
      setNavHint({ label, top: event.currentTarget.getBoundingClientRect().top + 22 });
  }
  useEffect(() => {
    const desktop = matchMedia('(min-width: 1200px)');
    const resize = () => {
      setNavHint(null);
      if (desktop.matches) setMenu(false);
    };
    desktop.addEventListener('change', resize);
    return () => desktop.removeEventListener('change', resize);
  }, []);
  const [globalError, setGlobalError] = useState('');
  const [confirm, dialog] = useConfirm();
  const dirty = useRef(false);
  const setDirty = useCallback((value) => {
    dirty.current = value;
  }, []);
  const listRoutes = useRef({});
  const menuButton = useRef();
  const menuRef = useRef();
  const [theme, setTheme] = useState(() => {
    try {
      return (
        localStorage.getItem('openfunnel-theme') ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      );
    } catch {
      return 'light';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  function toggleTheme() {
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('openfunnel-theme', next);
      } catch {
        /* Storage may be unavailable. */
      }
      return next;
    });
  }
  useEffect(() => {
    let stopped = false;
    setStartupError('');
    api('/public-config')
      .then(async (config) => {
        if (!stopped) setMode(config.mode);
        const data = await api('/session');
        if (!stopped) setSession(data.user);
      })
      .catch((error) => {
        if (!stopped) {
          setSession(null);
          if (error.status !== 401) setStartupError(error.message);
        }
      });
    const expired = () => {
      dirty.current = false;
      setSession(null);
      setStartupError('La sesión venció. Vuelve a entrar.');
    };
    window.addEventListener('session-expired', expired);
    return () => {
      stopped = true;
      window.removeEventListener('session-expired', expired);
    };
  }, [retry]);
  const canLeave = async () =>
    !dirty.current ||
    (await confirm(
      'Descartar cambios',
      'Hay cambios sin guardar. ¿Quieres descartarlos?',
      'Descartar',
    ));
  async function navigate(path, focus = true) {
    if (!(await canLeave())) return;
    dirty.current = false;
    if (!routeRef.current.id) listRoutes.current[routeRef.current.resource] = routeRef.current.raw;
    else if (routeRef.current.resource === 'conversations' && routeRef.current.id !== 'new')
      listRoutes.current.conversations = `/conversations${routeRef.current.query ? `?${routeRef.current.query}` : ''}`;
    history.pushState(null, '', `#${path}`);
    setRoute(getRoute());
    setMenu(false);
    setNavHint(null);
    setGlobalError('');
    if (focus) requestAnimationFrame(() => document.querySelector('h1')?.focus());
  }
  useEffect(() => {
    const onHash = async () => {
      const old = routeRef.current.raw;
      if (!(await canLeave())) {
        history.replaceState(null, '', `#${old}`);
        return;
      }
      dirty.current = false;
      setRoute(getRoute());
      setMenu(false);
    };
    const onBeforeUnload = (e) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  });
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector('button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenu(false);
        requestAnimationFrame(() => menuButton.current?.focus());
      }
      if (e.key === 'Tab') {
        const elements = [...menuRef.current.querySelectorAll('button:not([disabled])')];
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);
  async function logout() {
    if (!(await canLeave())) return;
    try {
      await api('/logout', { method: 'POST', body: {} });
      dirty.current = false;
      setSession(null);
      setStartupError('');
    } catch (e) {
      setGlobalError(e.message);
    }
  }
  const refresh = () => setVersion((x) => x + 1);
  function open(resource, id) {
    const query =
      resource === 'conversations' && route.resource === 'conversations' ? route.query : '';
    navigate(`/${resource}/${id}${query ? `?${query}` : ''}`);
  }
  if (session === undefined)
    return (
      <main className="loading-screen">
        <Brand />
        <p role="status">Abriendo tu espacio de trabajo…</p>
      </main>
    );
  const LoginPage = mode === 'cloud' ? CloudLogin : Login;
  if (!session || (mode === 'cloud' && /^\/(verify|reset)\?/.test(route.raw)))
    return (
      <>
        <LoginPage
          onLogin={(user) => {
            setSession(user);
            setRoute(getRoute());
            setStartupError('');
            refresh();
          }}
          error={startupError}
          retry={() => setRetry((x) => x + 1)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        {dialog}
      </>
    );
  const def = resources[route.resource] || { label: route.resource === 'cloud_accounts' ? 'Administración' : route.resource === 'billing' ? 'Facturación' : 'Claves API', group: 'Configuración' };
  const activeSection = def.navigationParent || route.resource;
  const back =
    route.resource === 'conversations' && route.id && route.id !== 'new'
      ? `/conversations${route.query ? `?${route.query}` : ''}`
      : listRoutes.current[route.resource] || `/${route.resource}`;
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main-content').focus();
        }}
      >
        Ir al contenido
      </a>
      {menu && (
        <div
          className="nav-scrim"
          onClick={() => {
            setMenu(false);
            requestAnimationFrame(() => menuButton.current?.focus());
          }}
        />
      )}
      <aside
        id="primary-sidebar"
        ref={menuRef}
        className={`sidebar ${menu ? 'is-open' : ''}`}
        aria-label="Navegación principal"
        role={menu ? 'dialog' : undefined}
        aria-modal={menu ? true : undefined}
        onScroll={() => setNavHint(null)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setNavHint(null);
        }}
      >
        <Brand />
        <button
          className="button secondary mobile-close"
          onClick={() => {
            setMenu(false);
            requestAnimationFrame(() => menuButton.current?.focus());
          }}
        >
          Cerrar menú
        </button>
        <nav>
          {['Operación', 'Configuración'].map((group) => (
            <div className="nav-group" key={group}>
              <p className="nav-label">{group}</p>
              {[...resourceEntries, ['api_keys', { label: 'Claves API', group: 'Configuración' }], ...(mode === 'cloud' ? [['billing',{label:'Facturación',group:'Configuración'}]] : []), ...(session.role === 'superadmin' ? [['cloud_accounts',{label:'Administración',group:'Configuración'}]] : [])]
                .filter(([, r]) => r.group === group)
                .map(([key, r]) => (
                  <button
                    key={key}
                    className={`nav-item ${activeSection === key ? 'active' : ''}`}
                    aria-current={activeSection === key ? 'page' : undefined}
                    aria-label={r.label}
                    aria-describedby={navHint?.label === r.label ? 'sidebar-hint' : undefined}
                    onMouseEnter={(event) => showNavHint(event, r.label)}
                    onMouseLeave={() => setNavHint(null)}
                    onFocus={(event) => showNavHint(event, r.label)}
                    onBlur={() => setNavHint(null)}
                    onClick={() => navigate(listRoutes.current[key] || `/${key}`)}
                  >
                    <Icon name={key} />
                    <span className="nav-text">{r.label}</span>
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          aria-expanded={!sidebarCollapsed}
          aria-controls="primary-sidebar"
          title={sidebarCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <Icon name={sidebarCollapsed ? 'expand' : 'collapse'} />
          <span className="nav-text">{sidebarCollapsed ? 'Expandir' : 'Colapsar'}</span>
        </button>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <span className="nav-text">Tu espacio de trabajo</span>
        </div>
      </aside>
      {navHint && (
        <div
          id="sidebar-hint"
          className="sidebar-tooltip"
          role="tooltip"
          style={{ top: navHint.top }}
        >
          {navHint.label}
        </div>
      )}
      <div className="workspace" inert={menu ? true : undefined}>
        <header className="topbar">
          <div className="inline-actions">
            <button
              ref={menuButton}
              className="button secondary menu-toggle"
              aria-expanded={menu}
              onClick={() => setMenu(true)}
            >
              Menú
            </button>
            <span className="topbar-location">{def.group || 'Operación'}</span>
          </div>
          <div className="inline-actions">
            <button
              className="button quiet"
              onClick={toggleTheme}
              aria-label={`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`}
            >
              {theme === 'light' ? '◐' : '☼'}{' '}
              <span className="theme-label">{theme === 'light' ? 'Oscuro' : 'Claro'}</span>
            </button>
            <span className="admin-name">{session.name}</span>
            <button className="button secondary" onClick={logout}>
              Salir
            </button>
          </div>
        </header>
        <main id="main-content" className="content" data-resource={route.resource} tabIndex="-1">
          <Notice error>{globalError}</Notice>
          {activeSection === 'ai_agents' &&
            !(route.resource === 'ai_agents' && route.id && route.id !== 'new') && (
              <nav className="module-navigation" aria-label="Configuración de Agentes IA">
                {[
                  ['ai_agents', 'Agentes'],
                  ['prompts', 'Prompts'],
                  ['tools', 'Herramientas'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={`module-link ${route.resource === key ? 'active' : ''}`}
                    aria-current={route.resource === key ? 'page' : undefined}
                    onClick={() => navigate(listRoutes.current[key] || `/${key}`)}
                  >
                    <Icon name={key} />
                    {label}
                  </button>
                ))}
              </nav>
            )}
          {route.resource === 'cloud_accounts' ? (
            session.role === 'superadmin' ? <CloudAdmin section={route.id} navigate={navigate} confirm={confirm} setDirty={setDirty}/> : <Notice error>No tienes acceso a la administración.</Notice>
          ) : route.resource === 'billing' && mode === 'cloud' ? (
            <BillingPage/>
          ) : route.resource === 'api_keys' ? (
            <>{session.workspaceId && <p className="muted">Para usar tu API key, incluye el encabezado <code>X-OpenFunnel-Workspace: {session.workspaceId}</code>.</p>}<ApiKeysPage confirm={confirm} setDirty={setDirty} /></>
          ) : route.resource === 'conversations' && route.id !== 'new' ? (
            <ConversationInbox
              id={route.id}
              query={route.query}
              version={version}
              navigate={navigate}
              open={open}
            >
              {route.id && (
                <RecordDetail
                  key={`conversations/${route.id}`}
                  resource="conversations"
                  id={route.id}
                  version={version}
                  refresh={refresh}
                  open={open}
                  navigate={navigate}
                  back={back}
                  confirm={confirm}
                  setDirty={setDirty}
                  canLeave={canLeave}
                />
              )}
            </ConversationInbox>
          ) : route.id === 'new' ? (
            <div key={route.raw}>
              <button className="back-link" onClick={() => navigate(back)}>
                ← Volver a {def.label.toLowerCase()}
              </button>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{def.label}</p>
                  <h1 tabIndex="-1">Crear {def.singular}</h1>
                  {def.note && <p className="muted">{def.note}</p>}
                </div>
              </div>
              <RecordForm
                resource={route.resource}
                initial={Object.fromEntries(new URLSearchParams(route.query))}
                version={version}
                setDirty={setDirty}
                onSaved={(record) => {
                  refresh();
                  navigate(`/${route.resource}/${record.id}`);
                }}
                onCancel={() => navigate(back)}
              />
            </div>
          ) : route.id ? (
            <div className="detail-content">
              <RecordDetail
                key={`${route.resource}/${route.id}`}
                resource={route.resource}
                id={route.id}
                version={version}
                refresh={refresh}
                open={open}
                navigate={navigate}
                back={back}
                confirm={confirm}
                setDirty={setDirty}
                canLeave={canLeave}
              />
            </div>
          ) : (
            <ResourceList
              key={route.resource}
              resource={route.resource}
              query={route.query}
              version={version}
              navigate={navigate}
              open={open}
              onCreate={() => navigate(`/${route.resource}/new`)}
              connection={['channels','ai_agents'].includes(route.resource) ? (onConfigured) => <ProviderConnection onConfigured={onConfigured} key={`provider-${route.resource}`} provider={route.resource === 'channels' ? 'zernio':'llm'} onSaved={refresh} setDirty={setDirty} confirm={confirm} /> : undefined}
            />
          )}
        </main>
        <footer className="workspace-footer">
          OpenFunnel <span>De conversación a resultado.</span>{' '}
          <a href="./docs/" target="_blank" rel="noreferrer">
            Documentación
          </a>
        </footer>
      </div>
      {dialog}
    </div>
  );
}
function Brand() {
  return (
    <div className="app-brand">
      <span className="brand-mark" aria-hidden="true" />
      <span>OpenFunnel</span>
    </div>
  );
}
function Login({ onLogin, error: initialError, retry, theme, toggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    // Read the DOM too: password managers may fill inputs without React change events.
    const credentials = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const data = await api('/login', {
        method: 'POST',
        body: {
          username: credentials.get('username'),
          password: credentials.get('password'),
        },
      });
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <header>
        <Brand />
        <button className="button quiet" onClick={toggleTheme}>
          Tema {theme === 'light' ? 'oscuro' : 'claro'}
        </button>
      </header>
      <div className="login-layout">
        <section className="login-panel" aria-labelledby="login-title">
          <h1 id="login-title">Bienvenido a OpenFunnel</h1>
          <p className="muted">Accede a tu espacio de trabajo.</p>
          <Notice error>{error || initialError}</Notice>
          {initialError && !error && (
            <button className="text-button" onClick={retry}>
              Comprobar conexión
            </button>
          )}
          <form
            id="login-form"
            name="login"
            method="post"
            autoComplete="on"
            onSubmit={submit}
            aria-busy={busy}
          >
            <fieldset disabled={busy}>
              <legend className="sr-only">Credenciales de acceso</legend>
              <div className="field">
                <label htmlFor="username">Usuario</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  maxLength={80}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <div className="password-field">
                  <input
                    id="password"
                    name="password"
                    type={visible ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="text-button"
                    aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setVisible((x) => !x)}
                  >
                    {visible ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              <button className="button primary login-submit" type="submit">
                {busy ? 'Entrando…' : 'Entrar'} <span aria-hidden="true">→</span>
              </button>
            </fieldset>
          </form>
        </section>
      </div>
      <footer>
        OpenFunnel · Un motor conversacional abierto. <a href="./docs/">Documentación</a>
        {' · '}<a href="./docs/terminos.html">Términos de servicio</a>
        {' · '}<a href="./docs/privacidad.html">Política de privacidad</a>
      </footer>
    </main>
  );
}
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
