import { useTheme } from '../context/ThemeContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  IconChart, IconPie, IconBar, IconTrending,
} from './Icons';

const FALLBACK = {
  success: '#16a34a',
  successBright: '#4ade80',
  warning: '#f59e0b',
  danger: '#dc2626',
  primary: '#0ea5e9',
};

function cssVar(name, fallback = '#888') {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function semanticColors() {
  return {
    success: cssVar('--color-success', FALLBACK.success),
    successBright: cssVar('--color-success-bright', FALLBACK.successBright),
    warning: cssVar('--color-warning-bright', FALLBACK.warning),
    danger: cssVar('--color-danger', FALLBACK.danger),
    primary: cssVar('--primary', FALLBACK.primary),
    text: cssVar('--dash-text-strong', cssVar('--text', '#f0f7fb')),
    muted: cssVar('--dash-text-quiet', cssVar('--text-soft', '#8aa6b8')),
    grid: cssVar('--grid', '#243640'),
    tooltipBg: cssVar('--tooltip-bg', cssVar('--surface', '#16212a')),
    border: cssVar('--dash-card-border', cssVar('--border', '#243640')),
  };
}

function byClient(rows, field) {
  const map = {};
  rows.forEach((r) => { map[r.client] = (map[r.client] || 0) + (r[field] || 0); });
  return Object.entries(map).map(([client, value]) => ({ client, value }));
}

function normalizeRagSummary(summary, colors) {
  if (!Array.isArray(summary)) return null;
  const map = { Green: 0, Amber: 0, Red: 0 };
  summary.forEach((item) => {
    const key = String(item.rag || item.RAG || item.ragStatus || item.status || '').trim();
    if (key.toLowerCase() === 'green') map.Green += Number(item.count || item.value || 0);
    if (key.toLowerCase() === 'amber') map.Amber += Number(item.count || item.value || 0);
    if (key.toLowerCase() === 'red') map.Red += Number(item.count || item.value || 0);
  });
  return [
    { name: 'Green', value: map.Green, color: colors.success },
    { name: 'Amber', value: map.Amber, color: colors.warning },
    { name: 'Red', value: map.Red, color: colors.danger },
  ];
}

function ragBreakdown(rows, colors) {
  const map = { Green: 0, Amber: 0, Red: 0 };
  rows.forEach((r) => { if (map[r.requirementRag] != null) map[r.requirementRag]++; });
  return [
    { name: 'Green', value: map.Green, color: colors.success },
    { name: 'Amber', value: map.Amber, color: colors.warning },
    { name: 'Red', value: map.Red, color: colors.danger },
  ];
}

function pipelineFunnel(rows) {
  return [
    { stage: 'In Pipeline', value: rows.reduce((s, r) => s + (r.candidatesInPipeline || 0), 0) },
    { stage: 'Selected', value: rows.reduce((s, r) => s + (r.selectedCandidates || 0), 0) },
    { stage: 'Offers Released', value: rows.reduce((s, r) => s + (r.offersReleased || 0), 0) },
    { stage: 'Offers Accepted', value: rows.reduce((s, r) => s + (r.offersAccepted || 0), 0) },
    { stage: 'Joined', value: rows.reduce((s, r) => s + (r.candidatesJoined || 0), 0) },
  ];
}

function positionStatus(rows, colors) {
  const open = rows.reduce((s, r) => s + (r.openPositions || 0), 0);
  const closed = rows.reduce((s, r) => s + (r.closedPositions || 0), 0);
  return [
    { name: 'Open', value: open, color: colors.successBright },
    { name: 'Closed', value: closed, color: colors.danger },
  ];
}

function stageConversion(funnel) {
  const pct = (next, prev) => (prev > 0 ? Math.round((next / prev) * 100) : 0);
  return [
    { name: 'Selected / Pipeline', value: pct(funnel[1]?.value, funnel[0]?.value) },
    { name: 'Offers / Selected', value: pct(funnel[2]?.value, funnel[1]?.value) },
    { name: 'Accepted / Offers', value: pct(funnel[3]?.value, funnel[2]?.value) },
    { name: 'Joined / Accepted', value: pct(funnel[4]?.value, funnel[3]?.value) },
  ];
}

function ChartTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const title = label || item.name || item.payload?.name || item.payload?.client;
  return (
    <div className="chart-tooltip">
      <strong>{title}</strong>
      <span>{item.value}{suffix}</span>
    </div>
  );
}

function reduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function ClientBarChart({ data, color, empty }) {
  if (!data.length) {
    return <div className="progress-empty">{empty}</div>;
  }
  const colors = semanticColors();
  return (
    <div className="chart-plot">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="client"
            width={92}
            tick={{ fill: colors.muted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(14, 165, 233, 0.08)' }} />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} maxBarSize={18} isAnimationActive={!reduceMotion()} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DonutChart({ data, centerLabel, total }) {
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return <div className="progress-empty">No data found.</div>;
  }
  return (
    <div className="chart-donut">
      <div className="chart-donut-wrap">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={74}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={!reduceMotion()}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="chart-donut-center">
          <strong>{total}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <ul className="rag-legend">
        {data.map((d) => (
          <li key={d.name}>
            <span className="rag-dot" style={{ background: d.color }} />
            {d.name}
            <strong>{d.value}</strong>
            <em>{total ? Math.round((d.value / total) * 100) : 0}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardCharts({
  rows,
  kpis = [],
  openPositionsOnClient = null,
  closedPositionsOnClient = null,
  requirementRagSummary = null,
}) {
  const { theme } = useTheme();
  void theme;
  const colors = semanticColors();

  const ragFromSummary = normalizeRagSummary(requirementRagSummary, colors);
  const effectiveRows = rows.length ? rows : kpis.map((k) => ({
    client: k.label,
    openPositions: k.label === 'openPositions' ? k.value : 0,
    closedPositions: k.label === 'closedPositions' ? k.value : 0,
    candidatesInPipeline: k.label === 'candidatesInPipeline' ? k.value : 0,
    selectedCandidates: k.label === 'selectedCandidates' ? k.value : 0,
    offersReleased: k.label === 'offersReleased' ? k.value : 0,
    offersAccepted: k.label === 'offersAccepted' ? k.value : 0,
    candidatesJoined: k.label === 'candidatesJoined' ? k.value : 0,
    requirementRag: null,
  }));

  const openByClient = openPositionsOnClient === null
    ? byClient(effectiveRows, 'openPositions').sort((a, b) => b.value - a.value).slice(0, 6)
    : openPositionsOnClient.length
      ? openPositionsOnClient.map((c) => ({ client: c.client, value: c.openPositions }))
      : [];
  const closedByClient = closedPositionsOnClient === null
    ? byClient(effectiveRows, 'closedPositions').sort((a, b) => b.value - a.value).slice(0, 6)
    : closedPositionsOnClient.length
      ? closedPositionsOnClient.map((c) => ({ client: c.client, value: c.closedPositions })).sort((a, b) => b.value - a.value).slice(0, 6)
      : [];
  const rag = ragFromSummary || ragBreakdown(effectiveRows, colors);
  const funnel = pipelineFunnel(effectiveRows);
  const status = positionStatus(effectiveRows, colors);
  const conversion = stageConversion(funnel);

  const ragTotal = rag.reduce((s, d) => s + d.value, 0);
  const statusTotal = status.reduce((s, d) => s + d.value, 0);
  const funnelHasData = funnel.some((d) => d.value > 0);

  return (
    <div className="charts-grid">
      <div className="chart-card span-2">
        <h3><IconChart /> Recruitment Funnel</h3>
        {funnelHasData ? (
          <div className="funnel-stack">
            {funnel.map((d, i) => (
              <div
                className="funnel-stage"
                key={d.stage}
                style={{ width: `${100 - i * 10}%` }}
              >
                <span className="funnel-stage-name">{d.stage}</span>
                <strong className="funnel-stage-val">{d.value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="progress-empty">No data found.</div>
        )}
      </div>

      {funnelHasData && (
        <div className="chart-card span-2">
          <h3><IconTrending /> Stage conversion</h3>
          <div className="chart-plot">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={conversion} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: colors.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={40}
                />
                <Tooltip content={<ChartTooltip suffix="%" />} cursor={{ fill: 'rgba(14, 165, 233, 0.08)' }} />
                <Bar dataKey="value" fill={colors.primary} radius={[6, 6, 0, 0]} maxBarSize={42} isAnimationActive={!reduceMotion()} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="chart-card">
        <h3><IconBar /> Open Positions on Client</h3>
        <ClientBarChart data={openByClient} color={colors.success} empty="No data found." />
      </div>

      <div className="chart-card">
        <h3><IconBar /> Closed Positions on Client</h3>
        <ClientBarChart data={closedByClient} color={colors.danger} empty="No data found." />
      </div>

      <div className="chart-card">
        <h3><IconPie /> Requirement RAG</h3>
        <DonutChart data={rag} centerLabel="Reqs" total={ragTotal} />
      </div>

      <div className="chart-card">
        <h3><IconPie /> Position Status</h3>
        <DonutChart data={status} centerLabel="Positions" total={statusTotal} />
      </div>
    </div>
  );
}
