import { useEffect } from 'react';

/** Close dialogs on Escape when `active` is true. */
export function useEscapeKey(active, onEscape) {
  useEffect(() => {
    if (!active || typeof onEscape !== 'function') return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onEscape]);
}
