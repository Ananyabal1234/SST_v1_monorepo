import { DASHBOARD_COLUMNS, ROLE_COLUMNS } from '../config/columns';

function Badge({ type, value }) {
  if (type === 'rag') {
    const cls = value?.toLowerCase();
    return <span className={`badge rag ${cls}`}>{value}</span>;
  }
  if (type === 'stage') {
    return <span className="badge stage">{value}</span>;
  }
  return value;
}

export default function DataTable({ rows, variant = 'full' }) {
  const columns = variant === 'full' ? DASHBOARD_COLUMNS : ROLE_COLUMNS;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.key}>
                  <Badge type={c.badge} value={row[c.key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
