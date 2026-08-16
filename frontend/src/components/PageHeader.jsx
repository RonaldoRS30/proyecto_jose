import { MoreHorizontal } from 'lucide-react';

export default function PageHeader({ title, subtitle, action, children }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      {children}

      {action && (
        <>
          <button
            type="button"
            className="btn btn-primary page-header-action-desktop"
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
          >
            {action.icon && <action.icon size={16} />}
            {action.loading && action.loadingLabel ? action.loadingLabel : action.label}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm page-header-action-mobile"
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
            title={action.title}
          >
            {action.icon && <action.icon size={16} />}
            {action.loading && action.loadingLabel ? action.loadingLabel : action.label}
          </button>
        </>
      )}
    </header>
  );
}

export function PageHeaderActions({ children }) {
  return <div className="page-header-actions">{children}</div>;
}
