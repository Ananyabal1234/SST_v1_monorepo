/**
 * Shared UI primitives for the design system.
 * Prefer these over ad-hoc class combinations for new code.
 */

export { default as Modal } from './Modal';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}) {
  const classes = ['btn', `btn-${variant}`, size !== 'md' ? `btn-${size}` : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

export function Input({ className = '', ...rest }) {
  return <input className={['field-control', className].filter(Boolean).join(' ')} {...rest} />;
}

export function Select({ className = '', children, ...rest }) {
  return (
    <select className={['field-control', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </select>
  );
}

export function Field({ label, required, children, className = '' }) {
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      {label != null && (
        <span className="field-label">
          {label}
          {required ? <i className="req">*</i> : null}
        </span>
      )}
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'info', className = '' }) {
  const toneClass =
    tone === 'success' || tone === 'green' ? 'status-success' :
    tone === 'warning' || tone === 'amber' ? 'status-warning' :
    tone === 'danger' || tone === 'red' ? 'status-danger' :
    'status-info';
  return (
    <span className={['badge', 'status', toneClass, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={['surface-card', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ icon: Icon, title, subtitle, extra, className = '' }) {
  return (
    <header className={['page-header', className].filter(Boolean).join(' ')}>
      {Icon ? (
        <div className="page-header-badge" aria-hidden="true">
          <Icon />
        </div>
      ) : null}
      <div>
        <h2 className="page-header-title">{title}</h2>
        {subtitle ? <p className="page-header-sub">{subtitle}</p> : null}
      </div>
      {extra ? <div className="page-header-extra">{extra}</div> : null}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')} role="status">
      {Icon ? (
        <div className="empty-state-icon" aria-hidden="true">
          <Icon />
        </div>
      ) : null}
      {title ? <p className="empty-state-title">{title}</p> : null}
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ variant = 'text', className = '', style }) {
  const v =
    variant === 'card' ? 'skeleton-card' :
    variant === 'row' ? 'skeleton-row' :
    variant === 'short' ? 'skeleton-text short' :
    'skeleton-text';
  return <span className={['skeleton', v, className].filter(Boolean).join(' ')} style={style} aria-hidden="true" />;
}

export function SkeletonBlock({ rows = 3, className = '' }) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant={i === rows - 1 ? 'short' : 'text'} />
      ))}
    </div>
  );
}
