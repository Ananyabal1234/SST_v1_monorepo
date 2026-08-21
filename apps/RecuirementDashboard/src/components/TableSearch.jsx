export default function TableSearch({
  value,
  onChange,
  placeholder = 'Search name, email, ID…',
}) {
  return (
    <div className="table-toolbar">
      <label className="filter-field table-search">
        <span className="filter-label">Search</span>
        <input
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
