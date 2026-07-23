import { useEffect, useState } from 'react';
import { get } from '../services/apiClient';
import { ENDPOINTS } from '../config/api';
import KpiCards from './KpiCards';
import DataTable from './DataTable';

// Generic role screen. Pass the endpoint key + a title.
// Each role screen hits its OWN API endpoint (see config/api.js).
export default function RoleScreen({ endpointKey, title }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    get(ENDPOINTS[endpointKey])
      .then((res) => active && setData(res))
      .catch(() => active && setData({ title, kpis: [], rows: [] }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [endpointKey, title]);

  if (loading) {
    return (
      <div className="screen-loading">
        <div className="spinner" />
      </div>
    );
  }

  // Support both {label,value} arrays and {kpiLabel: value} objects.
  const kpiList = Array.isArray(data.kpis)
    ? data.kpis.map((k) => (k && typeof k === 'object' && 'label' in k ? k : { label: Object.keys(k)[0], value: Object.values(k)[0] }))
    : Object.entries(data.kpis || {}).map(([label, value]) => ({ label, value }));

  return (
    <div className="role-screen">
      <h2 className="screen-title">{data.title || title}</h2>
      <KpiCards kpis={kpiList} />
      <DataTable rows={data.rows || []} variant="role" />
    </div>
  );
}
