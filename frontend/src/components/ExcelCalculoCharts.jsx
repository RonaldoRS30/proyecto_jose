import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ComposedChart, Line, Cell, Legend,
} from 'recharts';
import { formatNumber, formatCurrency, formatChartAxisSoles } from '../utils/helpers';
import { toPieChartData } from '../utils/chartPieData';
import {
  buildSubtotalCompositionData,
  buildFacturaStepsData,
  buildTotalFacturaPieData,
  EXCEL_CHART_COLORS,
} from '../utils/excelChartData';
import { DashboardMesTooltip, DashboardChartPanel, DashboardSimpleTooltip } from './DashboardChartPanel';
import DashboardPieChart from './DashboardPieChart';

const formatKwh = (v) => `${formatNumber(v)} kWh`;
const formatSoles = (v) => formatCurrency(v);

/** Eje Y/X en soles: sin decimales y compacto (ej. 260k) para lectura clara */
const formatAxisSolesTick = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'S/ 0';
  const compact = Math.abs(n) >= 1000;
  const formatted = formatChartAxisSoles(n, { compact });
  return `S/ ${formatted}`;
};

const CHART_Y_AXIS_SOLES = {
  width: 72,
  tick: { fill: 'var(--text-muted)', fontSize: 11 },
  tickFormatter: formatAxisSolesTick,
  tickMargin: 6,
};

export function ExcelSubtotalItemsBar({ factura, title, subtitle }) {
  const data = useMemo(() => buildSubtotalCompositionData(factura), [factura]);

  if (!data.length) {
    return (
      <DashboardChartPanel title={title} subtitle={subtitle}>
        <div className="dashboard-empty dashboard-empty--compact"><p>Sin líneas de subtotal.</p></div>
      </DashboardChartPanel>
    );
  }

  return (
    <DashboardChartPanel title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={formatAxisSolesTick} />
          <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={130} />
          <Tooltip content={<DashboardSimpleTooltip formatValue={formatSoles} />} />
          <Bar dataKey="value" name="Monto" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </DashboardChartPanel>
  );
}

export function ExcelFacturaStepsBar({ factura, title, subtitle }) {
  const data = useMemo(() => buildFacturaStepsData(factura), [factura]);

  if (!data.length) {
    return (
      <DashboardChartPanel title={title} subtitle={subtitle}>
        <div className="dashboard-empty dashboard-empty--compact"><p>Sin total de factura.</p></div>
      </DashboardChartPanel>
    );
  }

  return (
    <DashboardChartPanel title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} interval={0} />
          <YAxis {...CHART_Y_AXIS_SOLES} />
          <Tooltip content={<DashboardSimpleTooltip formatValue={formatSoles} />} />
          <Bar dataKey="value" name="Monto" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </DashboardChartPanel>
  );
}

export function ExcelTotalFacturaPie({ factura, title, subtitle }) {
  const pieData = useMemo(
    () => toPieChartData(buildTotalFacturaPieData(factura)),
    [factura],
  );

  return (
    <DashboardChartPanel title={title} subtitle={subtitle}>
      <DashboardPieChart
        data={pieData}
        formatValue={formatSoles}
        emptyMessage="Sin desglose del total de factura"
      />
    </DashboardChartPanel>
  );
}

export function ExcelFacturaTrendChart({ data = [], title, subtitle, wide = false }) {
  if (!data.length) return null;

  return (
    <DashboardChartPanel title={title} subtitle={subtitle} wide={wide}>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="mesLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis
            yAxisId="kwh"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickFormatter={(v) => formatNumber(v)}
            width={48}
          />
          <YAxis
            yAxisId="soles"
            orientation="right"
            width={72}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            tickFormatter={formatAxisSolesTick}
            tickMargin={6}
          />
          <Tooltip
            content={(
              <DashboardMesTooltip
                formatValue={(v, name) => (
                  String(name || '').toLowerCase().includes('kwh') || String(name || '').toLowerCase().includes('consumo')
                    ? formatKwh(v)
                    : formatSoles(v)
                )}
              />
            )}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            yAxisId="kwh"
            type="monotone"
            dataKey="consumoKwh"
            name="Consumo kWh prom."
            stroke={EXCEL_CHART_COLORS.c43}
            fill={EXCEL_CHART_COLORS.c43}
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="soles"
            type="monotone"
            dataKey="totalMes"
            name="Total factura prom."
            stroke={EXCEL_CHART_COLORS.total}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="soles"
            type="monotone"
            dataKey="subtotal"
            name="Subtotal prom."
            stroke={EXCEL_CHART_COLORS.subtotal}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </DashboardChartPanel>
  );
}

export function ExcelSubtotalTrendArea({ data = [], title, subtitle, wide = false }) {
  if (!data.length) return null;

  return (
    <DashboardChartPanel title={title} subtitle={subtitle} wide={wide}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="excelIgvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={EXCEL_CHART_COLORS.igv} stopOpacity={0.35} />
              <stop offset="95%" stopColor={EXCEL_CHART_COLORS.igv} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="mesLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis width={72} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={formatAxisSolesTick} tickMargin={6} />
          <Tooltip content={<DashboardMesTooltip formatValue={formatSoles} />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="subtotal" name="Subtotal" stroke={EXCEL_CHART_COLORS.subtotal} fill="transparent" strokeWidth={2} />
          <Area type="monotone" dataKey="igv" name="IGV" stroke={EXCEL_CHART_COLORS.igv} fill="url(#excelIgvGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="totalMes" name="Total factura" stroke={EXCEL_CHART_COLORS.total} fill="transparent" strokeWidth={2} strokeDasharray="5 3" />
        </AreaChart>
      </ResponsiveContainer>
    </DashboardChartPanel>
  );
}

/** Bloque reutilizable de gráficos Excel (factura promedio + tendencias) */
export default function ExcelCalculoChartsBlock({
  facturaPromedio,
  facturaTrend = [],
  showTrends = true,
}) {
  return (
    <>
      {showTrends && facturaTrend.length > 0 && (
        <>
          <ExcelFacturaTrendChart
            data={facturaTrend}
            title="Consumo kWh vs total de factura"
            subtitle="Evolución mensual del consumo y el monto estimado a pagar"
            wide
          />
          <ExcelSubtotalTrendArea
            data={facturaTrend}
            title="Subtotal, IGV y total por mes"
            subtitle="Promedio de subtotal, impuesto y total en cada mes"
            wide
          />
        </>
      )}

      <ExcelSubtotalItemsBar
        factura={facturaPromedio}
        title="Detalle línea por línea"
        subtitle="Cada componente del subtotal en soles o kWh"
      />

      <ExcelFacturaStepsBar
        factura={facturaPromedio}
        title="Hacia el total del mes"
        subtitle="Subtotal → IGV → Electrificación rural → Total a pagar"
      />

      <ExcelTotalFacturaPie
        factura={facturaPromedio}
        title="Partes del total de factura"
        subtitle="Proporción entre subtotal, IGV y electrificación rural"
      />
    </>
  );
}