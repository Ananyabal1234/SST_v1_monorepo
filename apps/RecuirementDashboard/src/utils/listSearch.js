import { useEffect, useState } from 'react';

export function matchesQuery(query, ...values) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => String(v ?? '').toLowerCase().includes(q));
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
