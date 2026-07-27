/** Client-side fallback for pipeline column derivation (mirrors API). */

export const PIPELINE_COLUMNS = [
  { key: 'SUBMITTED_TO_SPOC', label: 'Submitted' },
  { key: 'CLIENT_SHORTLIST', label: 'Shortlist' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'SELECTED', label: 'Selected' },
  { key: 'OFFER', label: 'Offer' },
  { key: 'ONBOARDING', label: 'Onboarding' },
  { key: 'JOINED', label: 'Joined' },
  { key: 'HOLD', label: 'Hold' },
  { key: 'REJECT', label: 'Reject' },
];

const LABELS = Object.fromEntries(PIPELINE_COLUMNS.map((c) => [c.key, c.label]));

export function derivePipelineStage(candidate) {
  if (candidate?.pipelineStage) {
    return {
      pipelineStage: candidate.pipelineStage,
      pipelineLabel: candidate.pipelineLabel || LABELS[candidate.pipelineStage] || candidate.pipelineStage,
    };
  }

  const onboardingStatus = (candidate?.onboarding?.statusCode || '').toUpperCase();
  if (onboardingStatus === 'JOINED' || onboardingStatus === 'COMPLETED') {
    return { pipelineStage: 'JOINED', pipelineLabel: LABELS.JOINED };
  }
  if (candidate?.onboarding) {
    return { pipelineStage: 'ONBOARDING', pipelineLabel: LABELS.ONBOARDING };
  }
  if (candidate?.offer) {
    return { pipelineStage: 'OFFER', pipelineLabel: LABELS.OFFER };
  }
  if (candidate?.selected) {
    return { pipelineStage: 'SELECTED', pipelineLabel: LABELS.SELECTED };
  }

  const stage = (candidate?.stageCode || candidate?.candidateStage || '').toUpperCase();
  const feedback = (candidate?.feedbackCode || '').toUpperCase();
  if (stage === 'REJECT' || feedback === 'NEGATIVE') {
    return { pipelineStage: 'REJECT', pipelineLabel: LABELS.REJECT };
  }
  if (stage === 'HOLD') {
    return { pipelineStage: 'HOLD', pipelineLabel: LABELS.HOLD };
  }

  const round = (candidate?.interviewRound || '').toUpperCase();
  if (/^L[1-4]$/.test(round) || round === 'COMPLETED') {
    return { pipelineStage: 'INTERVIEW', pipelineLabel: LABELS.INTERVIEW };
  }
  if (stage === 'CLIENT_SHORTLIST') {
    return { pipelineStage: 'CLIENT_SHORTLIST', pipelineLabel: LABELS.CLIENT_SHORTLIST };
  }
  return { pipelineStage: 'SUBMITTED_TO_SPOC', pipelineLabel: LABELS.SUBMITTED_TO_SPOC };
}

export function cardSubtitle(candidate) {
  const { pipelineStage } = derivePipelineStage(candidate);
  if (pipelineStage === 'INTERVIEW' && candidate.interviewRound) {
    return `Round ${candidate.interviewRound}`;
  }
  if (pipelineStage === 'OFFER' && candidate.offer?.statusCode) {
    return `Offer: ${candidate.offer.statusCode}`;
  }
  if (pipelineStage === 'ONBOARDING' || pipelineStage === 'JOINED') {
    const parts = [];
    if (candidate.onboarding?.statusCode) parts.push(candidate.onboarding.statusCode);
    if (candidate.onboarding?.bgvStatusCode) parts.push(`BGV ${candidate.onboarding.bgvStatusCode}`);
    return parts.join(' · ') || LABELS[pipelineStage];
  }
  return candidate.candidateStatus || LABELS[pipelineStage] || '';
}

export function groupByPipelineStage(candidates) {
  const groups = Object.fromEntries(PIPELINE_COLUMNS.map((c) => [c.key, []]));
  for (const cand of candidates || []) {
    const { pipelineStage } = derivePipelineStage(cand);
    if (!groups[pipelineStage]) groups[pipelineStage] = [];
    groups[pipelineStage].push(cand);
  }
  return groups;
}
