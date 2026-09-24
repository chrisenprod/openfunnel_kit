import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons.jsx';

const normalize = (text) => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function AppSelect({ id, name, value = '', onChange, options, disabled = false, required = false, label = 'Seleccionar', ...accessibility }) {
  const uid = useId();
  const controlId = id || `select-${uid}`;
  const listId = `${controlId}-list`;
  const trigger = useRef();
  const popup = useRef();
  const search = useRef();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [position, setPosition] = useState({});
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) => normalize(option.label).includes(normalize(query)));
  const enabled = filtered.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
  const activeIndex = enabled.includes(active) ? active : enabled[0];

  function close(restore = false) {
    setOpen(false);
    if (restore) trigger.current?.focus();
  }
  function choose(option) {
    if (!option || option.disabled) return;
    setInvalid(false);
    close(true);
    onChange(option.value);
  }
  function show() {
    if (trigger.current?.matches(':disabled')) return;
    setQuery('');
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  }
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = trigger.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const height = viewport?.height || window.innerHeight;
      const width = viewport?.width || window.innerWidth;
      const offsetTop = viewport?.offsetTop || 0;
      const below = height + offsetTop - rect.bottom - 12;
      const above = rect.top - offsetTop - 12;
      const upwards = below < 240 && above > below;
      const maxHeight = Math.max(120, Math.min(320, upwards ? above : below));
      const popupWidth = Math.min(Math.max(rect.width, 260), width - 24);
      setPosition({
        width: popupWidth,
        left: Math.max(12, Math.min(rect.left, width - popupWidth - 12)),
        top: upwards ? rect.top - 6 : rect.bottom + 6,
        transform: upwards ? 'translateY(-100%)' : undefined,
        maxHeight,
      });
    }
    place();
    search.current?.focus();
    const outside = (event) => {
      if (!popup.current?.contains(event.target) && !trigger.current?.contains(event.target)) close();
    };
    const scroll = (event) => {
      if (!popup.current?.contains(event.target)) place();
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', scroll, true);
    window.visualViewport?.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', scroll, true);
      window.visualViewport?.removeEventListener('resize', place);
    };
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({block: 'nearest'});
  }, [open, activeIndex, listId]);
  function keys(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const current = enabled.indexOf(activeIndex);
      setActive(enabled[(current + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length] ?? 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(filtered[activeIndex]);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const controls = [...document.querySelectorAll('a[href],button,input,textarea,select,[tabindex="0"]')]
        .filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert]') && element.getClientRects().length && !popup.current?.contains(element));
      const next = controls[controls.indexOf(trigger.current) + (event.shiftKey ? -1 : 1)];
      close();
      (next || trigger.current)?.focus();
    }
  }
  return (
    <div className="app-select">
      <button
        {...accessibility}
        ref={trigger}
        id={controlId}
        type="button"
        className="select-trigger"
        disabled={disabled}
        aria-label={accessibility['aria-label'] || (!id ? label : undefined)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-invalid={invalid || accessibility['aria-invalid'] || undefined}
        aria-describedby={[`${controlId}-value`, accessibility['aria-describedby'], invalid ? `${controlId}-required` : null].filter(Boolean).join(' ')}
        onClick={() => open ? close() : show()}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            show();
          }
        }}
      >
        {selected?.icon && <Icon name={selected.icon} className={`channel-icon channel-${selected.icon}`} />}
        <span id={`${controlId}-value`}>{selected?.label || label}</span>
        <Icon name="chevron" className="select-chevron" />
      </button>
      {required && (
        <input
          className="select-validation"
          aria-hidden="true"
          tabIndex={-1}
          name={name}
          required
          disabled={disabled}
          value={value}
          onChange={() => {}}
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
            trigger.current?.focus();
          }}
        />
      )}
      {invalid && <span id={`${controlId}-required`} className="field-error" role="alert">Selecciona una opción.</span>}
      {open && createPortal(
        <div ref={popup} className="select-popover" style={position} onKeyDown={keys}>
          <div className="select-search">
            <Icon name="search" />
            <input
              ref={search}
              role="combobox"
              aria-label={`Buscar en ${label.toLowerCase()}`}
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={activeIndex == null ? undefined : `${listId}-${activeIndex}`}
              placeholder="Buscar…"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            />
          </div>
          <div className="select-options" id={listId} role="listbox" aria-label={label}>
            {filtered.map((option, index) => (
              <div
                id={`${listId}-${index}`}
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled || undefined}
                className={`select-option ${index === activeIndex ? 'highlighted' : ''}`}
                onPointerMove={() => !option.disabled && setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option.icon && <Icon name={option.icon} className={`channel-icon channel-${option.icon}`} />}
                <span>{option.label}</span>
                {option.value === value && <Icon name="check" className="select-check" />}
              </div>
            ))}
            {!filtered.length && <p className="select-empty" role="status">No hay coincidencias.</p>}
          </div>
        </div>, document.body,
      )}
    </div>
  );
}
