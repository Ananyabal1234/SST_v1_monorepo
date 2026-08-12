import { useTheme } from '../context/ThemeContext';
import {
  IconChart, IconPie, IconBar,
} from './Icons';

// Semantic chart colors (danger is NOT brand primary — brand stays sky #0ea5e9)
const FALLBACK = {
  success: '#16a34a',
  successBright: '#4ade80',
  warning: '#f59e0b',
  danger: '#dc2626',
  primary: '#0ea5e9',
};

// Read theme colors from CSS variables so charts match dark/light mode.
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
    ragGreen: cssVar('--rag-green-fg', FALLBACK.success),
    ragAmber: cssVar('--rag-amber-fg', FALLBACK.warning),
    ragRed: cssVar('--rag-red-fg', FALLBACK.danger),
  };
}

// ---- Aggregate helpers (computed from the dashboard rows) ----
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

export default function DashboardCharts({ rows, kpis = [], openPositionsOnClient = null, closedPositionsOnClient = null, requirementRagSummary = null }) {
  const { theme } = useTheme();
  // `theme` is referenced so the component re-renders on toggle.
  void theme;
  const colors = semanticColors();

  // When API returns summary-only response (no rows), use kpis from summary
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

  const maxClient = Math.max(1, ...openByClient.map((d) => d.value));
  const maxClosed = Math.max(1, ...closedByClient.map((d) => d.value));
  const maxFunnel = Math.max(1, ...funnel.map((d) => d.value));
  const ragTotal = rag.reduce((s, d) => s + d.value, 0) || 1;
  const statusTotal = status.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="charts-grid">
      {/* Pipeline funnel — horizontal progress bars */}
      <div className="chart-card span-2">
        <h3><IconChart /> Recruitment Funnel</h3>
        <div className="progress-list">
          {funnel.map((d) => {
            const pct = Math.round((d.value / maxFunnel) * 100);
            return (
              <div className="progress-row" key={d.stage}>
                <span className="progress-name">{d.stage}</span>
                <div className="progress-track">
                  <div className="progress-fill funnel" style={{ width: `${pct}%` }} />
                </div>
                <span className="progress-val">{d.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Open positions by client — progress list */}
      <div className="chart-card">
        <h3><IconBar /> Open Positions on Client</h3>
        <div className="progress-list">
          {openByClient.length > 0 ? openByClient.map((d) => {
            const pct = Math.round((d.value / maxClient) * 100);
            return (
              <div className="progress-row" key={d.client}>
                <span className="progress-name">{d.client}</span>
                <div className="progress-track">
                  <div className="progress-fill client" style={{ width: `${pct}%` }} />
                </div>
                <span className="progress-val">{d.value}</span>
              </div>
            );
          }) : (
            <div className="progress-empty">No data found.</div>
          )}
        </div>
      </div>

      {/* Closed positions by client — progress list */}
      <div className="chart-card">
        <h3><IconBar /> Closed Positions on Client</h3>
        <div className="progress-list">
          {closedByClient.length > 0 ? closedByClient.map((d) => {
            const pct = Math.round((d.value / maxClosed) * 100);
            return (
              <div className="progress-row" key={d.client}>
                <span className="progress-name">{d.client}</span>
                <div className="progress-track">
                  <div className="progress-fill closed" style={{ width: `${pct}%` }} />
                </div>
                <span className="progress-val">{d.value}</span>
              </div>
            );
          }) : (
            <div className="progress-empty">No data found.</div>
          )}
        </div>
      </div>

      {/* RAG summary — radial gauge + legend */}
      <div className="chart-card">
        <h3><IconPie /> Requirement RAG</h3>
        <div className="rag-gauge">
          <svg viewBox="0 0 120 120" className="rag-svg">
            <circle cx="60" cy="60" r="50" className="rag-bg" />
            {(() => {
              let acc = 0;
              return rag.map((d) => {
                const frac = d.value / ragTotal;
                const dash = frac * (2 * Math.PI * 50);
                const el = (
                  <circle
                    key={d.name}
                    cx="60" cy="60" r="50"
                    className="rag-seg"
                    style={{ stroke: d.color, strokeDasharray: `${dash} ${2 * Math.PI * 50}`, strokeDashoffset: -acc }}
                    transform="rotate(-90 60 60)"
                  />
                );
                acc += dash;
                return el;
              });
            })()}
            <text x="60" y="56" className="rag-center-num">{ragTotal}</text>
            <text x="60" y="72" className="rag-center-lbl">Reqs</text>
          </svg>
          <ul className="rag-legend">
            {rag.map((d) => (
              <li key={d.name}>
                <span className="rag-dot" style={{ background: d.color }} />
                {d.name}
                <strong>{d.value}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Position status — donut (Open vs Closed) */}
      <div className="chart-card">
        <h3><IconPie /> Position Status</h3>
        <div className="rag-gauge">
          <svg viewBox="0 0 120 120" className="rag-svg">
            <circle cx="60" cy="60" r="50" className="rag-bg" />
            {(() => {
              let acc = 0;
              return status.map((d) => {
                const frac = d.value / statusTotal;
                const dash = frac * (2 * Math.PI * 50);
                const el = (
                  <circle
                    key={d.name}
                    cx="60" cy="60" r="50"
                    className="rag-seg"
                    style={{ stroke: d.color, strokeDasharray: `${dash} ${2 * Math.PI * 50}`, strokeDashoffset: -acc }}
                    transform="rotate(-90 60 60)"
                  />
                );
                acc += dash;
                return el;
              });
            })()}
            <text x="60" y="56" className="rag-center-num">{statusTotal}</text>
            <text x="60" y="72" className="rag-center-lbl">Positions</text>
          </svg>
          <ul className="rag-legend">
            {status.map((d) => (
              <li key={d.name}>
                <span className="rag-dot" style={{ background: d.color }} />
                {d.name}
                <strong>{d.value}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
