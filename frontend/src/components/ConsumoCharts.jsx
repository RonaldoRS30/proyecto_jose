import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { formatChartAxisSoles, formatChartCurrency, formatChartKwh, formatNumber } from '../utils/helpers';
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
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => formatChartAxisSoles(v)} width={52} />
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
        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => formatChartAxisSoles(v)} width={52} />
        <Tooltip content={<DashboardSimpleTooltip formatValue={formatChartCurrency} valueLabel="Gasto" titleKey="periodo" />} />
        <Bar dataKey="gasto" name="Gasto" fill="#1A4AB0" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EvolucionHistorialTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload ?? {};
  const title = row.fechaFull || label;

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

function computeYDomain(values) {
  const nums = values.filter((v) => Number.isFinite(v) && v >= 0);
  if (!nums.length) return [0, 100];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) {
    const pad = Math.max(10, min * 0.15);
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  }
  const span = max - min;
  const pad = Math.max(span * 0.12, 5);
  return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
}

export function EvolucionHistoricaChart({ data, showKwh = true }) {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';
  const soloMoneda = !showKwh;

  const yDomainCost = useMemo(
    () => computeYDomain(data.map((d) => d.gastoMensual)),
    [data],
  );

  const yDomainKwh = useMemo(
    () => (showKwh ? computeYDomain(data.map((d) => d.consumoMes)) : undefined),
    [data, showKwh],
  );

  if (!data?.length) return <div className="empty-state">Sin historial</div>;

  const height = isMobile ? 280 : isTablet ? 300 : 320;
  const tickSize = isMobile ? 10 : 11;
  const yAxisWidth = isMobile ? 44 : isTablet ? 48 : 52;
  const xMinTickGap = isMobile ? 28 : isTablet ? 36 : 48;
  const xAngle = data.length > (isMobile ? 3 : 6) ? (isMobile ? -40 : -25) : 0;
  const xHeight = xAngle ? (isMobile ? 56 : 48) : 28;

  const formatAxisCost = (v) => formatChartAxisSoles(v, { compact: isMobile });

  return (
    <div className="chart-evolucion-wrap">
      {soloMoneda && (
        <p className="chart-axis-hint">Montos en soles (S/)</p>
      )}

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
            top: isMobile ? 10 : 12,
            right: soloMoneda ? 12 : isMobile ? 8 : 20,
            left: isMobile ? 4 : 8,
            bottom: xAngle ? 4 : 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="fecha"
            tick={{ fill: 'var(--text-muted)', fontSize: tickSize }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval="preserveStartEnd"
            minTickGap={xMinTickGap}
            angle={xAngle}
            textAnchor={xAngle ? 'end' : 'middle'}
            height={xHeight}
          />
          {showKwh && (
            <YAxis
              yAxisId="kwh"
              width={yAxisWidth}
              domain={yDomainKwh}
              tickCount={5}
              allowDecimals={false}
              tick={{ fill: '#1A4AB0', fontSize: tickSize }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatChartAxisSoles(v, { compact: isMobile })}
            />
          )}
          <YAxis
            yAxisId="cost"
            orientation={soloMoneda ? 'left' : 'right'}
            width={yAxisWidth}
            domain={yDomainCost}
            tickCount={5}
            allowDecimals={false}
            tick={{ fill: '#10b981', fontSize: tickSize }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxisCost}
          />
          <Tooltip content={<EvolucionHistorialTooltip formatValue={formatTooltipValue} />} />
          {!isMobile && (
            <Legend
              verticalAlign="bottom"
              height={28}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
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
              dot={{ r: isMobile ? 4 : 4, fill: '#1A4AB0', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
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
            dot={{ r: isMobile ? 4 : 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
