export const chartTooltipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '13px',
  boxShadow: 'var(--shadow)',
  color: 'var(--text)',
};

/** Tooltip para barras con un solo valor (evita mostrar "value" genérico). */
export function DashboardSimpleTooltip({
  active,
  payload,
  label,
  formatValue,
  valueLabel,
  titleKey = 'name',
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload ?? {};
  const entry = payload[0];
  const title = row[titleKey] ?? label ?? row.nombre ?? row.name ?? row.shortName ?? row.mesLabel;
  const seriesLabel = (
    entry.name && entry.name !== 'value' && entry.name !== title
      ? entry.name
      : valueLabel
  );
  const value = entry.value ?? row.value;

  return (
    <div className="dashboard-chart-tooltip">
      {title && <p className="dashboard-chart-tooltip__title">{title}</p>}
      <p className="dashboard-chart-tooltip__value">
        {seriesLabel && (
          <span className="dashboard-chart-tooltip__label">{seriesLabel}: </span>
        )}
        <strong>{formatValue ? formatValue(value, seriesLabel || title) : value}</strong>
      </p>
    </div>
  );
}

/** Tooltip para gráficos con varias series en un mismo punto. */
export function DashboardMultiTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload ?? {};
  const title = label || row.mesLabel || row.mes || row.nombre || row.name || row.periodo;

  return (
    <div className="dashboard-chart-tooltip">
      {title && <p className="dashboard-chart-tooltip__title">{title}</p>}
      {payload.map((entry) => {
        const name = entry.name && entry.name !== 'value' ? entry.name : 'Valor';
        return (
          <p key={`${entry.dataKey}-${name}`} className="dashboard-chart-tooltip__row">
            <span className="dashboard-chart-tooltip__dot" style={{ background: entry.color }} aria-hidden />
            <span className="dashboard-chart-tooltip__label">{name}: </span>
            <strong>{formatValue ? formatValue(entry.value, name) : entry.value}</strong>
          </p>
        );
      })}
    </div>
  );
}

/** Tooltip para barras apiladas — muestra solo el segmento bajo el cursor. */
export function DashboardStackedTooltip({ active, payload, labelMap, formatValue, title = 'Composición' }) {
  if (!active || !payload?.length) return null;

  const entry = [...payload].reverse().find((p) => p.value != null && Number(p.value) > 0) ?? payload[payload.length - 1];
  if (!entry) return null;

  const segmentLabel = labelMap?.[entry.dataKey] || entry.name || 'Valor';

  return (
    <div className="dashboard-chart-tooltip">
      <p className="dashboard-chart-tooltip__title">{title}</p>
      <p className="dashboard-chart-tooltip__row">
        <span className="dashboard-chart-tooltip__dot" style={{ background: entry.color }} aria-hidden />
        <span className="dashboard-chart-tooltip__label">{segmentLabel}: </span>
        <strong>{formatValue ? formatValue(entry.value, segmentLabel) : entry.value}</strong>
      </p>
    </div>
  );
}

export function DashboardMesTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload ?? {};
  const title = label || row.mesLabel || row.mes || 'Período';

  return (
    <div className="dashboard-chart-tooltip">
      <p className="dashboard-chart-tooltip__title">{title}</p>
      {payload.map((entry) => {
        const name = entry.name && entry.name !== 'value' ? entry.name : 'Valor';
        return (
          <p key={`${entry.dataKey}-${name}`} className="dashboard-chart-tooltip__row">
            <span className="dashboard-chart-tooltip__dot" style={{ background: entry.color }} aria-hidden />
            <span className="dashboard-chart-tooltip__label">{name}: </span>
            <strong>{formatValue ? formatValue(entry.value, name) : entry.value}</strong>
          </p>
        );
      })}
    </div>
  );
}

export function DashboardChartPanel({ title, subtitle, children, wide = false }) {
  return (
    <div className={`card card-chart dashboard-chart-panel ${wide ? 'dashboard-chart-panel--wide' : ''}`}>
      <div className="dashboard-chart-panel__head">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="card-body dashboard-chart-panel__body">{children}</div>
    </div>
  );
}
