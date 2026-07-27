/** Derive a single pipeline board column for a candidate row. */

export type PipelineStageCode =
  | 'JOINED'
  | 'ONBOARDING'
  | 'OFFER'
  | 'SELECTED'
  | 'REJECT'
  | 'HOLD'
  | 'INTERVIEW'
  | 'CLIENT_SHORTLIST'
  | 'SUBMITTED_TO_SPOC';

const PIPELINE_LABELS: Record<PipelineStageCode, string> = {
  JOINED: 'Joined',
  ONBOARDING: 'Onboarding',
  OFFER: 'Offer',
  SELECTED: 'Selected',
  REJECT: 'Reject',
  HOLD: 'Hold',
  INTERVIEW: 'Interview',
  CLIENT_SHORTLIST: 'Client Shortlist',
  SUBMITTED_TO_SPOC: 'Submitted to SPOC',
};

export function pipelineLabel(stage: PipelineStageCode): string {
  return PIPELINE_LABELS[stage];
}

export function derivePipelineStage(input: {
  selected?: boolean | null;
  stageCode?: string | null;
  feedbackCode?: string | null;
  interviewRound?: string | null;
  offer?: { statusCode?: string | null } | null;
  onboarding?: { statusCode?: string | null } | null;
}): { pipelineStage: PipelineStageCode; pipelineLabel: string } {
  const onboardingStatus = (input.onboarding?.statusCode ?? '').toUpperCase();
  if (onboardingStatus === 'JOINED' || onboardingStatus === 'COMPLETED') {
    return { pipelineStage: 'JOINED', pipelineLabel: PIPELINE_LABELS.JOINED };
  }
  if (input.onboarding) {
    return {
      pipelineStage: 'ONBOARDING',
      pipelineLabel: PIPELINE_LABELS.ONBOARDING,
    };
  }
  if (input.offer) {
    return { pipelineStage: 'OFFER', pipelineLabel: PIPELINE_LABELS.OFFER };
  }
  if (input.selected) {
    return {
      pipelineStage: 'SELECTED',
      pipelineLabel: PIPELINE_LABELS.SELECTED,
    };
  }

  const stage = (input.stageCode ?? '').toUpperCase();
  const feedback = (input.feedbackCode ?? '').toUpperCase();
  if (stage === 'REJECT' || feedback === 'NEGATIVE') {
    return { pipelineStage: 'REJECT', pipelineLabel: PIPELINE_LABELS.REJECT };
  }
  if (stage === 'HOLD') {
    return { pipelineStage: 'HOLD', pipelineLabel: PIPELINE_LABELS.HOLD };
  }

  const round = (input.interviewRound ?? '').toUpperCase();
  if (/^L[1-4]$/.test(round) || round === 'COMPLETED') {
    return {
      pipelineStage: 'INTERVIEW',
      pipelineLabel: PIPELINE_LABELS.INTERVIEW,
    };
  }
  if (stage === 'CLIENT_SHORTLIST') {
    return {
      pipelineStage: 'CLIENT_SHORTLIST',
      pipelineLabel: PIPELINE_LABELS.CLIENT_SHORTLIST,
    };
  }
  return {
    pipelineStage: 'SUBMITTED_TO_SPOC',
    pipelineLabel: PIPELINE_LABELS.SUBMITTED_TO_SPOC,
  };
}
