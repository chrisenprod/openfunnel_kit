import { useEffect, useState } from 'react';
import { api } from './api.js';
import { AppSelect } from './select.jsx';
import { Icon, ChannelIcon } from './icons.jsx';
import { Notice, LoadState, ReferenceSelect, useData } from './components.jsx';
export const deliveryLabels = {
  pending: 'Pendiente',
  sending: 'Enviando',
  sent: 'Aceptado por el canal',
  delivered: 'Entregado',
  read: 'Leído',
  received: 'Recibido',
  failed: 'Fallido',
  uncertain: 'Entrega incierta',
  cancelled: 'Cancelado',
  deleted: 'Eliminado',
  reviewed: 'Revisado',
};
const runLabels = {
  pending: 'Pendiente',
  running: 'Generando',
  completed: 'Generado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  handed_off: 'Derivado a una persona',
};
function useAction(refresh = () => {}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function act(task, message = 'Cambios guardados.') {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await task();
      setNotice(message);
      refresh();
      return result;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    act,
    feedback: (
      <>
        <Notice error>{error}</Notice>
        <Notice>{notice}</Notice>
      </>
    ),
  };
}
export function ChannelConnections({ refresh, version }) {
  const [revision, setRevision] = useState(0),
    [connecting, setConnecting] = useState(false),
    [platform, setPlatform] = useState('instagram'),
    [profile, setProfile] = useState(''),
    [profileName, setProfileName] = useState(''),
    [onboarding, setOnboarding] = useState('api');
  const update = () => {
    setRevision((v) => v + 1);
    refresh();
  };
  const state = useData('/integrations', `${version}:${revision}`, {
    pollMs: 10000,
    preserve: true,
  });
  const profiles = useData(connecting ? '/integrations/profiles' : null, revision);
  const a = useAction(update);
  async function begin(e) {
    e.preventDefault();
    const d = await a.act(
      () =>
        api('/integrations/connect', {
          method: 'POST',
          body: { platform, profile_id: profile, onboarding },
        }),
      'Abriendo autorización…',
    );
    if (d) window.location.assign(d.authUrl);
  }
  return (
    <section className="integration-panel" aria-label="Conexión de canales">
      <div className="section-heading">
        <div>
          <h2>Canales conectados</h2>
          <p className="muted">Instagram y WhatsApp · Zernio</p>
        </div>
        <div className="inline-actions">
          <button
            className="button secondary"
            disabled={a.busy || !state.data?.zernio.configured}
            onClick={() =>
              a.act(
                () => api('/integrations/sync', { method: 'POST', body: {} }),
                'Canales sincronizados. El historial se importará en segundo plano.',
              )
            }
          >
            Sincronizar canales
          </button>
          <button
            className="button primary"
            disabled={a.busy || !state.data?.zernio.configured}
            onClick={() => setConnecting(!connecting)}
          >
            {connecting ? 'Cerrar conexión' : 'Conectar canal'}
          </button>
        </div>
      </div>
      {a.feedback}
      <LoadState state={state}>
        {state.data && (
          <>
            {!state.data.zernio.configured && (
              <p className="muted">
                Configura ZERNIO_API_KEY en el servidor para conectar tus cuentas.
              </p>
            )}
            {state.data.zernio.configured && (
              <div className="integration-status">
                <span>
                  {state.data.zernio.webhookRegistered ? 'Webhook registrado' : 'Webhook pendiente'}
                </span>
                <button
                  className="text-button"
                  disabled={a.busy || !state.data.zernio.webhookConfigured}
                  onClick={() =>
                    a.act(
                      () =>
                        api('/integrations/webhook', {
                          method: 'POST',
                          body: {},
                        }),
                      'Webhook registrado.',
                    )
                  }
                >
                  Registrar / actualizar webhook
                </button>
              </div>
            )}
            {!state.data.zernio.webhookConfigured && (
              <p className="muted">
                La recepción en tiempo real requiere URL pública HTTPS y secreto del webhook
                configurados en el servidor.
              </p>
            )}
            <Notice error>{state.data.zernio.error}</Notice>
            {state.data.syncJobs.some((j) => j.status === 'pending') && (
              <p role="status" className="muted">
                Importando historial disponible… Puedes seguir usando la app.
              </p>
            )}
            {state.data.syncJobs
              .filter((j) => j.status === 'failed')
              .map((j) => (
                <p key={j.id} className="field-error">
                  Importación: {j.error}
                </p>
              ))}
            {!!state.data.unsupported.length && (
              <p className="muted">
                Otras cuentas sin soporte en esta etapa:{' '}
                {state.data.unsupported.map((x) => x.platform).join(', ')}.
              </p>
            )}
            {state.data.failedEvents.map((e) => (
              <div key={e.id} className="integration-status">
                <span>Evento pendiente de revisión: {e.error}</span>
                <button
                  className="text-button"
                  disabled={a.busy}
                  onClick={() =>
                    a.act(
                      () =>
                        api(`/events/${e.id}/retry`, {
                          method: 'POST',
                          body: {},
                        }),
                      'Evento en cola para reprocesar.',
                    )
                  }
                >
                  Reprocesar
                </button>
              </div>
            ))}
          </>
        )}
      </LoadState>
      {connecting && (
        <form className="connection-form" onSubmit={begin}>
          <fieldset disabled={a.busy}>
            <legend>Conectar una cuenta</legend>
            <div className="fields-grid">
              <label>
                Plataforma
                <AppSelect label="Plataforma" value={platform} onChange={setPlatform} options={[
                  {value: 'instagram', label: 'Instagram profesional', icon: 'instagram'},
                  {value: 'whatsapp', label: 'WhatsApp Business', icon: 'whatsapp'},
                ]} />
              </label>
              <label>
                Perfil de Zernio
                <AppSelect required label="Perfil de Zernio" value={profile} onChange={setProfile} options={[
                  {value: '', label: 'Seleccionar perfil…'},
                  ...(profiles.data?.items || []).map((p) => ({value: p.id, label: p.name})),
                ]} />
              </label>
              {platform === 'whatsapp' && (
                <label>
                  Conexión WhatsApp
                  <AppSelect label="Conexión WhatsApp" value={onboarding} onChange={setOnboarding} options={[
                    {value: 'api', label: 'Cloud API'},
                    {value: 'business_app', label: 'Conservar WhatsApp Business (coexistencia)'},
                  ]} />
                </label>
              )}
            </div>
            <Notice error>{profiles.error}</Notice>
            <p className="muted">
              Completa la autorización del proveedor y volverás a OpenFunnel. Cada número WhatsApp
              necesita un perfil distinto.
            </p>
            <div className="inline-actions">
              <button className="button primary" disabled={!profile}>
                Continuar con autorización
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setConnecting(false)}
              >
                Cancelar
              </button>
            </div>
            <div className="profile-create">
              <label htmlFor="profile-name">Nuevo perfil (opcional)</label>
              <div className="inline-actions">
                <input
                  id="profile-name"
                  maxLength={100}
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Nombre del perfil"
                />
                <button
                  type="button"
                  className="button secondary"
                  disabled={!profileName.trim()}
                  onClick={async () => {
                    const p = await a.act(
                      () =>
                        api('/integrations/profiles', {
                          method: 'POST',
                          body: {
                            name: profileName,
                            request_id: crypto.randomUUID(),
                          },
                        }),
                      'Perfil creado.',
                    );
                    if (p) {
                      setProfile(p.id);
                      setProfileName('');
                    }
                  }}
                >
                  Crear perfil
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
export function ChannelAutomation({ record, refresh, version }) {
  const [agent, setAgent] = useState(record.default_ai_agent_id || '');
  const a = useAction(refresh);
  useEffect(() => setAgent(record.default_ai_agent_id || ''), [record.default_ai_agent_id]);
  if (record.provider !== 'zernio')
    return <p className="muted">Canal manual · Sin conexión externa.</p>;
  const enabled = !!record.automation_enabled;
  const savedAgent = record.default_ai_agent_id || '';
  const agentChanged = agent !== savedAgent;
  const platform = record.kind === 'instagram' ? 'Instagram' : 'WhatsApp';
  const activationHelp = agentChanged
    ? 'Guarda el agente seleccionado antes de activar las respuestas.'
    : !savedAgent
      ? 'Selecciona y guarda un agente para activar las respuestas.'
      : record.connection_status !== 'connected'
        ? `Conecta ${platform} para activar las respuestas.`
        : !record.inbox_verified_at
          ? 'Sincroniza los mensajes del canal para activar las respuestas.'
          : !record.active
            ? 'Activa este canal en su configuración para habilitar las respuestas.'
            : '';
  async function reconnect() {
    const d = await a.act(
      () =>
        api('/integrations/connect', {
          method: 'POST',
          body: {
            platform: record.kind,
            profile_id: record.external_profile_id,
            channel_id: record.id,
            onboarding: 'api',
          },
        }),
      'Abriendo autorización…',
    );
    if (d) window.location.assign(d.authUrl);
  }
  return (
    <section className="integration-panel channel-automation" aria-label="Agente y respuestas automáticas">
      <h2>Agente y respuestas automáticas</h2>
      {a.feedback}
      <div className="channel-connection">
        <div>
          <span className="channel-label"><ChannelIcon kind={record.kind} />{platform} {record.connection_status === 'connected' ? 'conectado' : 'desconectado'}</span>
          <p className="muted">{record.inbox_verified_at ? 'Acceso a mensajes verificado.' : 'Acceso a mensajes pendiente de verificar.'}</p>
        </div>
        <button className="text-button" disabled={a.busy} onClick={reconnect}>
          {record.connection_status === 'connected' ? `Reconectar ${platform}` : `Conectar ${platform}`}
        </button>
      </div>
      <Notice error>{record.sync_error}</Notice>
      <div className="channel-replies">
        <div className={`automation-state${enabled ? ' is-enabled' : ''}`} role="status">
          <Icon name={enabled ? 'check' : 'pause'} />
          <strong>Respuestas automáticas {enabled ? 'activadas' : 'desactivadas'}</strong>
        </div>
        <p>{enabled
          ? 'El agente responderá a los nuevos mensajes. Las conversaciones en modo manual siguen a cargo de una persona.'
          : 'El agente no responde. Apagar la IA no desconecta la cuenta: puedes seguir recibiendo mensajes y responder tú.'}</p>
        <button
          className={`button ${enabled ? 'secondary' : 'primary'}`}
          disabled={a.busy || (!enabled && !!activationHelp)}
          aria-describedby="channel-activation-help"
          onClick={() =>
            a.act(
              () =>
                api(`/channels/${record.id}/automation`, {
                  method: 'POST',
                  body: { agent_id: savedAgent || null, enabled: !enabled },
                }),
              enabled ? 'Respuestas automáticas desactivadas.' : 'Respuestas automáticas activadas para nuevos mensajes.',
            )
          }
        >
          <Icon name={enabled ? 'pause' : 'play'} />
          {a.busy ? 'Guardando…' : enabled ? 'Desactivar respuestas' : 'Activar respuestas'}
        </button>
        <p className="muted" id="channel-activation-help">
          {enabled ? 'Desactivar conserva el agente asignado y la conexión de la cuenta.' : activationHelp || 'Al activar, responderá a nuevos mensajes. Las conversaciones en modo manual seguirán a tu cargo.'}
        </p>
      </div>
      <label htmlFor="channel-agent">Agente que responde en este canal</label>
      <div className="channel-agent-row">
        <ReferenceSelect
          id="channel-agent"
          resource="ai_agents"
          value={agent}
          onChange={setAgent}
          label="Agente que responde en este canal"
          emptyLabel="Sin agente asignado"
          disabled={a.busy}
          aria-describedby="channel-agent-help"
          version={version}
        />
        <button
          className="button secondary"
          disabled={a.busy || !agentChanged || (enabled && !agent)}
          onClick={() =>
            a.act(
              () =>
                api(`/channels/${record.id}/automation`, {
                  method: 'POST',
                  body: { agent_id: agent || null, enabled },
                }),
              'Agente guardado. El estado de las respuestas automáticas no ha cambiado.',
            )
          }
        >
          {a.busy ? 'Guardando…' : 'Guardar agente'}
        </button>
      </div>
      <p className="muted" id="channel-agent-help">
        {enabled && !agent
          ? 'Desactiva las respuestas antes de quitar el agente.'
          : agentChanged
            ? `Cambio sin guardar. Guardar agente mantiene las respuestas ${enabled ? 'activadas' : 'desactivadas'}.`
            : 'Guardar agente solo cambia quién responde; no activa ni desactiva las respuestas.'}
      </p>
    </section>
  );
}
export function AgentIntegration({ id, version, refresh }) {
  const [revision, setRevision] = useState(0);
  const a = useAction(() => {
    setRevision((v) => v + 1);
    refresh();
  });
  const state = useData(`/ai_agents/${id}/integration`, `${version}:${revision}`);
  return (
    <section className="integration-panel">
      <div className="section-heading">
        <div>
          <h2>Modelo y ejecución</h2>
          <p className="muted">API compatible con OpenAI · Chat Completions y tools</p>
        </div>
        <button
          className="button secondary"
          disabled={a.busy || !state.data?.configured || !state.data?.model}
          onClick={() =>
            a.act(
              () => api(`/ai_agents/${id}/validate`, { method: 'POST', body: {} }),
              'Modelo validado: texto y tool calling.',
            )
          }
        >
          {a.busy ? 'Validando…' : 'Validar modelo'}
        </button>
      </div>
      {a.feedback}
      <LoadState state={state}>
        {state.data && (
          <>
            <p>
              {state.data.model || 'Sin deployment/modelo'} ·{' '}
              {state.data.validated ? 'Validado' : 'Validación pendiente'}
            </p>
            {!state.data.configured && (
              <p className="muted">Configura LLM_BASE_URL y LLM_API_KEY en el servidor.</p>
            )}
            {state.data.tools.map((t) => (
              <p key={t.id} className="muted">
                {t.name}:{' '}
                {t.executable ? 'Función disponible' : 'Definición sin función ejecutable'}
              </p>
            ))}
          </>
        )}
      </LoadState>
    </section>
  );
}
export function ConversationIntegration({ record, version, refresh, setDirty, confirm }) {
  const [text, setText] = useState(''),
    [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const a = useAction(refresh);
  const state = useData(`/conversations/${record.id}/activity`, version, {
    pollMs: 5000,
    preserve: true,
  });
  async function send(e) {
    e.preventDefault();
    const result = await a.act(
      () =>
        api(`/conversations/${record.id}/send`, {
          method: 'POST',
          body: { message: text, request_id: requestId },
        }),
      'Mensaje en cola de envío.',
    );
    if (result) {
      setText('');
      setDirty(false);
      setRequestId(crypto.randomUUID());
    }
  }
  return (
    <section className="integration-panel">
      <div className="section-heading">
        <div>
          <h2>Atención de la conversación</h2>
          <p className="muted">
            {record.effective_agent_name || 'Sin agente'} ·{' '}
            {record.automation_mode === 'automatic' ? 'Modo automático' : 'Atención manual'}
          </p>
        </div>
        <div className="inline-actions">
          <button
            className="button secondary"
            disabled={a.busy}
            onClick={() =>
              a.act(() =>
                api(`/conversations/${record.id}/mode`, {
                  method: 'POST',
                  body: {
                    mode: record.automation_mode === 'automatic' ? 'manual' : 'automatic',
                  },
                }),
              )
            }
          >
            {record.automation_mode === 'automatic' ? 'Tomar control' : 'Reanudar IA'}
          </button>
          <button
            className="text-button"
            disabled={a.busy}
            onClick={() =>
              a.act(
                () =>
                  api(`/conversations/${record.id}/sync`, {
                    method: 'POST',
                    body: {},
                  }),
                'Reconciliación en cola.',
              )
            }
          >
            Actualizar mensajes
          </button>
        </div>
      </div>
      {record.pause_reason && <p className="muted">{record.pause_reason}</p>}
      {a.feedback}
      {record.automation_mode === 'manual' && (
        <form onSubmit={send}>
          <label htmlFor="send-message">Responder por el canal</label>
          <textarea
            id="send-message"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDirty(!!e.target.value);
            }}
            maxLength={1000}
            rows={3}
            required
            disabled={a.busy}
          />
          <div className="inline-actions">
            <button className="button primary" disabled={a.busy || !text.trim()}>
              Enviar mensaje
            </button>
            <span className="muted">{text.length}/1000 · Sujeto a la ventana de respuesta</span>
          </div>
        </form>
      )}
      <LoadState state={state}>
        {state.data && (
          <>
            {state.data.outbox
              .filter((o) => ['uncertain', 'failed', 'cancelled'].includes(o.status))
              .map((o) => (
                <div className="integration-status" key={o.id}>
                  <span>
                    {deliveryLabels[o.status]}: {o.error}
                  </span>
                  {o.status === 'uncertain' && (
                    <button
                      className="text-button"
                      disabled={a.busy}
                      onClick={async () => {
                        if (
                          await confirm(
                            'Revisar entrega incierta',
                            'Comprueba primero el historial del canal. Esta acción cierra la revisión; no confirma entrega ni reenvía el mensaje.',
                            'He revisado el canal',
                          )
                        )
                          await a.act(
                            () =>
                              api(`/outbound/${o.id}/review`, {
                                method: 'POST',
                                body: { action: 'reviewed' },
                              }),
                            'Revisión registrada.',
                          );
                      }}
                    >
                      Cerrar revisión
                    </button>
                  )}
                </div>
              ))}
            {!!state.data.runs.length && (
              <details>
                <summary>Actividad del agente</summary>
                <ul className="related-list">
                  {state.data.runs.map((r) => (
                    <li key={r.id}>
                      <span>
                        {runLabels[r.status] || r.status} · {r.model || 'Modelo pendiente'}
                        <small className="muted">
                          {' '}
                          {new Date(r.created_at).toLocaleString('es-CL')}
                        </small>
                        {r.error && <p>{r.error}</p>}
                      </span>
                      <span className="muted">
                        {r.usage ? `${JSON.parse(r.usage).total_tokens} tokens` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </LoadState>
    </section>
  );
}
