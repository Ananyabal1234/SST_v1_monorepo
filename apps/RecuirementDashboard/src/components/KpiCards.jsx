import {
  IconBriefcase, IconFolderOpen, IconUsers, IconCheckCircle, IconUserCheck, IconXCircle,
  IconClipboardCheck, IconChart,
} from './Icons';

// Map each KPI label to an icon + a target used to draw the radial progress ring.
const KPI_META = {
  totalRequirements: { Icon: IconBriefcase, target: 100 },
  totalPositions: { Icon: IconFolderOpen, target: 200 },
  openPositions: { Icon: IconFolderOpen, target: 150 },
  closedPositions: { Icon: IconFolderOpen, target: 100 },
  pendingSalesHandoff: { Icon: IconClipboardCheck, target: 50 },
  candidatesInPipeline: { Icon: IconUsers, target: 120 },
  selectedCandidates: { Icon: IconUserCheck, target: 20 },
  duplicateMobiles: { Icon: IconXCircle, target: 20 },
  offersReleased: { Icon: IconCheckCircle, target: 20 },
  offersAccepted: { Icon: IconUserCheck, target: 20 },
  candidatesJoined: { Icon: IconUserCheck, target: 20 },
  fillRate: { Icon: IconChart, target: 100 },
  averageDaysToFill: { Icon: IconChart, target: 100 },
  requirementsAtRisk: { Icon: IconXCircle, target: 20 },
  cancelledRequirements: { Icon: IconXCircle, target: 20 },
  wastedSourcing: { Icon: IconXCircle, target: 20 },
  overdueRequirements: { Icon: IconXCircle, target: 20 },
  offersRejected: { Icon: IconXCircle, target: 40 },
};

const KPI_LABELS = {
  totalRequirements: 'Total Requirements',
  totalPositions: 'Total Positions',
  openPositions: 'Open Positions',
  closedPositions: 'Closed Positions',
  pendingSalesHandoff: 'Pending Sales Handoff',
  candidatesInPipeline: 'Candidates In Pipeline',
  selectedCandidates: 'Selected Candidates',
  duplicateMobiles: 'Duplicate Mobiles',
  offersReleased: 'Offers Released',
  offersAccepted: 'Offers Accepted',
  candidatesJoined: 'Candidates Joined',
  fillRate: 'Fill Rate',
  averageDaysToFill: 'Avg Days To Fill',
  requirementsAtRisk: 'Requirements At Risk',
  cancelledRequirements: 'Cancelled Requirements',
  wastedSourcing: 'Wasted Sourcing',
  overdueRequirements: 'Overdue Requirements',
  offersRejected: 'Offers Rejected',
};

function formatKpiValue(label, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (label.toLowerCase().includes('rate')) return `${value}%`;
    return value;
  }
  return value;
}

function getKpiLabel(kpi) {
  if (kpi.title) return kpi.title;
  if (kpi.name) return kpi.name;
  return KPI_LABELS[kpi.label] || kpi.label || 'KPI';
}

function cssVar(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export default function KpiCards({ kpis = [], onCardClick }) {
  const successLight = cssVar('--color-success-light', '#22c55e');
  const success = cssVar('--color-success', '#16a34a');

  return (
    <div className="kpi-grid">
      {/* Shared gradient for the radial progress rings — uses semantic success tokens */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="kpiGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={successLight} />
            <stop offset="100%" stopColor={success} />
          </linearGradient>
        </defs>
      </svg>
      {kpis.map((k) => {
        const label = k.label || k.name || k.key || `kpi-${Math.random().toString(36).slice(2, 8)}`;
        const Icon = KPI_META[label]?.Icon || IconBriefcase;
        return (
          <div
            className="kpi-card"
            key={label}
            role={onCardClick ? 'button' : undefined}
            tabIndex={onCardClick ? 0 : undefined}
            onClick={() => onCardClick && onCardClick(label)}
            onKeyDown={(e) => {
              if (!onCardClick) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onCardClick(label);
              }
            }}
          >
            <div className="kpi-top">
              <span className="kpi-icon"><Icon /></span>
            </div>
            <span className="kpi-value">{formatKpiValue(label, k.value)}</span>
            <span className="kpi-label">{getKpiLabel(k)}</span>
          </div>
        );
      })}
    </div>
  );
}
