import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { formatNumber, formatCurrency, formatChartAxisKwh, formatChartAxisSoles } from '../utils/helpers';
import { buildComparacionBarData, hasComparacionVariacion } from '../utils/compareCalculos';
import { DashboardSimpleTooltip, DashboardChartPanel } from './DashboardChartPanel';
import { useBreakpoint } from '../hooks/useBreakpoint';

const formatKwh = (v) => `${formatNumber(v)} kWh`;
const formatSoles = (v) => formatCurrency(v);

const CHART_MARGIN = { top: 8, right: 12, left: 4, bottom: 4 };

function ComparacionYAxis({ axisType = 'number', compact = false }) {
  const formatAxis = axisType === 'kwh'
    ? (v) => formatChartAxisKwh(v, { compact })
    : (v) => formatChartAxisSoles(v, { compact });

  return (
    <YAxis
      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
      tickFormatter={formatAxis}
      width={compact ? 44 : 56}
      allowDecimals={false}
      tickCount={5}
      tickLine={false}
      axisLine={{ stroke: 'var(--border)' }}
    />
  );
}

function ComparacionBarPanel({ title, subtitle, data, formatValue, valueLabel, axisType = 'number', wide = false }) {
  if (!data?.length) return null;

  const breakpoint = useBreakpoint();
  const compact = breakpoint === 'mobile';

  return (
    <DashboardChartPanel title={title} subtitle={subtitle} wide={wide}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <ComparacionYAxis axisType={axisType} compact={compact} />
          <Tooltip content={<DashboardSimpleTooltip formatValue={formatValue} valueLabel={valueLabel} titleKey="name" />} />
          <Bar dataKey="value" name={valueLabel} radius={[4, 4, 0, 0]} maxBarSize={72}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </DashboardChartPanel>
  );
}

function VariacionTooltip({ active, payload, formatValue }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const entry = payload[0];
  return (
    <div className="dashboard-chart-tooltip">
      <p className="dashboard-chart-tooltip__title">{row.name}</p>
      <p className="dashboard-chart-tooltip__row">
        <span className="dashboard-chart-tooltip__dot" style={{ background: entry.color }} aria-hidden />
        <span className="dashboard-chart-tooltip__label">{row.tipo}: </span>
        <strong>{formatValue ? formatValue(row.value, row.name) : row.value}</strong>
      </p>
    </div>
  );
}

function ComparacionVariacionPanel({ data, sinVariacion = false }) {
  const breakpoint = useBreakpoint();
  const compact = breakpoint === 'mobile';

  if (sinVariacion || !data?.length || data.every((d) => (d.value ?? 0) < 0.001)) {
    return (
      <DashboardChartPanel title="Variación (ahorro o aumento)" subtitle="Respecto al recibo o referencia" wide>
        <div className="dashboard-empty dashboard-empty--compact">
          <p>Sin variación entre los escenarios seleccionados.</p>
        </div>
      </DashboardChartPanel>
    );
  }

  const formatVariacion = (v, name) => (
    String(name || '').includes('kWh') ? formatKwh(v) : formatSoles(v)
  );

  return (
    <DashboardChartPanel
      title="Variación (ahorro o aumento)"
      subtitle="Valores absolutos vs recibo/referencia — verde = ahorro, rojo = aumento"
      wide
    >
      <div className="comparacion-variacion-legend" aria-hidden="false">
        <span><i style={{ background: '#10b981' }} /> Ahorro — consumiste o pagaste menos que la referencia</span>
        <span><i style={{ background: '#ef4444' }} /> Aumento — consumiste o pagaste más que la referencia</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <ComparacionYAxis axisType="number" compact={compact} />
          <Tooltip content={<VariacionTooltip formatValue={formatVariacion} />} />
          <Bar dataKey="value" name="Variación" radius={[4, 4, 0, 0]} maxBarSize={72}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </DashboardChartPanel>
  );
}

export default function ComparacionCharts({ comparison, metricas = {} }) {
  if (!comparison) return null;

  const barData = buildComparacionBarData(comparison, metricas);
  const metricFields = [];
  if (metricas.consumoKwh !== false) metricFields.push('consumoMesKwh');
  if (metricas.gastoEnergia !== false) metricFields.push('gastoEnergiaMes');
  if (metricas.totalFactura !== false) metricFields.push('facturaTotalMes');
  if (metricas.ahorroAnual !== false) metricFields.push('facturaTotalAnio');
  const sinVariacion = !hasComparacionVariacion(comparison, metricFields);

  const refSubtitle = comparison.referenciaEsRecibo
    ? 'Escenario estimado vs recibo real'
    : 'Escenario actual vs referencia';

  return (
    <div className="dashboard-charts-grid comparacion-charts-grid">
      {barData.kwh.length > 0 && (
        <ComparacionBarPanel
          title="Consumo mensual (kWh)"
          subtitle={refSubtitle}
          data={barData.kwh}
          formatValue={formatKwh}
          valueLabel="Consumo"
          axisType="kwh"
        />
      )}
      {barData.factura.length > 0 && (
        <ComparacionBarPanel
          title="Total a pagar (S/mes)"
          subtitle="Total facturado del mes — escenario vs recibo/referencia"
          data={barData.factura}
          formatValue={formatSoles}
          valueLabel="Total a pagar"
          axisType="soles"
        />
      )}
      {barData.gasto.length > 0 && (
        <ComparacionBarPanel
          title="Gasto por energía (S/mes)"
          subtitle="Consumo kWh × tarifa — escenario vs recibo/referencia"
          data={barData.gasto}
          formatValue={formatSoles}
          valueLabel="Gasto energía"
          axisType="soles"
        />
      )}
      {barData.ahorro.length > 0 && (
        <ComparacionVariacionPanel data={barData.ahorro} sinVariacion={sinVariacion} />
      )}
    </div>
  );
}
