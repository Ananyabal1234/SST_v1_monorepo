import { describe, expect, it } from 'vitest';
import {
  CreateRequirementSchema,
  ClosureStatusSchema,
  LoginSchema,
  PaginationSchema,
  RagSchema,
  RequirementStatusSchema,
  RoleSchema,
} from './index';

const baseCreate = {
  requirementDate: '2026-07-07',
  clientId: '11111111-1111-1111-1111-111111111111',
  roleSkill: 'Python Developer',
  jobFamilyId: '22222222-2222-2222-2222-222222222222',
  numberOfPositions: 2,
  salesOwnerId: '33333333-3333-3333-3333-333333333333',
  priorityCode: 'HIGH',
};

describe('CreateRequirementSchema (UT-ZOD)', () => {
  it('UT-ZOD-001: accepts valid create payload', () => {
    const parsed = CreateRequirementSchema.parse(baseCreate);
    expect(parsed.roleSkill).toBe('Python Developer');
  });

  it('UT-ZOD-002: rejects numberOfPositions < 1', () => {
    const result = CreateRequirementSchema.safeParse({
      ...baseCreate,
      numberOfPositions: 0,
    });
    expect(result.success).toBe(false);
  });

  it('UT-ZOD-003: rejects invalid UUID fields', () => {
    const result = CreateRequirementSchema.safeParse({
      ...baseCreate,
      clientId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('UT-ZOD-004: rejects minBudget > maxBudget', () => {
    const result = CreateRequirementSchema.safeParse({
      ...baseCreate,
      minBudget: 100,
      maxBudget: 50,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty roleSkill', () => {
    const result = CreateRequirementSchema.safeParse({
      ...baseCreate,
      roleSkill: '   ',
    });
    expect(result.success).toBe(false);
  });
});

describe('enums (UT-ZOD-005)', () => {
  it('RoleSchema has seven MVP roles', () => {
    expect(RoleSchema.options).toEqual([
      'ADMIN',
      'SALES',
      'SALES_LEAD',
      'TA',
      'TA_LEAD',
      'HR',
      'HR_LEAD',
    ]);
  });

  it('RequirementStatusSchema options', () => {
    expect(RequirementStatusSchema.options).toEqual([
      'ACTIVE',
      'ON_HOLD',
      'CANCELLED',
      'CLOSED',
    ]);
  });

  it('ClosureStatusSchema options', () => {
    expect(ClosureStatusSchema.options).toEqual([
      'ON_TRACK',
      'OVERDUE',
      'FILLED',
      'CANCELLED',
      'ON_HOLD',
    ]);
  });

  it('RagSchema options', () => {
    expect(RagSchema.options).toEqual(['GREEN', 'AMBER', 'RED', 'NONE']);
  });
});

describe('LoginSchema (UT-ZOD-006)', () => {
  it('accepts valid login', () => {
    expect(
      LoginSchema.parse({ email: 'a@b.com', password: '12345678' }).email,
    ).toBe('a@b.com');
  });

  it('rejects password shorter than 8', () => {
    expect(
      LoginSchema.safeParse({ email: 'a@b.com', password: 'short' }).success,
    ).toBe(false);
  });

  it('rejects invalid email', () => {
    expect(
      LoginSchema.safeParse({ email: 'nope', password: '12345678' }).success,
    ).toBe(false);
  });
});

describe('PaginationSchema (UT-ZOD-007)', () => {
  it('applies defaults', () => {
    const p = PaginationSchema.parse({});
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(20);
  });

  it('coerces string numbers', () => {
    const p = PaginationSchema.parse({ page: '2', pageSize: '50' });
    expect(p.page).toBe(2);
    expect(p.pageSize).toBe(50);
  });

  it('rejects pageSize > 100', () => {
    expect(PaginationSchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });
});
