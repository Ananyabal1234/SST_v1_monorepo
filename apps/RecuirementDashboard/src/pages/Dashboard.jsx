import { useEffect, useState } from 'react';
import { useAuth, USER_TYPE_LABELS } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { get, post } from '../services/apiClient';
import { ENDPOINTS } from '../config/api';
import Logo from '../assets/Logo';
import KpiCards from '../components/KpiCards';
import DataTable from '../components/DataTable';
import DashboardCharts from '../components/DashboardCharts';
import FilterBar from '../components/FilterBar';
import { DASHBOARD_COLUMNS } from '../config/columns';
import {
  IconDashboard, IconSun, IconMoon, IconLogout, IconPlus, IconClipboardCheck, IconUsers, IconList, IconCheckCircle, IconUser,
} from '../components/Icons';
import SalesScreen from './roles/SalesScreen';
import TaOwnerScreen from './roles/TaOwnerScreen';
import HrScreen from './roles/HrScreen';
import OnboardingScreen from './roles/OnboardingScreen';
import AddRequestScreen from './roles/AddRequestScreen';
import AssignTaskScreen from './roles/AssignTaskScreen';
import HrCandidatesScreen from './roles/HrCandidatesScreen';
import OffersScreen from './roles/OffersScreen';
import UsersScreen from './roles/UsersScreen';
import YourRequirementsScreen from './roles/YourRequirementsScreen';
import MyTasksScreen from './roles/MyTasksScreen';
import TaLeadAssignScreen from './roles/TaLeadAssignScreen';

// Map each user type to the screen component it can visit.
// (Admin has no dedicated tab — "Add request" replaces it.)
const ROLE_SCREENS = {
  sales: { label: 'Sales', Component: SalesScreen },
  sales_lead: { label: 'Sales Lead', Component: SalesScreen },
  ta_owner: { label: 'TA Owner', Component: TaOwnerScreen },
  ta_lead: { label: 'TA Lead', Component: TaOwnerScreen },
  hr: { label: 'HR', Component: HrScreen },
  hr_lead: { label: 'HR Lead', Component: HrScreen },
  onboarding: { label: 'Onboarding', Component: OnboardingScreen },
};

// Which secondary tab(s) each user type sees, alongside the Dashboard.
const SECONDARY_TABS = {
  sales: [
    { key: 'add', label: 'Add Request', icon: IconPlus },
    { key: 'your', label: 'Requirements', icon: IconList },
    { key: 'mytasks', label: 'Task History', icon: IconUsers },
  ],
  sales_lead: [
    { key: 'add', label: 'Add Request', icon: IconPlus },
    { key: 'your', label: 'Requirements', icon: IconList },
    { key: 'mytasks', label: 'Task History', icon: IconUsers },
  ],
  ta_owner: [{ key: 'assign', label: 'Assign Task', icon: IconClipboardCheck }],
  ta_lead: [
    { key: 'lead-assign', label: 'Requirements & Pipeline', icon: IconList },
    { key: 'assign', label: 'Assign Task', icon: IconClipboardCheck },
  ],
  hr: [
    { key: 'hr-offers', label: 'Offer', icon: IconCheckCircle },
    { key: 'hr-onboarding', label: 'Onboarding', icon: IconUsers },
  ],
  hr_lead: [
    { key: 'hr-offers', label: 'Offer', icon: IconCheckCircle },
    { key: 'hr-onboarding', label: 'Onboarding', icon: IconUsers },
  ],
  onboarding: [
    { key: 'hr-offers', label: 'Offer', icon: IconCheckCircle },
    { key: 'hr-onboarding', label: 'Onboarding', icon: IconUsers },
  ],
  admin: [
    { key: 'add', label: 'Add Request', icon: IconPlus },
    { key: 'your', label: 'Requirements', icon: IconList },
    { key: 'assign', label: 'Assign Task', icon: IconClipboardCheck },
    { key: 'hr-offers', label: 'Offer', icon: IconCheckCircle },
    { key: 'hr-onboarding', label: 'Onboarding', icon: IconUsers },
    { key: 'users', label: 'Users', icon: IconUser },
  ],
};

const KPI_DISPLAY_LABELS = [
  'totalRequirements',
  'totalPositions',
  'openPositions',
  'closedPositions',
  'candidatesInPipeline',
  'selectedCandidates',
  'offersReleased',
  'offersAccepted',
  'candidatesJoined',
  'cancelledRequirements',
  'overdueRequirements',
  'wastedSourcing',
];

const KPI_LIST_MAP = {
  totalRequirements: 'requirements',
  totalPositions: 'requirements',
  openPositions: 'requirements',
  closedPositions: 'closedPositions',
  candidatesInPipeline: 'candidatesInPipeline',
  selectedCandidates: 'selectedCandidates',
  offersReleased: 'offersReleased',
  offersAccepted: 'offersAccepted',
  candidatesJoined: 'candidatesJoined',
  cancelledRequirements: 'cancelledRequirements',
  requirementsAtRisk: 'requirementsAtRisk',
  overdueRequirements: 'requirementsAtRisk',
  wastedSourcing: 'wasted',
  pendingSalesHandoff: 'pendingSalesHandoff',
};

const KPI_LABELS = {
  totalRequirements: 'Total Requirements',
  totalPositions: 'Total Positions',
  openPositions: 'Open Positions',
  closedPositions: 'Closed Positions',
  candidatesInPipeline: 'Candidates in Pipeline',
  selectedCandidates: 'Selected Candidates',
  offersReleased: 'Offers Released',
  offersAccepted: 'Offers Accepted',
  candidatesJoined: 'Candidates Joined',
  cancelledRequirements: 'Cancelled Requirements',
  overdueRequirements: 'Overdue Requirements',
  wastedSourcing: 'Wasted Sourcing',
};

function getKpiLabel(kpi) {
  if (!kpi) return 'KPI';
  if (kpi.title) return kpi.title;
  if (kpi.name) return kpi.name;
  return KPI_LABELS[kpi.label] || kpi.label || 'KPI';
}

// Recompute KPI totals from a set of rows (used when no backend KPI summary is provided).
function computeKpis(rows) {
  return {
    totalRequirements: rows.reduce((s, r) => s + (r.totalRequirements || 0), 0),
    totalPositions: rows.reduce((s, r) => s + (r.totalPositions || 0), 0),
    openPositions: rows.reduce((s, r) => s + (r.openPositions || 0), 0),
    closedPositions: rows.reduce((s, r) => s + (r.closedPositions || 0), 0),
    candidatesInPipeline: rows.reduce((s, r) => s + (r.candidatesInPipeline || 0), 0),
    selectedCandidates: rows.reduce((s, r) => s + (r.selectedCandidates || 0), 0),
    offersReleased: rows.reduce((s, r) => s + (r.offersReleased || 0), 0),
    offersAccepted: rows.reduce((s, r) => s + (r.offersAccepted || 0), 0),
    candidatesJoined: rows.reduce((s, r) => s + (r.candidatesJoined || 0), 0),
    cancelledRequirements: rows.reduce((s, r) => s + (r.cancelledRequirements || 0), 0),
    overdueRequirements: rows.reduce((s, r) => s + (r.overdueRequirements || 0), 0),
    wastedSourcing: rows.reduce((s, r) => s + (r.wastedSourcing || 0), 0),
    offersRejected: rows.reduce((s, r) => s + (r.offersRejected || 0), 0),
  };
}

function normalizeKpis(kpis) {
  if (!kpis) return {};
  if (Array.isArray(kpis)) {
    return kpis.reduce((acc, item) => {
      if (!item || typeof item !== 'object') return acc;
      if ('label' in item) {
        acc[item.label] = item.value ?? 0;
      } else {
        const [label, value] = Object.entries(item)[0] || [];
        if (label) acc[label] = value;
      }
      return acc;
    }, {});
  }
  if (typeof kpis === 'object') {
    return { ...kpis };
  }
  return {};
}

function attachKpiPercentages(kpis) {
  const values = kpis.reduce((acc, kpi) => ({ ...acc, [kpi.label]: Number(kpi.value) || 0 }), {});
  const progressMap = {
    totalRequirements: null,
    totalPositions: null,
    openPositions: values.totalPositions > 0 ? ((values.totalPositions - values.openPositions) / values.totalPositions) * 100 : 0,
    closedPositions: values.totalPositions > 0 ? (values.closedPositions / values.totalPositions) * 100 : 0,
    candidatesInPipeline: values.openPositions > 0 ? (values.candidatesInPipeline / values.openPositions) * 100 : 0,
    selectedCandidates: values.candidatesInPipeline > 0 ? (values.selectedCandidates / values.candidatesInPipeline) * 100 : 0,
    offersReleased: values.selectedCandidates > 0 ? (values.offersReleased / values.selectedCandidates) * 100 : 0,
    offersAccepted: values.offersReleased > 0 ? (values.offersAccepted / values.offersReleased) * 100 : 0,
    candidatesJoined: values.offersAccepted > 0 ? (values.candidatesJoined / values.offersAccepted) * 100 : 0,
    overdueRequirements: values.openPositions > 0 ? (values.overdueRequirements / values.openPositions) * 100 : 0,
  };

  return kpis.map((kpi) => {
    const noPercentage = ['totalRequirements', 'totalPositions'].includes(kpi.label);
    const progress = kpi.progress ?? progressMap[kpi.label];
    if (noPercentage || progress == null || Number.isNaN(progress) || !Number.isFinite(progress)) {
      return { ...kpi, noPercentage: true };
    }
    return { ...kpi, progress: Number(progress.toFixed(2)), noPercentage: false };
  });
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [rows, setRows] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | role key
  const [filters, setFilters] = useState({
    taOwner: 'All',
    salesOwner: 'All',
    client: 'All',
    jobFamily: 'All',
    priority: 'All',
    fromDate: '',
    toDate: '',
  });
  const [modalKpi, setModalKpi] = useState(null); // { label, rows }
  const [openPositionsOnClient, setOpenPositionsOnClient] = useState(null);
  const [closedPositionsOnClient, setClosedPositionsOnClient] = useState(null);
  const [requirementRagSummary, setRequirementRagSummary] = useState(null);
  const [dashboardLists, setDashboardLists] = useState({});
  const [taOwnerOptions, setTaOwnerOptions] = useState([]);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [jobFamilyOptions, setJobFamilyOptions] = useState([]);
  // When the backend returns a summary-only response, display KPIs from the summary object
  // Fetch the main dashboard grid from its own API endpoint.
  useEffect(() => {
    let active = true;
    setLoading(true);
    const payload = {};
    if (filters.taOwner !== 'All') payload.taOwnerId = filters.taOwner;
    if (filters.salesOwner !== 'All') payload.salesOwnerId = filters.salesOwner;
    if (filters.client !== 'All') payload.clientId = filters.client;
    if (filters.jobFamily !== 'All') payload.jobFamilyId = filters.jobFamily;
    if (filters.priority !== 'All') payload.priorityCode = filters.priority;
    if (filters.fromDate) payload.from = filters.fromDate;
    if (filters.toDate) payload.to = filters.toDate;

    post(ENDPOINTS.DASHBOARD, payload)
      .then((res) => {
        console.log('Dashboard API response:', res);
        if (!active) return;
        // Extract open/closed positions arrays from API response
        if (res?.openPositionsOnClient == null) {
          setOpenPositionsOnClient(null);
        } else if (Array.isArray(res.openPositionsOnClient)) {
          setOpenPositionsOnClient(res.openPositionsOnClient);
        } else {
          setOpenPositionsOnClient(null);
        }
        if (res?.closedPositionsOnClient == null) {
          setClosedPositionsOnClient(null);
        } else if (Array.isArray(res.closedPositionsOnClient)) {
          setClosedPositionsOnClient(res.closedPositionsOnClient);
        } else {
          setClosedPositionsOnClient(null);
        }
        if (res?.requirementRagSummary == null) {
          setRequirementRagSummary(null);
        } else if (Array.isArray(res.requirementRagSummary)) {
          setRequirementRagSummary(res.requirementRagSummary);
        } else {
          setRequirementRagSummary(null);
        }
        setDashboardLists(typeof res?.lists === 'object' && res?.lists !== null ? res.lists : {});
        const hasRows = Array.isArray(res?.rows);
        if (hasRows) {
          const rowsData = res.rows || [];
          const rowKpis = computeKpis(rowsData);
          const effectiveKpis = { ...rowKpis, ...normalizeKpis(res.kpis) };
          setRows(rowsData);
          setKpis(
            Object.entries(effectiveKpis).map(([label, value]) => ({ label, value, rows: rowsData }))
          );
        } else {
          const summaryKpis = normalizeKpis(res.kpis);
          const effectiveSummary = Object.keys(summaryKpis).length > 0 ? summaryKpis : normalizeKpis(res.summary);
          setRows([]);
          setKpis(
            Object.entries(effectiveSummary).map(([label, value]) => ({ label, value, rows: [] }))
          );
        }
      })
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filters]);

  useEffect(() => {
    let active = true;
    get(ENDPOINTS.TA_MEMBERS)
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.items || res?.data || [];
        if (active) setTaOwnerOptions(items
          .filter((u) => u.fullName)
          .map((u) => ({ value: u.id, label: u.fullName }))
          .sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch(() => active && setTaOwnerOptions([]));
    get(ENDPOINTS.SALES_MEMBERS)
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.items || res?.data || [];
        if (active) setSalesOwnerOptions(items
          .filter((u) => u.fullName)
          .map((u) => ({ value: u.id, label: u.fullName }))
          .sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch(() => active && setSalesOwnerOptions([]));
    get(ENDPOINTS.CLIENTS)
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.items || res?.data || [];
        if (active) setClientOptions(items
          .filter((c) => c.name)
          .map((c) => ({ value: c.id, label: c.name }))
          .sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch(() => active && setClientOptions([]));
    get(ENDPOINTS.JOB_FAMILIES)
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.items || res?.data || [];
        if (active) setJobFamilyOptions(items
          .filter((j) => j.name)
          .map((j) => ({ value: j.id, label: j.name }))
          .sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch(() => active && setJobFamilyOptions([]));
    return () => { active = false; };
  }, []);

  const userType = user?.userType || 'admin';
  const roleScreen = ROLE_SCREENS[userType];

  // Apply dropdown + date filters (each defaults to "All"/empty => no filtering).
  const getLabel = (options, selected) => {
    if (!selected || selected === 'All') return null;
    const option = options.find((o) => o.value === selected || o === selected);
    return option?.label || option || selected;
  };

  const filteredRows = rows.filter((r) => {
    const taName = getLabel(taOwnerOptions, filters.taOwner);
    const salesName = getLabel(salesOwnerOptions, filters.salesOwner);
    const clientName = getLabel(clientOptions, filters.client);
    const jobFamilyName = getLabel(jobFamilyOptions, filters.jobFamily);

    if (filters.taOwner !== 'All' && taName) {
      const owners = Array.isArray(r.taOwners)
        ? r.taOwners.map((t) => (typeof t === 'string' ? t : t.fullName || t.name))
        : [];
      const primary =
        typeof r.taOwner === 'string'
          ? r.taOwner
          : r.taOwner?.fullName || r.taOwner?.name;
      const names = owners.length ? owners : primary ? [primary] : [];
      if (!names.includes(taName) && r.taOwner !== taName && r.taOwnerId !== filters.taOwner) {
        return false;
      }
    }
    if (filters.salesOwner !== 'All' && salesName && r.salesOwner !== salesName) return false;
    if (filters.client !== 'All' && clientName && r.client !== clientName) return false;
    if (filters.jobFamily !== 'All' && jobFamilyName && r.jobFamily !== jobFamilyName) return false;
    if (filters.priority !== 'All' && r.priority !== filters.priority) return false;
    if (filters.fromDate && r.createdDate && r.createdDate < filters.fromDate) return false;
    if (filters.toDate && r.createdDate && r.createdDate > filters.toDate) return false;
    return true;
  });

  const filteredKpis = Object.entries(computeKpis(filteredRows))
    .filter(([label]) => KPI_DISPLAY_LABELS.includes(label))
    .map(([label, value]) => ({ label, value }));

  const rawKpis = rows.length ? filteredKpis : kpis.filter((k) => KPI_DISPLAY_LABELS.includes(k.label));
  const displayedKpis = attachKpiPercentages(rawKpis);
  const displayedKpisFiltered = displayedKpis.filter((k) => KPI_DISPLAY_LABELS.includes(k.label));

  return (
    <div className="dashboard">
      {/* Sidebar — narrow, icon-led navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo size={40} />
        </div>

        <nav className="sidebar-nav">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
            title="Dashboard"
          >
            <IconDashboard />
            <span>Dashboard</span>
          </button>

          {/* Secondary tabs — restricted by user type (Dashboard + one role tab) */}
          {SECONDARY_TABS[userType]?.map((t) => {
            const TabIcon = t.icon;
            return (
              <button
                key={t.key}
                className={activeTab === t.key ? 'active' : ''}
                onClick={() => setActiveTab(t.key)}
                title={t.label}
              >
                <TabIcon />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{user?.name?.[0] || 'U'}</div>
            <div className="user-meta">
              <strong>{user?.name}</strong>
              <span>{USER_TYPE_LABELS[userType]}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <IconLogout />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{activeTab === 'overview' ? 'Recruitment Overview' : activeTab === 'add' ? 'Add Request' : activeTab === 'your' ? 'Requirements' : activeTab === 'lead-assign' ? 'Assign Requirements' : activeTab === 'assign' ? 'Assign Task' : activeTab === 'hr-offers' ? 'Offer' : activeTab === 'hr-onboarding' ? 'Onboarding' : activeTab === 'users' ? 'Users' : `${roleScreen?.label} Workspace`}</h1>
            <span className="role-pill">{USER_TYPE_LABELS[userType]}</span>
          </div>
          <div className="topbar-meta">
            <span className="email">{user?.email}</span>
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </header>

        {activeTab === 'overview' ? (
          loading ? (
            <div className="screen-loading"><div className="spinner" /></div>
          ) : (
            <>
              <FilterBar
                rows={rows}
                filters={filters}
                onChange={setFilters}
                options={{
                  taOwner: taOwnerOptions,
                  salesOwner: salesOwnerOptions,
                  client: clientOptions,
                  jobFamily: jobFamilyOptions,
                  priority: ['HIGH', 'MEDIUM', 'LOW'],
                }}
              />
              <KpiCards
                kpis={displayedKpisFiltered}
                onCardClick={(label) => {
                  const listName = KPI_LIST_MAP[label];
                  const listRows = listName && Array.isArray(dashboardLists[listName])
                    ? dashboardLists[listName]
                    : filteredRows;
                  setModalKpi({ label, rows: listRows, listKey: listName || null });
                }}
              />
              <DashboardCharts
                rows={filteredRows}
                kpis={kpis}
                openPositionsOnClient={openPositionsOnClient}
                closedPositionsOnClient={closedPositionsOnClient}
                requirementRagSummary={requirementRagSummary}
              />
              {/* <DataTable rows={filteredRows} variant="full" /> */}
            </>
          )
        ) : activeTab === 'add' ? (
          // Add request form
          <AddRequestScreen />
        ) : activeTab === 'your' ? (
          // List of requirements the user has added
          <YourRequirementsScreen />
        ) : activeTab === 'lead-assign' ? (
          <TaLeadAssignScreen />
        ) : activeTab === 'assign' ? (
          // Assign task screen
          <AssignTaskScreen />
        ) : activeTab === 'mytasks' ? (
          <MyTasksScreen />
        ) : activeTab === 'hr-offers' ? (
          <OffersScreen />
        ) : activeTab === 'hr-onboarding' ? (
          <HrCandidatesScreen />
        ) : activeTab === 'users' ? (
          <UsersScreen />
        ) : (
          // Render the role-specific screen (each hits its own API endpoint)
          <roleScreen.Component />
        )}

        {modalKpi && (
          <KpiModal kpi={modalKpi} onClose={() => setModalKpi(null)} />
        )}
      </main>
    </div>
  );
}

// Modal listing the rows that make up a clicked KPI.
function KpiModal({ kpi, onClose }) {
  const key = kpi.label;
  const listKey = kpi.listKey;
  const items = Array.isArray(kpi.rows) ? kpi.rows : [];
  const sortedItems = items.slice().sort((a, b) => {
    const aValue = Number(a[key]) || 0;
    const bValue = Number(b[key]) || 0;
    return bValue - aValue;
  });
  const totalValue = sortedItems.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
  const formatHeader = (header) => header
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\w/g, (m) => m.toUpperCase());

  const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const HIDDEN_KEYS = new Set([
    'id',
    'requirementId',
    'candidateId',
    'offerId',
    'clientId',
    'jobFamilyId',
    'salesOwnerId',
    'taOwnerId',
    'hrOwnerId',
    'mobileNormalized',
    'emailNormalized',
  ]);

  const columns = listKey
    ? Array.from(new Set(sortedItems.flatMap((row) => Object.keys(row))))
      .filter((key) => !HIDDEN_KEYS.has(key))
      .map((key) => ({ key, label: formatHeader(key) }))
    : DASHBOARD_COLUMNS.filter((c) => [
      'taOwner', 'salesOwner', 'priority', 'client', 'jobFamily',
      'totalRequirements', 'totalPositions', 'openPositions', 'closedPositions',
      'pendingSalesHandoff', 'candidatesInPipeline', 'selectedCandidates',
      'offersReleased', 'offersAccepted', 'candidatesJoined', 'offersRejected',
      'requirementRag',
    ].includes(c.key));

  const formatCell = (value) => {
    if (value == null) return '—';
    if (Array.isArray(value)) {
      if (!value.length) return '—';
      return value
        .map((v) => (typeof v === 'string' ? v : v?.fullName || v?.name || ''))
        .filter(Boolean)
        .join(', ') || '—';
    }
    if (typeof value === 'object') {
      if ('publicId' in value && value.publicId) return value.publicId;
      if ('name' in value) return value.name;
      if ('fullName' in value) return value.fullName;
      return JSON.stringify(value);
    }
    if (typeof value === 'string' && UUID_LIKE.test(value)) return '—';
    return value;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{getKpiLabel({ label: key })} Details — {totalValue} total</h3>
          <button className="modal-close" onClick={onClose} title="Close">×</button>
        </div>
        <div className="modal-body">
          {sortedItems.length === 0 && <p className="modal-empty">No records for this metric.</p>}
          {sortedItems.length > 0 && (
            <div className="table-wrap">
              <table className="data-table modal-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((row) => (
                    <tr key={row.id || JSON.stringify(row).slice(0, 100)}>
                      {columns.map((col) => (
                        <td key={col.key}>{formatCell(row[col.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
