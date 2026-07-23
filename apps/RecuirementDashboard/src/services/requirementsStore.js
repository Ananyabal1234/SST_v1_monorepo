// ---------------------------------------------------------------------------
//  Local store for requirements created in this app.
//  The backend exposes a POST to create a requirement but no list endpoint,
//  so we persist created requirements in localStorage. This lets the Sales
//  screen show "My Requirements" immediately after a request is added, and
//  keeps them available across navigation and reloads.
// ---------------------------------------------------------------------------
const KEY = 'added_requirements';

export function getRequirements() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRequirement(req) {
  const list = getRequirements();
  const entry = {
    id: req.id || 'REQ-' + Date.now(),
    status: req.status || 'Submitted',
    createdAt: new Date().toISOString(),
    ...req,
  };
  const next = [entry, ...list];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
