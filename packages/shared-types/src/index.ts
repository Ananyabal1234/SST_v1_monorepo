import { z } from 'zod';

export const RoleSchema = z.enum([
  'ADMIN',
  'SALES',
  'TA',
  'HR',
  'LEADERSHIP_READONLY',
]);
export type Role = z.infer<typeof RoleSchema>;

export const RequirementStatusSchema = z.enum([
  'ACTIVE',
  'ON_HOLD',
  'CANCELLED',
  'CLOSED',
]);
export type RequirementStatus = z.infer<typeof RequirementStatusSchema>;

/** Derived overdue / fill helper — not stored in DB. */
export const ClosureStatusSchema = z.enum([
  'ON_TRACK',
  'OVERDUE',
  'FILLED',
  'CANCELLED',
  'ON_HOLD',
]);
export type ClosureStatus = z.infer<typeof ClosureStatusSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const UserPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  role: RoleSchema,
  isActive: z.boolean().optional(),
});
export type UserPublic = z.infer<typeof UserPublicSchema>;

export const RagSchema = z.enum(['GREEN', 'AMBER', 'RED', 'NONE']);
export type Rag = z.infer<typeof RagSchema>;

export const LOOKUP_TYPES = [
  'PRIORITY',
  'CANDIDATE_STAGE',
  'FEEDBACK',
  'OFFER_STATUS',
  'ONBOARDING_STATUS',
  'BGV_STATUS',
  'REQUIREMENT_STATUS',
] as const;
export type LookupType = (typeof LOOKUP_TYPES)[number];

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const RequirementDerivedSchema = z.object({
  requirementAgeDays: z.number().int().nonnegative(),
  taHandoffSlaRag: RagSchema,
  openPositions: z.number().int().nonnegative(),
  closedPositions: z.number().int().nonnegative(),
  closureStatus: ClosureStatusSchema,
  taReadyReqId: z.string().nullable(),
});
export type RequirementDerived = z.infer<typeof RequirementDerivedSchema>;

export const RequirementOwnerSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
});

export const RequirementResponseSchema = z.object({
  id: z.string().uuid(),
  publicId: z.string(),
  requirementDate: z.string().or(z.date()),
  clientId: z.string().uuid(),
  client: z.object({ id: z.string().uuid(), name: z.string() }).optional(),
  roleSkill: z.string(),
  jobFamilyId: z.string().uuid(),
  jobFamily: z.object({ id: z.string().uuid(), name: z.string() }).optional(),
  numberOfPositions: z.number().int().min(1),
  salesOwnerId: z.string().uuid(),
  salesOwner: RequirementOwnerSchema.optional(),
  priorityCode: z.string(),
  taOwnerId: z.string().uuid().nullable().optional(),
  taOwner: RequirementOwnerSchema.nullable().optional(),
  taHandoffDate: z.string().or(z.date()).nullable().optional(),
  targetClosureDate: z.string().or(z.date()).nullable().optional(),
  remarks: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  jobLocation: z.string().nullable().optional(),
  minBudget: z.union([z.number(), z.string()]).nullable().optional(),
  maxBudget: z.union([z.number(), z.string()]).nullable().optional(),
  durationMonths: z.number().int().nullable().optional(),
  status: RequirementStatusSchema,
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
}).merge(RequirementDerivedSchema);
export type RequirementResponse = z.infer<typeof RequirementResponseSchema>;

export const CreateRequirementSchema = z
  .object({
    requirementDate: z.string().min(1),
    clientId: z.string().uuid(),
    roleSkill: z.string().trim().min(1),
    jobFamilyId: z.string().uuid(),
    numberOfPositions: z.coerce.number().int().min(1),
    salesOwnerId: z.string().uuid(),
    priorityCode: z.string().trim().min(1),
    taOwnerId: z.string().uuid().optional().nullable(),
    taHandoffDate: z.string().optional().nullable(),
    targetClosureDate: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
    experience: z.string().optional().nullable(),
    jobLocation: z.string().optional().nullable(),
    minBudget: z.coerce.number().nonnegative().optional().nullable(),
    maxBudget: z.coerce.number().nonnegative().optional().nullable(),
    durationMonths: z.coerce.number().int().positive().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.minBudget != null &&
      data.maxBudget != null &&
      data.minBudget > data.maxBudget
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minBudget must be <= maxBudget',
        path: ['minBudget'],
      });
    }
  });
export type CreateRequirementInput = z.infer<typeof CreateRequirementSchema>;
