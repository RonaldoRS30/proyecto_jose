import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { formatChartCurrency, formatChartKwh, formatNumber } from '../utils/helpers';
import { DashboardSimpleTooltip, DashboardMultiTooltip } from './DashboardChartPanel';

const COLORS = ['#1A4AB0', '#2563d4', '#C0C0C0', '#10b981', '#f59e0b', '#64748b'];

const formatTooltipValue = (value, name) => {
  if (name === 'kWh/mes' || name === 'Consumo mensual') return formatChartKwh(value);
  if (name === 'S/ mes' || name?.includes('Gasto')) return formatChartCurrency(value);
  return formatNumber(value);
};

export function ConsumoPorEquipoChart({ data }) {
  if (!data?.length) return <div className="empty-state">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.slice(0, 10)} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => formatNumber(v)} />
        <YAxis dataKey="nombre" type="category" width={120} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <Tooltip content={<DashboardSimpleTooltip formatValue={formatChartKwh} valueLabel="Consumo mensual" titleKey="nombre" />} />
        <Bar dataKey="consumoMes" name="Consumo mensual" fill="#1A4AB0" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConsumoPorCategoriaChart({ data }) {
  if (!data?.length) return <div className="empty-state">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, value }) => `${name}: ${formatNumber(value)}`}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<DashboardSimpleTooltip formatValue={(v) => `${formatNumber(v)} kWh`} valueLabel="Consumo mensual" />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ConsumoMensualChart({ data }) {
  if (!data?.length) return <div className="empty-state">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="modulo" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip content={<DashboardMultiTooltip formatValue={formatTooltipValue} />} />
        <Legend />
        <Bar dataKey="consumoMes" name="Consumo (kWh/mes)" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gastoMensual" name="Gasto (S/ mes)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GastoPorEquipoChart({ data }) {
  if (!data?.length) return <div className="empty-state">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.slice(0, 8)}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="nombre" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `S/${formatNumber(v)}`} />
        <Tooltip content={<DashboardMultiTooltip formatValue={formatTooltipValue} />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="gastoDiario" name="Gasto diario" fill="#2563d4" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gastoMensual" name="Gasto mensual" fill="#1A4AB0" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gastoAnual" name="Gasto anual" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GastoResumenChart({ data }) {
  if (!data?.length) return <div className="empty-state">Sin datos</div>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="periodo" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `S/${formatNumber(v)}`} />
        <Tooltip content={<DashboardSimpleTooltip formatValue={formatChartCurrency} valueLabel="Gasto" titleKey="periodo" />} />
        <Bar dataKey="gasto" name="Gasto" fill="#1A4AB0" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EvolucionHistoricaChart({ data, showKwh = true }) {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';
  const soloMoneda = !showKwh;

  if (!data?.length) return <div className="empty-state">Sin historial</div>;

  const height = isMobile ? 300 : isTablet ? 320 : 340;
  const tickSize = isMobile ? 10 : 11;
  const yAxisWidth = isMobile ? 36 : 48;

  return (
    <div className="chart-evolucion-wrap">
      {isMobile && (
        <div className="chart-legend-external">
          {showKwh && (
            <span className="chart-legend-item">
              <i className="chart-legend-dot" style={{ background: '#1A4AB0' }} />
              kWh/mes
            </span>
          )}
          <span className="chart-legend-item">
            <i className="chart-legend-dot" style={{ background: '#10b981' }} />
            S/ mes
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{
            top: isMobile ? 8 : 12,
            right: isMobile ? 8 : soloMoneda ? 8 : 16,
            left: isMobile ? -8 : 0,
            bottom: isMobile ? 4 : 8,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="fecha"
            tick={{ fill: 'var(--text-muted)', fontSize: tickSize }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={0}
            angle={data.length > 4 && isMobile ? -35 : 0}
            textAnchor={data.length > 4 && isMobile ? 'end' : 'middle'}
            height={data.length > 4 && isMobile ? 50 : 30}
          />
          {showKwh && (
            <YAxis
              yAxisId="kwh"
              width={yAxisWidth}
              tick={{ fill: '#1A4AB0', fontSize: tickSize }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (isMobile && v >= 1000 ? `${(v / 1000).toFixed(3)}k` : formatNumber(v))}
            />
          )}
          <YAxis
            yAxisId="cost"
            orientation={soloMoneda ? 'left' : 'right'}
            width={yAxisWidth}
            tick={{ fill: '#10b981', fontSize: tickSize }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (isMobile ? formatNumber(v) : formatChartCurrency(v))}
          />
          <Tooltip content={<DashboardMultiTooltip formatValue={formatTooltipValue} />} />
          {!isMobile && (
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
            />
          )}
          {showKwh && (
            <Line
              yAxisId="kwh"
              type="monotone"
              dataKey="consumoMes"
              name="kWh/mes"
              stroke="#1A4AB0"
              strokeWidth={2}
              dot={{ r: isMobile ? 5 : 4, fill: '#1A4AB0', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 7 }}
              connectNulls
            />
          )}
          <Line
            yAxisId="cost"
            type="monotone"
            dataKey="gastoMensual"
            name="S/ mes"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: isMobile ? 5 : 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 7 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
