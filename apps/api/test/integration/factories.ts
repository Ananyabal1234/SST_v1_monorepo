import { api, ensureUser, login, QA_PASS, unwrap, adminSession } from './helpers';

export type RoleKey =
  | 'ADMIN'
  | 'SALES'
  | 'SALES_LEAD'
  | 'TA'
  | 'TA_LEAD'
  | 'HR'
  | 'HR_LEAD';

export type Persona = {
  id: string;
  email: string;
  role: RoleKey;
  token: string;
};

export const PERSONA_DEFS: {
  email: string;
  fullName: string;
  role: Exclude<RoleKey, 'ADMIN'>;
}[] = [
  { email: 'qa.sales@sst.test', fullName: 'QA Sales', role: 'SALES' },
  {
    email: 'qa.saleslead@sst.test',
    fullName: 'QA Sales Lead',
    role: 'SALES_LEAD',
  },
  { email: 'qa.ta@sst.test', fullName: 'QA TA', role: 'TA' },
  { email: 'qa.talead@sst.test', fullName: 'QA TA Lead', role: 'TA_LEAD' },
  { email: 'qa.hr@sst.test', fullName: 'QA HR', role: 'HR' },
  { email: 'qa.hrlead@sst.test', fullName: 'QA HR Lead', role: 'HR_LEAD' },
];

export function uniqueSuffix() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function bootstrapPersonas(): Promise<{
  adminToken: string;
  personas: Record<RoleKey, Persona>;
  clientId: string;
  jobFamilyId: string;
}> {
  const admin = await adminSession();
  const adminToken = admin.accessToken;
  const personas = {
    ADMIN: {
      id: admin.user.id,
      email: admin.user.email,
      role: 'ADMIN' as const,
      token: adminToken,
    },
  } as Record<RoleKey, Persona>;

  for (const def of PERSONA_DEFS) {
    const user = await ensureUser(
      adminToken,
      def.email,
      def.fullName,
      def.role,
    );
    const sess = await login(def.email, QA_PASS);
    personas[def.role] = {
      id: user.id,
      email: def.email,
      role: def.role,
      token: sess.accessToken,
    };
  }

  const { clientId, jobFamilyId } = await ensureClientAndJobFamily(adminToken);
  return { adminToken, personas, clientId, jobFamilyId };
}

export async function ensureClientAndJobFamily(adminToken: string) {
  const clientsRes = await api('GET', '/master-data/clients', {
    token: adminToken,
  });
  const clientsRaw = unwrap<any>(clientsRes.data);
  const clients = Array.isArray(clientsRaw)
    ? clientsRaw
    : (clientsRaw?.data ?? []);
  let client = clients.find((c: any) => c.name === 'QA Client Alpha');
  if (!client) {
    const c = await api('POST', '/master-data/clients', {
      token: adminToken,
      body: { name: 'QA Client Alpha' },
    });
    client = unwrap(c.data);
  }

  const jfRes = await api('GET', '/master-data/job-families', {
    token: adminToken,
  });
  const jfRaw = unwrap<any>(jfRes.data);
  const jfs = Array.isArray(jfRaw) ? jfRaw : (jfRaw?.data ?? []);
  let jf = jfs.find((j: any) => j.name === 'QA Engineering');
  if (!jf) {
    const j = await api('POST', '/master-data/job-families', {
      token: adminToken,
      body: { name: 'QA Engineering' },
    });
    jf = unwrap(j.data);
  }

  return { clientId: client.id as string, jobFamilyId: jf.id as string };
}

export async function createRequirement(
  token: string,
  body: Record<string, unknown>,
) {
  const res = await api('POST', '/requirements', { token, body });
  return { status: res.status, row: unwrap<any>(res.data), raw: res.data };
}

export async function createActiveAssignedRequirement(opts: {
  sales: Persona;
  ta: Persona;
  taLead?: Persona;
  clientId: string;
  jobFamilyId: string;
  positions?: number;
  roleSkill?: string;
}) {
  const created = await createRequirement(opts.sales.token, {
    requirementDate: new Date().toISOString().slice(0, 10),
    clientId: opts.clientId,
    roleSkill: opts.roleSkill ?? `QA AF ${uniqueSuffix()}`,
    jobFamilyId: opts.jobFamilyId,
    numberOfPositions: opts.positions ?? 2,
    salesOwnerId: opts.sales.id,
    priorityCode: 'HIGH',
    taLeadIds: opts.taLead ? [opts.taLead.id] : undefined,
  });
  if (created.status >= 400) {
    throw new Error(`create requirement failed: ${created.status}`);
  }
  const patchToken = opts.taLead?.token ?? opts.sales.token;
  const patch = await api('PATCH', `/requirements/${created.row.id}`, {
    token: patchToken,
    body: {
      taOwnerIds: [opts.ta.id],
      taHandoffDate: new Date().toISOString().slice(0, 10),
    },
  });
  if (patch.status >= 400) {
    // Sales can assign owners if lead patch fails
    await api('PATCH', `/requirements/${created.row.id}`, {
      token: opts.sales.token,
      body: {
        taOwnerIds: [opts.ta.id],
        taHandoffDate: new Date().toISOString().slice(0, 10),
      },
    });
  }
  const get = await api('GET', `/requirements/${created.row.id}`, {
    token: opts.sales.token,
  });
  return unwrap<any>(get.data);
}

export async function addCandidate(
  taToken: string,
  requirementId: string,
  overrides: Record<string, unknown> = {},
) {
  const u = uniqueSuffix();
  const res = await api('POST', '/candidates', {
    token: taToken,
    body: {
      requirementId,
      name: `Cand ${u}`,
      mobile: `9${u.replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`,
      email: `cand.${u}@sst.test`,
      stageCode: 'SUBMITTED_TO_SPOC',
      ...overrides,
    },
  });
  return { status: res.status, row: unwrap<any>(res.data) };
}

export async function selectWithEligibleLoi(taToken: string, candidateId: string) {
  await api('POST', `/candidates/${candidateId}/select`, {
    token: taToken,
    body: { selected: true },
  });
  const patched = await api('PATCH', `/candidates/${candidateId}`, {
    token: taToken,
    body: { loiStatus: 'RECEIVED' },
  });
  const row = unwrap<any>(patched.data);
  let offerId = row?.offer?.id ?? row?.offerId;
  if (!offerId) {
    const one = await api('GET', `/candidates/${candidateId}`, {
      token: taToken,
    });
    offerId = unwrap<any>(one.data)?.offer?.id;
  }
  return { offerId, candidate: row };
}

export async function ensureOfferReleased(
  hrToken: string,
  candidateId: string,
  existingOfferId?: string,
) {
  let offerId = existingOfferId;
  if (!offerId) {
    const created = await api('POST', '/offers', {
      token: hrToken,
      body: {
        candidateId,
        statusCode: 'RELEASED',
        ctcRate: '10 LPA',
        expectedDoj: new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10),
      },
    });
    if ([200, 201].includes(created.status)) {
      offerId = unwrap<any>(created.data).id;
    } else if (created.status === 409) {
      const list = await api('GET', '/offers?pageSize=50', { token: hrToken });
      const body = unwrap<any>(list.data);
      const arr = Array.isArray(body) ? body : (body?.items ?? body?.data ?? []);
      offerId = arr.find((o: any) => o.candidateId === candidateId)?.id;
    }
  } else {
    await api('PATCH', `/offers/${offerId}`, {
      token: hrToken,
      body: { statusCode: 'RELEASED', ctcRate: '10 LPA' },
    });
  }
  return offerId as string;
}

export async function acceptOffer(hrToken: string, offerId: string) {
  return api('POST', `/offers/${offerId}/status`, {
    token: hrToken,
    body: { statusCode: 'ACCEPTED' },
  });
}

export async function resolveOnboardingId(hrToken: string, offerId: string) {
  const created = await api('POST', '/onboardings', {
    token: hrToken,
    body: {
      offerId,
      hrOwnerId: undefined,
      bgvStatusCode: 'NOT_STARTED',
      onboardingStatus: 'DOCS_PENDING',
    },
  });
  // hrOwnerId required — caller should pass; this helper lists instead
  void created;
  const list = await api('GET', '/onboardings?pageSize=50', { token: hrToken });
  const body = list.data;
  const arr =
    body?.items ??
    body?.data?.items ??
    (Array.isArray(body?.data) ? body.data : null) ??
    (Array.isArray(body) ? body : []);
  return (
    arr.find((o: any) => o.offerId === offerId || o.offer?.id === offerId)?.id ??
    null
  );
}

export async function createOnboarding(
  hr: Persona,
  offerId: string,
) {
  const res = await api('POST', '/onboardings', {
    token: hr.token,
    body: {
      offerId,
      hrOwnerId: hr.id,
      bgvStatusCode: 'NOT_STARTED',
      onboardingStatus: 'DOCS_PENDING',
      docsPending: true,
    },
  });
  let onbId = [200, 201].includes(res.status)
    ? unwrap<any>(res.data)?.id
    : undefined;
  if (!onbId) {
    const list = await api('GET', '/onboardings?pageSize=50', {
      token: hr.token,
    });
    const body = list.data;
    const arr =
      body?.items ??
      body?.data?.items ??
      (Array.isArray(body?.data) ? body.data : null) ??
      (Array.isArray(body) ? body : []);
    onbId = arr.find(
      (o: any) => o.offerId === offerId || o.offer?.id === offerId,
    )?.id;
  }
  if (!onbId) {
    const offerGet = unwrap<any>(
      (await api('GET', `/offers/${offerId}`, { token: hr.token })).data,
    );
    onbId = offerGet?.onboarding?.id ?? offerGet?.onboardingId;
  }
  return { status: res.status, onbId, raw: res.data };
}
