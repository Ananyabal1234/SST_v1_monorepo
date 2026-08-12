import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Accessible modal with Escape to close, body scroll lock, and basic focus restore.
 * Markup stays compatible with existing .modal-overlay / .modal-card styles.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  cardClassName = '',
  labelledBy,
  closeOnOverlay = true,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);

    // Focus first focusable or dialog itself
    const t = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelector(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (focusable || root).focus?.();
    }, 0);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
        previousFocus.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === 'sm' ? 'modal-sm' :
    size === 'lg' ? 'modal-lg detail-modal' :
    size === 'large' || size === 'xl-wide' ? 'modal-large' :
    size === 'xl' ? 'modal-xl' :
    'modal-md';

  const node = (
    <div
      className={['modal-overlay', className].filter(Boolean).join(' ')}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnOverlay) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={['modal-card', sizeClass, cardClassName].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {title != null && (
          <div className="modal-head">
            <h3 id={titleId}>{title}</h3>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
              ×
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
