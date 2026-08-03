import { describe, expect, it } from 'vitest';
import {
  computeClosureStatus,
  computeOpenPositions,
  computeTaHandoffSlaRag,
  daysBetween,
  daysSince,
  deriveRequirementMetrics,
  formatPublicId,
  normalizeEmail,
  normalizeMobile,
} from './index';

describe('normalizeEmail (UT-NORM)', () => {
  it('UT-NORM-001: trims and lowercases', () => {
    expect(normalizeEmail('  A@B.Com ')).toBe('a@b.com');
  });

  it('UT-NORM-002: empty string', () => {
    expect(normalizeEmail('')).toBe('');
  });
});

describe('normalizeMobile (UT-NORM)', () => {
  it('UT-NORM-003: strips non-digits', () => {
    expect(normalizeMobile('+91-98765-43210')).toBe('919876543210');
  });

  it('UT-NORM-004: letters only → empty', () => {
    expect(normalizeMobile('abc')).toBe('');
  });
});

describe('daysBetween / daysSince (UT-DAY)', () => {
  it('UT-DAY-001: same calendar day is 0', () => {
    expect(daysBetween('2026-07-01', '2026-07-01')).toBe(0);
  });

  it('UT-DAY-002: counts +3 days', () => {
    expect(daysBetween('2026-07-01', '2026-07-04')).toBe(3);
  });

  it('UT-DAY-003: end before start is negative', () => {
    expect(daysBetween('2026-07-10', '2026-07-01')).toBe(-9);
  });

  it('UT-DAY-004: daysSince matches daysBetween to now', () => {
    const now = new Date('2026-07-04T12:00:00Z');
    expect(daysSince('2026-07-01', now)).toBe(3);
    expect(daysBetween('2026-07-01', now)).toBe(3);
  });
});

describe('computeOpenPositions (UT-OPEN)', () => {
  it('UT-OPEN: never negative and subtracts closed', () => {
    expect(computeOpenPositions(5, 2)).toBe(3);
    expect(computeOpenPositions(2, 2)).toBe(0);
    expect(computeOpenPositions(2, 5)).toBe(0);
    expect(computeOpenPositions(1, 0)).toBe(1);
  });
});

describe('computeTaHandoffSlaRag (UT-SLA)', () => {
  const reqDate = '2026-07-01';

  it('UT-SLA-001: NONE for CLOSED/CANCELLED', () => {
    expect(
      computeTaHandoffSlaRag({ requirementDate: reqDate, status: 'CLOSED' }),
    ).toBe('NONE');
    expect(
      computeTaHandoffSlaRag({
        requirementDate: reqDate,
        status: 'CANCELLED',
      }),
    ).toBe('NONE');
  });

  it('UT-SLA-002..004: pending handoff GREEN/AMBER/RED by age', () => {
    expect(
      computeTaHandoffSlaRag({
        requirementDate: reqDate,
        status: 'ACTIVE',
        now: new Date('2026-07-02'),
      }),
    ).toBe('GREEN');
    expect(
      computeTaHandoffSlaRag({
        requirementDate: reqDate,
        status: 'ACTIVE',
        now: new Date('2026-07-05'),
      }),
    ).toBe('AMBER');
    expect(
      computeTaHandoffSlaRag({
        requirementDate: reqDate,
        status: 'ACTIVE',
        now: new Date('2026-07-10'),
      }),
    ).toBe('RED');
  });

  it('UT-SLA-005: freezes age at handoff − requirementDate', () => {
    expect(
      computeTaHandoffSlaRag({
        requirementDate: reqDate,
        taHandoffDate: '2026-07-03',
        status: 'ACTIVE',
        now: new Date('2026-08-01'),
      }),
    ).toBe('GREEN');
    expect(
      computeTaHandoffSlaRag({
        requirementDate: reqDate,
        taHandoffDate: '2026-07-05',
        status: 'ACTIVE',
        now: new Date('2026-08-01'),
      }),
    ).toBe('AMBER');
    expect(
      computeTaHandoffSlaRag({
        requirementDate: reqDate,
        taHandoffDate: '2026-07-10',
        status: 'ACTIVE',
        now: new Date('2026-08-01'),
      }),
    ).toBe('RED');
  });

  it('UT-SLA-006: handoff before reqDate clamps age ≥ 0 → GREEN', () => {
    expect(
      computeTaHandoffSlaRag({
        requirementDate: '2026-07-10',
        taHandoffDate: '2026-07-01',
        status: 'ACTIVE',
        now: new Date('2026-08-01'),
      }),
    ).toBe('GREEN');
  });
});

describe('computeClosureStatus (UT-CLS)', () => {
  it('UT-CLS-001/002: mirrors CANCELLED and ON_HOLD', () => {
    expect(
      computeClosureStatus({ status: 'CANCELLED', openPositions: 2 }),
    ).toBe('CANCELLED');
    expect(computeClosureStatus({ status: 'ON_HOLD', openPositions: 2 })).toBe(
      'ON_HOLD',
    );
  });

  it('UT-CLS-003: FILLED when CLOSED or open ≤ 0', () => {
    expect(computeClosureStatus({ status: 'CLOSED', openPositions: 0 })).toBe(
      'FILLED',
    );
    expect(computeClosureStatus({ status: 'ACTIVE', openPositions: 0 })).toBe(
      'FILLED',
    );
  });

  it('UT-CLS-004: OVERDUE when target past with open seats', () => {
    expect(
      computeClosureStatus({
        status: 'ACTIVE',
        openPositions: 1,
        targetClosureDate: '2026-07-01',
        now: new Date('2026-07-05'),
      }),
    ).toBe('OVERDUE');
  });

  it('UT-CLS-005: ON_TRACK otherwise', () => {
    expect(
      computeClosureStatus({
        status: 'ACTIVE',
        openPositions: 1,
        targetClosureDate: '2026-07-20',
        now: new Date('2026-07-05'),
      }),
    ).toBe('ON_TRACK');
    expect(
      computeClosureStatus({
        status: 'ACTIVE',
        openPositions: 1,
        now: new Date('2026-07-05'),
      }),
    ).toBe('ON_TRACK');
  });
});

describe('formatPublicId (UT-PID)', () => {
  it('UT-PID-001/002: pads to 5 digits', () => {
    expect(formatPublicId('REQ', 1)).toBe('REQ-00001');
    expect(formatPublicId('REQ', 12345)).toBe('REQ-12345');
  });
});

describe('deriveRequirementMetrics (UT-DER)', () => {
  it('UT-DER-001: taReadyReqId null without handoff', () => {
    const m = deriveRequirementMetrics({
      publicId: 'REQ-00009',
      requirementDate: '2026-07-01',
      status: 'ACTIVE',
      numberOfPositions: 2,
      closedPositions: 0,
      now: new Date('2026-07-02'),
    });
    expect(m.taReadyReqId).toBeNull();
    expect(m.requirementAgeDays).toBe(1);
  });

  it('UT-DER-002/003: composes metrics when handoff set', () => {
    const metrics = deriveRequirementMetrics({
      publicId: 'REQ-00001',
      requirementDate: '2026-07-01',
      taHandoffDate: '2026-07-02',
      targetClosureDate: '2026-07-20',
      status: 'ACTIVE',
      numberOfPositions: 3,
      closedPositions: 1,
      now: new Date('2026-07-10'),
    });
    expect(metrics.openPositions).toBe(2);
    expect(metrics.closedPositions).toBe(1);
    expect(metrics.taHandoffSlaRag).toBe('GREEN');
    expect(metrics.closureStatus).toBe('ON_TRACK');
    expect(metrics.taReadyReqId).toBe('REQ-00001');
  });
});
