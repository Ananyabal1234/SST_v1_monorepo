import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get, patch } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { IconList, IconFilter, IconBriefcase, IconFlag, IconClipboardCheck, IconUser } from '../../components/Icons';
import TaOwnersMultiSelect, { formatTaOwnerNames, formatTaLeadNames } from '../../components/TaOwnersMultiSelect';
import RequirementPipelineBoard from '../../components/RequirementPipelineBoard';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { matchesQuery, useDebouncedValue } from '../../utils/listSearch';
import TableSearch from '../../components/TableSearch';
import { EmptyState, ScreenSkeleton } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

/** TA Lead workspace: view all requirements, assign TA owners, view pipelines. */
export default function TaLeadAssignScreen() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ clientId: '', priorityCode: '', status: '', assignment: '' });
  const [listSearch, setListSearch] = useState('');
  const listSearchQ = useDebouncedValue(listSearch);
  const [assigning, setAssigning] = useState(null);
  const [taOwnerIds, setTaOwnerIds] = useState([]);
  const [taOwnerOptions, setTaOwnerOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState(null);
  const [viewingRequirement, setViewingRequirement] = useState(null);
  const [viewingCandidate, setViewingCandidate] = useState(null);

  const load = () => {
    let active = true;
    setLoading(true);
    setError(null);
    get(ENDPOINTS.REQUIREMENTS)
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : res?.items || res?.data?.items || res?.data || [];
        if (active) setItems(list);
      })
      .catch((err) => {
        if (active) {
          setError(
            err?.response?.data?.message || err?.message || 'Failed to load requirements',
          );
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    const cleanup = load();
    let active = true;
    get(ENDPOINTS.TA_MEMBERS)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        if (active) setTaOwnerOptions(list);
      })
      .catch(() => active && setTaOwnerOptions([]));
    return () => {
      cleanup?.();
      active = false;
    };
  }, []);

  const clients = useMemo(() => {
    const map = new Map();
    items.forEach((r) => {
      const id = r.client?.id || r.clientId;
      const name = r.client?.name;
      if (id && name) map.set(id, { id, name });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const STATUSES = ['ACTIVE', 'ON_HOLD', 'CLOSED', 'CANCELLED'];

  const isUnassigned = (r) => {
    const ids = Array.isArray(r.taOwnerIds) ? r.taOwnerIds : [];
    const owners = Array.isArray(r.taOwners) ? r.taOwners : [];
    return !ids.length && !owners.length && !r.taOwnerId && !r.taOwner;
  };

  const assignmentLabel = (r) => {
    if (!isUnassigned(r)) return 'Assigned to TAs';
    const leads = Array.isArray(r.taLeads) ? r.taLeads : [];
    const leadIds = Array.isArray(r.taLeadIds) ? r.taLeadIds : [];
    if (leads.length || leadIds.length) return 'Awaiting TA Lead';
    return 'Unassigned';
  };

  const visible = useMemo(() => {
    return items.filter((r) => {
      if (filters.clientId && (r.client?.id || r.clientId) !== filters.clientId) return false;
      if (filters.priorityCode && r.priorityCode !== filters.priorityCode) return false;
      if (filters.status && (r.status || 'ACTIVE') !== filters.status) return false;
      if (filters.assignment === 'unassigned' && !isUnassigned(r)) return false;
      if (filters.assignment === 'assigned' && isUnassigned(r)) return false;
      if (filters.assignment === 'awaiting_lead') {
        const unassigned = isUnassigned(r);
        const hasLead =
          (Array.isArray(r.taLeadIds) && r.taLeadIds.length) ||
          (Array.isArray(r.taLeads) && r.taLeads.length);
        if (!(unassigned && hasLead)) return false;
      }
      return matchesQuery(
        listSearchQ,
        r.publicId,
        r.client?.name,
        r.roleSkill,
        r.salesOwner?.fullName,
        formatTaOwnerNames(r),
        formatTaLeadNames(r),
      );
    });
  }, [items, filters, listSearchQ]);

  const hasFilters = Boolean(
    filters.clientId || filters.priorityCode || filters.status || filters.assignment,
  );
  const update = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const clearFilters = () =>
    setFilters({ clientId: '', priorityCode: '', status: '', assignment: '' });

  const openAssign = (r) => {
    setAssigning(r);
    setAssignError(null);
    setAssignSuccess(null);
    setTaOwnerIds(
      Array.isArray(r.taOwnerIds) && r.taOwnerIds.length
        ? r.taOwnerIds
        : Array.isArray(r.taOwners) && r.taOwners.length
          ? r.taOwners.map((t) => t.id)
          : r.taOwner?.id || r.taOwnerId
            ? [r.taOwner?.id || r.taOwnerId]
            : [],
    );
  };

  const closeAssign = () => {
    setAssigning(null);
    setTaOwnerIds([]);
    setAssignError(null);
    setAssignSuccess(null);
  };
  useEscapeKey(Boolean(assigning), closeAssign);
  useEscapeKey(Boolean(viewingRequirement), () => {
    setViewingRequirement(null);
    setViewingCandidate(null);
  });

  useEffect(() => {
    const req = searchParams.get('req');
    if (!req || !items.length) return;
    const match = items.find((r) => r.id === req || r.publicId === req);
    if (match) openAssign(match);
    // openAssign is stable enough for a deep-link once items load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, items]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!assigning) return;
    if (!taOwnerIds.length) {
      setAssignError('Select at least one TA owner.');
      return;
    }
    setSaving(true);
    setAssignError(null);
    setAssignSuccess(null);
    try {
      await patch(`${ENDPOINTS.REQUIREMENT_BY_ID}/${assigning.id}`, {
        taOwnerIds,
      });
      setAssignSuccess('TA owners assigned successfully');
      toast('TA owners assigned successfully');
      closeAssign();
      load();
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to assign TA owners';
      setAssignError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="yr-screen">
      <div className="yr-head">
        <span className="yr-badge"><IconList /></span>
        <div>
          <h2 className="yr-title">Requirements &amp; Pipeline</h2>
          <p className="yr-sub">
            Track all requirements, assign TA owners, and open any candidate pipeline.
          </p>
        </div>
        {!loading && items.length > 0 && (
          <span className="yr-count">{visible.length} shown</span>
        )}
      </div>

      {!loading && !error && items.length > 0 && (
        <div className="filter-bar">
          <div className="filter-bar-head">
            <IconFilter />
            Filters
            {hasFilters && <span className="filter-count">{visible.length}</span>}
          </div>
          <div className="filter-fields">
            <div className="filter-field">
              <span className="filter-label"><IconBriefcase /> Client</span>
              <select value={filters.clientId} onChange={(e) => update('clientId', e.target.value)}>
                <option value="">All</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <span className="filter-label"><IconFlag /> Priority</span>
              <select
                value={filters.priorityCode}
                onChange={(e) => update('priorityCode', e.target.value)}
              >
                <option value="">All</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <span className="filter-label"><IconClipboardCheck /> Status</span>
              <select value={filters.status} onChange={(e) => update('status', e.target.value)}>
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <span className="filter-label"><IconUser /> Assignment</span>
              <select
                value={filters.assignment}
                onChange={(e) => update('assignment', e.target.value)}
              >
                <option value="">All</option>
                <option value="unassigned">No TA owners</option>
                <option value="awaiting_lead">Awaiting TA Lead</option>
                <option value="assigned">Assigned to TAs</option>
              </select>
            </div>
            {hasFilters && (
              <button className="filter-clear" onClick={clearFilters}>Clear</button>
            )}
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <TableSearch
          value={listSearch}
          onChange={setListSearch}
          placeholder="Search req ID, client, role…"
        />
      )}

      {loading ? (
        <ScreenSkeleton rows={8} />
      ) : error ? (
        <div className="add-error">{error}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={IconList}
          title="No requirements found yet"
          description="New requirements will appear here for TA assignment."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={IconList}
          title="No matching requirements"
          description="Try a different search or clear filters."
        />
      ) : (
        <div className="table-wrap">
          <table className="data-table yr-table">
            <thead>
              <tr>
                <th>Req ID</th>
                <th>Client</th>
                <th>Role / Skill</th>
                <th>Positions</th>
                <th>Priority</th>
                <th>Sales Owner</th>
                <th>TA Leads</th>
                <th>TA Owners</th>
                <th>Assignment</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const unassigned = isUnassigned(r);
                return (
                  <tr key={r.id || r.publicId}>
                    <td>{r.publicId || '—'}</td>
                    <td>{r.client?.name || '—'}</td>
                    <td>{r.roleSkill || '—'}</td>
                    <td>{r.numberOfPositions ?? '—'}</td>
                    <td>{r.priorityCode || '—'}</td>
                    <td>{r.salesOwner?.fullName || '—'}</td>
                    <td>{formatTaLeadNames(r)}</td>
                    <td>
                      {unassigned ? (
                        <span className="yr-status on_hold">—</span>
                      ) : (
                        formatTaOwnerNames(r)
                      )}
                    </td>
                    <td>
                      <span className={`yr-status ${unassigned ? 'on_hold' : 'active'}`}>
                        {assignmentLabel(r)}
                      </span>
                    </td>
                    <td>
                      <span className={`yr-status ${(r.status || 'ACTIVE').toLowerCase()}`}>
                        {r.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div className="yr-actions">
                        <button
                          type="button"
                          className="cand-edit"
                          onClick={() => {
                            setViewingCandidate(null);
                            setViewingRequirement(r);
                          }}
                          title="View pipeline"
                        >
                          <IconClipboardCheck /> Pipeline
                        </button>
                        <button
                          className="cand-edit"
                          onClick={() => openAssign(r)}
                          title="Assign TA owners"
                        >
                          <IconUser /> {unassigned ? 'Assign' : 'Reassign'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {assigning && (
        <div className="modal-overlay" onClick={closeAssign}>
          <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Assign TAs — {assigning.publicId || assigning.id}</h3>
              <button className="modal-close" onClick={closeAssign} title="Close">×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Client</span>
                    <span className="detail-value">{assigning.client?.name || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Role / Skill</span>
                    <span className="detail-value">{assigning.roleSkill || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Sales Owner</span>
                    <span className="detail-value">{assigning.salesOwner?.fullName || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">TA Leads</span>
                    <span className="detail-value">{formatTaLeadNames(assigning)}</span>
                  </div>
                  <div className="detail-field full">
                    <span className="detail-label">TA Owners</span>
                    <TaOwnersMultiSelect
                      options={taOwnerOptions}
                      value={taOwnerIds}
                      onChange={setTaOwnerIds}
                    />
                  </div>
                </div>
                {assignError && <div className="add-error">{assignError}</div>}
                {assignSuccess && <div className="add-success">{assignSuccess}</div>}
              </div>
              <div className="modal-foot">
                <button type="button" className="filter-clear" onClick={closeAssign}>
                  Cancel
                </button>
                <button type="submit" className="add-submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingRequirement && (
        <div className="modal-overlay" onClick={() => { setViewingRequirement(null); setViewingCandidate(null); }}>
          <div className="modal-card detail-modal pipeline-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Candidate pipeline — {viewingRequirement.publicId || viewingRequirement.id}</h3>
              <button
                className="modal-close"
                onClick={() => { setViewingRequirement(null); setViewingCandidate(null); }}
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <RequirementPipelineBoard
                requirementId={viewingRequirement.id}
                requirement={viewingRequirement}
                mode="readonly"
                onSelectCandidate={setViewingCandidate}
              />
              {viewingCandidate && (
                <div className="detail-grid mt-md">
                  <div className="detail-item">
                    <span className="detail-label">Candidate</span>
                    <span className="detail-value">{viewingCandidate.name || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Stage</span>
                    <span className="detail-value">
                      {viewingCandidate.pipelineLabel || viewingCandidate.stageCode || '—'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
