import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({ example: 8 })
  totalRequirements!: number;

  @ApiProperty({ example: 17 })
  totalPositions!: number;

  @ApiProperty({ example: 16 })
  openPositions!: number;

  @ApiProperty({
    example: 1,
    description:
      'Closed positions = candidates with onboarding status JOINED (Total = Open + Closed)',
  })
  closedPositions!: number;

  @ApiProperty({ example: 0 })
  pendingSalesHandoff!: number;

  @ApiProperty({
    example: 5,
    description:
      'Candidates not yet marked Selected (mutually exclusive funnel stage)',
  })
  candidatesInPipeline!: number;

  @ApiProperty({
    example: 1,
    description:
      'Selected candidates without RELEASED/ACCEPTED offer and not yet JOINED',
  })
  selectedCandidates!: number;

  @ApiProperty({
    example: 0,
    description: 'Duplicate mobile-number groups in the filtered requirements',
  })
  duplicateMobiles!: number;

  @ApiProperty({
    example: 1,
    description:
      'Offers currently RELEASED (excludes accepted and joined stages)',
  })
  offersReleased!: number;

  @ApiProperty({
    example: 1,
    description: 'Offers ACCEPTED that are not yet JOINED',
  })
  offersAccepted!: number;

  @ApiProperty({
    example: 0,
    description: 'Offers with DECLINED status (rejected by candidate)',
  })
  offersRejected!: number;

  @ApiProperty({ example: 1 })
  candidatesJoined!: number;

  @ApiProperty({
    example: 0.0588,
    description: 'Closed positions divided by non-cancelled positions (0..1)',
  })
  fillRate!: number;

  @ApiPropertyOptional({
    example: 15.5,
    nullable: true,
    description:
      'Average calendar days from requirement date to actual joining date',
  })
  averageDaysToFill!: number | null;

  @ApiProperty({ example: 0, description: 'Requirements with RED handoff SLA' })
  requirementsAtRisk!: number;

  @ApiProperty({ example: 0 })
  cancelledRequirements!: number;

  @ApiProperty({
    example: 0,
    description:
      'Cancelled requirements where TA handoff or candidate sourcing started',
  })
  wastedSourcing!: number;

  @ApiProperty({
    example: 4,
    description: 'Requirements past target closure date with open positions',
  })
  overdueRequirements!: number;
}

export class DashboardStageBreakdownDto {
  @ApiProperty({ example: 'SUBMITTED_TO_SPOC' })
  stageCode!: string;

  @ApiProperty({ example: 'Submitted to SPOC' })
  label!: string;

  @ApiProperty({ example: 2 })
  count!: number;

  @ApiProperty({ example: 0.2857, description: 'Share of candidates (0..1)' })
  percentage!: number;
}

export class DashboardRagBreakdownDto {
  @ApiProperty({ enum: ['GREEN', 'AMBER', 'RED', 'NONE'] })
  rag!: string;

  @ApiProperty({ example: 8 })
  count!: number;

  @ApiProperty({ example: 1, description: 'Share of requirements (0..1)' })
  percentage!: number;
}

export class DashboardClosureBreakdownDto {
  @ApiProperty({
    enum: ['ON_TRACK', 'OVERDUE', 'FILLED', 'CANCELLED', 'ON_HOLD'],
  })
  closureStatus!: string;

  @ApiProperty({ example: 4 })
  count!: number;

  @ApiProperty({ example: 0.5, description: 'Share of requirements (0..1)' })
  percentage!: number;
}

export class DashboardBreakdownsDto {
  @ApiProperty({ type: [DashboardStageBreakdownDto] })
  byStage!: DashboardStageBreakdownDto[];

  @ApiProperty({ type: [DashboardRagBreakdownDto] })
  byRag!: DashboardRagBreakdownDto[];

  @ApiProperty({ type: [DashboardClosureBreakdownDto] })
  byClosureStatus!: DashboardClosureBreakdownDto[];
}

export class DashboardEscalationItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  publicId!: string;

  @ApiProperty()
  roleSkill!: string;

  @ApiProperty()
  client!: string;

  @ApiProperty({ type: String, format: 'date' })
  requirementDate!: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    nullable: true,
  })
  targetClosureDate!: Date | null;

  @ApiProperty()
  openPositions!: number;
}

export class DashboardEscalationsDto {
  @ApiProperty({
    type: [DashboardEscalationItemDto],
    description: 'AMBER handoff SLA requirements',
  })
  atRisk!: DashboardEscalationItemDto[];

  @ApiProperty({
    type: [DashboardEscalationItemDto],
    description: 'RED handoff SLA requirements',
  })
  overdue!: DashboardEscalationItemDto[];

  @ApiProperty({
    type: [DashboardEscalationItemDto],
    description: 'Requirements past target date with open positions',
  })
  closureOverdue!: DashboardEscalationItemDto[];

  @ApiProperty({ type: [DashboardEscalationItemDto] })
  cancelled!: DashboardEscalationItemDto[];

  @ApiProperty({
    type: [DashboardEscalationItemDto],
    description:
      'Cancelled requirements where TA handoff or candidate sourcing started',
  })
  wasted!: DashboardEscalationItemDto[];
}

export class DashboardClientOpenPositionsDto {
  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty({ example: 'Acme Corp' })
  client!: string;

  @ApiProperty({ example: 4 })
  openPositions!: number;
}

export class DashboardClientClosedPositionsDto {
  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty({ example: 'Acme Corp' })
  client!: string;

  @ApiProperty({ example: 2 })
  closedPositions!: number;
}

export class DashboardFilterUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;
}

export class DashboardFilterNamedDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class DashboardFilterPriorityDto {
  @ApiProperty({ example: 'HIGH' })
  code!: string;

  @ApiProperty({ example: 'High' })
  label!: string;
}

export class DashboardFilterOptionsDto {
  @ApiProperty({ type: [DashboardFilterUserDto] })
  taOwners!: DashboardFilterUserDto[];

  @ApiProperty({ type: [DashboardFilterUserDto] })
  salesOwners!: DashboardFilterUserDto[];

  @ApiProperty({ type: [DashboardFilterNamedDto] })
  clients!: DashboardFilterNamedDto[];

  @ApiProperty({ type: [DashboardFilterNamedDto] })
  jobFamilies!: DashboardFilterNamedDto[];

  @ApiProperty({ type: [DashboardFilterPriorityDto] })
  priorities!: DashboardFilterPriorityDto[];
}

export class DashboardListsDto {
  @ApiProperty({
    type: DashboardFilterOptionsDto,
    description: 'Full filter option lists for dashboard dropdowns',
  })
  filters!: DashboardFilterOptionsDto;

  @ApiProperty({
    description: 'All requirements matching current filters',
    type: 'array',
    items: { type: 'object' },
  })
  requirements!: Record<string, unknown>[];

  @ApiProperty({
    description:
      'One row per position slot across non-cancelled requirements (length = summary.totalPositions)',
    type: 'array',
    items: { type: 'object' },
  })
  totalPositions!: Record<string, unknown>[];

  @ApiProperty({
    description:
      'Open (unfilled) position slots (length = per-requirement open slots)',
    type: 'array',
    items: { type: 'object' },
  })
  openPositions!: Record<string, unknown>[];

  @ApiProperty({
    description:
      'Closed positions = JOINED onboardings (length = summary.closedPositions)',
    type: 'array',
    items: { type: 'object' },
  })
  closedPositions!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Per-requirement fill rate breakdown for non-cancelled requirements',
    type: 'array',
    items: { type: 'object' },
  })
  fillRate!: Record<string, unknown>[];

  @ApiProperty({
    description:
      'Joined positions with days-to-fill (used for summary.averageDaysToFill)',
    type: 'array',
    items: { type: 'object' },
  })
  averageDaysToFill!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Requirements pending sales handoff',
    type: 'array',
    items: { type: 'object' },
  })
  pendingSalesHandoff!: Record<string, unknown>[];

  @ApiProperty({
    description:
      'Candidates not yet marked Selected (mutually exclusive funnel stage)',
    type: 'array',
    items: { type: 'object' },
  })
  candidatesInPipeline!: Record<string, unknown>[];

  @ApiProperty({
    description:
      'Selected candidates without RELEASED/ACCEPTED offer and not yet JOINED',
    type: 'array',
    items: { type: 'object' },
  })
  selectedCandidates!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Offers currently RELEASED',
    type: 'array',
    items: { type: 'object' },
  })
  offersReleased!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Offers ACCEPTED and not yet JOINED',
    type: 'array',
    items: { type: 'object' },
  })
  offersAccepted!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Offers DECLINED',
    type: 'array',
    items: { type: 'object' },
  })
  offersRejected!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Joined onboardings',
    type: 'array',
    items: { type: 'object' },
  })
  candidatesJoined!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Cancelled requirements',
    type: 'array',
    items: { type: 'object' },
  })
  cancelledRequirements!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Requirements with RED handoff SLA',
    type: 'array',
    items: { type: 'object' },
  })
  requirementsAtRisk!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Requirements past target closure date with open positions',
    type: 'array',
    items: { type: 'object' },
  })
  overdueRequirements!: Record<string, unknown>[];

  @ApiProperty({
    description:
      'Cancelled requirements where TA handoff or candidate sourcing started',
    type: 'array',
    items: { type: 'object' },
  })
  wastedSourcing!: Record<string, unknown>[];

  @ApiProperty({
    description: 'Duplicate mobile-number groups in the filtered requirements',
    type: 'array',
    items: { type: 'object' },
  })
  duplicateMobiles!: Record<string, unknown>[];
}

export class DashboardDto {
  @ApiProperty({ type: DashboardSummaryDto })
  summary!: DashboardSummaryDto;

  @ApiProperty({ type: DashboardBreakdownsDto })
  breakdowns!: DashboardBreakdownsDto;

  @ApiProperty({ type: DashboardEscalationsDto })
  escalations!: DashboardEscalationsDto;

  @ApiProperty({
    type: [DashboardRagBreakdownDto],
    description: 'Requirement RAG summary (same as breakdowns.byRag)',
  })
  requirementRagSummary!: DashboardRagBreakdownDto[];

  @ApiProperty({
    type: [DashboardClientOpenPositionsDto],
    description: 'Clients with open positions remaining',
  })
  openPositionsOnClient!: DashboardClientOpenPositionsDto[];

  @ApiProperty({
    type: [DashboardClientClosedPositionsDto],
    description: 'Clients with closed (joined) positions',
  })
  closedPositionsOnClient!: DashboardClientClosedPositionsDto[];

  @ApiProperty({
    type: DashboardListsDto,
    description:
      'Full lists for filter options and every KPI (not only counts)',
  })
  lists!: DashboardListsDto;
}
