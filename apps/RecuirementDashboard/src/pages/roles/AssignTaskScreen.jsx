import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get, post, patch, uploadResume, parseResume } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  IconClipboardCheck, IconPlus, IconEdit, IconX, IconFilePlus,
} from '../../components/Icons';
import RequirementPipelineBoard from '../../components/RequirementPipelineBoard';
import DuplicateCandidatePanel from '../../components/DuplicateCandidatePanel';
import CandidateResumeSection from '../../components/CandidateResumeSection';
import SourcingPanel from '../../components/SourcingPanel';
import { formatTaOwnerNames } from '../../components/TaOwnersMultiSelect';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { formatDate, toDateInput } from '../../utils/formatDate';
import { matchesQuery, useDebouncedValue } from '../../utils/listSearch';
import TableSearch from '../../components/TableSearch';
import { EmptyState, ScreenSkeleton } from '../../components/ui';

const FALLBACK_STAGES = [
  { code: 'SUBMITTED_TO_SPOC', label: 'Submitted to SPOC' },
  { code: 'CLIENT_SHORTLIST', label: 'Client Shortlist' },
  { code: 'HOLD', label: 'Hold' },
  { code: 'REJECT', label: 'Reject' },
];

const FALLBACK_ROUNDS = [
  { code: 'L1', label: 'L1' },
  { code: 'L2', label: 'L2' },
  { code: 'L3', label: 'L3' },
  { code: 'L4', label: 'L4' },
  { code: 'COMPLETED', label: 'Completed' },
];

const LOI_OPTIONS = [
  { value: 'NOT_RECEIVED', label: 'Not Received' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
];

// Columns shown in the candidate table (editable on the same screen).
const CANDIDATE_FIELDS = [
  { key: 'candidateId', label: 'Candidate ID', type: 'text', required: false, locked: true, hideOnAdd: true },
  { key: 'reqId', label: 'Req ID', type: 'text', required: true, locked: true },
  { key: 'position', label: 'Position', type: 'text', required: true, locked: true },
  { key: 'jobFamily', label: 'Job Family', type: 'text', required: true, locked: true },
  { key: 'candidateName', label: 'Full name', type: 'text', required: true, placeholder: 'e.g. Priya Shah' },
  { key: 'email', label: 'Email', type: 'email', required: true, placeholder: 'name@company.com' },
  { key: 'mobile', label: 'Mobile', type: 'tel', required: true, placeholder: '10-digit mobile number' },
  { key: 'source', label: 'Source', type: 'text', required: true, placeholder: 'Naukri, LinkedIn, Referral…' },
  { key: 'candidateStage', label: 'Pipeline stage', type: 'select', required: true, optionsKey: 'candidateStages' },
  { key: 'feedbackStatus', label: 'Candidate status', type: 'select', required: true, optionsKey: 'candidateStatuses' },
  { key: 'loiStatus', label: 'LOI', type: 'select', required: false, optionsKey: 'loiStatuses', onlyWhenSelected: true },
  { key: 'profileSubmittedDate', label: 'Profile submitted', type: 'date', required: true },
  { key: 'clientShortlistDate', label: 'Client shortlist', type: 'date', required: false },
  { key: 'interviewRound', label: 'Interview round', type: 'select', required: false, optionsKey: 'interviewRounds' },
  { key: 'remarks', label: 'Remarks', type: 'textarea', required: false, placeholder: 'Skills, notice period, or interview notes' },
];

const RESUME_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const EMPTY_CANDIDATE = Object.fromEntries(
  CANDIDATE_FIELDS.map((f) => [f.key, f.key === 'loiStatus' ? 'NOT_RECEIVED' : '']),
);

const FORM_SECTIONS = [
  {
    id: 'identity',
    title: 'Candidate details',
    hint: 'Contact fields auto-fill when you upload a resume — verify before saving.',
    keys: ['candidateId', 'candidateName', 'email', 'mobile', 'source'],
  },
  {
    id: 'stage',
    title: 'Pipeline',
    hint: 'Start at Submitted to SPOC unless this profile is already further along.',
    keys: ['candidateStage', 'feedbackStatus', 'loiStatus', 'interviewRound'],
  },
  {
    id: 'dates',
    title: 'Dates & notes',
    hint: 'Submitted date is required. Shortlist date and remarks are optional.',
    keys: ['profileSubmittedDate', 'clientShortlistDate', 'remarks'],
  },
];

function normalizeLookupList(res) {
  const list = Array.isArray(res) ? res : res?.items || res?.data || [];
  return list
    .map((v) => ({
      code: String(v.code || '').toUpperCase(),
      label: v.label || v.code,
    }))
    .filter((v) => v.code);
}

function stageLabel(code, stages) {
  if (!code) return '';
  const found = stages.find((s) => s.code === String(code).toUpperCase());
  return found?.label || code;
}

function roundLabel(code, rounds) {
  if (!code) return '';
  const found = rounds.find((r) => r.code === String(code).toUpperCase());
  return found?.label || code;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isTargetOverdue(dateVal) {
  if (!dateVal) return false;
  const target = new Date(dateVal);
  if (Number.isNaN(target.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return target < today;
}

function taskUrgency(t) {
  if (t.isCompleted) return 400;
  if (String(t.taHandoffSlaRag || '').toUpperCase() === 'RED') return 0;
  if (t.isOverdue) return 1;
  if (!t.candidates?.length) return 2;
  return 3;
}

const STATUS_RANK = { ACTIVE: 0, ON_HOLD: 1, CLOSED: 2, CANCELLED: 3 };

const TASK_SECTIONS = [
  { status: 'ACTIVE', label: 'Active' },
  { status: 'ON_HOLD', label: 'On hold' },
  { status: 'CLOSED', label: 'Closed' },
  { status: 'CANCELLED', label: 'Cancelled' },
];

function compareTasks(a, b) {
  const byStatus = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
  return byStatus !== 0 ? byStatus : taskUrgency(a) - taskUrgency(b);
}

export default function AssignTaskScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showSourcing, setShowSourcing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editing, setEditing] = useState(null); // candidate being edited
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [form, setForm] = useState(EMPTY_CANDIDATE);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [candidateStatuses, setCandidateStatuses] = useState([]);
  const [candidateStages, setCandidateStages] = useState(FALLBACK_STAGES);
  const [interviewRounds, setInterviewRounds] = useState(FALLBACK_ROUNDS);
  const [pipelineRefreshKey, setPipelineRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState('pipeline'); // pipeline | table
  const [listSearch, setListSearch] = useState('');
  const listSearchQ = useDebouncedValue(listSearch);
  const [taskSearch, setTaskSearch] = useState('');
  const taskSearchQ = useDebouncedValue(taskSearch);
  const [duplicateLookup, setDuplicateLookup] = useState({
    loading: false,
    data: null,
    error: null,
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [parsingResume, setParsingResume] = useState(false);
  const [parseWarnings, setParseWarnings] = useState([]);
  const [autoFilled, setAutoFilled] = useState({});
  const [resumeDragOver, setResumeDragOver] = useState(false);
  const duplicateTimerRef = useRef(null);
  const resumeInputRef = useRef(null);

  const bumpPipeline = () => setPipelineRefreshKey((k) => k + 1);

  const handleAdvanceStage = async (candidate, action) => {
    const candidateId = candidate.id;
    if (!candidateId) return;
    const today = todayIso();
    const payload =
      action === 'shortlist'
        ? { stageCode: 'CLIENT_SHORTLIST', clientShortlistDate: toDateInput(candidate.clientShortlistDate) || today }
        : action === 'interview'
          ? { interviewRound: candidate.interviewRound || 'L1' }
          : action === 'hold'
            ? { stageCode: 'HOLD' }
            : action === 'reject'
              ? { stageCode: 'REJECT' }
              : null;
    if (!payload) return;
    try {
      await patch(`${ENDPOINTS.UPDATE_CANDIDATE}/${candidateId}`, payload);
      toast('Stage updated');
      setTasks((prev) => prev.map((t) => {
        if (t.id !== selectedTaskId) return t;
        return {
          ...t,
          candidates: t.candidates.map((c) =>
            c.id === candidateId
              ? {
                ...c,
                candidateStage: payload.stageCode || c.candidateStage,
                interviewRound: payload.interviewRound || c.interviewRound,
                clientShortlistDate: payload.clientShortlistDate || c.clientShortlistDate,
              }
              : c),
        };
      }));
      bumpPipeline();
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || 'Failed to update stage');
    }
  };

  const handleCloneOntoRequirement = async (row) => {
    if (!selectedTask) return;
    const email = String(row.email || '').trim();
    const mobile = String(row.mobile || '').trim();
    const exists = selectedTask.candidates.some((c) => {
      const cEmail = String(c.email || '').trim().toLowerCase();
      const cMobile = String(c.mobile || '').trim();
      return (email && cEmail === email.toLowerCase()) || (mobile && cMobile === mobile);
    });
    if (exists) {
      toast('Already on this requirement');
      return;
    }
    try {
      const res = await post(ENDPOINTS.ADD_CANDIDATE, {
        requirementId: selectedTask.id,
        name: row.name || row.candidateName,
        email,
        mobile,
        source: row.source || null,
        stageCode: 'SUBMITTED_TO_SPOC',
        candidateStatus: 'Pending',
        profileSubmittedDate: todayIso(),
      });
      const created = res?.candidate || res;
      const newCand = {
        id: created?.id,
        candidateId: created?.publicId || created?.id,
        publicId: created?.publicId || created?.id,
        requirementId: selectedTask.id,
        reqId: selectedTask.publicId,
        position: selectedTask.position,
        jobFamily: selectedTask.jobFamily,
        candidateName: created?.name || row.name,
        email: created?.email || email,
        mobile: created?.mobile || mobile,
        source: created?.source || row.source || '',
        candidateStage: created?.stageCode || 'SUBMITTED_TO_SPOC',
        feedbackStatus: created?.candidateStatus || 'Pending',
        loiStatus: created?.loiStatus || 'NOT_RECEIVED',
        profileSubmittedDate: todayIso(),
        clientShortlistDate: '',
        interviewRound: '',
        remarks: '',
        hasResume: Boolean(created?.hasResume),
        resumeFileName: created?.resumeFileName || '',
      };
      setTasks((prev) => prev.map((t) =>
        t.id === selectedTask.id ? { ...t, candidates: [...t.candidates, newCand] } : t
      ));
      bumpPipeline();
      toast(res?.message || 'Added to this requirement');
    } catch (err) {
      toast(err?.response?.data?.message || err?.message || 'Failed to add candidate');
    }
  };

  const appendCandidatesToTask = (createdList) => {
    const list = (Array.isArray(createdList) ? createdList : [createdList]).filter(Boolean);
    if (!selectedTask || !list.length) return;
    const mapped = list.map((created) => ({
      id: created?.id,
      candidateId: created?.publicId || created?.id,
      publicId: created?.publicId || created?.id,
      requirementId: selectedTask.id,
      reqId: selectedTask.publicId,
      position: selectedTask.position,
      jobFamily: selectedTask.jobFamily,
      candidateName: created?.name || created?.candidateName,
      email: created?.email,
      mobile: created?.mobile,
      source: created?.source || '',
      candidateStage: created?.stageCode || 'SUBMITTED_TO_SPOC',
      feedbackStatus: created?.candidateStatus || 'Pending',
      loiStatus: created?.loiStatus || 'NOT_RECEIVED',
      profileSubmittedDate: todayIso(),
      clientShortlistDate: '',
      interviewRound: '',
      remarks: created?.remarks || '',
      hasResume: Boolean(created?.hasResume),
      resumeFileName: created?.resumeFileName || '',
    }));
    setTasks((prev) => prev.map((t) =>
      t.id === selectedTask.id ? { ...t, candidates: [...t.candidates, ...mapped] } : t
    ));
    bumpPipeline();
  };

  const handleSourcingImported = async (payload, meta) => {
    if (meta?.bulk) {
      appendCandidatesToTask(payload);
      const n = Array.isArray(payload) ? payload.length : 0;
      if (n) toast(`Imported ${n} candidate${n === 1 ? '' : 's'}`);
      return;
    }
    const email = String(payload.email || '').trim();
    const mobile = String(payload.mobile || '').trim();
    const exists = selectedTask?.candidates.some((c) => {
      const cEmail = String(c.email || '').trim().toLowerCase();
      const cMobile = String(c.mobile || '').trim();
      return (email && cEmail === email.toLowerCase()) || (mobile && cMobile === mobile);
    });
    if (exists) {
      toast('Already on this requirement');
      throw new Error('Already on this requirement');
    }
    const res = await post(ENDPOINTS.ADD_CANDIDATE, {
      requirementId: selectedTask.id,
      name: payload.name,
      email,
      mobile,
      source: payload.source || 'Paste',
      remarks: payload.remarks || null,
      stageCode: 'SUBMITTED_TO_SPOC',
      candidateStatus: 'Pending',
      profileSubmittedDate: todayIso(),
      position: selectedTask.position,
      jobFamily: selectedTask.jobFamily,
    });
    appendCandidatesToTask(res?.candidate || res);
    toast(res?.message || 'Candidate added');
  };

  const clearDuplicateLookup = useCallback(() => {
    if (duplicateTimerRef.current) {
      clearTimeout(duplicateTimerRef.current);
      duplicateTimerRef.current = null;
    }
    setDuplicateLookup({ loading: false, data: null, error: null });
  }, []);

  const lookupDuplicates = useCallback((email, mobile, excludeId) => {
    const emailVal = String(email || '').trim();
    const mobileVal = String(mobile || '').trim();
    if (!emailVal && !mobileVal) {
      clearDuplicateLookup();
      return;
    }

    if (duplicateTimerRef.current) clearTimeout(duplicateTimerRef.current);
    duplicateTimerRef.current = setTimeout(async () => {
      setDuplicateLookup({ loading: true, data: null, error: null });
      try {
        const params = new URLSearchParams();
        if (emailVal) params.set('email', emailVal);
        if (mobileVal) params.set('mobile', mobileVal);
        if (excludeId) params.set('excludeId', excludeId);
        const res = await get(`${ENDPOINTS.CANDIDATE_DUPLICATES}?${params.toString()}`);
        setDuplicateLookup({ loading: false, data: res, error: null });
      } catch (err) {
        setDuplicateLookup({
          loading: false,
          data: null,
          error: err?.response?.data?.message || err?.message || 'Failed to check duplicates',
        });
      }
    }, 400);
  }, [clearDuplicateLookup]);

  const handleContactBlur = useCallback(() => {
    const excludeId = editing || form.id || undefined;
    lookupDuplicates(form.email, form.mobile, excludeId);
  }, [editing, form.email, form.mobile, form.id, lookupDuplicates]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      get(ENDPOINTS.REQUIREMENTS),
      get(ENDPOINTS.CANDIDATES),
    ])
      .then(([reqRes, candRes]) => {
        if (!active) return;
        const reqList = Array.isArray(reqRes) ? reqRes : reqRes?.items || reqRes?.data || [];
        const candList = Array.isArray(candRes) ? candRes : candRes?.items || candRes?.data || [];
        // Map the requirements API response into the task-card shape used below.
        const mapped = reqList
          .filter((r) => {
            // Admin / TA Lead: all requirements. TA Owner: server already scopes to assigned.
            if (
              user?.userType === 'admin' ||
              user?.userType === 'ta_owner' ||
              user?.userType === 'ta_lead'
            ) {
              return true;
            }
            const currentEmail = user?.email?.toLowerCase?.();
            const ownerEmail = r.salesOwner?.email?.toLowerCase?.();
            return !currentEmail || !ownerEmail || currentEmail === ownerEmail;
          })
          .map((r) => {
            const numberOfPositions = Number(r.numberOfPositions) || 0;
            const closedPositions = Number(r.closedPositions) || 0;
            return {
            id: r.id,
            publicId: r.publicId,
            clientName: r.client?.name || '—',
            position: r.roleSkill || '—',
            taOwner: formatTaOwnerNames(r),
            taOwners: Array.isArray(r.taOwners) ? r.taOwners : [],
            salesOwner: r.salesOwner?.fullName || '—',
            noOfPositions: r.numberOfPositions ?? '—',
            closedPositions,
            isCompleted: numberOfPositions > 0 && closedPositions >= numberOfPositions,
            jobFamily: r.jobFamily?.name || '—',
            minBudget: r.minBudget ?? '—',
            maxBudget: r.maxBudget ?? '—',
            jobLocation: r.jobLocation || '—',
            experience: r.experience || '',
            remarks: r.remarks || '',
            duration: r.durationMonths ?? '—',
            status: r.status || 'ACTIVE',
            taHandoffSlaRag: r.taHandoffSlaRag || 'NONE',
            targetClosureDate: r.targetClosureDate || null,
            isOverdue: isTargetOverdue(r.targetClosureDate),
            // Pull candidates for this requirement from the candidate list API.
            candidates: candList
              .filter((c) => c.requirementId === r.id)
              .map((c) => ({
                id: c.id,
                candidateId: c.publicId || c.id,
                publicId: c.publicId,
                requirementId: r.id,
                reqId: r.publicId || r.id,
                position: c.requirement?.roleSkill || r.roleSkill || '—',
                jobFamily: r.jobFamily?.name || '—',
                candidateName: c.name,
                email: c.email,
                mobile: c.mobile,
                source: c.source,
                candidateStage: c.stageCode,
                feedbackStatus: c.candidateStatus,
                loiStatus: c.loiStatus || 'NOT_RECEIVED',
                profileSubmittedDate: toDateInput(c.profileSubmittedDate),
                clientShortlistDate: toDateInput(c.clientShortlistDate),
                interviewRound: c.interviewRound || '',
                remarks: c.remarks || '',
                hasResume: Boolean(c.hasResume),
                resumeFileName: c.resumeFileName || '',
                resumeMimeType: c.resumeMimeType || '',
                resumeSizeBytes: c.resumeSizeBytes ?? null,
              })),
          };
          })
          .sort(compareTasks);
        setTasks(mapped);
        const reqParam = searchParams.get('req');
        const deep = reqParam && mapped.find((t) => t.id === reqParam || t.publicId === reqParam);
        if (deep) {
          setSelectedTaskId(deep.id);
          setShowDetail(true);
        }
      })
      .catch(() => active && setTasks([]))
      .finally(() => active && setLoading(false));

    get(ENDPOINTS.CANDIDATE_STATUS)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        active && setCandidateStatuses(list);
      })
      .catch(() => active && setCandidateStatuses([]));

    Promise.all([
      get(`${ENDPOINTS.LOOKUPS}/CANDIDATE_STAGE`).catch(() => null),
      get(`${ENDPOINTS.LOOKUPS}/INTERVIEW_ROUND`).catch(() => null),
    ]).then(([stageRes, roundRes]) => {
      if (!active) return;
      const stages = normalizeLookupList(stageRes);
      const rounds = normalizeLookupList(roundRes);
      if (stages.length) setCandidateStages(stages);
      if (rounds.length) setInterviewRounds(rounds);
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const req = searchParams.get('req');
    if (!req || !tasks.length) return;
    const match = tasks.find((t) => t.id === req || t.publicId === req);
    if (match) {
      setSelectedTaskId(match.id);
      setShowDetail(true);
    }
  }, [searchParams, tasks]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;
  const visibleTasks = tasks.filter((t) =>
    matchesQuery(taskSearchQ, t.clientName, t.position, t.publicId, t.id),
  );
  const tasksBySection = useMemo(() => {
    const groups = Object.fromEntries(TASK_SECTIONS.map(({ status }) => [status, []]));
    visibleTasks.forEach((t) => {
      const status = t.status || 'ACTIVE';
      if (groups[status]) groups[status].push(t);
      else groups.ACTIVE.push(t);
    });
    TASK_SECTIONS.forEach(({ status }) => {
      groups[status].sort((a, b) => taskUrgency(a) - taskUrgency(b));
    });
    return groups;
  }, [visibleTasks]);
  const displayedCandidates = (selectedTask?.candidates || []).filter((c) =>
    matchesQuery(
      listSearchQ,
      c.candidateName,
      c.email,
      c.mobile,
      c.candidateId,
      c.reqId,
      c.publicId,
    ),
  );
  const recruitingBlocked =
    selectedTask?.status === 'ON_HOLD'
    || selectedTask?.status === 'CANCELLED'
    || selectedTask?.status === 'CLOSED';

  const openAdd = (task) => {
    if (
      task?.status === 'ON_HOLD'
      || task?.status === 'CANCELLED'
      || task?.status === 'CLOSED'
    ) {
      setError(
        task.status === 'ON_HOLD'
          ? 'Requirement is on hold; recruiting is paused until it is resumed'
          : `Cannot add candidates to a ${task.status} requirement`,
      );
      return;
    }
    clearDuplicateLookup();
    setEditing(null);
    setResumeFile(null);
    setParsingResume(false);
    setParseWarnings([]);
    setAutoFilled({});
    setForm({
      ...EMPTY_CANDIDATE,
      requirementId: task.id,
      reqId: task.publicId || task.id,
      position: task.position,
      jobFamily: task.jobFamily,
      candidateStage: 'SUBMITTED_TO_SPOC',
      profileSubmittedDate: new Date().toISOString().slice(0, 10),
    });
    setError(null); setSuccess(null); setShowForm(true);
  };

  const openEdit = (cand) => {
    clearDuplicateLookup();
    setEditing(cand.id);
    setResumeFile(null);
    setParsingResume(false);
    setParseWarnings([]);
    setAutoFilled({});
    setForm({ ...EMPTY_CANDIDATE, ...cand, id: cand.id, requirementId: cand.requirementId || cand.reqId });
    setError(null); setSuccess(null); setShowForm(true);
    lookupDuplicates(cand.email, cand.mobile, cand.id);
  };

  const openEditFromPipeline = (cand) => {
    openEdit({
      id: cand.id,
      candidateId: cand.publicId || cand.id,
      publicId: cand.publicId,
      requirementId: cand.requirementId || selectedTaskId,
      reqId: selectedTask?.publicId || selectedTaskId,
      position: cand.position || selectedTask?.position || '',
      jobFamily: cand.jobFamily || selectedTask?.jobFamily || '',
      candidateName: cand.name || cand.candidateName || '',
      email: cand.email || '',
      mobile: cand.mobile || '',
      source: cand.source || '',
      candidateStage: cand.stageCode || cand.candidateStage || 'SUBMITTED_TO_SPOC',
      feedbackStatus: cand.candidateStatus || cand.feedbackStatus || 'Pending',
      loiStatus: cand.loiStatus || 'NOT_RECEIVED',
      profileSubmittedDate: toDateInput(cand.profileSubmittedDate),
      clientShortlistDate: toDateInput(cand.clientShortlistDate),
      interviewRound: cand.interviewRound || '',
      remarks: cand.remarks || '',
      hasResume: Boolean(cand.hasResume),
      resumeFileName: cand.resumeFileName || '',
      resumeMimeType: cand.resumeMimeType || '',
      resumeSizeBytes: cand.resumeSizeBytes ?? null,
    });
  };

  const handleSelectFromPipeline = async (cand, selected = true) => {
    if (recruitingBlocked) {
      setError(
        selectedTask?.status === 'ON_HOLD'
          ? 'Requirement is on hold; recruiting is paused until it is resumed'
          : `Cannot select candidates on a ${selectedTask?.status || 'unavailable'} requirement`,
      );
      return;
    }
    try {
      setError(null);
      await post(`${ENDPOINTS.CANDIDATES}/${cand.id}/select`, { selected });
      const msg = selected ? 'Candidate selected' : 'Candidate unselected';
      setSuccess(msg);
      toast(msg);
      bumpPipeline();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to select candidate');
    }
  };

  const closeForm = () => {
    clearDuplicateLookup();
    setShowForm(false);
    setEditing(null);
    setResumeFile(null);
    setParsingResume(false);
    setParseWarnings([]);
    setAutoFilled({});
    setForm(EMPTY_CANDIDATE);
  };
  const openCandidateDetails = (candidate) => setViewingCandidate(candidate);
  const closeCandidateDetails = () => setViewingCandidate(null);
  const closeDetail = () => {
    setShowDetail(false);
    closeForm();
    closeCandidateDetails();
  };
  const openTaskDetail = (task) => {
    setSelectedTaskId(task.id);
    setShowDetail(true);
  };
  const openTaskSourcing = (task) => {
    setSelectedTaskId(task.id);
    setShowSourcing(true);
  };
  useEscapeKey(Boolean(viewingCandidate), closeCandidateDetails);
  useEscapeKey(Boolean(showForm) && !viewingCandidate, () => {
    if (!parsingResume) closeForm();
  });
  useEscapeKey(Boolean(showSourcing) && !viewingCandidate && !showForm, () => setShowSourcing(false));
  useEscapeKey(
    Boolean(showDetail) && !showForm && !viewingCandidate && !showSourcing,
    closeDetail,
  );

  const update = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'feedbackStatus') {
        const selected = String(value).trim().toLowerCase() === 'selected';
        if (selected && !f.loiStatus) next.loiStatus = 'NOT_RECEIVED';
        if (!selected) next.loiStatus = 'NOT_RECEIVED';
      }
      return next;
    });
    setAutoFilled((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  };

  const isSelectedStatus =
    String(form.feedbackStatus || '').trim().toLowerCase() === 'selected';

  const formFields = CANDIDATE_FIELDS.filter((f) => {
    if (!editing && f.hideOnAdd) return false;
    if (f.onlyWhenSelected && !isSelectedStatus) return false;
    return true;
  });

  const resolveSelectOptions = (f) => {
    if (f.optionsKey === 'candidateStatuses') {
      return candidateStatuses.map((opt) => ({ value: opt, label: opt }));
    }
    if (f.optionsKey === 'candidateStages') {
      return candidateStages.map((s) => ({ value: s.code, label: s.label }));
    }
    if (f.optionsKey === 'interviewRounds') {
      return interviewRounds.map((r) => ({ value: r.code, label: r.label }));
    }
    if (f.optionsKey === 'loiStatuses') {
      return LOI_OPTIONS;
    }
    return [];
  };

  const renderFormField = (f) => {
    const options = resolveSelectOptions(f);
    const current = form[f.key] ?? '';
    const needsCurrent =
      f.type === 'select' &&
      current &&
      !options.some((o) => o.value === current || o.value === String(current).toUpperCase());
    const renderedOptions = needsCurrent
      ? [{ value: current, label: current }, ...options]
      : options;
    const isTextarea = f.type === 'textarea';
    const inputType = f.type === 'textarea' || f.type === 'select' ? 'text' : f.type;
    const filled = Boolean(autoFilled[f.key]);
    return (
      <label key={f.key} className={`cand-field${isTextarea ? ' full' : ''}${filled ? ' cand-field--autofill' : ''}`}>
        <span>
          {f.label}
          {f.required && <em className="req">*</em>}
          {!f.required && <em className="optional">Optional</em>}
          {filled && <em className="cand-field-badge">From resume</em>}
        </span>
        {f.type === 'select' ? (
          <select
            name={f.key}
            value={form[f.key] ?? ''}
            disabled={f.locked || parsingResume}
            onChange={(e) => update(f.key, e.target.value)}
          >
            <option value="">Select…</option>
            {renderedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : isTextarea ? (
          <textarea
            name={f.key}
            rows={3}
            value={form[f.key]}
            placeholder={f.placeholder}
            disabled={f.locked || parsingResume}
            onChange={(e) => update(f.key, e.target.value)}
          />
        ) : (
          <input
            name={f.key}
            type={inputType}
            value={form[f.key]}
            placeholder={f.placeholder}
            autoComplete={f.key === 'email' ? 'email' : f.key === 'mobile' ? 'tel' : f.key === 'candidateName' ? 'name' : 'off'}
            inputMode={f.key === 'mobile' ? 'tel' : undefined}
            autoFocus={f.key === 'candidateName' && !editing}
            disabled={f.locked || parsingResume}
            onChange={(e) => update(f.key, e.target.value)}
            onBlur={f.key === 'email' || f.key === 'mobile' ? handleContactBlur : undefined}
          />
        )}
      </label>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const missing = formFields.filter((f) => f.required && !String(form[f.key]).trim());
    if (missing.length) {
      setError(`Please fill: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    // Shared fields for POST /api/v1/candidates and PATCH /api/v1/candidates/{id}.
    // Empty optional dates/strings become null so the API can clear or skip them.
    const sharedPayload = {
      name: form.candidateName,
      mobile: form.mobile,
      email: form.email,
      source: form.source || null,
      position: form.position || null,
      jobFamily: form.jobFamily || null,
      stageCode: form.candidateStage || 'SUBMITTED_TO_SPOC',
      candidateStatus: form.feedbackStatus,
      ...(String(form.feedbackStatus || '').trim().toLowerCase() === 'selected'
        ? { loiStatus: form.loiStatus || 'NOT_RECEIVED' }
        : {}),
      profileSubmittedDate: form.profileSubmittedDate || null,
      clientShortlistDate: form.clientShortlistDate || null,
      interviewRound: form.interviewRound || null,
      remarks: form.remarks || null,
    };
    try {
      let res;
      let candidateId;
      if (editing) {
        candidateId = editing || form.id;
        // UpdateCandidateDto does not accept requirementId (forbidNonWhitelisted).
        res = await patch(`${ENDPOINTS.UPDATE_CANDIDATE}/${candidateId}`, sharedPayload);
        setSuccess(res.message || 'Candidate updated');
        toast(res.message || 'Candidate updated');
        const resumeMeta = resumeFile
          ? (await uploadResume(candidateId, resumeFile))?.candidate
          : null;
        setTasks((prev) => prev.map((t) => {
          if (t.id !== form.requirementId) return t;
          return {
            ...t,
            candidates: t.candidates.map((c) =>
              c.id === candidateId ? {
                ...c,
                ...{
                  position: form.position,
                  jobFamily: form.jobFamily,
                  candidateName: form.candidateName,
                  email: form.email,
                  mobile: form.mobile,
                  source: form.source,
                  candidateStage: form.candidateStage,
                  feedbackStatus: form.feedbackStatus,
                  loiStatus: form.loiStatus || 'NOT_RECEIVED',
                  profileSubmittedDate: form.profileSubmittedDate,
                  clientShortlistDate: form.clientShortlistDate,
                  interviewRound: form.interviewRound,
                  remarks: form.remarks,
                  hasResume: resumeMeta?.hasResume ?? c.hasResume,
                  resumeFileName: resumeMeta?.resumeFileName ?? c.resumeFileName,
                  resumeMimeType: resumeMeta?.resumeMimeType ?? c.resumeMimeType,
                  resumeSizeBytes: resumeMeta?.resumeSizeBytes ?? c.resumeSizeBytes,
                },
              } : c
            ),
          };
        }));
      } else {
        res = await post(ENDPOINTS.ADD_CANDIDATE, {
          ...sharedPayload,
          requirementId: form.requirementId || form.reqId,
        });
        candidateId = res?.candidate?.id || res?.id;
        let resumeInfo = {};
        if (resumeFile && candidateId) {
          const uploadRes = await uploadResume(candidateId, resumeFile);
          resumeInfo = uploadRes?.candidate || uploadRes || {};
        }
        setSuccess(res.message || 'Candidate added');
        toast(res.message || 'Candidate added');
        // Add the new candidate to the local task so it shows in the table.
        const newCand = {
          id: candidateId || form.id || form.candidateId,
          candidateId: res?.candidate?.publicId || res?.candidate?.id || form.candidateId,
          publicId: res?.candidate?.publicId || res?.candidate?.id || form.candidateId,
          requirementId: form.requirementId,
          reqId: form.reqId,
          position: form.position,
          jobFamily: form.jobFamily,
          candidateName: form.candidateName,
          email: form.email,
          mobile: form.mobile,
          source: form.source,
          candidateStage: form.candidateStage,
          feedbackStatus: form.feedbackStatus,
          loiStatus: res?.candidate?.loiStatus || form.loiStatus || 'NOT_RECEIVED',
          profileSubmittedDate: form.profileSubmittedDate,
          clientShortlistDate: form.clientShortlistDate,
          interviewRound: form.interviewRound,
          remarks: form.remarks,
          hasResume: Boolean(resumeInfo.hasResume),
          resumeFileName: resumeInfo.resumeFileName || '',
          resumeMimeType: resumeInfo.resumeMimeType || '',
          resumeSizeBytes: resumeInfo.resumeSizeBytes ?? null,
        };
        setTasks((prev) => prev.map((t) =>
          t.id === form.requirementId ? { ...t, candidates: [...t.candidates, newCand] } : t
        ));
      }
      closeForm();
      bumpPipeline();
    } catch (err) {
      setError(err?.message || 'Failed to save. Please try again.');
    }
  };

  const applyResumeFile = async (file) => {
    setResumeFile(file);
    setParseWarnings([]);
    setAutoFilled({});
    if (!file) return;
    setError(null);
    setSuccess(null);

    if (editing) return;

    setParsingResume(true);
    try {
      const parsed = await parseResume(file);
      const nextName = parsed?.name || '';
      const nextEmail = parsed?.email || '';
      const nextMobile = parsed?.mobile || '';
      const nextRemarks = parsed?.remarks || '';
      setForm((f) => ({
        ...f,
        candidateName: nextName || f.candidateName,
        email: nextEmail || f.email,
        mobile: nextMobile || f.mobile,
        remarks: nextRemarks || f.remarks,
      }));
      setAutoFilled({
        candidateName: Boolean(nextName),
        email: Boolean(nextEmail),
        mobile: Boolean(nextMobile),
        remarks: Boolean(nextRemarks),
      });
      const warnings = Array.isArray(parsed?.warnings) ? parsed.warnings : [];
      setParseWarnings(warnings);
      if (nextEmail || nextMobile) {
        lookupDuplicates(nextEmail, nextMobile);
      }
      if (!nextName && !nextEmail && !nextMobile) {
        setError('Could not extract contact details from the resume. Please fill the fields manually.');
      } else {
        setSuccess('Resume parsed — verify the highlighted fields, then save.');
        toast('Resume parsed — verify the fields below, then save.');
      }
    } catch (err) {
      setError(
        err?.message
          || 'Failed to parse resume. You can still fill fields manually and save with this file.',
      );
    } finally {
      setParsingResume(false);
    }
  };

  const handleResumeChange = (e) => {
    applyResumeFile(e.target.files?.[0] || null);
  };

  const handleResumeDrop = (e) => {
    e.preventDefault();
    setResumeDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyResumeFile(file);
  };

  const clearResumeSelection = () => {
    setResumeFile(null);
    setParseWarnings([]);
    setAutoFilled({});
    setParsingResume(false);
    if (resumeInputRef.current) resumeInputRef.current.value = '';
  };

  const resumeField = (
    <div className="cand-resume-block">
      <input
        ref={resumeInputRef}
        className="cand-resume-input"
        type="file"
        accept={RESUME_ACCEPT}
        onChange={handleResumeChange}
        disabled={parsingResume}
      />
      <button
        type="button"
        className={`cand-resume-drop${resumeDragOver ? ' is-drag' : ''}${parsingResume ? ' is-busy' : ''}${resumeFile ? ' has-file' : ''}`}
        disabled={parsingResume}
        onClick={() => resumeInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setResumeDragOver(true);
        }}
        onDragLeave={() => setResumeDragOver(false)}
        onDrop={handleResumeDrop}
      >
        <IconFilePlus />
        <strong>
          {parsingResume
            ? 'Reading resume…'
            : resumeFile
              ? resumeFile.name
              : editing && form.hasResume
                ? (form.resumeFileName || 'Resume on file — upload to replace')
                : 'Drop resume here, or click to upload'}
        </strong>
        <span>
          {editing
            ? 'PDF or DOCX, up to 5 MB. Optional when editing.'
            : 'PDF or DOCX, up to 5 MB. We’ll try to fill name, email, and mobile.'}
        </span>
      </button>
      {(resumeFile || parseWarnings.length > 0) && (
        <div className="resume-file-meta">
          {resumeFile && !parsingResume && (
            <button type="button" className="filter-clear" onClick={clearResumeSelection}>
              Remove file
            </button>
          )}
          {parseWarnings.length > 0 && (
            <div className="resume-parse-warnings">
              {parseWarnings.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (loading) return <ScreenSkeleton cards={0} rows={8} />;

  const renderTaskCard = (t) => {
    const openCount =
      Number(t.noOfPositions) > 0
        ? Math.max(Number(t.noOfPositions) - Number(t.closedPositions || 0), 0)
        : '—';
    return (
      <div
        key={t.id}
        className={`task-card${t.isCompleted ? ' task-card--completed' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => openTaskDetail(t)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openTaskDetail(t);
          }
        }}
      >
        <div className="task-card-top">
          <span className="task-client">{t.clientName}</span>
          <span className="task-count" title={`${t.candidates.length} candidates`}>
            {t.candidates.length}
          </span>
        </div>
        <div className="task-pos">{t.position}</div>
        <div className="task-card-foot">
          <span className="task-card-id">{t.publicId || t.id}</span>
          <span className={`yr-status ${(t.status || 'ACTIVE').toLowerCase()}`}>{t.status || 'ACTIVE'}</span>
          {t.taHandoffSlaRag && t.taHandoffSlaRag !== 'NONE' && (
            <span className={`yr-rag yr-rag--${String(t.taHandoffSlaRag).toLowerCase()}`}>{t.taHandoffSlaRag}</span>
          )}
          {t.isOverdue && <span className="task-overdue">Overdue</span>}
          <span className="task-card-quiet">
            Filled {t.closedPositions ?? 0}/{t.noOfPositions ?? '—'} · Open {openCount}
          </span>
        </div>
        <div
          className="task-card-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="cand-edit"
            onClick={() => openTaskSourcing(t)}
          >
            Source
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`assign-task${showForm ? ' cand-form-open' : ''}`}>
      <div className="assign-head">
        <span className="assign-badge"><IconClipboardCheck /></span>
        <div>
          <h2 className="assign-title">Assign Task</h2>
          <p className="assign-sub">Click a card to manage the pipeline. Source candidates from the card.</p>
        </div>
        {tasks.length > 0 && <span className="yr-count">{visibleTasks.length}</span>}
      </div>

      <div className="assign-body">
        <div className="task-list">
          {tasks.length > 0 && (
            <label className="at-task-search">
              <input
                type="search"
                value={taskSearch}
                aria-label="Search tasks"
                placeholder="Search client, role, req ID…"
                onChange={(e) => setTaskSearch(e.target.value)}
              />
            </label>
          )}
          {tasks.length === 0 && (
            <EmptyState
              icon={IconClipboardCheck}
              title="No tasks yet"
              description="Requirements assigned to you will appear here."
            />
          )}
          {tasks.length > 0 && visibleTasks.length === 0 && (
            <EmptyState
              icon={IconClipboardCheck}
              title="No matching tasks"
              description="Try a different search."
            />
          )}
          {visibleTasks.length > 0 && (
            <div className="task-list-sections">
              {TASK_SECTIONS.map(({ status, label }) => {
                const sectionTasks = tasksBySection[status] || [];
                if (!sectionTasks.length) return null;
                return (
                  <section key={status} className="at-task-section" aria-label={label}>
                    <div className="at-task-section-head">
                      <h3 className="at-task-section-title">{label}</h3>
                      <span className={`yr-status ${status.toLowerCase()}`}>{sectionTasks.length}</span>
                    </div>
                    <div className="task-list-scroll">
                      {sectionTasks.map(renderTaskCard)}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showDetail && selectedTask && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!showForm && !viewingCandidate) closeDetail();
          }}
        >
          <div className="modal-card detail-modal pipeline-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="pipeline-modal-heading">
                <h3>
                  {selectedTask.clientName} — {selectedTask.position}
                  <span className="kpi-modal-count">{selectedTask.publicId || selectedTask.id}</span>
                  <span className={`yr-status ${(selectedTask.status || 'ACTIVE').toLowerCase()}`}>
                    {selectedTask.status || 'ACTIVE'}
                  </span>
                </h3>
                <p className="pipeline-modal-sub">
                  Filled {selectedTask.closedPositions ?? 0}/{selectedTask.noOfPositions ?? '—'}
                  {' · '}
                  Open {
                    Number(selectedTask.noOfPositions) > 0
                      ? Math.max(Number(selectedTask.noOfPositions) - Number(selectedTask.closedPositions || 0), 0)
                      : '—'
                  }
                </p>
              </div>
              <div className="inline-actions">
                <div className="at-view-toggle" role="tablist" aria-label="View mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'pipeline'}
                    className={viewMode === 'pipeline' ? 'active' : ''}
                    onClick={() => setViewMode('pipeline')}
                  >
                    Pipeline
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'table'}
                    className={viewMode === 'table' ? 'active' : ''}
                    onClick={() => setViewMode('table')}
                  >
                    Table
                  </button>
                </div>
                {!recruitingBlocked && (
                  <button className="add-cand-btn" onClick={() => openAdd(selectedTask)}>
                    <IconPlus /> Add Candidate
                  </button>
                )}
              </div>
              <button type="button" className="modal-close" onClick={closeDetail} title="Close">
                <IconX />
              </button>
            </div>
            <div className="modal-body">
              <section className="task-detail">
              <div className="task-detail-body">
              {recruitingBlocked && (
                <div className="pipeline-recruiting-paused">
                  {selectedTask.status === 'ON_HOLD'
                    ? 'Requirement is on hold — Add Candidate and Select are disabled until resumed.'
                    : `Requirement is ${selectedTask.status} — recruiting actions are disabled.`}
                </div>
              )}

              {error && <div className="add-error">{Array.isArray(error) ? error.join(', ') : error}</div>}
              {success && <div className="add-success">{success}</div>}

              {viewMode === 'pipeline' ? (
                <RequirementPipelineBoard
                  requirementId={selectedTask.id}
                  mode="edit"
                  refreshKey={pipelineRefreshKey}
                  requirement={{
                    id: selectedTask.id,
                    publicId: selectedTask.publicId,
                    roleSkill: selectedTask.position,
                    status: selectedTask.status,
                    client: { name: selectedTask.clientName },
                    taOwner: { fullName: selectedTask.taOwner },
                    taOwners: selectedTask.taOwners,
                    salesOwner: { fullName: selectedTask.salesOwner },
                    numberOfPositions: selectedTask.noOfPositions,
                    openPositions: undefined,
                    closedPositions: selectedTask.closedPositions,
                  }}
                  onAddCandidate={() => openAdd(selectedTask)}
                  onEditCandidate={openEditFromPipeline}
                  onSelectCandidate={handleSelectFromPipeline}
                  onAdvanceStage={handleAdvanceStage}
                  onViewCandidate={(c) => openCandidateDetails({
                    ...c,
                    candidateId: c.publicId || c.id,
                    candidateName: c.name,
                    candidateStage: c.stageCode,
                    feedbackStatus: c.candidateStatus,
                    loiStatus: c.loiStatus || 'NOT_RECEIVED',
                    reqId: selectedTask.publicId,
                    position: selectedTask.position,
                    jobFamily: selectedTask.jobFamily,
                    profileSubmittedDate: toDateInput(c.profileSubmittedDate),
                    clientShortlistDate: toDateInput(c.clientShortlistDate),
                  })}
                />
              ) : (
              <>
              <TableSearch
                value={listSearch}
                onChange={setListSearch}
                placeholder="Search candidates…"
              />
              {selectedTask.candidates.length === 0 ? (
                <EmptyState
                  icon={IconPlus}
                  title="No candidates yet"
                  description='Click "Add Candidate" to add the first profile.'
                />
              ) : displayedCandidates.length === 0 ? (
                <EmptyState
                  icon={IconClipboardCheck}
                  title="No matching candidates"
                  description="Try a different search."
                />
              ) : (
              <div className="cand-table-wrap">
                <table className="cand-table">
                  <thead>
                    <tr>
                      {CANDIDATE_FIELDS.map((f) => (
                        <th key={f.key}>{f.label}</th>
                      ))}
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCandidates.map((c) => (
                      <tr key={c.candidateId} onClick={() => openCandidateDetails(c)}>
                        {CANDIDATE_FIELDS.map((f) => {
                          let display = c[f.key] || '—';
                          if (f.key === 'candidateStage' && c[f.key]) {
                            display = stageLabel(c[f.key], candidateStages);
                          } else if (f.key === 'interviewRound' && c[f.key]) {
                            display = roundLabel(c[f.key], interviewRounds);
                          } else if (f.key === 'loiStatus') {
                            const selected =
                              String(c.feedbackStatus || '').trim().toLowerCase() === 'selected';
                            if (!selected) {
                              display = '—';
                            } else {
                              display =
                                LOI_OPTIONS.find((o) => o.value === c.loiStatus)?.label ||
                                c.loiStatus ||
                                'Not Received';
                            }
                          }
                          if (f.key === 'candidateStage' && c[f.key]) {
                            return (
                              <td key={f.key}>
                                <span className="at-pill at-stage">{display}</span>
                              </td>
                            );
                          }
                          if (f.key === 'feedbackStatus' && c[f.key]) {
                            return (
                              <td key={f.key}>
                                <span className={`at-pill at-status ${(c.feedbackStatus || '').toLowerCase()}`}>{display}</span>
                              </td>
                            );
                          }
                          return (
                            <td key={f.key}>{display}</td>
                          );
                        })}
                        <td>
                          {!recruitingBlocked && (
                            <button className="cand-edit" onClick={(e) => { e.stopPropagation(); openEdit(c); }} title="Edit">
                              <IconEdit /> Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
              </>
              )}
              </div>

              {viewingCandidate && (
                <div className="modal-overlay" onClick={closeCandidateDetails}>
                  <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-head">
                      <h3>Candidate — {viewingCandidate.candidateId || viewingCandidate.publicId || viewingCandidate.candidateName || '—'}</h3>
                      <button className="modal-close" onClick={closeCandidateDetails} title="Close">×</button>
                    </div>
                    <div className="modal-body">
                      <div className="detail-grid detail-grid-2">
                        <div className="detail-item"><span className="detail-label">Candidate ID</span><span className="detail-value">{viewingCandidate.candidateId || viewingCandidate.publicId || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Req ID</span><span className="detail-value">{viewingCandidate.reqId || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Position</span><span className="detail-value">{viewingCandidate.position || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Job Family</span><span className="detail-value">{viewingCandidate.jobFamily || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Name</span><span className="detail-value">{viewingCandidate.candidateName || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{viewingCandidate.email || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Mobile</span><span className="detail-value">{viewingCandidate.mobile || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Source</span><span className="detail-value">{viewingCandidate.source || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Stage</span><span className="detail-value">{stageLabel(viewingCandidate.candidateStage, candidateStages) || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value">{viewingCandidate.feedbackStatus || '—'}</span></div>
                        <div className="detail-item"><span className="detail-label">LOI</span><span className="detail-value">{
                          String(viewingCandidate.feedbackStatus || '').trim().toLowerCase() === 'selected'
                            ? (LOI_OPTIONS.find((o) => o.value === viewingCandidate.loiStatus)?.label || viewingCandidate.loiStatus || 'Not Received')
                            : '—'
                        }</span></div>
                        <div className="detail-item"><span className="detail-label">Profile Submitted</span><span className="detail-value">{formatDate(viewingCandidate.profileSubmittedDate, '—')}</span></div>
                        <div className="detail-item"><span className="detail-label">Client Shortlist</span><span className="detail-value">{formatDate(viewingCandidate.clientShortlistDate, '—')}</span></div>
                        <div className="detail-item"><span className="detail-label">Interview</span><span className="detail-value">{roundLabel(viewingCandidate.interviewRound, interviewRounds) || '—'}</span></div>
                      </div>
                      <div className="detail-description mt-sm">{viewingCandidate.remarks || 'No remarks.'}</div>
                      <CandidateResumeSection
                        candidateId={viewingCandidate.id || viewingCandidate.candidateId}
                        initialHasResume={viewingCandidate.hasResume}
                        initialFileName={viewingCandidate.resumeFileName}
                      />
                    </div>
                    <div className="modal-foot">
                      <button type="button" className="filter-clear" onClick={closeCandidateDetails}>Close</button>
                    </div>
                  </div>
                </div>
              )}
              </section>
            </div>
          </div>
        </div>
      )}

      {showSourcing && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowSourcing(false)}>
          <div className="modal-card detail-modal sourcing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="pipeline-modal-heading">
                <h3>
                  Source candidates
                  <span className="kpi-modal-count">{selectedTask.publicId || selectedTask.id}</span>
                </h3>
                <p className="pipeline-modal-sub">
                  {selectedTask.clientName} — {selectedTask.position}
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowSourcing(false)} title="Close">
                <IconX />
              </button>
            </div>
            <div className="modal-body">
              <SourcingPanel
                requirement={selectedTask}
                recruitingBlocked={recruitingBlocked}
                currentCandidates={selectedTask.candidates || []}
                onClone={handleCloneOntoRequirement}
                onImported={handleSourcingImported}
              />
            </div>
            <div className="modal-foot">
              <button type="button" className="filter-clear" onClick={() => setShowSourcing(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="modal-overlay cand-form-overlay"
          onClick={() => { if (!parsingResume) closeForm(); }}
        >
          <form
            className="modal-card cand-form cand-form-modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cand-form-title"
          >
            <div className="cand-form-head">
              <div className="cand-form-heading">
                <h4 id="cand-form-title" className="cand-form-title">
                  {editing ? 'Edit candidate' : 'Add candidate'}
                </h4>
                <p className="cand-form-sub">
                  {selectedTask?.clientName || 'Requirement'}
                  {form.position ? ` · ${form.position}` : ''}
                  {form.reqId ? ` · ${form.reqId}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => { if (!parsingResume) closeForm(); }}
                title="Close"
                disabled={parsingResume}
              >
                <IconX />
              </button>
            </div>
            <div className="cand-form-body">
              <div className="cand-form-context" aria-label="Requirement context">
                <div className="cand-form-chip">
                  <span className="cand-form-chip-label">Req ID</span>
                  <span className="cand-form-chip-value">{form.reqId || '—'}</span>
                </div>
                <div className="cand-form-chip">
                  <span className="cand-form-chip-label">Position</span>
                  <span className="cand-form-chip-value">{form.position || '—'}</span>
                </div>
                <div className="cand-form-chip">
                  <span className="cand-form-chip-label">Job family</span>
                  <span className="cand-form-chip-value">{form.jobFamily || '—'}</span>
                </div>
                {editing && (form.candidateId || form.publicId) && (
                  <div className="cand-form-chip">
                    <span className="cand-form-chip-label">Candidate ID</span>
                    <span className="cand-form-chip-value">{form.candidateId || form.publicId}</span>
                  </div>
                )}
              </div>
              {resumeField}
              {FORM_SECTIONS.map((section) => {
                const sectionFields = formFields.filter((f) => section.keys.includes(f.key) && !f.locked);
                if (sectionFields.length === 0) return null;
                return (
                  <fieldset key={section.id} className="cand-form-section">
                    <legend>{section.title}</legend>
                    {section.hint && <p className="cand-form-section-hint">{section.hint}</p>}
                    <div className="cand-form-grid">
                      {sectionFields.map((f) => renderFormField(f))}
                    </div>
                  </fieldset>
                );
              })}
              <DuplicateCandidatePanel
                loading={duplicateLookup.loading}
                error={duplicateLookup.error}
                data={duplicateLookup.data}
                currentRequirementId={selectedTask?.id}
                currentCandidates={selectedTask?.candidates || []}
                onClone={handleCloneOntoRequirement}
              />
              {error && <div className="add-error">{error}</div>}
              {success && <div className="add-success">{success}</div>}
            </div>
            <div className="cand-form-foot">
              <p className="cand-form-foot-hint">Required fields are marked *</p>
              <div className="cand-form-foot-actions">
                <button type="button" className="add-reset" onClick={closeForm} disabled={parsingResume}>
                  Cancel
                </button>
                <button type="submit" className="add-submit" disabled={parsingResume}>
                  {parsingResume ? 'Reading resume…' : editing ? 'Save changes' : 'Save candidate'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
