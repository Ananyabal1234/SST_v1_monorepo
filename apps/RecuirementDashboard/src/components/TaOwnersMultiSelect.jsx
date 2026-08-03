import { useEffect, useMemo, useRef, useState } from 'react';

/** Compact multi-select dropdown for assigning TAs / TA Leads to a requirement. */
export default function TaOwnersMultiSelect({
  options = [],
  value = [],
  onChange,
  disabled = false,
  idPrefix = 'ta-owner',
  placeholder = 'Select TA owners…',
  emptyMessage = 'No TA users found. Create a TA user from Admin first.',
  ariaLabel = 'TA owners',
}) {
  const selected = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const labelById = useMemo(() => {
    const map = new Map();
    for (const o of options) {
      map.set(o.id, o.fullName || o.name || o.email || o.id);
    }
    return map;
  }, [options]);

  const summary = useMemo(() => {
    if (!selected.length) return placeholder;
    const names = selected.map((id) => labelById.get(id) || id);
    if (names.length <= 2) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
  }, [selected, labelById, placeholder]);

  const toggle = (id) => {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (!options.length) {
    return (
      <div className="ta-multi-empty">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`ta-multi-dropdown${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="ta-multi-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`ta-multi-summary${selected.length ? '' : ' is-placeholder'}`}>
          {summary}
        </span>
        <span className="ta-multi-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="ta-multi-panel" role="listbox" aria-multiselectable="true" aria-label={ariaLabel}>
          {options.map((o) => {
            const id = o.id;
            const label = o.fullName || o.name || o.email || id;
            const checked = selected.includes(id);
            const inputId = `${idPrefix}-${id}`;
            return (
              <label
                key={id}
                className={`ta-multi-option${checked ? ' is-selected' : ''}`}
                htmlFor={inputId}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(id)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function formatTaOwnerNames(requirement) {
  if (Array.isArray(requirement?.taOwners) && requirement.taOwners.length) {
    return requirement.taOwners.map((t) => t.fullName || t.name || t.email).filter(Boolean).join(', ');
  }
  return requirement?.taOwner?.fullName || requirement?.taOwner?.name || '—';
}

export function formatTaLeadNames(requirement) {
  if (Array.isArray(requirement?.taLeads) && requirement.taLeads.length) {
    return requirement.taLeads.map((t) => t.fullName || t.name || t.email).filter(Boolean).join(', ');
  }
  return '—';
}
