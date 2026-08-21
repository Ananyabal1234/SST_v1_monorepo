/**
 * Shared date helpers for API ISO timestamps vs date-only fields.
 * Calendar dates from the API are usually `YYYY-MM-DDT00:00:00.000Z`;
 * formatting via the date portion avoids UTC→local day shifts.
 */

/** YYYY-MM-DD for `<input type="date">`. */
export function toDateInput(value) {
  if (value == null || value === '') return '';
  const s = String(value);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Human-readable date for tables and labels (e.g. "12 Aug 2026"). */
export function formatDate(value, empty = '—') {
  if (value == null || value === '') return empty;
  const isoDay = toDateInput(value);
  if (!isoDay) return empty;
  const [y, mo, d] = isoDay.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Detect API ISO date / datetime strings for generic cell formatters. */
export function isIsoDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(value);
}
