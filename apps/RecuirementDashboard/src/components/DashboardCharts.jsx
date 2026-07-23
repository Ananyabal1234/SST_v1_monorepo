import { useTheme } from '../context/ThemeContext';
import {
  IconChart, IconPie, IconBar,
} from './Icons';

// BR brand palette for charts (theme-aware via CSS variables)
const BR = '#e11d2f';
const BR_LIGHT = '#ff4d5e';

// Read theme colors from CSS variables so charts match dark/light mode.
function cssVar(name) {
  if (typeof window === 'undefined') return '#888';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}

// ---- Aggregate helpers (computed from the dashboard rows) ----
function byClient(rows, field) {
  const map = {};
  rows.forEach((r) => { map[r.client] = (map[r.client] || 0) + (r[field] || 0); });
  return Object.entries(map).map(([client, value]) => ({ client, value }));
}

function normalizeRagSummary(summary) {
  if (!Array.isArray(summary)) return null;
  const map = { Green: 0, Amber: 0, Red: 0 };
  summary.forEach((item) => {
    const key = String(item.rag || item.RAG || item.ragStatus || item.status || '').trim();
    if (key.toLowerCase() === 'green') map.Green += Number(item.count || item.value || 0);
    if (key.toLowerCase() === 'amber') map.Amber += Number(item.count || item.value || 0);
    if (key.toLowerCase() === 'red') map.Red += Number(item.count || item.value || 0);
  });
  return [
    { name: 'Green', value: map.Green, color: '#16a34a' },
    { name: 'Amber', value: map.Amber, color: '#f59e0b' },
    { name: 'Red', value: map.Red, color: BR },
  ];
}

function ragBreakdown(rows) {
  const map = { Green: 0, Amber: 0, Red: 0 };
  rows.forEach((r) => { if (map[r.requirementRag] != null) map[r.requirementRag]++; });
  return [
    { name: 'Green', value: map.Green, color: '#16a34a' },
    { name: 'Amber', value: map.Amber, color: '#f59e0b' },
    { name: 'Red', value: map.Red, color: BR },
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

function positionStatus(rows) {
  const open = rows.reduce((s, r) => s + (r.openPositions || 0), 0);
  const closed = rows.reduce((s, r) => s + (r.closedPositions || 0), 0);
  return [
    { name: 'Open', value: open, color: '#4ade80' },
    { name: 'Closed', value: closed, color: BR },
  ];
}

export default function DashboardCharts({ rows, kpis = [], openPositionsOnClient = null, closedPositionsOnClient = null, requirementRagSummary = null }) {
  const { theme } = useTheme();
  // `theme` is referenced so the component re-renders on toggle.
  void theme;

  // When API returns summary-only response (no rows), use kpis from summary
  const ragFromSummary = normalizeRagSummary(requirementRagSummary);
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
  const rag = ragFromSummary || ragBreakdown(effectiveRows);
  const funnel = pipelineFunnel(effectiveRows);
  const status = positionStatus(effectiveRows);

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
