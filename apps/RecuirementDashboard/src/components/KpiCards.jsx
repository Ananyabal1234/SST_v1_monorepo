import {
  IconBriefcase, IconFolderOpen, IconUsers, IconCheckCircle, IconUserCheck, IconXCircle,
  IconClipboardCheck, IconChart,
} from './Icons';

const RISK_KPI = new Set([
  'overdueRequirements',
  'wastedSourcing',
  'cancelledRequirements',
  'requirementsAtRisk',
]);

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

export default function KpiCards({ kpis = [], onCardClick, heroLabels }) {
  const renderCard = (k, featured = false) => {
    const label = k.label || k.name || k.key || `kpi-${Math.random().toString(36).slice(2, 8)}`;
    const Icon = KPI_META[label]?.Icon || IconBriefcase;
    const tone = RISK_KPI.has(label) ? ' kpi-card-risk' : '';
    const size = featured ? ' kpi-card-hero' : ' kpi-card-compact';

    return (
      <div
        className={`kpi-card${tone}${size}`}
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
        <span className="kpi-icon"><Icon /></span>
        <div className="kpi-copy">
          <span className="kpi-value">{formatKpiValue(label, k.value)}</span>
          <span className="kpi-label">{getKpiLabel(k)}</span>
        </div>
      </div>
    );
  };

  if (Array.isArray(heroLabels) && heroLabels.length) {
    const heroSet = new Set(heroLabels);
    const hero = kpis.filter((k) => heroSet.has(k.label));
    const rest = kpis.filter((k) => !heroSet.has(k.label));
    return (
      <div className="kpi-stack">
        <div className="kpi-section">
          <h2 className="kpi-section-title">Key metrics</h2>
          <div className="kpi-grid kpi-grid-hero">
            {hero.map((k) => renderCard(k, true))}
          </div>
        </div>
        {rest.length > 0 && (
          <details className="kpi-more" open>
            <summary>More metrics</summary>
            <div className="kpi-grid kpi-grid-compact">
              {rest.map((k) => renderCard(k, false))}
            </div>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="kpi-grid">
      {kpis.map((k) => renderCard(k, false))}
    </div>
  );
}
