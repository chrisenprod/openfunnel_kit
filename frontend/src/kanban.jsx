import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Icon } from './icons.jsx';
import { AppSelect } from './select.jsx';
import { Badge, LoadState, Notice, Pagination, useData } from './components.jsx';

export function Board({ pipelineId, filters = {}, version, open }) {
  const pipeline = useData(pipelineId ? `/pipelines/${pipelineId}` : null, version);
  return !pipelineId ? (
    <div className="empty">
      <h2>Elige un pipeline</h2>
      <p className="muted">Selecciona el recorrido para ver sus tickets por etapas.</p>
    </div>
  ) : (
    <LoadState state={pipeline}>
      {pipeline.data && (
        <Kanban
          key={pipelineId}
          pipeline={pipeline.data}
          filters={filters}
          version={version}
          open={open}
        />
      )}
    </LoadState>
  );
}

function Kanban({ pipeline, filters, version, open }) {
  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  const [drag, setDrag] = useState(null);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const filterKey = JSON.stringify(filters);

  function cancelDrag() {
    dragRef.current = null;
    setDrag(null);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      dragRef.current = null;
    };
  }, []);
  useEffect(() => {
    cancelDrag();
  }, [filterKey, version]);
  useEffect(() => {
    const cancel = (event) => {
      if (event.key === 'Escape' && dragRef.current) {
        event.preventDefault();
        cancelDrag();
        setNotice('Movimiento cancelado.');
      }
    };
    window.addEventListener('keydown', cancel);
    window.addEventListener('blur', cancelDrag);
    return () => {
      window.removeEventListener('keydown', cancel);
      window.removeEventListener('blur', cancelDrag);
    };
  }, []);

  function destination(x, y) {
    const column = document.elementFromPoint(x, y)?.closest('[data-stage-id]');
    return column && boardRef.current?.contains(column) ? column.dataset.stageId : null;
  }
  const dragging = Boolean(drag);
  useEffect(() => {
    if (!dragging) return;
    let frame;
    function tick() {
      const current = dragRef.current;
      const board = boardRef.current;
      if (!current || !board) return;
      const rect = board.getBoundingClientRect();
      if (current.y >= rect.top && current.y <= rect.bottom) {
        const left = Math.max(rect.left, 0);
        const right = Math.min(rect.right, window.innerWidth);
        const speed = current.x < left + 48 ? -10 : current.x > right - 48 ? 10 : 0;
        if (speed) board.scrollLeft += speed;
      }
      const target = destination(current.x, current.y);
      if (target !== current.target) {
        dragRef.current = { ...current, target };
        setDrag(dragRef.current);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  async function move(ticket, stageId) {
    if (savingRef.current || !stageId || stageId === ticket.stage_id) return;
    const restoreFocus = boardRef.current?.contains(document.activeElement);
    savingRef.current = true;
    setSaving(true);
    setError('');
    setNotice(`Guardando «${ticket.title}»…`);
    try {
      await api(`/tickets/${ticket.id}`, {
        method: 'PATCH',
        body: { stage_id: stageId },
      });
      if (mounted.current)
        setNotice(
          `«${ticket.title}» se movió a ${pipeline.stages.find((stage) => stage.id === stageId)?.name}.`,
        );
    } catch (problem) {
      if (mounted.current) {
        setNotice('');
        setError(
          `No se pudo confirmar el movimiento. ${problem.message} Revisa la ubicación actual y vuelve a intentarlo.`,
        );
      }
    } finally {
      savingRef.current = false;
      if (mounted.current) {
        if (
          restoreFocus &&
          (document.activeElement === document.body ||
            boardRef.current?.contains(document.activeElement))
        )
          boardRef.current.focus({ preventScroll: true });
        setRevision((value) => value + 1);
        setSaving(false);
      }
    }
  }
  function startDrag(event, ticket) {
    if (savingRef.current || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      ticket,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      target: ticket.stage_id,
    };
    setDrag(dragRef.current);
    setError('');
    setNotice('');
  }
  function trackDrag(event) {
    if (!dragRef.current || event.pointerId !== dragRef.current.pointerId) return;
    dragRef.current = {
      ...dragRef.current,
      x: event.clientX,
      y: event.clientY,
      target: destination(event.clientX, event.clientY),
    };
    setDrag(dragRef.current);
  }
  function finishDrag(event) {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const target = destination(event.clientX, event.clientY);
    cancelDrag();
    setNotice('');
    void move(current.ticket, target);
  }
  return (
    <>
      <p className="muted kanban-help">
        Arrastra desde ⠿ para cambiar de etapa, o usa el selector de cada tarjeta.
      </p>
      <span className="sr-only" role="status">
        {drag
          ? `Moviendo «${drag.ticket.title}». Suelta en otra etapa o pulsa Escape para cancelar.`
          : ''}
      </span>
      <Notice>{notice}</Notice>
      <Notice error>{error}</Notice>
      <div
        ref={boardRef}
        className={`board ${drag ? 'is-dragging' : ''}`}
        role="region"
        aria-label="Tickets por etapas"
        tabIndex="0"
        aria-busy={saving}
      >
        {pipeline.stages.map((stage) => (
          <BoardColumn
            key={stage.id}
            stage={stage}
            stages={pipeline.stages}
            filters={{ ...filters, pipeline_id: pipeline.id }}
            version={`${version}:${revision}`}
            open={open}
            saving={saving}
            move={move}
            drag={drag}
            pointerHandlers={{
              onPointerDown: startDrag,
              onPointerMove: trackDrag,
              onPointerUp: finishDrag,
              onPointerCancel: cancelDrag,
              onLostPointerCapture: cancelDrag,
            }}
          />
        ))}
      </div>
      {drag && (
        <div
          className="drag-preview"
          aria-hidden="true"
          style={{
            left: Math.min(drag.x + 16, window.innerWidth - 230),
            top: Math.min(drag.y + 16, window.innerHeight - 100),
          }}
        >
          {drag.ticket.title}
        </div>
      )}
    </>
  );
}

function BoardColumn({
  stage,
  stages,
  filters,
  version,
  open,
  saving,
  move,
  drag,
  pointerHandlers,
}) {
  const [page, setPage] = useState(1);
  const key = JSON.stringify(filters);
  useEffect(() => setPage(1), [key]);
  const query = new URLSearchParams({
    ...filters,
    stage_id: stage.id,
    page: String(page),
    pageSize: '25',
  });
  const state = useData(`/tickets?${query}`, version);
  useEffect(() => {
    if (state.data && page > 1 && !state.data.items.length) setPage((value) => value - 1);
  }, [state.data, page]);
  return (
    <section
      className={`board-column ${drag?.target === stage.id ? 'drop-target' : ''}`}
      data-stage-id={stage.id}
      aria-label={stage.name}
    >
      <header>
        <h2>{stage.name}</h2>
        <Badge>{state.data?.total ?? '…'}</Badge>
      </header>
      {stage.description && <p className="muted">{stage.description}</p>}
      <LoadState state={state}>
        {state.data && (
          <>
            {state.data.items.map((ticket) => (
              <article
                className={`ticket-card ${drag?.ticket.id === ticket.id ? 'drag-source' : ''}`}
                key={ticket.id}
                data-ticket-id={ticket.id}
              >
                <div className="ticket-heading">
                  <button
                    className="record-link ticket-title"
                    onClick={() => open('tickets', ticket.id)}
                  >
                    {ticket.title}
                  </button>
                  <button
                    type="button"
                    className="drag-handle"
                    aria-label={`Arrastrar ${ticket.title}`}
                    title="Arrastrar a otra etapa"
                    disabled={saving}
                    {...pointerHandlers}
                    onPointerDown={(event) => pointerHandlers.onPointerDown(event, ticket)}
                  >
                    <Icon name="grip" />
                  </button>
                </div>
                <span>{ticket.labels.contact_id}</span>
                <span className="muted">
                  {ticket.labels.assigned_user_id || 'Sin responsable'} ·{' '}
                  {ticket.status === 'open' ? 'Abierto' : 'Cerrado'}
                </span>
                <label className="sr-only" htmlFor={`move-${ticket.id}`}>
                  Mover {ticket.title} a etapa
                </label>
                <AppSelect
                  id={`move-${ticket.id}`}
                  label="Etapa"
                  value={ticket.stage_id}
                  disabled={saving || Boolean(drag)}
                  onChange={(value) => void move(ticket, value)}
                  options={stages.map((item) => ({value: item.id, label: item.name}))}
                />
              </article>
            ))}
            {!state.data.total && (
              <p className="muted empty-stage">Sin tickets. Arrastra una tarjeta aquí.</p>
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
