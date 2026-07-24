import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, ENDPOINTS } from '../config/api';

// ---------------------------------------------------------------------------
//  Axios instance. Token is injected automatically from localStorage.
// ---------------------------------------------------------------------------
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Log every outgoing request (skip the silent refresh retry noise).
  if (!config._retry) {
    console.log(
      `%c[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`,
      'color:#2563eb;font-weight:bold',
      config.data ?? ''
    );
  }
  return config;
});

// ---------------------------------------------------------------------------
//  Auto-refresh on 401. When the access token expires, we call /auth/refresh
//  with the stored refresh token, update storage, and retry the original
//  request once. Avoids bouncing the user to login on every expiry.
// ---------------------------------------------------------------------------
let isRefreshing = false;
let pendingQueue = [];

function flushQueue(error) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  pendingQueue = [];
}

client.interceptors.response.use(
  (response) => {
    // Log every successful response.
    console.log(
      `%c[API RESPONSE] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
      'color:#16a34a;font-weight:bold',
      response.data
    );
    return response;
  },
  async (error) => {
    const original = error.config;
    // Only attempt refresh once per request and only on 401.
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Another refresh is in flight — wait for it, then retry.
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then(() => {
            original._retry = true;
            const token = localStorage.getItem('auth_token');
            if (token) original.headers.Authorization = `Bearer ${token}`;
            return client(original);
          })
          .catch(() => Promise.reject(error));
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('auth_refresh_token');
      try {
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await client.post(
          ENDPOINTS.REFRESH,
          { refreshToken }
        );
        localStorage.setItem('auth_token', data.accessToken);
        localStorage.setItem('auth_refresh_token', data.refreshToken);
        flushQueue(null);
        const token = localStorage.getItem('auth_token');
        if (token) original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      } catch (refreshErr) {
        flushQueue(refreshErr);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_email');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    // Log non-401 errors (4xx/5xx that aren't auto-refreshed).
    console.log(
      `%c[API ERROR] ${error.response?.status || ''} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      'color:#dc2626;font-weight:bold',
      error.response?.data ?? error.message
    );
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
//  Generic helpers. Every screen calls these so swapping to the real backend
//  is a single-file change (see config/api.js).
// ---------------------------------------------------------------------------

// Endpoints that are wired to the real backend. Everything else falls back to
// the static mock layer so every screen still shows full data.
const LIVE_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/refresh',
  '/api/v1/auth/me',
  '/api/v1/dashboard',
  '/api/v1/requirements',
  '/api/v1/master-data/job-families',
  '/api/v1/master-data/clients',
  '/api/v1/master-data/sales-members',
  '/api/v1/master-data/ta-members',
  '/api/v1/master-data/candidate-status',
  '/api/v1/master-data/lookups',
  '/api/v1/candidates',
  '/api/v1/users',
  '/api/v1/requirements',
  '/api/v1/offers',
  '/api/v1/onboardings',
];

function isLiveEndpoint(endpoint) {
  return LIVE_ENDPOINTS.some((e) => endpoint.includes(e));
}

export async function post(endpoint, body) {
  if (!isLiveEndpoint(endpoint)) return mockRequest(endpoint, body);
  // Live writes must surface real errors (no mock fallback on 4xx/5xx).
  const { data } = await client.post(endpoint, body);
  return data;
}

export async function put(endpoint, body) {
  if (!isLiveEndpoint(endpoint)) return mockRequest(endpoint, body);
  const { data } = await client.put(endpoint, body);
  return data;
}

export async function patch(endpoint, body) {
  if (!isLiveEndpoint(endpoint)) return mockRequest(endpoint, body);
  const { data } = await client.patch(endpoint, body);
  return data;
}

export async function get(endpoint) {
  if (!isLiveEndpoint(endpoint)) return mockRequest(endpoint);
  try {
    const { data } = await client.get(endpoint);
    // Empty arrays are valid (e.g. no sales/TA users yet). Do NOT fall back to
    // mock data — mock ids are not real UUIDs and break create/update calls.
    if (data == null) {
      console.warn(`[API FALLBACK] GET ${endpoint} returned null, using dummy data`);
      return mockRequest(endpoint);
    }
    return data;
  } catch (err) {
    // Live master-data / writes must surface real errors — mock ids cause 400s.
    if (isAuthEndpoint(endpoint) || isLiveEndpoint(endpoint)) throw err;
    console.warn(`[API FALLBACK] GET ${endpoint} failed, using dummy data`, err?.message);
    return mockRequest(endpoint);
  }
}

// Auth endpoints must always hit the real backend — never fall back to dummy.
function isAuthEndpoint(endpoint) {
  return ['/auth/login', '/auth/logout', '/auth/refresh', '/auth/me'].some((e) =>
    endpoint.includes(e)
  );
}

// ---------------------------------------------------------------------------
//  MOCK LAYER
//  Simulates network latency + returns realistic data so the UI is fully
//  functional before the backend exists. Remove when USE_MOCK = false.
// ---------------------------------------------------------------------------
function delay(ms = 600) {
  return new Promise((res) => setTimeout(res, ms));
}

async function mockRequest(endpoint, body) {
  await delay();
  console.info(`[MOCK] ${body ? 'POST' : 'GET'} ${endpoint}`);

  if (endpoint.includes('/auth/login')) return mockLogin(body);
  if (endpoint.includes('/auth/me')) return mockMe();
  if (endpoint.includes('/dashboard')) return mockDashboard();
  if (endpoint.includes('/reports/sales')) return mockSales();
  if (endpoint.includes('/reports/ta-owner')) return mockTaOwner();
  if (endpoint.includes('/reports/hr')) return mockHr();
  if (endpoint.includes('/reports/onboarding')) return mockOnboarding();
  if (endpoint.includes('/reports/admin')) return mockAdmin();
  if (endpoint.includes('/requests')) return mockAddRequest(body);
  if (endpoint.includes('/master-data/job-families')) return mockJobFamilies(body);
  if (endpoint.includes('/master-data/clients')) return mockClients(body);
  if (endpoint.includes('/master-data/sales-members')) return mockSalesMembers();
  if (endpoint.includes('/master-data/ta-members')) return mockTaMembers();
  if (endpoint.includes('/master-data/candidate-status')) return mockCandidateStatus();
  if (endpoint.includes('/master-data/lookups')) return mockLookups(endpoint);
  if (endpoint.includes('/users')) return mockUsers(body, endpoint);
  if (endpoint.includes('/requirements')) return mockRequirements();
  if (endpoint.includes('/tasks')) return mockTasks();
  if (endpoint.includes('/hr/candidates')) return mockHrCandidates(body);
  if (endpoint.includes('/candidates')) return mockCandidate(body);
  if (endpoint.includes('/offers')) return mockOffer(body, endpoint);
  if (endpoint.includes('/onboardings')) return mockOnboardingApi(body, endpoint);

  return { ok: true, data: [] };
}

// ---- Mock auth ----
function mockLogin({ email, password }) {
  // Any email + password works in mock mode. Backend will validate and
  // return the role; the app maps role -> userType (see AuthContext).
  return {
    accessToken: 'mock-jwt-token-' + Date.now(),
    refreshToken: 'mock-refresh-token',
    user: {
      id: 'mock-id',
      email,
      fullName: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      role: 'ADMIN',
    },
  };
}

function mockMe() {
  const email = localStorage.getItem('auth_email') || 'admin@sst.local';
  return { id: 'mock-id', email, fullName: 'Demo User', role: 'ADMIN' };
}

// Helper to generate mock rows for role-specific reports
function generateMockRows() {
  const clients = ['Acme Corp', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli'];
  const families = ['Engineering', 'Sales', 'Finance', 'Operations', 'HR', 'Marketing'];
  const owners = ['A. Khan', 'R. Singh', 'M. Patel', 'S. Rao', 'J. Lee'];
  const rag = ['Green', 'Amber', 'Red'];
  const stage = ['Sourcing', 'Screening', 'Interview', 'Offer', 'Joined'];

  return Array.from({ length: 24 }).map((_, i) => ({
    id: i + 1,
    taOwner: owners[i % owners.length],
    salesOwner: owners[(i + 2) % owners.length],
    priority: ['High', 'Medium', 'Low'][i % 3],
    client: clients[i % clients.length],
    jobFamily: families[i % families.length],
    createdDate: new Date(2026, 5, 1 + i).toISOString().slice(0, 10), // 2026-06-01 .. 2026-06-24
    totalRequirements: 10 + (i % 9),
    totalPositions: 5 + (i % 7),
    openPositions: 2 + (i % 5),
    closedPositions: 1 + (i % 4),
    pendingSalesHandoff: i % 3,
    candidatesInPipeline: 12 + (i % 20),
    selectedCandidates: 3 + (i % 6),
    duplicateMobiles: i % 4,
    offersAccepted: 1 + (i % 3),
    candidatesJoined: i % 3,
    offersReleased: 2 + (i % 4),
    offersRejected: i % 3,
    requirementRag: rag[i % rag.length],
    candidateStage: stage[i % stage.length],
  }));
}

// ---- Mock dashboard grid (new structure: summary, breakdowns, escalations) ----
function mockDashboard() {
  return {
    summary: {
      totalRequirements: 8,
      totalPositions: 17,
      openPositions: 16,
      closedPositions: 1,
      pendingSalesHandoff: 0,
      candidatesInPipeline: 5,
      selectedCandidates: 1,
      duplicateMobiles: 0,
      offersReleased: 1,
      offersAccepted: 1,
      candidatesJoined: 1,
      fillRate: 0.0588,
      averageDaysToFill: 15.5,
      requirementsAtRisk: 0,
      cancelledRequirements: 0,
      wastedSourcing: 0,
      overdueRequirements: 4
    },
    breakdowns: {
      byStage: [
        {
          stageCode: 'SUBMITTED_TO_SPOC',
          label: 'Submitted to SPOC',
          count: 2,
          percentage: 0.2857
        }
      ],
      byRag: [
        {
          rag: 'GREEN',
          count: 8,
          percentage: 1
        }
      ],
      byClosureStatus: [
        {
          closureStatus: 'ON_TRACK',
          count: 4,
          percentage: 0.5
        }
      ]
    },
    escalations: {
      atRisk: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          publicId: 'REQ-00008',
          roleSkill: 'Senior Java Developer',
          client: 'Acme Corp',
          requirementDate: '2026-07-01',
          targetClosureDate: '2026-07-20',
          openPositions: 2
        }
      ],
      overdue: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          publicId: 'REQ-00008',
          roleSkill: 'Senior Java Developer',
          client: 'Acme Corp',
          requirementDate: '2026-07-01',
          targetClosureDate: '2026-07-20',
          openPositions: 2
        }
      ],
      closureOverdue: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          publicId: 'REQ-00008',
          roleSkill: 'Senior Java Developer',
          client: 'Acme Corp',
          requirementDate: '2026-07-01',
          targetClosureDate: '2026-07-20',
          openPositions: 2
        }
      ],
      cancelled: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          publicId: 'REQ-00008',
          roleSkill: 'Senior Java Developer',
          client: 'Acme Corp',
          requirementDate: '2026-07-01',
          targetClosureDate: '2026-07-20',
          openPositions: 2
        }
      ],
      wasted: [
        {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          publicId: 'REQ-00008',
          roleSkill: 'Senior Java Developer',
          client: 'Acme Corp',
          requirementDate: '2026-07-01',
          targetClosureDate: '2026-07-20',
          openPositions: 2
        }
      ]
    }
  };
}

// ---- Role-specific mock reports ----
function mockSales() {
  return {
    title: 'Sales Owner Report',
    kpis: { activeClients: 18, pendingHandoffs: 7, totalRequirements: 142, wonDeals: 39 },
    rows: generateMockRows().slice(0, 10),
  };
}
function mockTaOwner() {
  return {
    title: 'TA Owner Report',
    kpis: { openPositions: 64, pipeline: 210, offersReleased: 28, joined: 19 },
    rows: generateMockRows().slice(0, 10),
  };
}
function mockHr() {
  return {
    title: 'HR Report',
    kpis: { candidatesJoined: 22, onboardingPending: 9, offersAccepted: 31, duplicateMobiles: 14 },
    rows: generateMockRows().slice(0, 10),
  };
}
function mockOnboarding() {
  return {
    title: 'Onboarding Report',
    kpis: { toOnboard: 12, inProgress: 8, completed: 15, dropped: 2 },
    rows: generateMockRows().slice(0, 10),
  };
}
function mockAdmin() {
  return {
    title: 'Admin Overview',
    kpis: { users: 56, clients: 24, requirements: 320, positions: 180 },
    rows: generateMockRows().slice(0, 10),
  };
}

// ---- Add request (mock create) ----
function mockAddRequest(body) {
  // Echo the submitted payload back as the created record.
  return {
    ok: true,
    message: 'Recruitment request created successfully',
    request: { id: Date.now(), status: 'Submitted', ...body },
  };
}

// ---- Master-data + users fallbacks (used when the live API fails) ----
let mockJobFamiliesStore = [
  { id: 'jf-eng', name: 'Engineering', createdAt: '', updatedAt: '', deletedAt: null },
  { id: 'jf-sales', name: 'Sales', createdAt: '', updatedAt: '', deletedAt: null },
  { id: 'jf-fin', name: 'Finance', createdAt: '', updatedAt: '', deletedAt: null },
];

let mockClientsStore = [
  { id: 'c-acme', name: 'Acme Corp', nameNormalized: 'acme corp', createdAt: '', updatedAt: '', deletedAt: null },
  { id: 'c-globex', name: 'Globex', nameNormalized: 'globex', createdAt: '', updatedAt: '', deletedAt: null },
  { id: 'c-initech', name: 'Initech', nameNormalized: 'initech', createdAt: '', updatedAt: '', deletedAt: null },
];

function mockJobFamilies(body) {
  if (body?.name) {
    const name = String(body.name).trim();
    const existing = mockJobFamiliesStore.find(
      (jf) => jf.name.toLowerCase() === name.toLowerCase() && !jf.deletedAt,
    );
    if (existing) return existing;
    const row = {
      id: 'jf-' + Date.now(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    mockJobFamiliesStore = [...mockJobFamiliesStore, row];
    return row;
  }
  return mockJobFamiliesStore.filter((jf) => !jf.deletedAt);
}

function mockClients(body) {
  if (body?.name) {
    const name = String(body.name).trim();
    const nameNormalized = name.toLowerCase();
    const existing = mockClientsStore.find(
      (c) => c.nameNormalized === nameNormalized && !c.deletedAt,
    );
    if (existing) return existing;
    const row = {
      id: 'c-' + Date.now(),
      name,
      nameNormalized,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    mockClientsStore = [...mockClientsStore, row];
    return row;
  }
  return mockClientsStore.filter((c) => !c.deletedAt);
}

function mockUsers(body, endpoint) {
  if (endpoint && endpoint.includes('/users/roles')) {
    return {
      key: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: [
        { value: 'SALES', label: 'Sales Owner', description: 'Creates credentials used as salesOwnerId on requirements' },
        { value: 'TA', label: 'TA Owner', description: 'Creates credentials used as taOwnerId on requirements' },
        { value: 'HR', label: 'HR Owner', description: 'Creates credentials used as hrOwnerId on onboarding' },
        { value: 'LEADERSHIP_READONLY', label: 'Leadership (read-only)', description: 'Dashboard / reporting access' },
        { value: 'ADMIN', label: 'Admin', description: 'Full system administration' },
      ],
    };
  }
  if (body) {
    return {
      ok: true,
      message: 'User created successfully',
      user: { id: 'u-' + Date.now(), isActive: true, ...body, password: undefined },
    };
  }
  return {
    items: [
      { id: 'u-admin', email: 'admin@sst.local', fullName: 'SST Admin', role: 'ADMIN', isActive: true },
      { id: 'u-sales', email: 'sales@sst.local', fullName: 'Sam Sales', role: 'SALES', isActive: true },
      { id: 'u-ta', email: 'ta@sst.local', fullName: 'Tara Talent', role: 'TA', isActive: true },
      { id: 'u-hr', email: 'hr@sst.local', fullName: 'Hank HR', role: 'HR', isActive: true },
    ],
  };
}

function mockSalesMembers() {
  return [
    { id: 'u-sales', email: 'sales@sst.local', fullName: 'Sam Sales', role: 'SALES', isActive: true },
    { id: 'u-sales2', email: 'sales2@sst.local', fullName: 'Sara Sales', role: 'SALES', isActive: true },
  ];
}

function mockTaMembers() {
  return [
    { id: 'u-ta', email: 'ta@sst.local', fullName: 'Tara Talent', role: 'TA', isActive: true },
    { id: 'u-ta2', email: 'ta.rohit@sst.local', fullName: 'Rohit TA', role: 'TA', isActive: true },
  ];
}

function mockCandidateStatus() {
  return ['Selected', 'Rejected', 'Pending'];
}

function mockLookups(endpoint) {
  // endpoint like /api/v1/master-data/lookups/OFFER_STATUS
  const type = endpoint.split('/').pop()?.toUpperCase();
  if (type === 'OFFER_STATUS') {
    return [
      { code: 'INITIATED', label: 'Initiated' },
      { code: 'RELEASED', label: 'Released' },
      { code: 'ACCEPTED', label: 'Accepted' },
      { code: 'DECLINED', label: 'Declined' },
      { code: 'HOLD', label: 'Hold' },
      { code: 'BACKOUT', label: 'Backout' },
    ];
  }
  if (type === 'CANDIDATE_STAGE') {
    return [
      { code: 'SUBMITTED_TO_SPOC', label: 'Submitted to SPOC' },
      { code: 'CLIENT_SHORTLIST', label: 'Client Shortlist' },
      { code: 'HOLD', label: 'Hold' },
      { code: 'REJECT', label: 'Reject' },
    ];
  }
  if (type === 'INTERVIEW_ROUND') {
    return [
      { code: 'L1', label: 'L1' },
      { code: 'L2', label: 'L2' },
      { code: 'L3', label: 'L3' },
      { code: 'L4', label: 'L4' },
      { code: 'COMPLETED', label: 'Completed' },
    ];
  }
  return [];
}

function mockRequirements() {
  return {
    items: [
      {
        id: 'req-1', publicId: 'REQ-00001', requirementDate: '2026-07-10T00:00:00.000Z',
        clientId: 'c-acme', roleSkill: 'React Developer', jobFamilyId: 'jf-eng',
        numberOfPositions: 5, salesOwnerId: 'u-sales', taOwnerId: 'u-ta', priorityCode: 'HIGH',
        jobLocation: 'Bangalore', minBudget: '50000', maxBudget: '80000', durationMonths: 6,
        status: 'ACTIVE', createdAt: '2026-07-10T06:55:00.000Z', deletedAt: null,
        client: { id: 'c-acme', name: 'Acme Corp' },
        jobFamily: { id: 'jf-eng', name: 'Engineering' },
        salesOwner: { id: 'u-sales', fullName: 'Sam Sales', email: 'sales@sst.local', role: 'SALES' },
        taOwner: { id: 'u-ta', fullName: 'Tara Talent', email: 'ta@sst.local', role: 'TA' },
        openPositions: 5, closedPositions: 0, closureStatus: 'OPEN',
      },
    ],
  };
}

// ---- Assign task (TA owner) mock store ----
// Tasks are "prefilled by sales"; candidates are added/edited by the TA owner.
const mockTasksStore = [
  {
    id: 'REQ-1001',
    clientName: 'Acme Corp', position: 'Senior React Engineer', noOfPositions: 5,
    taOwner: 'A. Khan', jobFamily: 'Engineering', minBudget: 50000, maxBudget: 80000,
    jobLocation: 'Bangalore', duration: '6 months',
    candidates: [
      { candidateId: 'C-001', reqId: 'REQ-1001', position: 'Senior React Engineer', jobFamily: 'Engineering', candidateName: 'Rahul Mehra', email: 'rahul.m@mail.com', mobile: '9876500001', source: 'Naukri', candidateStage: 'CLIENT_SHORTLIST', feedbackStatus: 'Positive', profileSubmittedDate: '2026-07-01', clientShortlistDate: '2026-07-05', interviewRound: 'L2', pipelineAge: 15, candidateRag: 'Green', closureStatus: 'Open' },
      { candidateId: 'C-002', reqId: 'REQ-1001', position: 'Senior React Engineer', jobFamily: 'Engineering', candidateName: 'Priya Nair', email: 'priya.n@mail.com', mobile: '9876500002', source: 'Referral', candidateStage: 'SUBMITTED_TO_SPOC', feedbackStatus: 'Pending', profileSubmittedDate: '2026-07-03', clientShortlistDate: '', interviewRound: '', pipelineAge: 13, candidateRag: 'Amber', closureStatus: 'Open' },
    ],
  },
  {
    id: 'REQ-1002',
    clientName: 'Globex', position: 'Sales Executive', noOfPositions: 3,
    taOwner: 'R. Singh', jobFamily: 'Sales', minBudget: 30000, maxBudget: 45000,
    jobLocation: 'Mumbai', duration: '4 months',
    candidates: [
      { candidateId: 'C-003', reqId: 'REQ-1002', position: 'Sales Executive', jobFamily: 'Sales', candidateName: 'Arjun Rao', email: 'arjun.r@mail.com', mobile: '9876500003', source: 'LinkedIn', candidateStage: 'CLIENT_SHORTLIST', feedbackStatus: 'Positive', profileSubmittedDate: '2026-06-20', clientShortlistDate: '2026-06-25', interviewRound: 'L4', pipelineAge: 26, candidateRag: 'Green', closureStatus: 'Offer Rolled Out' },
    ],
  },
  {
    id: 'REQ-1003',
    clientName: 'Initech', position: 'Finance Analyst', noOfPositions: 2,
    taOwner: 'M. Patel', jobFamily: 'Finance', minBudget: 40000, maxBudget: 60000,
    jobLocation: 'Delhi', duration: '5 months',
    candidates: [],
  },
];

function mockTasks() {
  return { tasks: mockTasksStore };
}

function mockCandidate(body) {
  const { reqId, candidate } = body;
  const task = mockTasksStore.find((t) => t.id === reqId);
  if (!task) return { ok: false, message: 'Task not found' };

  if (candidate.candidateId && task.candidates.some((c) => c.candidateId === candidate.candidateId)) {
    // Edit existing
    task.candidates = task.candidates.map((c) =>
      c.candidateId === candidate.candidateId ? { ...c, ...candidate } : c
    );
    return { ok: true, message: 'Candidate updated successfully', candidate };
  }

  // Add new
  const newCand = { ...candidate, candidateId: 'C-' + String(Date.now()).slice(-6) };
  task.candidates = [...task.candidates, newCand];
  return { ok: true, message: 'Candidate added successfully', candidate: newCand };
}

// ---- HR candidate pipeline (mock store) ----
// Flattened list of every candidate across all tasks, each carrying an
// HR-managed status. HR can move a candidate between pipeline states.
const HR_STATUSES = ['Pipeline', 'Pending', 'Selected', 'Offer', 'Rejected', 'Joined'];

const mockHrCandidatesStore = mockTasksStore.flatMap((t) =>
  t.candidates.map((c) => ({
    ...c,
    reqId: t.id,
    clientName: t.clientName,
    position: t.position,
    // Seed an HR status from the existing closure/stage so the list looks real.
    hrStatus: seedHrStatus(c),
  }))
);

function seedHrStatus(c) {
  if (c.closureStatus === 'Offer Rolled Out' || c.candidateStage === 'Joined') return 'Joined';
  if (c.feedbackStatus === 'Negative') return 'Rejected';
  if (c.candidateStage === 'Interview' || c.candidateStage === 'Offer') return 'Selected';
  if (c.candidateStage === 'Shortlist') return 'Pending';
  return 'Pipeline';
}

function mockHrCandidates(body) {
  // A PUT-style update: { candidateId, hrStatus }
  if (body && body.candidateId && body.hrStatus) {
    const target = mockHrCandidatesStore.find((c) => c.candidateId === body.candidateId);
    if (!target) return { ok: false, message: 'Candidate not found' };
    target.hrStatus = body.hrStatus;
    return { ok: true, message: 'HR status updated', candidate: target };
  }
  return { candidates: mockHrCandidatesStore, statuses: HR_STATUSES };
}

function mockOffer(body, endpoint) {
  // GET /api/v1/offers/{id}
  const byId = endpoint && /\/offers\/[^/?]+$/.test(endpoint) && !body;
  if (byId) {
    const id = endpoint.split('/').pop();
    return {
      id,
      publicId: 'OFF-00001',
      candidateId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      candidate: { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', publicId: 'C-001', name: 'Demo Candidate' },
      offerInitiatedDate: '2026-07-12',
      offerReleasedDate: '2026-07-13',
      statusCode: 'RELEASED',
      ctcRate: '18 LPA',
      expectedDoj: '2026-08-01',
      remarks: 'Mock offer',
    };
  }

  // POST / PUT create or update
  if (body) {
    return {
      ok: true,
      message: body.id || endpoint?.includes('/offers/') ? 'Offer updated successfully' : 'Offer created successfully',
      offer: { id: 'OFF-' + String(Date.now()).slice(-6), publicId: 'OFF-00001', ...body },
    };
  }

  // GET /api/v1/offers — paginated { items, total, page, pageSize }
  return {
    items: [
      {
        id: '57922bfe-3402-411a-9a58-241b515e417a',
        publicId: 'OFF-00007',
        candidateId: 'a8ecec7f-5e3e-4aea-a504-fa033aa85358',
        requirementId: 'b77fdb11-5e76-47a6-9879-43b37147c4c3',
        statusCode: 'ACCEPTED',
        offerStatus: 'ACCEPTED',
        selectedDate: '2026-07-22T00:00:00.000Z',
        offerInitiatedDate: null,
        offerReleasedDate: null,
        ctcRate: '18 LPA',
        expectedDoj: '2026-09-01T00:00:00.000Z',
        remarks: null,
        candidate: {
          id: 'a8ecec7f-5e3e-4aea-a504-fa033aa85358',
          publicId: 'CAN-00018',
          name: 'Postman Test Cand',
          email: 'postman.cand@example.com',
          mobile: '9876543210',
          source: null,
          stageCode: 'L1',
          selected: true,
        },
        requirement: {
          id: 'b77fdb11-5e76-47a6-9879-43b37147c4c3',
          publicId: 'REQ-00013',
          roleSkill: 'PHP',
          client: 'Microsoft',
        },
        candidatePublicId: 'CAN-00018',
        candidateName: 'Postman Test Cand',
        position: 'PHP',
        client: 'Microsoft',
        email: 'postman.cand@example.com',
        mobile: '9876543210',
        source: null,
        stage: 'L1',
        requirementPublicId: 'REQ-00013',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  };
}

function mockOnboardingApi(body) {
  if (body) {
    return {
      ok: true,
      message: 'Onboarding created successfully',
      onboarding: { id: 'onb-' + Date.now(), publicId: 'ONB-NEW', ...body },
    };
  }
  return {
    items: [
      {
        id: 'df299ca2-403a-4464-a6f7-8a5cd965f803',
        publicId: 'ONB-00007',
        offerId: '57922bfe-3402-411a-9a58-241b515e417a',
        candidateId: 'a8ecec7f-5e3e-4aea-a504-fa033aa85358',
        statusCode: 'JOINED',
        onboardingId: 'ONB-00007',
        offerPublicId: 'OFF-00007',
        candidatePublicId: 'CAN-00018',
        candidateName: 'Postman Test Cand',
        mobileNumber: '9876543210',
        emailAddress: 'postman.cand@example.com',
        clientRole: 'PHP',
        offerStatus: 'ACCEPTED',
        ctcRate: '18 LPA',
        hrOwnerName: 'Aditya',
        expectedDOJ: '2026-09-01T00:00:00.000Z',
        pendingDocs: false,
        bgvStatus: 'NOT_STARTED',
        actualDOJ: '2026-09-15T00:00:00.000Z',
        onboardingStatus: 'JOINED',
        requirementStatus: 'CLOSED',
        reqId: 'REQ-00013',
        remarks: 'postman test',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 25,
  };
}
