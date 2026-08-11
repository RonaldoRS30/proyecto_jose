import { CalendarDays, RefreshCw } from 'lucide-react';
import { CHART_PERIOD_PRESETS } from '../utils/chartPeriodFilters';

export default function DashboardPeriodFilters({
  presets = CHART_PERIOD_PRESETS,
  preset,
  onPresetChange,
  customDesde,
  customHasta,
  onCustomDesdeChange,
  onCustomHastaChange,
  onCustomApply,
  isCustom,
  onRefresh,
  loading,
  appliedLabel,
}) {
  return (
    <div className="dashboard-chart-filters">
      <div className="dashboard-chart-filters__row dashboard-chart-filters__row--head">
        <CalendarDays size={15} aria-hidden />
        <span className="dashboard-chart-filters__label">Período</span>
        {appliedLabel && (
          <span className="dashboard-period-applied">{appliedLabel}</span>
        )}
        {onRefresh && (
          <button
            type="button"
            className="btn btn-secondary btn-sm dashboard-chart-filters__refresh"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            Actualizar
          </button>
        )}
      </div>
      <div className="dashboard-chart-filters__pills dashboard-chart-filters__pills--wrap">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`dashboard-chart-chip dashboard-chart-chip--sm ${preset === p.value && !isCustom ? 'active' : ''}`}
            onClick={() => onPresetChange(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="dashboard-chart-filters__dates">
        <span>Rango personalizado:</span>
        <input
          type="date"
          className="form-control"
          value={customDesde}
          onChange={(e) => onCustomDesdeChange(e.target.value)}
        />
        <span>→</span>
        <input
          type="date"
          className="form-control"
          value={customHasta}
          onChange={(e) => onCustomHastaChange(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onCustomApply}
          disabled={!customDesde && !customHasta}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
