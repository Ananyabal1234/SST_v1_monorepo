import type { ClosureStatus, Rag } from '@sst/shared-types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeMobile(mobile: string): string {
  return mobile.replace(/\D/g, '');
}

/** Calendar days between two dates (UTC date-only). */
export function daysBetween(
  start: Date | string,
  end: Date | string = new Date(),
): number {
  const aDate = new Date(start);
  const bDate = new Date(end);
  const a = Date.UTC(aDate.getFullYear(), aDate.getMonth(), aDate.getDate());
  const b = Date.UTC(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());
  return Math.floor((b - a) / 86_400_000);
}

/** Days between start date and today (UTC date). */
export function daysSince(date: Date | string, now = new Date()): number {
  return daysBetween(date, now);
}

function ragFromAge(ageDays: number): Rag {
  if (ageDays <= 2) return 'GREEN';
  if (ageDays <= 5) return 'AMBER';
  return 'RED';
}

/**
 * TA handoff SLA RAG (Requirement Intake):
 * - CLOSED / CANCELLED → NONE
 * - Pending handoff: age = today − requirementDate
 * - After handoff: age freezes at handoffDate − requirementDate
 * Thresholds: ≤2 Green, ≤5 Amber, else Red
 */
export function computeTaHandoffSlaRag(opts: {
  requirementDate: Date | string;
  taHandoffDate?: Date | string | null;
  targetClosureDate?: Date | string | null;
  status: string;
  now?: Date;
}): Rag {
  if (opts.status === 'CLOSED' || opts.status === 'CANCELLED') return 'NONE';

  const now = opts.now ?? new Date();
  const age = opts.taHandoffDate
    ? daysBetween(opts.requirementDate, opts.taHandoffDate)
    : daysBetween(opts.requirementDate, now);

  return ragFromAge(Math.max(0, age));
}

/**
 * Closure Status (derived, not stored):
 * CANCELLED / ON_HOLD mirror requirement status;
 * FILLED when closed or open seats = 0;
 * OVERDUE when target past with open seats;
 * otherwise ON_TRACK.
 */
export function computeClosureStatus(opts: {
  status: string;
  openPositions: number;
  targetClosureDate?: Date | string | null;
  now?: Date;
}): ClosureStatus {
  if (opts.status === 'CANCELLED') return 'CANCELLED';
  if (opts.status === 'ON_HOLD') return 'ON_HOLD';
  if (opts.status === 'CLOSED' || opts.openPositions <= 0) return 'FILLED';

  if (opts.targetClosureDate) {
    const overdueDays = daysBetween(opts.targetClosureDate, opts.now ?? new Date());
    if (overdueDays > 0) return 'OVERDUE';
  }

  return 'ON_TRACK';
}

export function computeOpenPositions(
  numberOfPositions: number,
  closedPositions: number,
): number {
  return Math.max(0, numberOfPositions - closedPositions);
}

export function formatPublicId(prefix: string, value: number): string {
  return `${prefix}-${String(value).padStart(5, '0')}`;
}

export function deriveRequirementMetrics(opts: {
  publicId: string;
  requirementDate: Date | string;
  taHandoffDate?: Date | string | null;
  targetClosureDate?: Date | string | null;
  status: string;
  numberOfPositions: number;
  closedPositions: number;
  now?: Date;
}) {
  const openPositions = computeOpenPositions(
    opts.numberOfPositions,
    opts.closedPositions,
  );
  return {
    requirementAgeDays: daysSince(opts.requirementDate, opts.now),
    taHandoffSlaRag: computeTaHandoffSlaRag({
      requirementDate: opts.requirementDate,
      taHandoffDate: opts.taHandoffDate,
      targetClosureDate: opts.targetClosureDate,
      status: opts.status,
      now: opts.now,
    }),
    openPositions,
    closedPositions: opts.closedPositions,
    closureStatus: computeClosureStatus({
      status: opts.status,
      openPositions,
      targetClosureDate: opts.targetClosureDate,
      now: opts.now,
    }),
    taReadyReqId: opts.taHandoffDate ? opts.publicId : null,
  };
}
