// Centralized column definitions for the dashboard grid.
// Every screen reuses these so adding/removing a column is a one-line change.

export const DASHBOARD_COLUMNS = [
  { key: 'taOwner', label: 'TA Owner' },
  { key: 'salesOwner', label: 'Sales Owner' },
  { key: 'priority', label: 'Priority' },
  { key: 'client', label: 'Client' },
  { key: 'jobFamily', label: 'Job Family' },
  { key: 'totalRequirements', label: 'Total Requirements' },
  { key: 'totalPositions', label: 'Total Positions' },
  { key: 'openPositions', label: 'Open Positions' },
  { key: 'closedPositions', label: 'Closed Positions' },
  { key: 'pendingSalesHandoff', label: 'Pending Sales Handoff' },
  { key: 'candidatesInPipeline', label: 'Candidates in Pipeline' },
  { key: 'selectedCandidates', label: 'Selected Candidates' },
  { key: 'offersReleased', label: 'Offers Released' },
  { key: 'offersAccepted', label: 'Offers Accepted' },
  { key: 'candidatesJoined', label: 'Candidates Joined' },
  { key: 'offersRejected', label: 'Offers Rejected' },
  { key: 'requirementRag', label: 'Requirement RAG Summary', badge: 'rag' },
];

// Columns shown on the compact role screens (a focused subset).
export const ROLE_COLUMNS = [
  { key: 'client', label: 'Client' },
  { key: 'jobFamily', label: 'Job Family' },
  { key: 'priority', label: 'Priority' },
  { key: 'openPositions', label: 'Open Positions' },
  { key: 'candidatesInPipeline', label: 'Candidates in Pipeline' },
  { key: 'offersReleased', label: 'Offers Released' },
  { key: 'offersAccepted', label: 'Offers Accepted' },
  { key: 'candidatesJoined', label: 'Candidates Joined' },
  { key: 'requirementRag', label: 'RAG', badge: 'rag' },
  { key: 'candidateStage', label: 'Stage', badge: 'stage' },
];
