/**
 * Requirement Intake — lifecycle verification checklist (API)
 *
 * Run against a live local stack after `pnpm db:seed`:
 *
 * 1. Login as sales@sst.local / ChangeMeNow!
 * 2. POST /api/v1/requirements with core fields only → expect ACTIVE,
 *    openPositions = numberOfPositions, closedPositions = 0,
 *    closureStatus = ON_TRACK, taHandoffSlaRag from requirement age.
 * 3. PUT /api/v1/requirements/:id (Sales owner) → full-body edit of intake fields;
 *    PATCH remains for partial updates (TA limited fields).
 *    Sales cannot edit another owner's requirement (403).
 * 4. PATCH handoff + TA owner → taReadyReqId set, SLA freezes at handoff age.
 * 4. As TA: POST /candidates on ACTIVE req → 201; on CANCELLED/CLOSED → 400.
 * 5. Select candidate → create offer → ACCEPTED → create onboarding → JOINED.
 * 6. Confirm requirement open/closed recount; when filled → status CLOSED,
 *    closureStatus FILLED; dashboard summary open/closed/fillRate update.
 * 7. Revert JOINED → requirement may reopen to ACTIVE when seats free.
 * 8. GET /requirements/REQ-00001 resolves by publicId.
 */
export const REQUIREMENT_INTAKE_E2E_CHECKLIST = [
  'create-core',
  'assign-handoff',
  'block-candidates-on-terminal',
  'pipeline-to-joined',
  'dashboard-counts',
  'public-id-lookup',
] as const;
