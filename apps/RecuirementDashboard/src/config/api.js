// ============================================================================
//  API CONFIGURATION
//  ---------------------------------------------------------------------------
//  When the backend team assigns real endpoints, you ONLY need to edit the
//  values below. Nothing else in the app needs to change.
//
//  HOW TO GO LIVE:
//    1. Set USE_MOCK = false
//    2. Set API_BASE_URL to your backend base URL
//    3. Fill in each ENDPOINTS.* path with the real route
// ============================================================================

export const USE_MOCK = false; // <-- backend is live

export const API_BASE_URL = ''; // endpoints already include /api; proxied to backend via vite.config.js (avoids CORS in dev)

export const ENDPOINTS = {
  // ---- Auth ----
  LOGIN: '/api/v1/auth/login',          // POST { email, password } -> { accessToken, refreshToken, user }
  LOGOUT: '/api/v1/auth/logout',        // POST { refreshToken } -> void
  REFRESH: '/api/v1/auth/refresh',      // POST { refreshToken } -> { accessToken, refreshToken }
  ME: '/api/v1/auth/me',                // GET  -> { id, email, fullName, role }

  // ---- Dashboard (main grid) ----
  DASHBOARD: '/api/v1/dashboard',      // GET  -> { rows: [...], kpis: {...} }

  // ---- Role-specific screens ----
  SALES: '/reports/sales',              // GET  -> sales owner report data
  TA_OWNER: '/reports/ta-owner',        // GET  -> TA owner report data
  HR: '/reports/hr',                    // GET  -> HR report data
  ONBOARDING: '/reports/onboarding',    // GET  -> onboarding report data
  ADMIN: '/reports/admin',              // GET  -> admin overview data

  // ---- Add request ----
  ADD_REQUEST: '/api/v1/requirements',  // POST { ...requirement } -> 201 created requirement
  JOB_FAMILIES: '/api/v1/master-data/job-families', // GET -> [{ id, name, ... }]
  CLIENTS: '/api/v1/master-data/clients',            // GET -> [{ id, name, ... }]
  SALES_MEMBERS: '/api/v1/master-data/sales-members', // GET -> [{ id, fullName, email, role }]
  TA_MEMBERS: '/api/v1/master-data/ta-members',       // GET -> [{ id, fullName, email, role }]
  TA_LEAD_MEMBERS: '/api/v1/master-data/ta-lead-members', // GET -> [{ id, fullName, email, role }]
  CANDIDATE_STATUS: '/api/v1/master-data/candidate-status', // GET -> ["Selected","Rejected","Pending"]
  LOOKUPS: '/api/v1/master-data/lookups', // GET /api/v1/master-data/lookups/{type} -> lookup values (e.g. OFFER_STATUS)
  USERS: '/api/v1/users',                            // GET list | POST create | PATCH/DELETE /{id}
  USER_ROLES: '/api/v1/users/roles',                 // GET -> role select options
  REQUIREMENTS: '/api/v1/requirements',              // GET -> [{ id, salesOwnerId, taOwnerId, ... }]
  REQUIREMENT_BY_ID: '/api/v1/requirements',          // PUT /api/v1/requirements/{id} -> updated requirement
  REQUIREMENT_PIPELINE: '/api/v1/requirements',       // GET /api/v1/requirements/{id}/pipeline

  // ---- Assign task (TA owner) ----
  TASKS: '/tasks',                      // GET  -> list of assigned tasks (prefilled by sales)
  CANDIDATES: '/api/v1/candidates',     // GET  -> list of candidates { items: [...] }
  CANDIDATE_DUPLICATES: '/api/v1/candidates/duplicates', // GET -> prior rows by email/mobile
  ADD_CANDIDATE: '/api/v1/candidates',  // POST -> add a candidate { requirementId, name, mobile, email, source, stageCode, candidateStatus, profileSubmittedDate, remarks }
  UPDATE_CANDIDATE: '/api/v1/candidates', // PATCH /api/v1/candidates/{id} -> edit a candidate

  // ---- HR candidate pipeline ----
  HR_CANDIDATES: '/hr/candidates',      // GET  -> all candidates with their HR status
  UPDATE_HR_STATUS: '/hr/candidates',   // PUT  -> update a candidate's HR status
  OFFERS: '/api/v1/offers',             // GET list | POST create | GET/PUT /api/v1/offers/{id}
  ONBOARDINGS: '/api/v1/onboardings',   // GET list | POST create
};

// Standard request timeout (ms)
export const API_TIMEOUT = 15000;
