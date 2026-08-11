/**
 * Navegación por pestañas del dashboard (clics, sin scroll largo).
 */
export default function DashboardTabs({ tabs, activeId, onChange }) {
  return (
    <nav className="dashboard-tabs" aria-label="Secciones del inicio">
      <div className="dashboard-tabs__scroll">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              className={`dashboard-tabs__btn ${isActive ? 'active' : ''}`}
              onClick={() => onChange(tab.id)}
              aria-selected={isActive}
              role="tab"
            >
              {tab.icon && <tab.icon size={16} aria-hidden />}
              <span>{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span className="dashboard-tabs__badge">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
