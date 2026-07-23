// Dropdown filter bar. Each filter defaults to "All" and filters the rows.
// Options are derived from the data so they stay in sync with the API response.

import {
  IconUser, IconUsers, IconBriefcase, IconTarget, IconFilter, IconFolderOpen, IconCalendar,
} from './Icons';

function uniqueValues(rows, key) {
  const values = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort();
  return values.map((value) => ({ value, label: value }));
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

  return (
    <div className="filter-bar">
      <div className="filter-bar-head">
        <IconFilter />
        <span>Filters</span>
        {activeCount > 0 && <span className="filter-count">{activeCount} active</span>}
      </div>
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

        <label className="filter-field">
          <span className="filter-label">
            <IconCalendar />
            From Date
          </span>
          <input
            type="date"
            value={filters.fromDate || ''}
            onChange={(e) => handle('fromDate', e.target.value)}
          />
        </label>

        <label className="filter-field">
          <span className="filter-label">
            <IconCalendar />
            To Date
          </span>
          <input
            type="date"
            value={filters.toDate || ''}
            onChange={(e) => handle('toDate', e.target.value)}
          />
        </label>

        {activeCount > 0 && (
          <button className="filter-clear" onClick={clearAll}>
            Clear ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
}
