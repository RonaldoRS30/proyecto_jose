import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { formatNumber } from '../utils/helpers';

const COLORS = ['#1A4AB0', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b', '#2563d4'];

function PieTooltip({ active, payload, formatValue }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="dashboard-chart-tooltip">
      <p className="dashboard-chart-tooltip__title">{row.name}</p>
      <p className="dashboard-chart-tooltip__value">
        <span className="dashboard-chart-tooltip__label">Valor: </span>
        <strong>{formatValue ? formatValue(row.value) : formatNumber(row.value)}</strong>
      </p>
      <p className="dashboard-chart-tooltip__value">
        <span className="dashboard-chart-tooltip__label">Participación: </span>
        <strong>{row.percent}%</strong>
      </p>
    </div>
  );
}

export default function DashboardPieChart({
  data = [],
  formatValue,
  emptyMessage = 'Sin datos para mostrar',
  height,
}) {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const chartHeight = height ?? (isMobile ? 260 : 280);
  const outerRadius = isMobile ? 72 : 88;
  const innerRadius = isMobile ? 42 : 52;

  if (!data.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  const renderLabel = isMobile
    ? false
    : ({ name, percent }) => (percent >= 0.08 ? `${name} (${Math.round(percent * 100)}%)` : '');

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          label={renderLabel}
          labelLine={!isMobile}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} stroke="var(--bg-card)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip formatValue={formatValue} />} />
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: isMobile ? 11 : 12, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
