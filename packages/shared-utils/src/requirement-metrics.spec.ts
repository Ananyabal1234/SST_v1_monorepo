import { describe, expect, it } from 'vitest';
import {
  computeClosureStatus,
  computeOpenPositions,
  computeTaHandoffSlaRag,
  daysSince,
  deriveRequirementMetrics,
} from './index';

describe('daysSince', () => {
  it('counts calendar days', () => {
    expect(daysSince('2026-07-01', new Date('2026-07-04T12:00:00Z'))).toBe(3);
  });
});

describe('computeTaHandoffSlaRag', () => {
  const reqDate = '2026-07-01';

  it('returns NONE for terminal statuses', () => {
    expect(
      computeTaHandoffSlaRag({
        requirementDate: reqDate,
        status: 'CLOSED',
      }),
    ).toBe('NONE');
    expect(
      computeTaHandoffSlaRag({
        requirementDate: reqDate,
        status: 'CANCELLED',
      }),
    ).toBe('NONE');
  });

  it('uses today − requirementDate while handoff pending', () => {
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

  it('freezes age at handoff − requirementDate after handoff', () => {
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
});

describe('computeClosureStatus', () => {
  it('mirrors cancelled and on-hold', () => {
    expect(
      computeClosureStatus({ status: 'CANCELLED', openPositions: 2 }),
    ).toBe('CANCELLED');
    expect(computeClosureStatus({ status: 'ON_HOLD', openPositions: 2 })).toBe(
      'ON_HOLD',
    );
  });

  it('returns FILLED when closed or no open seats', () => {
    expect(computeClosureStatus({ status: 'CLOSED', openPositions: 0 })).toBe(
      'FILLED',
    );
    expect(computeClosureStatus({ status: 'ACTIVE', openPositions: 0 })).toBe(
      'FILLED',
    );
  });

  it('returns OVERDUE when target past with open seats', () => {
    expect(
      computeClosureStatus({
        status: 'ACTIVE',
        openPositions: 1,
        targetClosureDate: '2026-07-01',
        now: new Date('2026-07-05'),
      }),
    ).toBe('OVERDUE');
  });

  it('returns ON_TRACK otherwise', () => {
    expect(
      computeClosureStatus({
        status: 'ACTIVE',
        openPositions: 1,
        targetClosureDate: '2026-07-20',
        now: new Date('2026-07-05'),
      }),
    ).toBe('ON_TRACK');
  });
});

describe('deriveRequirementMetrics', () => {
  it('composes age, sla, positions, closure, and taReadyReqId', () => {
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
    expect(computeOpenPositions(5, 7)).toBe(0);
  });
});
