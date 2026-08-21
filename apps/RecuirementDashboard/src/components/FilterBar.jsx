// Dropdown filter bar. Each filter defaults to "All" and filters the rows.
// Options are derived from the data so they stay in sync with the API response.

import {
  IconUser, IconUsers, IconBriefcase, IconTarget, IconFilter, IconFolderOpen, IconCalendar, IconX,
} from './Icons';

function uniqueValues(rows, key) {
  const values = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort();
  return values.map((value) => ({ value, label: value }));
}

function resolveLabel(list, value) {
  const found = (list || []).find((item) => {
    const v = typeof item === 'string' ? item : item.value;
    return String(v) === String(value);
  });
  if (!found) return value;
  return typeof found === 'string' ? found : found.label;
}

export default function FilterBar({ rows, filters, onChange, options = {} }) {
  const fields = [
    { key: 'taOwner', label: 'TA Owner', Icon: IconUser },
    { key: 'salesOwner', label: 'Sales Owner', Icon: IconUsers },
    { key: 'client', label: 'Client', Icon: IconBriefcase },
    { key: 'jobFamily', label: 'Job Family', Icon: IconFolderOpen },
    { key: 'priority', label: 'Priority', Icon: IconTarget },
  ];

  const handle = (key, value) => onChange({ ...filters, [key]: value });

  const clearAll = () =>
    onChange(Object.fromEntries(fields.map((f) => [f.key, 'All']).concat([['fromDate', ''], ['toDate', '']])));

  const activeCount =
    fields.filter((f) => filters[f.key] !== 'All').length +
    (filters.fromDate ? 1 : 0) + (filters.toDate ? 1 : 0);

  const chips = [
    ...fields
      .filter((f) => filters[f.key] && filters[f.key] !== 'All')
      .map((f) => ({
        key: f.key,
        label: `${f.label}: ${resolveLabel(options[f.key] || uniqueValues(rows, f.key), filters[f.key])}`,
        reset: () => handle(f.key, 'All'),
      })),
    filters.fromDate
      ? { key: 'fromDate', label: `From ${filters.fromDate}`, reset: () => handle('fromDate', '') }
      : null,
    filters.toDate
      ? { key: 'toDate', label: `To ${filters.toDate}`, reset: () => handle('toDate', '') }
      : null,
  ].filter(Boolean);

  return (
    <div className="filter-bar">
      <div className="filter-bar-head">
        <IconFilter />
        <span>Filters</span>
        {activeCount > 0 && <span className="filter-count">{activeCount} active</span>}
        {activeCount > 0 && (
          <button type="button" className="filter-clear" onClick={clearAll}>
            Clear
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="filter-chips" aria-label="Active filters">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="filter-chip"
              onClick={chip.reset}
              title={`Remove ${chip.label}`}
            >
              {chip.label}
              <IconX width={12} height={12} />
            </button>
          ))}
        </div>
      )}

      <div className="filter-fields">
        {fields.map((f) => (
          <label key={f.key} className="filter-field">
            <span className="filter-label">
              <f.Icon />
              {f.label}
            </span>
            <select
              value={filters[f.key]}
              onChange={(e) => handle(f.key, e.target.value)}
            >
              <option value="All">All</option>
              {(options[f.key] || uniqueValues(rows, f.key)).map((item) => {
                const value = typeof item === 'string' ? item : item.value;
                const label = typeof item === 'string' ? item : item.label;
                return (
                  <option key={value} value={value}>{label}</option>
                );
              })}
            </select>
          </label>
        ))}

        <div className="filter-field filter-date-range">
          <span className="filter-label">
            <IconCalendar />
            Date range
          </span>
          <div className="filter-date-pair">
            <input
              type="date"
              value={filters.fromDate || ''}
              onChange={(e) => handle('fromDate', e.target.value)}
              aria-label="From date"
            />
            <span className="filter-date-sep" aria-hidden="true">–</span>
            <input
              type="date"
              value={filters.toDate || ''}
              onChange={(e) => handle('toDate', e.target.value)}
              aria-label="To date"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
