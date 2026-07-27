/** Multi-select checkbox list for assigning TAs to a requirement (shared pool). */
export default function TaOwnersMultiSelect({
  options = [],
  value = [],
  onChange,
  disabled = false,
  idPrefix = 'ta-owner',
}) {
  const selected = Array.isArray(value) ? value : [];

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
        No TA users found. Create a TA user from Admin first.
      </div>
    );
  }

  return (
    <div className="ta-multi-select" role="group" aria-label="TA owners">
      {options.map((o) => {
        const id = o.id;
        const label = o.fullName || o.name || o.email || id;
        const checked = selected.includes(id);
        const inputId = `${idPrefix}-${id}`;
        return (
          <label key={id} className={`ta-multi-option${checked ? ' is-selected' : ''}`} htmlFor={inputId}>
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
  );
}

export function formatTaOwnerNames(requirement) {
  if (Array.isArray(requirement?.taOwners) && requirement.taOwners.length) {
    return requirement.taOwners.map((t) => t.fullName || t.name || t.email).filter(Boolean).join(', ');
  }
  return requirement?.taOwner?.fullName || requirement?.taOwner?.name || '—';
}
