import { describe, expect, it } from 'vitest';
import {
  CreateRequirementSchema,
  ClosureStatusSchema,
  RequirementStatusSchema,
} from './index';

describe('Requirement intake shared types', () => {
  it('accepts valid create payload', () => {
    const parsed = CreateRequirementSchema.parse({
      requirementDate: '2026-07-07',
      clientId: '11111111-1111-1111-1111-111111111111',
      roleSkill: 'Python Developer',
      jobFamilyId: '22222222-2222-2222-2222-222222222222',
      numberOfPositions: 2,
      salesOwnerId: '33333333-3333-3333-3333-333333333333',
      priorityCode: 'HIGH',
    });
    expect(parsed.roleSkill).toBe('Python Developer');
  });

  it('rejects minBudget > maxBudget', () => {
    const result = CreateRequirementSchema.safeParse({
      requirementDate: '2026-07-07',
      clientId: '11111111-1111-1111-1111-111111111111',
      roleSkill: 'Python Developer',
      jobFamilyId: '22222222-2222-2222-2222-222222222222',
      numberOfPositions: 2,
      salesOwnerId: '33333333-3333-3333-3333-333333333333',
      priorityCode: 'HIGH',
      minBudget: 100,
      maxBudget: 50,
    });
    expect(result.success).toBe(false);
  });

  it('exposes status and closure enums', () => {
    expect(RequirementStatusSchema.options).toContain('ACTIVE');
    expect(ClosureStatusSchema.options).toEqual([
      'ON_TRACK',
      'OVERDUE',
      'FILLED',
      'CANCELLED',
      'ON_HOLD',
    ]);
  });
});
