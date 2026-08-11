import DashboardPeriodFilters from './DashboardPeriodFilters';

const MODULO_FILTERS = [
  { id: 'todos', label: 'Todos los módulos' },
  { id: 'aparato', label: 'Electrodomésticos' },
  { id: 'iluminacion', label: 'Iluminación' },
  { id: 'fantasma', label: 'Consumo fantasma' },
];

export default function DashboardChartFilters({
  dataSource,
  onDataSourceChange,
  preset,
  onPresetChange,
  customDesde,
  customHasta,
  onCustomDesdeChange,
  onCustomHastaChange,
  onCustomApply,
  isCustom,
  moduloFilter,
  onModuloFilterChange,
  showModuloFilter,
  onRefresh,
  loading,
}) {
  return (
    <div className="dashboard-chart-filters">
      <div className="dashboard-chart-filters__row">
        <span className="dashboard-chart-filters__label">Fuente</span>
        <div className="dashboard-chart-filters__pills">
          <button
            type="button"
            className={`dashboard-chart-chip ${dataSource === 'actual' ? 'active' : ''}`}
            onClick={() => onDataSourceChange('actual')}
          >
            Cálculo actual
          </button>
          <button
            type="button"
            className={`dashboard-chart-chip ${dataSource === 'historial' ? 'active' : ''}`}
            onClick={() => onDataSourceChange('historial')}
          >
            Historial
          </button>
        </div>
      </div>

      {showModuloFilter && dataSource === 'actual' && (
        <div className="dashboard-chart-filters__row">
          <span className="dashboard-chart-filters__label">Módulo</span>
          <div className="dashboard-chart-filters__pills dashboard-chart-filters__pills--wrap">
            {MODULO_FILTERS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`dashboard-chart-chip dashboard-chart-chip--sm ${moduloFilter === m.id ? 'active' : ''}`}
                onClick={() => onModuloFilterChange(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {dataSource === 'historial' && (
        <DashboardPeriodFilters
          preset={preset}
          onPresetChange={onPresetChange}
          customDesde={customDesde}
          customHasta={customHasta}
          onCustomDesdeChange={onCustomDesdeChange}
          onCustomHastaChange={onCustomHastaChange}
          onCustomApply={onCustomApply}
          isCustom={isCustom}
          onRefresh={onRefresh}
          loading={loading}
        />
      )}
    </div>
  );
}
