import { useEffect, useRef, useState } from 'react';
import { api, allRecords } from './api.js';
import { resources } from '../../shared/resources.js';
import { AppSelect } from './select.jsx';
import { Icon, ChannelIcon, channelIcon } from './icons.jsx';
export function useData(path, version = 0, { pollMs = 0, preserve = false } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [retry, setRetry] = useState(0);
  const previousPath = useRef(path);
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: '' });
      return;
    }
    const controller = new AbortController();
    const same = previousPath.current === path;
    previousPath.current = path;
    setState((old) =>
      preserve && same && old.data
        ? { ...old, error: '' }
        : { data: null, loading: true, error: '' },
    );
    let pending = false;
    async function load() {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        const data = await api(path, { signal: controller.signal });
        if (!controller.signal.aborted) setState({ data, loading: false, error: '' });
      } catch (error) {
        if (error.name !== 'AbortError')
          setState((old) => ({
            data: preserve ? old.data : null,
            loading: false,
            error: error.message,
          }));
      } finally {
        pending = false;
      }
    }
    load();
    const timer = pollMs
      ? setInterval(() => {
          if (!document.hidden) load();
        }, pollMs)
      : null;
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [path, version, retry, pollMs, preserve]);
  return { ...state, retry: () => setRetry((value) => value + 1) };
}
export function LoadState({ state, children }) {
  if (state.loading && !state.data)
    return (
      <p className="muted" role="status">
        Cargando…
      </p>
    );
  if (state.error && !state.data)
    return (
      <div className="notice error" role="alert">
        {state.error}{' '}
        <button className="button secondary" onClick={state.retry}>
          Reintentar
        </button>
      </div>
    );
  return (
    <>
      {state.error && <Notice error>{state.error}</Notice>}
      {children}
    </>
  );
}
export function Badge({ children }) {
  return <span className="badge">{children}</span>;
}
export function Notice({ children, error = false }) {
  return children ? (
    <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
      {children}
    </div>
  ) : null;
}
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const resolveRef = useRef();
  const dialog = useRef();
  const origin = useRef();
  useEffect(() => {
    if (request) {
      origin.current = document.activeElement;
      dialog.current?.showModal();
    }
  }, [request]);
  const finish = (value) => {
    dialog.current?.close();
    setRequest(null);
    resolveRef.current?.(value);
    origin.current?.focus();
  };
  const confirm = (title, message, label = 'Continuar') =>
    new Promise((resolve) => {
      resolveRef.current = resolve;
      setRequest({ title, message, label });
    });
  const element = request && (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        finish(false);
      }}
      aria-labelledby="confirmation-title"
    >
      <h2 id="confirmation-title">{request.title}</h2>
      <p>{request.message}</p>
      <div className="form-actions">
        <button className="button secondary" autoFocus onClick={() => finish(false)}>
          Cancelar
        </button>
        <button className="button danger" onClick={() => finish(true)}>
          {request.label}
        </button>
      </div>
    </dialog>
  );
  return [confirm, element];
}
export function ReferenceSelect({
  resource,
  value = '',
  onChange,
  id,
  required,
  disabled,
  filters = {},
  currentValue,
  label = 'Seleccionar',
  emptyLabel,
  includeInactive = false,
  version = 0,
  ...accessibility
}) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify(filters);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    allRecords(resource, JSON.parse(key), controller.signal)
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [resource, key, version, retry]);
  return (
    <>
      <AppSelect
        {...accessibility}
        id={id}
        value={value || ''}
        onChange={onChange}
        required={required}
        disabled={disabled || loading || !!error}
        label={label}
        options={[
          {value: '', label: loading ? 'Cargando opciones…' : emptyLabel || `Seleccionar ${label.toLowerCase()}`, icon: resource === 'channels' ? 'inbox' : undefined},
          ...(value && !items.some((item) => item.id === value) ? [{value, label: loading ? 'Cargando…' : 'Opción no disponible', disabled: true}] : []),
          ...items
            .filter((item) => includeInactive || item.active !== 0 || item.id === currentValue || item.id === value)
            .map((item) => ({
              value: item.id,
              label: `${item[resources[resource].title]}${item.active === 0 ? ' (inactivo)' : ''}`,
              disabled: !includeInactive && item.active === 0 && item.id !== currentValue,
              icon: resource === 'channels' ? channelIcon(item.kind) : undefined,
            })),
        ]}
      />
      {error && (
        <span className="field-error" role="alert">
          {error}{' '}
          <button type="button" className="text-button" onClick={() => setRetry((x) => x + 1)}>
            Reintentar opciones
          </button>
        </span>
      )}
    </>
  );
}
export function Field({ field, value, onChange, error, record, draft, version }) {
  const id = `field-${field.key}`;
  const errorId = `${id}-error`;
  const common = {
    id,
    name: field.key,
    required: field.required,
    'aria-invalid': !!error,
    'aria-describedby': error ? errorId : undefined,
  };
  let control;
  if (field.type === 'reference') {
    const filters =
      field.key === 'stage_id'
        ? { pipeline_id: draft.pipeline_id || '__none__' }
        : field.key === 'conversation_id' && draft.contact_id
          ? { contact_id: draft.contact_id }
          : {};
    control = (
      <ReferenceSelect
        {...common}
        resource={field.resource}
        value={value}
        onChange={onChange}
        currentValue={record?.[field.key]}
        label={field.label}
        filters={filters}
        version={version}
      />
    );
  } else if (field.type === 'boolean') {
    return (
      <div className="field checkbox-field">
        <label htmlFor={id}>
          <input
            {...common}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />{' '}
          {field.label}
        </label>
        {error && (
          <span id={errorId} className="field-error">
            {error}
          </span>
        )}
      </div>
    );
  } else if (field.type === 'select')
    control = (
      <AppSelect
        {...common}
        value={value || ''}
        onChange={onChange}
        label={field.label}
        options={field.options.map(([value, label]) => ({value, label}))}
      />
    );
  else if (['textarea', 'json'].includes(field.type))
    control = (
      <textarea
        {...common}
        className={field.type === 'json' ? 'code-input' : ''}
        rows={['content', 'body'].includes(field.key) ? 8 : 4}
        maxLength={field.max}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={field.type !== 'json'}
      />
    );
  else
    control = (
      <input
        {...common}
        type={
          field.type === 'datetime' ? 'datetime-local' : field.type === 'email' ? 'email' : 'text'
        }
        maxLength={field.max}
        value={value ?? ''}
        list={field.suggestions ? `${id}-suggestions` : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  return (
    <div className={`field ${['textarea', 'json'].includes(field.type) ? 'full' : ''}`}>
      <label htmlFor={id}>
        {field.label}
        {field.required && <span aria-label="obligatorio"> *</span>}
      </label>
      {control}
      {field.suggestions && (
        <>
          <datalist id={`${id}-suggestions`}>
            {field.suggestions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </datalist>
          <span className="muted">
            Sol 5.6 · Terra 5.6 · Luna 5.6, o el nombre de tu deployment.
          </span>
        </>
      )}
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
export function Pagination({ page, pageSize = 25, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span className="muted" role="status">
        {total} registros · Página {page} de {pages}
      </span>
      <div>
        <button className="button secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </button>
        <button
          className="button secondary"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
export function RecordTable({ resource, items, onOpen }) {
  const def = resources[resource];
  const columns = def.fields
    .filter(
      (field) =>
        field.key !== def.title &&
        !['status', 'active'].includes(field.key) &&
        !['textarea', 'json'].includes(field.type),
    )
    .slice(0, 3);
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label={`Lista de ${def.label.toLowerCase()}`}
      tabIndex="0"
    >
      <table>
        <thead>
          <tr>
            <th>{def.fields.find((f) => f.key === def.title)?.label || 'Nombre'}</th>
            {columns.map((f) => (
              <th key={f.key}>{f.label}</th>
            ))}
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <button className="record-link" onClick={() => onOpen(item.id)}>
                  {resource === 'channels' ? <ChannelIcon kind={item.kind} /> : <Icon name={resource === 'conversations' ? 'message' : resource} />}
                  <span>{item[def.title]}</span>
                </button>
              </td>
              {columns.map((f) => (
                <td key={f.key}>
                  {f.key === 'channel_id' ? (
                    <span className="channel-label"><ChannelIcon kind={item.channel_kind} />{formatValue(f, item)}</span>
                  ) : formatValue(f, item)}
                </td>
              ))}
              <td>
                {resource === 'channels' ? (
                  <Badge>
                    {item.provider === 'zernio'
                      ? item.connection_status === 'connected'
                        ? item.automation_enabled
                          ? 'Conectado · Respuestas IA activadas'
                          : 'Conectado · Respuestas IA desactivadas'
                        : 'Desconectado'
                      : 'Manual'}
                  </Badge>
                ) : resource === 'ai_agents' || resource === 'tools' ? (
                  <Badge>Configuración</Badge>
                ) : item.status ? (
                  <Badge>{item.status === 'open' ? 'Abierto' : 'Cerrado'}</Badge>
                ) : 'active' in item ? (
                  <Badge>{item.active ? 'Activo' : 'Inactivo'}</Badge>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function formatValue(field, row) {
  const value = row[field.key];
  if (field.type === 'reference') return row.labels?.[field.key] || 'Sin asignar';
  if (field.type === 'boolean') return value ? 'Activo' : 'Inactivo';
  if (field.options) return field.options.find(([key]) => key === value)?.[1] || value;
  if (field.type === 'datetime') return value ? new Date(value).toLocaleString('es-CL') : '—';
  return value || '—';
}
