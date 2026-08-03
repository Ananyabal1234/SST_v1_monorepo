export function userCredentialsEmail(opts: {
  fullName: string;
  email: string;
  password: string;
  role: string;
  loginUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = 'Your Staffing Tracker account credentials';
  const text = [
    `Hello ${opts.fullName},`,
    '',
    'An account has been created for you on Staffing Tracker.',
    `Username (email): ${opts.email}`,
    `Temporary password: ${opts.password}`,
    `Role: ${opts.role}`,
    '',
    `Sign in: ${opts.loginUrl}`,
    '',
    'Please change your password after first login if your admin requires it.',
  ].join('\n');
  const html = `
    <p>Hello <strong>${escapeHtml(opts.fullName)}</strong>,</p>
    <p>An account has been created for you on Staffing Tracker.</p>
    <ul>
      <li><strong>Username (email):</strong> ${escapeHtml(opts.email)}</li>
      <li><strong>Temporary password:</strong> ${escapeHtml(opts.password)}</li>
      <li><strong>Role:</strong> ${escapeHtml(opts.role)}</li>
    </ul>
    <p><a href="${escapeHtml(opts.loginUrl)}">Sign in to Staffing Tracker</a></p>
  `;
  return { subject, text, html };
}

export function taAssignmentEmail(opts: {
  taName: string;
  publicId: string;
  clientName: string;
  roleSkill: string;
  numberOfPositions: number;
  priorityCode: string;
  salesOwnerName: string;
}): { subject: string; text: string; html: string } {
  const subject = `New requirement assigned: ${opts.publicId}`;
  const text = [
    `Hello ${opts.taName},`,
    '',
    'You have been assigned as TA on a requirement.',
    `Requirement: ${opts.publicId}`,
    `Client: ${opts.clientName}`,
    `Role / Skill: ${opts.roleSkill}`,
    `Positions: ${opts.numberOfPositions}`,
    `Priority: ${opts.priorityCode}`,
    `Sales owner: ${opts.salesOwnerName}`,
  ].join('\n');
  const html = `
    <p>Hello <strong>${escapeHtml(opts.taName)}</strong>,</p>
    <p>You have been assigned as TA on a requirement.</p>
    <ul>
      <li><strong>Requirement:</strong> ${escapeHtml(opts.publicId)}</li>
      <li><strong>Client:</strong> ${escapeHtml(opts.clientName)}</li>
      <li><strong>Role / Skill:</strong> ${escapeHtml(opts.roleSkill)}</li>
      <li><strong>Positions:</strong> ${opts.numberOfPositions}</li>
      <li><strong>Priority:</strong> ${escapeHtml(opts.priorityCode)}</li>
      <li><strong>Sales owner:</strong> ${escapeHtml(opts.salesOwnerName)}</li>
    </ul>
  `;
  return { subject, text, html };
}

export function hrCandidateSelectedEmail(opts: {
  hrName: string;
  candidateName: string;
  candidatePublicId: string;
  requirementPublicId: string;
  roleSkill: string;
  clientName: string;
}): { subject: string; text: string; html: string } {
  const subject = `Candidate selected: ${opts.candidatePublicId} (${opts.requirementPublicId})`;
  const text = [
    `Hello ${opts.hrName},`,
    '',
    'A candidate has been selected and an offer was initiated.',
    `Candidate: ${opts.candidateName} (${opts.candidatePublicId})`,
    `Requirement: ${opts.requirementPublicId}`,
    `Role / Skill: ${opts.roleSkill}`,
    `Client: ${opts.clientName}`,
  ].join('\n');
  const html = `
    <p>Hello <strong>${escapeHtml(opts.hrName)}</strong>,</p>
    <p>A candidate has been selected and an offer was initiated.</p>
    <ul>
      <li><strong>Candidate:</strong> ${escapeHtml(opts.candidateName)} (${escapeHtml(opts.candidatePublicId)})</li>
      <li><strong>Requirement:</strong> ${escapeHtml(opts.requirementPublicId)}</li>
      <li><strong>Role / Skill:</strong> ${escapeHtml(opts.roleSkill)}</li>
      <li><strong>Client:</strong> ${escapeHtml(opts.clientName)}</li>
    </ul>
  `;
  return { subject, text, html };
}

export function candidateJoinedEmail(opts: {
  recipientName: string;
  candidateName: string;
  candidateEmail: string;
  candidateMobile: string;
  candidatePublicId: string;
  requirementPublicId: string;
  roleSkill: string;
  clientName: string;
  doj: string;
  hrOwnerName: string;
  closedCount: number;
  totalPositions: number;
}): { subject: string; text: string; html: string } {
  const subject = `Candidate joined: ${opts.candidateName} (${opts.closedCount}/${opts.totalPositions} — ${opts.requirementPublicId})`;
  const text = [
    `Hello ${opts.recipientName},`,
    '',
    'A candidate has been marked JOINED for this requirement.',
    `Candidate: ${opts.candidateName} (${opts.candidatePublicId})`,
    `Email: ${opts.candidateEmail}`,
    `Mobile: ${opts.candidateMobile}`,
    `Requirement: ${opts.requirementPublicId}`,
    `Client: ${opts.clientName}`,
    `Role / Skill: ${opts.roleSkill}`,
    `DOJ: ${opts.doj}`,
    `HR owner: ${opts.hrOwnerName}`,
    `Positions closed: ${opts.closedCount} of ${opts.totalPositions}`,
  ].join('\n');
  const html = `
    <p>Hello <strong>${escapeHtml(opts.recipientName)}</strong>,</p>
    <p>A candidate has been marked <strong>JOINED</strong> for this requirement.</p>
    <ul>
      <li><strong>Candidate:</strong> ${escapeHtml(opts.candidateName)} (${escapeHtml(opts.candidatePublicId)})</li>
      <li><strong>Email:</strong> ${escapeHtml(opts.candidateEmail)}</li>
      <li><strong>Mobile:</strong> ${escapeHtml(opts.candidateMobile)}</li>
      <li><strong>Requirement:</strong> ${escapeHtml(opts.requirementPublicId)}</li>
      <li><strong>Client:</strong> ${escapeHtml(opts.clientName)}</li>
      <li><strong>Role / Skill:</strong> ${escapeHtml(opts.roleSkill)}</li>
      <li><strong>DOJ:</strong> ${escapeHtml(opts.doj)}</li>
      <li><strong>HR owner:</strong> ${escapeHtml(opts.hrOwnerName)}</li>
      <li><strong>Positions closed:</strong> ${opts.closedCount} of ${opts.totalPositions}</li>
    </ul>
  `;
  return { subject, text, html };
}

/** @deprecated use candidateJoinedEmail */
export function taCandidateJoinedEmail(opts: {
  taName: string;
  candidateName: string;
  candidateEmail: string;
  candidateMobile: string;
  candidatePublicId: string;
  requirementPublicId: string;
  roleSkill: string;
  doj: string;
  hrOwnerName: string;
}): { subject: string; text: string; html: string } {
  return candidateJoinedEmail({
    recipientName: opts.taName,
    candidateName: opts.candidateName,
    candidateEmail: opts.candidateEmail,
    candidateMobile: opts.candidateMobile,
    candidatePublicId: opts.candidatePublicId,
    requirementPublicId: opts.requirementPublicId,
    roleSkill: opts.roleSkill,
    clientName: '—',
    doj: opts.doj,
    hrOwnerName: opts.hrOwnerName,
    closedCount: 0,
    totalPositions: 0,
  });
}

export function salesPositionsClosedEmail(opts: {
  recipientName: string;
  publicId: string;
  roleSkill: string;
  closedCount: number;
  totalPositions: number;
  candidateName: string;
}): { subject: string; text: string; html: string } {
  const subject = `Positions update: ${opts.closedCount} of ${opts.totalPositions} closed (${opts.publicId})`;
  const text = [
    `Hello ${opts.recipientName},`,
    '',
    `${opts.closedCount} of ${opts.totalPositions} positions are now closed for requirement ${opts.publicId}.`,
    `Role / Skill: ${opts.roleSkill}`,
    `Latest joined candidate: ${opts.candidateName}`,
  ].join('\n');
  const html = `
    <p>Hello <strong>${escapeHtml(opts.recipientName)}</strong>,</p>
    <p><strong>${opts.closedCount}</strong> of <strong>${opts.totalPositions}</strong> positions are now closed for requirement <strong>${escapeHtml(opts.publicId)}</strong>.</p>
    <ul>
      <li><strong>Role / Skill:</strong> ${escapeHtml(opts.roleSkill)}</li>
      <li><strong>Latest joined candidate:</strong> ${escapeHtml(opts.candidateName)}</li>
    </ul>
  `;
  return { subject, text, html };
}

export function salesRequirementClosedEmail(opts: {
  recipientName: string;
  publicId: string;
  roleSkill: string;
  clientName: string;
  totalPositions: number;
}): { subject: string; text: string; html: string } {
  const subject = `Requirement closed: ${opts.publicId}`;
  const text = [
    `Hello ${opts.recipientName},`,
    '',
    `Requirement ${opts.publicId} is now CLOSED.`,
    `Client: ${opts.clientName}`,
    `Role / Skill: ${opts.roleSkill}`,
    `Positions filled: ${opts.totalPositions}`,
  ].join('\n');
  const html = `
    <p>Hello <strong>${escapeHtml(opts.recipientName)}</strong>,</p>
    <p>Requirement <strong>${escapeHtml(opts.publicId)}</strong> is now <strong>CLOSED</strong>.</p>
    <ul>
      <li><strong>Client:</strong> ${escapeHtml(opts.clientName)}</li>
      <li><strong>Role / Skill:</strong> ${escapeHtml(opts.roleSkill)}</li>
      <li><strong>Positions filled:</strong> ${opts.totalPositions}</li>
    </ul>
  `;
  return { subject, text, html };
}

export function requirementCreatedEmail(opts: {
  recipientName: string;
  roleLabel: string;
  publicId: string;
  clientName: string;
  roleSkill: string;
  numberOfPositions: number;
  priorityCode: string;
  salesOwnerName: string;
}): { subject: string; text: string; html: string } {
  const subject = `New requirement: ${opts.publicId}`;
  const text = [
    `Hello ${opts.recipientName},`,
    '',
    `A new requirement has been created (${opts.roleLabel}).`,
    `Requirement: ${opts.publicId}`,
    `Client: ${opts.clientName}`,
    `Role / Skill: ${opts.roleSkill}`,
    `Positions: ${opts.numberOfPositions}`,
    `Priority: ${opts.priorityCode}`,
    `Sales owner: ${opts.salesOwnerName}`,
  ].join('\n');
  const html = `
    <p>Hello <strong>${escapeHtml(opts.recipientName)}</strong>,</p>
    <p>A new requirement has been created (<strong>${escapeHtml(opts.roleLabel)}</strong>).</p>
    <ul>
      <li><strong>Requirement:</strong> ${escapeHtml(opts.publicId)}</li>
      <li><strong>Client:</strong> ${escapeHtml(opts.clientName)}</li>
      <li><strong>Role / Skill:</strong> ${escapeHtml(opts.roleSkill)}</li>
      <li><strong>Positions:</strong> ${opts.numberOfPositions}</li>
      <li><strong>Priority:</strong> ${escapeHtml(opts.priorityCode)}</li>
      <li><strong>Sales owner:</strong> ${escapeHtml(opts.salesOwnerName)}</li>
    </ul>
  `;
  return { subject, text, html };
}

export function taLeadAssignmentEmail(opts: {
  leadName: string;
  publicId: string;
  clientName: string;
  roleSkill: string;
  numberOfPositions: number;
  priorityCode: string;
  salesOwnerName: string;
}): { subject: string; text: string; html: string } {
  const subject = `Requirement awaiting TA assignment: ${opts.publicId}`;
  const text = [
    `Hello ${opts.leadName},`,
    '',
    'You have been assigned as TA Lead on a requirement. Please assign TA owner(s).',
    `Requirement: ${opts.publicId}`,
    `Client: ${opts.clientName}`,
    `Role / Skill: ${opts.roleSkill}`,
    `Positions: ${opts.numberOfPositions}`,
    `Priority: ${opts.priorityCode}`,
    `Sales owner: ${opts.salesOwnerName}`,
  ].join('\n');
  const html = `
    <p>Hello <strong>${escapeHtml(opts.leadName)}</strong>,</p>
    <p>You have been assigned as <strong>TA Lead</strong> on a requirement. Please assign TA owner(s).</p>
    <ul>
      <li><strong>Requirement:</strong> ${escapeHtml(opts.publicId)}</li>
      <li><strong>Client:</strong> ${escapeHtml(opts.clientName)}</li>
      <li><strong>Role / Skill:</strong> ${escapeHtml(opts.roleSkill)}</li>
      <li><strong>Positions:</strong> ${opts.numberOfPositions}</li>
      <li><strong>Priority:</strong> ${escapeHtml(opts.priorityCode)}</li>
      <li><strong>Sales owner:</strong> ${escapeHtml(opts.salesOwnerName)}</li>
    </ul>
  `;
  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
