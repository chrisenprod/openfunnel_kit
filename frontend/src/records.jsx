import { useCallback, useEffect, useRef, useState } from 'react';
import { AgentKnowledge } from './agent-knowledge.jsx';
import { AgentTestPanel, PromptHistory } from './agent-workbench.jsx';
import { Board } from './kanban.jsx';
import { AppSelect } from './select.jsx';
import { Icon, ChannelIcon } from './icons.jsx';
import {
  ChannelConnections,
  ChannelAutomation,
  AgentIntegration,
  ConversationIntegration,
  deliveryLabels,
} from './integrations.jsx';
import { resources } from '../../shared/resources.js';
import { api, allRecords } from './api.js';
import {
  Badge,
  Field,
  LoadState,
  Notice,
  Pagination,
  RecordTable,
  ReferenceSelect,
  formatValue,
  useData,
} from './components.jsx';
const localTime = (value) => {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function RecordForm({
  resource,
  record,
  initial = {},
  version,
  onSaved,
  onCancel,
  setDirty,
  confirm,
  agentSection,
}) {
  const def = resources[resource];
  const [draft, setDraft] = useState(() => {
    const values = Object.fromEntries(
      def.fields
        .filter((f) => !f.readOnly)
        .map((f) => [f.key, record?.[f.key] ?? initial[f.key] ?? f.default ?? '']),
    );
    if (resource === 'messages') values.occurred_at = localTime(values.occurred_at);
    if (resource === 'pipelines')
      values.stages = record?.stages.map(({ id, name, description }) => ({
        id,
        name,
        description: description || '',
      })) || [{ name: '', description: '' }];
    if (resource === 'ai_agents') {
      values.prompt_ids = record?.prompt_ids || [];
      values.tool_ids = record?.tool_ids || [];
    }
    return values;
  });
  const [baseVersion] = useState(record?.version);
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => () => setDirty(false), [setDirty]);
  function update(key, value) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === 'pipeline_id' ? { stage_id: '' } : {}),
      ...(key === 'contact_id' && resource === 'tickets' ? { conversation_id: '' } : {}),
    }));
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setFields({});
    try {
      const body =
        resource === 'ai_agents' && agentSection
          ? Object.fromEntries(
              Object.entries(draft).filter(([key]) =>
                agentSection === 'instructions'
                  ? key === 'prompt_ids'
                  : agentSection === 'tools'
                    ? key === 'tool_ids'
                    : !['prompt_ids', 'tool_ids'].includes(key),
              ),
            )
          : { ...draft };
      if (resource === 'prompts' && record) body.expected_version = baseVersion;
      if (resource === 'messages') body.occurred_at = new Date(body.occurred_at).toISOString();
      const saved = await api(`/${resource}${record ? `/${record.id}` : ''}`, {
        method: record ? 'PATCH' : 'POST',
        body,
      });
      setDirty(false);
      onSaved(saved);
    } catch (e) {
      setError(e.message);
      setFields(e.fields || {});
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="record-form" onSubmit={submit} aria-busy={busy}>
      <Notice error>{error}</Notice>
      <fieldset disabled={busy}>
        <legend className="sr-only">Datos de {def.singular}</legend>
        {(!agentSection || agentSection === 'information') && (
          <div className="fields-grid">
            {def.fields
              .filter(
                (f) => !f.readOnly && !(resource === 'messages' && f.key === 'conversation_id'),
              )
              .map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={draft[field.key]}
                  onChange={(value) => update(field.key, value)}
                  error={fields[field.key]}
                  draft={draft}
                  record={record}
                  version={version}
                />
              ))}
          </div>
        )}
        {resource === 'pipelines' && (
          <section className="form-section">
            <h2>Etapas del pipeline</h2>
            <p className="muted">Define el recorrido y ordena sus etapas.</p>
            {fields.stages && <p className="field-error">{fields.stages}</p>}
            {draft.stages.map((stage, index) => (
              <div className="stage-editor" key={stage.id || `new-${index}`}>
                <span className="stage-number">{String(index + 1).padStart(2, '0')}</span>
                <div className="stage-fields">
                  <label htmlFor={`stage-${index}`}>Nombre de etapa {index + 1}</label>
                  <input
                    id={`stage-${index}`}
                    value={stage.name}
                    maxLength={160}
                    required
                    onChange={(e) =>
                      update(
                        'stages',
                        draft.stages.map((s, i) =>
                          i === index ? { ...s, name: e.target.value } : s,
                        ),
                      )
                    }
                  />
                  <label htmlFor={`stage-description-${index}`} className="muted">
                    Descripción
                  </label>
                  <input
                    id={`stage-description-${index}`}
                    value={stage.description || ''}
                    maxLength={4000}
                    onChange={(e) =>
                      update(
                        'stages',
                        draft.stages.map((s, i) =>
                          i === index ? { ...s, description: e.target.value } : s,
                        ),
                      )
                    }
                  />
                </div>
                <div className="stage-actions">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={index === 0}
                    aria-label={`Subir etapa ${stage.name || index + 1}`}
                    onClick={() => {
                      const copy = [...draft.stages];
                      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
                      update('stages', copy);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={index === draft.stages.length - 1}
                    aria-label={`Bajar etapa ${stage.name || index + 1}`}
                    onClick={() => {
                      const copy = [...draft.stages];
                      [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]];
                      update('stages', copy);
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-button danger-text"
                    disabled={draft.stages.length === 1}
                    onClick={async () => {
                      if (
                        stage.id &&
                        confirm &&
                        !(await confirm(
                          'Quitar etapa',
                          `Se quitará «${stage.name}» al guardar. Una etapa con tickets no puede eliminarse.`,
                          'Quitar',
                        ))
                      )
                        return;
                      update(
                        'stages',
                        draft.stages.filter((_, i) => i !== index),
                      );
                    }}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              onClick={() => update('stages', [...draft.stages, { name: '', description: '' }])}
            >
              Añadir etapa
            </button>
          </section>
        )}
        {resource === 'ai_agents' && (
          <>
            {(!agentSection || agentSection === 'instructions') && (
              <Associations
                label="Instrucciones en orden"
                resource="prompts"
                ids={draft.prompt_ids}
                original={record?.prompt_ids || []}
                onChange={(value) => update('prompt_ids', value)}
                version={version}
                error={fields.prompt_ids}
              />
            )}
            {(!agentSection || agentSection === 'tools') && (
              <Associations
                label="Herramientas disponibles"
                resource="tools"
                ids={draft.tool_ids}
                original={record?.tool_ids || []}
                onChange={(value) => update('tool_ids', value)}
                version={version}
                error={fields.tool_ids}
              />
            )}
          </>
        )}
        <div className="form-actions">
          <button className="button primary" type="submit">
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
          <button className="button secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </fieldset>
    </form>
  );
}
function Associations({ label, resource, ids, original, onChange, version, error }) {
  const [options, setOptions] = useState([]);
  const [choice, setChoice] = useState('');
  const [failure, setFailure] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setFailure('');
    allRecords(resource, {}, c.signal)
      .then(setOptions)
      .catch((e) => {
        if (e.name !== 'AbortError') setFailure(e.message);
      });
    return () => c.abort();
  }, [resource, version, retry]);
  return (
    <section className="form-section">
      <h2>{label}</h2>
      <Notice error>{error || failure}</Notice>
      {failure && (
        <button type="button" className="button secondary" onClick={() => setRetry((x) => x + 1)}>
          Reintentar opciones
        </button>
      )}
      <ol className="association-list">
        {ids.map((id, index) => (
          <li key={id}>
            <span>{options.find((x) => x.id === id)?.name || 'Cargando referencia…'}</span>
            <div>
              {resource === 'prompts' && (
                <>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={index === 0}
                    aria-label={`Subir prompt ${index + 1}`}
                    onClick={() => {
                      const copy = [...ids];
                      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
                      onChange(copy);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={index === ids.length - 1}
                    aria-label={`Bajar prompt ${index + 1}`}
                    onClick={() => {
                      const copy = [...ids];
                      [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]];
                      onChange(copy);
                    }}
                  >
                    ↓
                  </button>
                </>
              )}
              <button
                type="button"
                className="text-button"
                onClick={() => onChange(ids.filter((x) => x !== id))}
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="inline-actions">
        <AppSelect
          label={`Añadir ${resources[resource].singular}`}
          value={choice}
          onChange={setChoice}
          options={[
            { value: '', label: 'Seleccionar…' },
            ...options
              .filter((x) => !ids.includes(x.id) && (x.active || original.includes(x.id)))
              .map((x) => ({ value: x.id, label: `${x.name}${!x.active ? ' (inactivo)' : ''}` })),
          ]}
        />
        <button
          type="button"
          className="button secondary"
          disabled={!choice}
          onClick={() => {
            onChange([...ids, choice]);
            setChoice('');
          }}
        >
          Añadir
        </button>
      </div>
    </section>
  );
}
export function ConversationChannelFilter({ query, version, navigate }) {
  const params = new URLSearchParams(query);
  const channelId = params.get('channel_id') || '';
  return (
    <section className="inbox-scope" aria-label="Canales de la bandeja">
      <div className="inbox-channel-field">
        <label htmlFor="inbox-channel">Bandeja de conversaciones</label>
        <ReferenceSelect
          id="inbox-channel"
          resource="channels"
          label="Canal"
          emptyLabel="Todos los canales"
          includeInactive
          value={channelId}
          version={version}
          onChange={(value) => {
            if (value) params.set('channel_id', value);
            else params.delete('channel_id');
            params.delete('page');
            navigate(`/conversations${params.size ? `?${params}` : ''}`, false);
          }}
        />
      </div>
      <p className="muted">
        {channelId
          ? 'Conversaciones del canal seleccionado.'
          : 'Todos tus canales en una misma bandeja.'}
      </p>
    </section>
  );
}

function ResourceFilters({ resource, params, version, onChange }) {
  const def = resources[resource];
  const filtered = def.filters.some((key) => params.get(key));
  return (
    <>
      {def.filters.length > 0 && (
        <details className="list-filters" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector('summary').focus(); } }}>
          <summary title="Filtros">
            <Icon name="filters" /> Filtros
            {filtered && <span className="filter-dot" aria-label="Hay filtros activos" />}
          </summary>
          <div className="filter-fields">
            {def.filters
              .filter(
                (key) =>
                  key !== 'stage_id' &&
                  key !== 'conversation_id' &&
                  !(resource === 'conversations' && key === 'channel_id'),
              )
              .map((key) => {
                const f = def.fields.find((x) => x.key === key);
                return (
                  <div className="filter" key={key}>
                    <label htmlFor={`filter-${key}`}>{f.label}</label>
                    {f.type === 'reference' ? (
                      <ReferenceSelect
                        id={`filter-${key}`}
                        resource={f.resource}
                        value={params.get(key) || ''}
                        onChange={(value) => onChange(key, value)}
                        label={f.label}
                        version={version}
                      />
                    ) : !f.options && key !== 'active' ? (
                      <input
                        id={`filter-${key}`}
                        value={params.get(key) || ''}
                        maxLength={160}
                        onChange={(e) => onChange(key, e.target.value)}
                        placeholder="Todos"
                      />
                    ) : (
                      <AppSelect
                        id={`filter-${key}`}
                        value={params.get(key) || ''}
                        onChange={(value) => onChange(key, value)}
                        label={f.label}
                        options={[
                          { value: '', label: 'Todos' },
                          ...(
                            f.options ||
                            (key === 'active'
                              ? [
                                  ['1', 'Activo'],
                                  ['0', 'Inactivo'],
                                ]
                              : [])
                          ).map(([value, label]) => ({ value, label })),
                        ]}
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </details>
      )}
    </>
  );
}

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase();

export function ConversationInbox({ id, query, version, navigate, open, children }) {
  const params = new URLSearchParams(query);
  const state = useData(`/conversations?${params}`, version, { preserve: true, pollMs: 10000 });
  const [search, setSearch] = useState(params.get('q') || '');
  useEffect(() => setSearch(new URLSearchParams(query).get('q') || ''), [query]);
  const Heading = id ? 'h2' : 'h1';
  function change(key, value) {
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    navigate(`/conversations${params.size ? `?${params}` : ''}`, false);
  }
  return (
    <div className={`inbox-workspace ${id ? 'has-selection' : ''}`}>
      <aside className="inbox-list" aria-label="Bandeja de conversaciones">
        <div className="inbox-list-heading">
          <Heading tabIndex="-1">
            Conversaciones <span>{state.data?.total ?? '—'}</span>
          </Heading>
          <button
            className="button icon-button quiet"
            aria-label="Crear conversación"
            onClick={() => navigate('/conversations/new')}
          >
            <Icon name="plus" />
          </button>
        </div>
        <ConversationChannelFilter query={query} version={version} navigate={navigate} />
        <div className="inbox-search">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              change('q', search);
            }}
          >
            <label className="sr-only" htmlFor="inbox-search">
              Buscar conversaciones
            </label>
            <input
              id="inbox-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversación…"
              maxLength={200}
            />
            <button className="button quiet icon-button" aria-label="Buscar conversaciones">
              <Icon name="search" />
            </button>
          </form>
          <ResourceFilters
            resource="conversations"
            params={params}
            version={version}
            onChange={change}
          />
        </div>
        {[...params].some(([key, value]) => !['page', 'channel_id'].includes(key) && value) && (
          <button
            className="text-button inbox-clear"
            onClick={() =>
              navigate(
                `/conversations${params.get('channel_id') ? `?channel_id=${params.get('channel_id')}` : ''}`,
                false,
              )
            }
          >
            Limpiar filtros
          </button>
        )}
        <div className="inbox-entries">
          <LoadState state={state}>
            {state.data?.items.length === 0 && (
              <div className="inbox-list-empty">
                <Icon name="inbox" />
                <h3>No hay conversaciones</h3>
                <p className="muted">Prueba otro canal o cambia los filtros.</p>
              </div>
            )}
            <ul>
              {state.data?.items.map((item) => (
                <li key={item.id}>
                  <button
                    className={`inbox-entry ${String(item.id) === String(id) ? 'active' : ''}`}
                    aria-current={String(item.id) === String(id) ? 'page' : undefined}
                    onClick={() => open('conversations', item.id)}
                  >
                    <span className="person-avatar" aria-hidden="true">
                      {initials(item.labels?.contact_id || item.title)}
                    </span>
                    <span className="inbox-entry-copy">
                      <strong>{item.title}</strong>
                      <span className="inbox-entry-channel">
                        <ChannelIcon kind={item.channel_kind} />
                        {item.labels?.channel_id || item.channel_name || 'Canal'}
                        <span>· {item.status === 'open' ? 'Abierta' : 'Cerrada'}</span>
                      </span>
                      <span className="inbox-entry-mode">
                        <Icon name={item.automation_mode === 'automatic' ? 'ai_agents' : 'users'} />
                        {item.automation_mode === 'automatic'
                          ? 'Atención con IA'
                          : 'Atención humana'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </LoadState>
        </div>
        {state.data && state.data.total > (state.data.pageSize || 25) && (
          <Pagination
            page={Number(params.get('page') || 1)}
            pageSize={state.data.pageSize || 25}
            total={state.data.total}
            onPage={(page) => change('page', String(page))}
          />
        )}
      </aside>
      <div className="inbox-thread">
        {children || (
          <div className="inbox-placeholder">
            <span className="empty-symbol">
              <Icon name="conversations" />
            </span>
            <h2>Tu próxima conversación empieza aquí</h2>
            <p className="muted">
              Selecciona una conversación para leerla y responder.
              <br />
              Todos tus canales, en un mismo lugar.
            </p>
            <span className="inbox-platforms">
              <ChannelIcon kind="instagram" />
              <ChannelIcon kind="whatsapp" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResourceList({ resource, query, version, navigate, open, onCreate }) {
  const def = resources[resource];
  const [localVersion, setLocalVersion] = useState(0);
  const params = new URLSearchParams(query);
  const connectionFailed = params.get('connection') === 'failed';
  params.delete('connection');
  const view = params.get('view') || 'list';
  params.delete('view');
  const state = useData(`/${resource}?${params}`, `${version}:${localVersion}`);
  const [search, setSearch] = useState(params.get('q') || '');
  useEffect(() => setSearch(new URLSearchParams(query).get('q') || ''), [query]);
  const change = (key, value) => {
    const p = new URLSearchParams(query);
    if (value) p.set(key, String(value));
    else p.delete(key);
    if (key !== 'page') p.delete('page');
    navigate(`/${resource}?${p}`, false);
  };
  const filtered = [...params].some(([key, value]) => !['page', 'pageSize'].includes(key) && value);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {def.navigationParent ? resources[def.navigationParent].label : def.group}
          </p>
          <h1 tabIndex="-1" className="heading-with-icon">
            <Icon name={resource} />
            {def.label}
          </h1>
          {def.note && <p className="muted">{def.note}</p>}
        </div>
        <button
          className={`button ${resource === 'channels' ? 'secondary' : 'primary'}`}
          onClick={onCreate}
        >
          <Icon name="plus" /> Crear {def.singular}
          {resource === 'channels' ? ' manual' : ''}
        </button>
      </div>
      {resource === 'channels' && (
        <>
          <Notice error>
            {connectionFailed
              ? 'No se pudo confirmar la conexión. Revisa permisos, configuración o inicia un nuevo intento.'
              : ''}
          </Notice>
          <ChannelConnections version={version} refresh={() => setLocalVersion((v) => v + 1)} />
        </>
      )}
      {resource === 'conversations' && (
        <ConversationChannelFilter query={query} version={version} navigate={navigate} />
      )}
      <div className="toolbar">
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            change('q', search);
          }}
        >
          <label className="sr-only" htmlFor="search">
            Buscar {def.label.toLowerCase()}
          </label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Buscar ${def.label.toLowerCase()}…`}
            maxLength={200}
          />
          <button className="button secondary">
            <Icon name="search" />
            Buscar
          </button>
        </form>
        <ResourceFilters resource={resource} params={params} version={version} onChange={change} />
        {filtered && (
          <button className="text-button" onClick={() => navigate(`/${resource}`, false)}>
            Limpiar filtros
          </button>
        )}
        {resource === 'tickets' && (
          <div className="view-switch" aria-label="Vista de tickets">
            <button
              className={`button ${view === 'list' ? 'selected' : 'secondary'}`}
              aria-pressed={view === 'list'}
              onClick={() => change('view', 'list')}
            >
              Lista
            </button>
            <button
              className={`button ${view === 'board' ? 'selected' : 'secondary'}`}
              aria-pressed={view === 'board'}
              onClick={() => change('view', 'board')}
            >
              Por etapas
            </button>
          </div>
        )}
      </div>
      {view === 'board' && resource === 'tickets' ? (
        <Board
          pipelineId={params.get('pipeline_id')}
          filters={Object.fromEntries(
            [...params].filter(([key]) => !['page', 'pageSize'].includes(key)),
          )}
          version={version}
          open={open}
        />
      ) : (
        <LoadState state={state}>
          {state.data && (
            <>
              {state.data.items.length ? (
                resource === 'channels' ? (
                  <ChannelRows items={state.data.items} open={open} />
                ) : (
                  <RecordTable
                    resource={resource}
                    items={state.data.items}
                    onOpen={(id) => open(resource, id)}
                  />
                )
              ) : (
                <div className="empty">
                  <span className="empty-mark" aria-hidden="true">
                    ○
                  </span>
                  <h2>
                    {filtered ? 'No hay resultados' : `Aún no hay ${def.label.toLowerCase()}`}
                  </h2>
                  <p className="muted">
                    {filtered
                      ? 'Prueba otros filtros o inicia una nueva búsqueda.'
                      : `Crea tu primer registro para comenzar.`}
                  </p>
                  <button
                    className="button secondary"
                    onClick={filtered ? () => navigate(`/${resource}`, false) : onCreate}
                  >
                    {filtered ? 'Limpiar filtros' : `Crear ${def.singular}`}
                  </button>
                </div>
              )}
              <Pagination
                page={state.data.page}
                total={state.data.total}
                pageSize={state.data.pageSize}
                onPage={(page) => change('page', page)}
              />
            </>
          )}
        </LoadState>
      )}
    </>
  );
}

function ChannelRows({ items, open }) {
  return (
    <div className="channel-list">
      <div className="channel-list-labels">
        <span>Cuenta</span>
        <span>Conexión</span>
        <span>Atención</span>
        <span />
      </div>
      {items.map((item) => (
        <button
          className="channel-list-row"
          key={item.id}
          onClick={() => open('channels', item.id)}
        >
          <span className="channel-list-identity">
            <span className="record-avatar">
              <ChannelIcon kind={item.kind} />
            </span>
            <span>
              <strong>{item.name}</strong>
              <small>{item.external_reference || item.kind}</small>
            </span>
          </span>
          <span
            className={`connection-indicator ${item.connection_status === 'connected' ? 'is-connected' : ''}`}
          >
            <Icon name={item.connection_status === 'connected' ? 'check' : 'pause'} />
            {item.provider !== 'zernio'
              ? 'Manual'
              : item.connection_status === 'connected'
                ? 'Conectado'
                : 'Desconectado'}
          </span>
          <span className="channel-list-automation">
            <Icon name={item.automation_enabled ? 'ai_agents' : 'users'} />
            {item.automation_enabled ? 'IA activada' : 'Atención humana'}
          </span>
          <Icon name="arrow_out" />
        </button>
      ))}
    </div>
  );
}

export function RelatedList({ title, resource, filters, version, open, limit, onViewAll }) {
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({
    ...filters,
    page: String(page),
    ...(limit ? { pageSize: String(limit) } : {}),
  });
  const state = useData(`/${resource}?${query}`, version);
  return (
    <section className="related-section">
      <h2>{title}</h2>
      <LoadState state={state}>
        {state.data && (
          <>
            {state.data.items.length ? (
              <ul className="related-records">
                {state.data.items.slice(0, limit || 25).map((item) => (
                  <li key={item.id}>
                    <button onClick={() => open(resource, item.id)}>
                      <span className="row-symbol">
                        <Icon name={resource === 'conversations' ? 'conversations' : resource} />
                      </span>
                      <span className="related-record-copy">
                        <strong>{item[resources[resource].title]}</strong>
                        <small>
                          {resource === 'conversations'
                            ? item.labels?.channel_id || 'Conversación'
                            : item.labels?.contact_id || item.description || ''}
                        </small>
                      </span>
                      {item.status && (
                        <span className="badge">
                          {item.status === 'open' ? 'Abierto' : 'Cerrado'}
                        </span>
                      )}
                      <Icon name="arrow_out" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sin registros relacionados.</p>
            )}
            {!limit && state.data.total > 25 && (
              <Pagination page={page} total={state.data.total} onPage={setPage} />
            )}
            {limit && state.data.total > limit && (
              <button className="text-button" onClick={onViewAll}>
                Ver todas las conversaciones ({state.data.total}) →
              </button>
            )}
          </>
        )}
      </LoadState>
    </section>
  );
}
export function RecordDetail({
  resource,
  id,
  version,
  refresh,
  open,
  navigate,
  back,
  confirm,
  setDirty,
  canLeave,
}) {
  const state = useData(`/${resource}/${id}`, version, {
    pollMs: 5000,
    preserve: true,
  });
  const [editing, setEditing] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const contextTrigger = useRef();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const def = resources[resource];
  async function erase() {
    if (!(await canLeave())) return;
    if (
      !(await confirm(
        `Eliminar ${def.singular}`,
        `Se eliminará «${state.data[def.title]}». Los registros vinculados pueden impedir esta operación.`,
        'Eliminar',
      ))
    )
      return;
    setDeleting(true);
    setError('');
    try {
      await api(`/${resource}/${id}`, { method: 'DELETE' });
      refresh();
      navigate(back);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }
  const messageHistory = resource === 'conversations' && state.data && (
    <Messages
      connected={state.data.connected}
      conversationId={id}
      version={version}
      refresh={refresh}
      confirm={confirm}
      setDirty={setDirty}
      canLeave={canLeave}
    />
  );
  const done = () => {
    setEditing(false);
    refresh();
    setNotice('Cambios guardados.');
    requestAnimationFrame(() => document.querySelector('h1')?.focus());
  };
  if (resource === 'ai_agents')
    return (
      <>
        <button className="back-link" onClick={() => navigate(back)}>
          ← Agentes IA
        </button>
        <LoadState state={state}>
          {state.data && (
            <AgentWorkspace
              key={id}
              record={state.data}
              version={version}
              refresh={refresh}
              open={open}
              confirm={confirm}
              setDirty={setDirty}
              erase={erase}
              deleting={deleting}
              error={error}
            />
          )}
        </LoadState>
      </>
    );
  async function edit() {
    if (!(await canLeave())) return;
    setDirty(false);
    setEditing(true);
    setNotice('');
    requestAnimationFrame(() => document.querySelector('.record-form input')?.focus());
  }
  const editor = (
    <RecordForm
      key={id}
      resource={resource}
      record={state.data}
      version={version}
      setDirty={setDirty}
      confirm={confirm}
      onSaved={done}
      onCancel={async () => {
        if (await canLeave()) {
          setDirty(false);
          setEditing(false);
        }
      }}
    />
  );
  const record = state.data;
  if (resource === 'conversations')
    return (
      <LoadState state={state}>
        {record && (
          <section className="conversation-thread">
            <header className="thread-header">
              <button
                className="button quiet icon-button thread-back"
                aria-label="Volver a la bandeja"
                onClick={() => navigate(back)}
              >
                <Icon name="arrow_left" />
              </button>
              <span className="person-avatar" aria-hidden="true">
                {initials(record.labels?.contact_id || record.title)}
              </span>
              <div className="thread-identity">
                <h1 tabIndex="-1">{record.title}</h1>
                <p>
                  <ChannelIcon kind={record.channel_kind} />
                  <span>{record.labels?.channel_id || record.channel_name || 'Conversación'}</span>
                  <span className="thread-status">
                    {record.status === 'open' ? 'Abierta' : 'Cerrada'}
                  </span>
                </p>
              </div>
              <button
                ref={contextTrigger}
                className={`button quiet thread-details ${contextOpen ? 'selected' : ''}`}
                aria-expanded={contextOpen}
                aria-controls="conversation-details"
                aria-label="Detalles"
                onClick={() => setContextOpen(!contextOpen)}
              >
                <Icon name="info" />
                <span>Detalles</span>
              </button>
              {!editing && <DetailActions edit={edit} erase={erase} deleting={deleting} compact />}
            </header>
            <Notice>{notice}</Notice>
            <Notice error>{error}</Notice>
            {editing ? (
              <div className="thread-editor">{editor}</div>
            ) : (
              <div className={`thread-content ${contextOpen ? 'context-open' : ''}`}>
                <div className="thread-flow">
                  {record.connected ? (
                    <ConversationIntegration
                      record={record}
                      version={version}
                      refresh={refresh}
                      setDirty={setDirty}
                      confirm={confirm}
                    >
                      {messageHistory}
                    </ConversationIntegration>
                  ) : (
                    messageHistory
                  )}
                </div>
                {contextOpen && (
                  <aside
                    className="conversation-context"
                    id="conversation-details"
                    aria-label="Detalles y ticket"
                  >
                    <div className="section-heading">
                      <h2>Detalles y ticket</h2>
                      <button
                        className="button quiet icon-button"
                        aria-label="Cerrar detalles"
                        onClick={() => {
                          setContextOpen(false);
                          contextTrigger.current?.focus();
                        }}
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                    <RecordFields resource={resource} record={record} open={open} />
                    <section className="conversation-ticket">
                      <h3>Ticket vinculado</h3>
                      {record.ticket_id ? (
                        <button
                          className="record-link"
                          onClick={() => open('tickets', record.ticket_id)}
                        >
                          Abrir ticket <Icon name="arrow_out" />
                        </button>
                      ) : (
                        <button
                          className="button secondary"
                          onClick={() =>
                            navigate(
                              `/tickets/new?${new URLSearchParams({ title: record.title, contact_id: record.contact_id, conversation_id: id, assigned_user_id: record.assigned_user_id || '' })}`,
                            )
                          }
                        >
                          Crear ticket
                        </button>
                      )}
                    </section>
                  </aside>
                )}
              </div>
            )}
          </section>
        )}
      </LoadState>
    );
  return (
    <>
      <button className="back-link" onClick={() => navigate(back)}>
        ← {def.label}
      </button>
      <LoadState state={state}>
        {record && (
          <>
            <div className="page-heading record-heading">
              <div className="record-identity">
                <span
                  className={`record-avatar ${resource === 'channels' ? 'platform-avatar' : ''}`}
                  aria-hidden="true"
                >
                  {resource === 'contacts' || resource === 'users' ? (
                    initials(record[def.title])
                  ) : resource === 'channels' ? (
                    <ChannelIcon kind={record.kind} />
                  ) : (
                    <Icon name={resource} />
                  )}
                </span>
                <div>
                  <h1 tabIndex="-1">{record[def.title]}</h1>
                  <p className="record-subtitle">
                    {resource === 'channels' ? (
                      <>
                        <span>
                          {record.kind === 'instagram'
                            ? 'Instagram'
                            : record.kind === 'whatsapp'
                              ? 'WhatsApp'
                              : record.kind}
                        </span>
                        <span>·</span>
                        <span>{record.external_reference || 'Canal manual'}</span>
                      </>
                    ) : resource === 'contacts' || resource === 'users' ? (
                      record.email || record.company || def.singular
                    ) : record.status ? (
                      record.status === 'open' ? (
                        'Abierto'
                      ) : (
                        'Cerrado'
                      )
                    ) : record.active === false || record.active === 0 ? (
                      'Inactivo'
                    ) : (
                      def.singular
                    )}
                  </p>
                </div>
              </div>
              {!editing && (
                <div className="inline-actions">
                  {resource === 'channels' && (
                    <button
                      className="button primary"
                      onClick={() => navigate(`/conversations?channel_id=${id}`)}
                    >
                      <Icon name="inbox" />
                      Abrir bandeja
                    </button>
                  )}
                  <DetailActions
                    edit={edit}
                    erase={erase}
                    deleting={deleting}
                    compact={resource === 'channels'}
                  />
                </div>
              )}
            </div>
            <Notice>{notice}</Notice>
            <Notice error>{error}</Notice>
            {editing ? (
              <div className="record-edit-surface">{editor}</div>
            ) : resource === 'channels' ? (
              <div className="channel-workspace">
                <div className="channel-main">
                  <ChannelAutomation
                    record={record}
                    refresh={refresh}
                    version={version}
                    setDirty={setDirty}
                    confirm={confirm}
                    open={open}
                  />
                  <RelatedList
                    title="Conversaciones recientes"
                    resource="conversations"
                    limit={5}
                    onViewAll={() => navigate(`/conversations?channel_id=${id}`)}
                    filters={{ channel_id: id }}
                    version={version}
                    open={(target, targetId) => navigate(`/${target}/${targetId}?channel_id=${id}`)}
                  />
                </div>
                <aside className="record-aside">
                  <h2>Acerca de este canal</h2>
                  <p className="muted">{record.description || 'Sin descripción.'}</p>
                  <div className="channel-facts">
                    <span>Tipo de conexión</span>
                    <strong>{record.provider === 'zernio' ? 'Zernio' : 'Registro manual'}</strong>
                    <span>Canal</span>
                    <strong>{record.active ? 'Activo' : 'Inactivo'}</strong>
                  </div>
                  <button className="text-button" onClick={edit}>
                    Editar información <Icon name="arrow_out" />
                  </button>
                  <details className="technical-details">
                    <summary>Información técnica</summary>
                    <RecordFields resource={resource} record={record} open={open} />
                  </details>
                </aside>
              </div>
            ) : (
              <div className={`record-reading-layout resource-${resource}`}>
                <div className="record-main">
                  {resource === 'contacts' ? (
                    <>
                      <RelatedList
                        title="Conversaciones"
                        resource="conversations"
                        filters={{ contact_id: id }}
                        version={version}
                        open={open}
                      />
                      <RelatedList
                        title="Tickets"
                        resource="tickets"
                        filters={{ contact_id: id }}
                        version={version}
                        open={open}
                      />
                      {record.notes && <ReadingSection title="Notas" text={record.notes} />}
                    </>
                  ) : resource === 'pipelines' ? (
                    <>
                      <div className="section-heading">
                        <h2>Etapas del pipeline</h2>
                      </div>
                      <Board
                        pipelineId={id}
                        filters={{ pipeline_id: id }}
                        version={version}
                        open={open}
                      />
                    </>
                  ) : resource === 'prompts' ? (
                    <>
                      <ReadingSection title="Instrucciones" text={record.content} />
                      <PromptHistory
                        id={id}
                        version={version}
                        refresh={refresh}
                        confirm={confirm}
                      />
                    </>
                  ) : resource === 'tools' ? (
                    <>
                      <ReadingSection title="Qué hace esta herramienta" text={record.description} />
                      <RelatedList
                        title="Agentes que la utilizan"
                        resource="ai_agents"
                        filters={{ tool_id: id }}
                        version={version}
                        open={open}
                      />
                      <details className="technical-details">
                        <summary>Esquema de entrada</summary>
                        <pre className="workbench-output">{record.input_schema || '{}'}</pre>
                      </details>
                    </>
                  ) : resource === 'tickets' ? (
                    <>
                      <ReadingSection title="Descripción" text={record.description} />
                      {record.conversation_id && (
                        <button
                          className="button secondary"
                          onClick={() => open('conversations', record.conversation_id)}
                        >
                          <Icon name="conversations" />
                          Ver conversación
                        </button>
                      )}
                    </>
                  ) : (
                    <ReadingSection
                      title="Información"
                      text={
                        record.notes ||
                        record.description ||
                        (record.active
                          ? 'Este registro está activo.'
                          : 'Este registro está inactivo.')
                      }
                    />
                  )}
                </div>
                <aside className="record-aside">
                  <h2>{resource === 'contacts' ? 'Datos de contacto' : 'Detalles'}</h2>
                  <RecordFields
                    resource={resource}
                    record={record}
                    open={open}
                    omit={[
                      'notes',
                      'content',
                      'input_schema',
                      ...(resource !== 'pipelines' ? ['description'] : []),
                    ]}
                  />
                  {resource === 'prompts' && (
                    <RelatedList
                      title="Agentes asociados"
                      resource="ai_agents"
                      filters={{ prompt_id: id }}
                      version={version}
                      open={open}
                    />
                  )}
                </aside>
              </div>
            )}
          </>
        )}
      </LoadState>
    </>
  );
}

function ReadingSection({ title, text }) {
  return (
    <section className="reading-section">
      <h2>{title}</h2>
      <p className={text ? 'preserve-text' : 'muted'}>{text || 'Sin información adicional.'}</p>
    </section>
  );
}

function DetailActions({ edit, erase, deleting, compact = false }) {
  function choose(event, action) {
    const menu = event.currentTarget.closest('details');
    menu.open = false;
    menu.querySelector('summary').focus();
    action();
  }
  return (
    <div className="inline-actions record-action-group">
      {!compact && (
        <button className="button secondary" onClick={edit}>
          <Icon name="edit" />
          Editar
        </button>
      )}
      <details
        className="record-actions"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary').focus();
          }
        }}
      >
        <summary className="button quiet icon-button" aria-label="Más acciones">
          <Icon name="more" />
        </summary>
        <div className="record-actions-menu">
          {compact && (
            <button onClick={(event) => choose(event, edit)}>
              <Icon name="edit" />
              Editar información
            </button>
          )}
          <button
            className="danger-text"
            disabled={deleting}
            onClick={(event) => choose(event, erase)}
          >
            <Icon name="trash" />
            {deleting ? 'Eliminando…' : 'Eliminar registro'}
          </button>
        </div>
      </details>
    </div>
  );
}

function AgentWorkspace({
  record,
  version,
  refresh,
  open,
  confirm,
  setDirty,
  erase,
  deleting,
  error,
}) {
  const [tab, setTab] = useState('instructions');
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const dirty = useRef({ configuration: false, test: false });
  const configDirty = useCallback(
    (value) => {
      dirty.current.configuration = value;
      setDirty(value || dirty.current.test);
    },
    [setDirty],
  );
  const testDirty = useCallback(
    (value) => {
      dirty.current.test = value;
      setDirty(value || dirty.current.configuration);
    },
    [setDirty],
  );
  async function leaveConfiguration() {
    if (
      dirty.current.configuration &&
      !(await confirm(
        'Descartar cambios',
        'Hay cambios pendientes en la configuración. La conversación de prueba se conservará.',
        'Descartar',
      ))
    )
      return false;
    configDirty(false);
    return true;
  }
  async function selectTab(key) {
    if ((key === tab && !editing) || !(await leaveConfiguration())) return;
    setEditing(false);
    setTab(key);
    setNotice('');
  }
  return (
    <>
      <div className="page-heading agent-heading">
        <div>
          <h1 tabIndex="-1">{record.name}</h1>
          <p className={`availability ${record.active ? '' : 'inactive'}`}>
            <span />
            {record.active ? 'Disponible' : 'Inactivo'}
          </p>
        </div>
        {!editing && (
          <button
            className="button secondary"
            onClick={async () => {
              if (await leaveConfiguration()) {
                setEditing('information');
                setNotice('');
              }
            }}
          >
            Editar agente
          </button>
        )}
      </div>
      <Notice error>{error}</Notice>
      <Notice>{notice}</Notice>
      <div className="agent-workspace">
        <div className="agent-configuration">
          <nav className="agent-tabs" aria-label="Secciones del agente">
            {[
              ['instructions', 'Instrucciones'],
              ['tools', 'Herramientas'],
              ['knowledge', 'Contexto'],
              ['test', 'Probar'],
            ].map(([key, label]) => (
              <button
                key={key}
                className="button"
                aria-current={
                  !editing || editing !== 'information'
                    ? tab === key
                      ? 'page'
                      : undefined
                    : undefined
                }
                onClick={() => selectTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          {editing ? (
            <>
              <h2 className="agent-editor-title">
                {editing === 'information'
                  ? 'Editar agente'
                  : editing === 'instructions'
                    ? 'Editar instrucciones'
                    : 'Editar herramientas'}
              </h2>
              <RecordForm
                key={editing}
                agentSection={editing}
                resource="ai_agents"
                record={record}
                version={version}
                setDirty={configDirty}
                confirm={confirm}
                onSaved={() => {
                  configDirty(false);
                  setEditing(false);
                  refresh();
                  setNotice('Cambios guardados.');
                }}
                onCancel={async () => {
                  if (await leaveConfiguration()) setEditing(false);
                }}
              />
              {editing === 'information' && (
                <>
                  <details className="technical-details">
                    <summary>Conexión IA</summary>
                    <AgentIntegration id={record.id} refresh={refresh} version={version} />
                  </details>
                  <div className="agent-danger">
                    <button className="text-button danger-text" disabled={deleting} onClick={erase}>
                      {deleting ? 'Eliminando…' : 'Eliminar agente'}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {tab === 'instructions' && (
                <>
                  <AssociationDetail
                    title="Instrucciones"
                    resource="prompts"
                    ids={record.prompt_ids}
                    version={version}
                    open={open}
                    preview
                  />
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditing('instructions');
                    }}
                  >
                    <Icon name="plus" /> Editar instrucciones
                  </button>
                </>
              )}
              {tab === 'knowledge' && (
                <AgentKnowledge id={record.id} confirm={confirm} setDirty={configDirty} />
              )}
              {tab === 'tools' && (
                <>
                  <AssociationDetail
                    title="Herramientas disponibles"
                    resource="tools"
                    ids={record.tool_ids}
                    version={version}
                    open={open}
                    preview
                  />
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditing('tools');
                    }}
                  >
                    <Icon name="plus" /> Editar herramientas
                  </button>
                </>
              )}
            </>
          )}
          <div hidden={tab !== 'test' || !!editing} className="agent-playground">
            <AgentTestPanel id={record.id} setDirty={testDirty} />
          </div>
        </div>
      </div>
    </>
  );
}

function RecordFields({ resource, record, open, omit = [] }) {
  const def = resources[resource];
  return (
    <dl className={`detail-grid ${resource === 'pipelines' ? 'pipeline-summary' : ''}`}>
      {def.fields
        .filter((field) => field.key !== def.title && !omit.includes(field.key))
        .map((field) => (
          <div key={field.key} className={['textarea', 'json'].includes(field.type) ? 'full' : ''}>
            <dt>{field.label}</dt>
            <dd>
              {field.type === 'reference' && record[field.key] ? (
                <button
                  className="record-link"
                  onClick={() =>
                    field.resource === 'pipeline_stages'
                      ? open('pipelines', record.pipeline_id)
                      : open(field.resource, record[field.key])
                  }
                >
                  {field.key === 'channel_id' && <ChannelIcon kind={record.channel_kind} />}
                  {formatValue(field, record)}
                </button>
              ) : (
                <span className={field.type === 'json' ? 'code-text' : 'preserve-text'}>
                  {formatValue(field, record)}
                </span>
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}

function AssociationDetail({ title, resource, ids, version, open, preview = false }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setError('');
    Promise.all(ids.map((id) => api(`/${resource}/${id}`, { signal: c.signal })))
      .then(setItems)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => c.abort();
  }, [resource, JSON.stringify(ids), version, retry]);
  return (
    <section className={`related-section ${preview ? 'association-preview' : ''}`}>
      <h2>{title}</h2>
      <Notice error>{error}</Notice>
      {error && (
        <button className="button secondary" onClick={() => setRetry((x) => x + 1)}>
          Reintentar
        </button>
      )}
      {ids.length ? (
        <ol className="related-list">
          {items.map((item) => (
            <li key={item.id}>
              <div className="association-title">
                <strong>{item.name}</strong>
                <button className="text-button" onClick={() => open(resource, item.id)}>
                  {resource === 'prompts' ? 'Ver prompt' : 'Ver herramienta'}{' '}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
              {preview && (
                <p className="preserve-text">
                  {resource === 'prompts' ? item.content : item.description}
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">Sin asociaciones.</p>
      )}
    </section>
  );
}
function Messages({ conversationId, connected, version, refresh, confirm, setDirty, canLeave }) {
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleting, setDeleting] = useState(false);
  const state = useData(`/messages?conversation_id=${conversationId}&page=${page}`, version, {
    pollMs: connected ? 5000 : 0,
    preserve: true,
  });
  async function erase(message) {
    if (
      !(await confirm(
        'Eliminar mensaje',
        'Se eliminará únicamente este registro manual.',
        'Eliminar',
      ))
    )
      return;
    setDeleting(true);
    try {
      await api(`/messages/${message.id}`, { method: 'DELETE' });
      refresh();
      setNotice('Mensaje eliminado.');
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }
  return (
    <section className="message-history">
      <div className="section-heading">
        <div>
          <h2 className="heading-with-icon">
            <Icon name="message" />
            Mensajes
          </h2>
          <p className={`muted ${connected ? '' : 'manual-history-note'}`}>
            {connected
              ? 'Historial sincronizado con el canal.'
              : 'Registro manual. No se envía al canal.'}
          </p>
        </div>
        {!form && !connected && (
          <button className="button primary" onClick={() => setForm({})}>
            Registrar mensaje
          </button>
        )}
      </div>
      <Notice error>{error}</Notice>
      <Notice>{notice}</Notice>
      {form ? (
        <RecordForm
          resource="messages"
          record={form.id ? form : null}
          initial={{ conversation_id: conversationId }}
          version={version}
          setDirty={setDirty}
          onSaved={() => {
            setForm(null);
            refresh();
            setNotice('Mensaje registrado.');
          }}
          onCancel={async () => {
            if (await canLeave()) {
              setDirty(false);
              setForm(null);
            }
          }}
        />
      ) : (
        <LoadState state={state}>
          {state.data && (
            <>
              <div className="messages">
                {state.data.items.map((message) => (
                  <article className={`message ${message.direction}`} key={message.id}>
                    <header>
                      <Badge>{message.direction === 'incoming' ? 'Entrada' : 'Salida'}</Badge>
                      <time dateTime={message.occurred_at}>
                        {new Date(message.occurred_at).toLocaleString('es-CL')}
                      </time>
                    </header>
                    <p className="preserve-text">{message.body}</p>
                    {message.source !== 'manual' && (
                      <p className="muted">
                        {deliveryLabels[message.delivery_status] || 'Estado pendiente'} ·{' '}
                        {message.source === 'ai'
                          ? 'Agente IA'
                          : message.source === 'human'
                            ? 'Administrador'
                            : 'Zernio'}
                      </p>
                    )}
                    {message.source === 'manual' && (
                      <footer>
                        <button className="text-button" onClick={() => setForm(message)}>
                          Editar mensaje
                        </button>
                        <button
                          className="text-button danger-text"
                          disabled={deleting}
                          onClick={() => erase(message)}
                        >
                          Eliminar mensaje
                        </button>
                      </footer>
                    )}
                  </article>
                ))}
              </div>
              {!state.data.total && (
                <p className="muted">Aún no hay mensajes en esta conversación.</p>
              )}
              {state.data.total > 25 && (
                <Pagination page={page} total={state.data.total} onPage={setPage} />
              )}
            </>
          )}
        </LoadState>
      )}
    </section>
  );
}
