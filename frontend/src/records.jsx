import { useEffect, useState } from 'react';
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
      const body = { ...draft };
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
        <div className="fields-grid">
          {def.fields
            .filter((f) => !f.readOnly && !(resource === 'messages' && f.key === 'conversation_id'))
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
            <Associations
              label="Prompts en orden"
              resource="prompts"
              ids={draft.prompt_ids}
              original={record?.prompt_ids || []}
              onChange={(value) => update('prompt_ids', value)}
              version={version}
              error={fields.prompt_ids}
            />
            <Associations
              label="Tools disponibles"
              resource="tools"
              ids={draft.tool_ids}
              original={record?.tool_ids || []}
              onChange={(value) => update('tool_ids', value)}
              version={version}
              error={fields.tool_ids}
            />
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
            {value: '', label: 'Seleccionar…'},
            ...options.filter((x) => !ids.includes(x.id) && (x.active || original.includes(x.id)))
              .map((x) => ({value: x.id, label: `${x.name}${!x.active ? ' (inactivo)' : ''}`})),
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
        {channelId ? 'Conversaciones del canal seleccionado.' : 'Todos tus canales en una misma bandeja.'}
      </p>
    </section>
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
          <h1 tabIndex="-1" className="heading-with-icon"><Icon name={resource} />{def.label}</h1>
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
          <button className="button secondary"><Icon name="search" />Buscar</button>
        </form>
        {def.filters
          .filter((key) => key !== 'stage_id' && key !== 'conversation_id' && !(resource === 'conversations' && key === 'channel_id'))
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
                    onChange={(value) => change(key, value)}
                    label={f.label}
                    version={version}
                  />
                ) : !f.options && key !== 'active' ? (
                  <input
                    id={`filter-${key}`}
                    value={params.get(key) || ''}
                    maxLength={160}
                    onChange={(e) => change(key, e.target.value)}
                    placeholder="Todos"
                  />
                ) : (
                  <AppSelect
                    id={`filter-${key}`}
                    value={params.get(key) || ''}
                    onChange={(value) => change(key, value)}
                    label={f.label}
                    options={[
                      {value: '', label: 'Todos'},
                      ...(f.options || (key === 'active' ? [['1', 'Activo'], ['0', 'Inactivo']] : []))
                        .map(([value, label]) => ({value, label})),
                    ]}
                  />
                )}
              </div>
            );
          })}
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
                <RecordTable
                  resource={resource}
                  items={state.data.items}
                  onOpen={(id) => open(resource, id)}
                />
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

export function RelatedList({ title, resource, filters, version, open }) {
  const [page, setPage] = useState(1);
  const query = new URLSearchParams({ ...filters, page: String(page) });
  const state = useData(`/${resource}?${query}`, version);
  return (
    <section className="related-section">
      <h2>{title}</h2>
      <LoadState state={state}>
        {state.data && (
          <>
            {state.data.items.length ? (
              <ul className="related-list">
                {state.data.items.map((item) => (
                  <li key={item.id}>
                    <button className="record-link" onClick={() => open(resource, item.id)}>
                      {item[resources[resource].title]}
                    </button>
                    <span className="muted">
                      {item.status ? (item.status === 'open' ? 'Abierto' : 'Cerrado') : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sin registros relacionados.</p>
            )}
            {state.data.total > 25 && (
              <Pagination page={page} total={state.data.total} onPage={setPage} />
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
  const done = () => {
    setEditing(false);
    refresh();
    setNotice('Cambios guardados.');
    requestAnimationFrame(() => document.querySelector('h1')?.focus());
  };
  return (
    <>
      <button className="back-link" onClick={() => navigate(back)}>
        ← Volver a {def.label.toLowerCase()}
      </button>
      <LoadState state={state}>
        {state.data && (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">{def.label}</p>
                <h1 tabIndex="-1" className="heading-with-icon">
                    {resource === 'channels' ? <ChannelIcon kind={state.data.kind} /> : <Icon name={resource} />}
                    {state.data[def.title]}
                  </h1>
                {def.note && <p className="muted">{def.note}</p>}
              </div>
              {!editing && (
                <div className="inline-actions">
                  <button
                    className="button primary"
                    onClick={async () => {
                      if (!(await canLeave())) return;
                      setDirty(false);
                      setEditing(true);
                      setNotice('');
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="button secondary danger-text"
                    disabled={deleting}
                    onClick={erase}
                  >
                    {deleting ? 'Eliminando…' : 'Eliminar'}
                  </button>
                </div>
              )}
            </div>
            <Notice>{notice}</Notice>
            <Notice error>{error}</Notice>
            {editing ? (
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
            ) : (
              <>
                <dl className={`detail-grid ${resource === 'pipelines' ? 'pipeline-summary' : ''}`}>
                  {def.fields.map((field) => (
                    <div
                      key={field.key}
                      className={['textarea', 'json'].includes(field.type) ? 'full' : ''}
                    >
                      <dt>{field.label}</dt>
                      <dd>
                        {field.type === 'reference' && state.data[field.key] ? (
                          <button
                            className="record-link"
                            onClick={() =>
                              field.resource === 'pipeline_stages'
                                ? open('pipelines', state.data.pipeline_id)
                                : open(field.resource, state.data[field.key])
                            }
                          >
                            {field.key === 'channel_id' && <ChannelIcon kind={state.data.channel_kind} />}
                            {formatValue(field, state.data)}
                          </button>
                        ) : (
                          <span className={field.type === 'json' ? 'code-text' : 'preserve-text'}>
                            {formatValue(field, state.data)}
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {resource === 'pipelines' && (
                  <section className="related-section">
                    <h2>Tablero por etapas</h2>
                    <Board
                      pipelineId={id}
                      filters={{ pipeline_id: id }}
                      version={version}
                      open={open}
                    />
                  </section>
                )}
                {resource === 'contacts' && (
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
                  </>
                )}
                {resource === 'channels' && (
                  <ChannelAutomation record={state.data} refresh={refresh} version={version} />
                )}
                {resource === 'ai_agents' && (
                  <AgentIntegration id={id} refresh={refresh} version={version} />
                )}
                {resource === 'channels' && (
                  <RelatedList
                    title="Conversaciones del canal"
                    resource="conversations"
                    filters={{ channel_id: id }}
                    version={version}
                    open={open}
                  />
                )}
                {resource === 'prompts' && (
                  <RelatedList
                    title="Agentes que utilizan este prompt"
                    resource="ai_agents"
                    filters={{ prompt_id: id }}
                    version={version}
                    open={open}
                  />
                )}
                {resource === 'tools' && (
                  <RelatedList
                    title="Agentes que utilizan esta tool"
                    resource="ai_agents"
                    filters={{ tool_id: id }}
                    version={version}
                    open={open}
                  />
                )}
                {resource === 'ai_agents' && (
                  <>
                    <AssociationDetail
                      title="Prompts en orden"
                      resource="prompts"
                      ids={state.data.prompt_ids}
                      version={version}
                      open={open}
                    />
                    <AssociationDetail
                      title="Tools disponibles"
                      resource="tools"
                      ids={state.data.tool_ids}
                      version={version}
                      open={open}
                    />
                  </>
                )}
                {resource === 'conversations' && (
                  <>
                    <section className="related-section">
                      <h2>Ticket vinculado</h2>
                      {state.data.ticket_id ? (
                        <button
                          className="record-link"
                          onClick={() => open('tickets', state.data.ticket_id)}
                        >
                          Abrir ticket →
                        </button>
                      ) : (
                        <button
                          className="button secondary"
                          onClick={() =>
                            navigate(
                              `/tickets/new?${new URLSearchParams({ title: state.data.title, contact_id: state.data.contact_id, conversation_id: id, assigned_user_id: state.data.assigned_user_id || '' })}`,
                            )
                          }
                        >
                          Crear ticket desde conversación
                        </button>
                      )}
                    </section>
                    {state.data.connected && (
                      <ConversationIntegration
                        record={state.data}
                        version={version}
                        refresh={refresh}
                        setDirty={setDirty}
                        confirm={confirm}
                      />
                    )}
                    <Messages
                      connected={state.data.connected}
                      conversationId={id}
                      version={version}
                      refresh={refresh}
                      confirm={confirm}
                      setDirty={setDirty}
                      canLeave={canLeave}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </LoadState>
    </>
  );
}
function AssociationDetail({ title, resource, ids, version, open }) {
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
    <section className="related-section">
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
              <button className="record-link" onClick={() => open(resource, item.id)}>
                {item.name}
              </button>
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
    <section className="related-section">
      <div className="section-heading">
        <div>
          <h2 className="heading-with-icon"><Icon name="message" />Mensajes</h2>
          <p className="muted">
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
              <Pagination page={page} total={state.data.total} onPage={setPage} />
            </>
          )}
        </LoadState>
      )}
    </section>
  );
}

export function ConversationPanel({ id, query, version, open }) {
  const state = useData(`/conversations?${query}`, version);
  return (
    <aside className="conversation-panel" aria-label="Bandeja de conversaciones">
      <h2>Conversaciones</h2>
      <LoadState state={state}>
        {state.data && (
          <>
            <p className="muted">{state.data.total} en esta selección</p>
            <ul>
              {state.data.items.map((item) => (
                <li key={item.id}>
                  <button
                    className={item.id === id ? 'active' : ''}
                    aria-current={item.id === id ? 'true' : undefined}
                    onClick={() => open('conversations', item.id)}
                  >
                    <strong className="conversation-title"><Icon name="message" />{item.title}</strong>
                    <span>{item.labels.contact_id}</span>
                    <span className="channel-label">
                      <ChannelIcon kind={item.channel_kind} />{item.labels.channel_id} · {item.status === 'open' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </LoadState>
    </aside>
  );
}
