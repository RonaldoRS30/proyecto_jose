import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { formatNumber, formatCurrency } from '../utils/helpers';
import { hasComparacionVariacion } from '../utils/compareCalculos';
import { DashboardSimpleTooltip, DashboardChartPanel } from './DashboardChartPanel';

const formatKwh = (v) => `${formatNumber(v)} kWh`;
const formatSoles = (v) => formatCurrency(v);

function ComparacionBarPanel({ title, subtitle, data, formatValue, valueLabel, wide = false }) {
  if (!data?.length) {
    return (
      <DashboardChartPanel title={title} subtitle={subtitle} wide={wide}>
        <div className="dashboard-empty dashboard-empty--compact"><p>Sin datos para comparar.</p></div>
      </DashboardChartPanel>
    );
  }

  return (
    <DashboardChartPanel title={title} subtitle={subtitle} wide={wide}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} width={56} />
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
  if (sinVariacion || !data?.length || data.every((d) => (d.value ?? 0) < 0.001)) {
    return (
      <DashboardChartPanel title="Variación (ahorro o aumento)" subtitle="Respecto al reporte de referencia" wide>
        <div className="dashboard-empty dashboard-empty--compact">
          <p>Sin variación entre los cálculos seleccionados.</p>
          <p style={{ fontSize: '0.8125rem', marginTop: '0.35rem' }}>
            Elija otro cálculo de referencia para ver diferencias.
          </p>
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
      subtitle="Valores absolutos respecto a la referencia — ver leyenda de colores"
      wide
    >
      <div className="comparacion-variacion-legend" aria-hidden="false">
        <span><i style={{ background: '#10b981' }} /> Ahorro — consumiste menos que la referencia</span>
        <span><i style={{ background: '#ef4444' }} /> Aumento — consumiste más que la referencia</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} width={56} />
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

export default function ComparacionCharts({ comparison }) {
  if (!comparison) return null;

  const sinVariacion = !hasComparacionVariacion(comparison);

  const kwhData = [
    { name: 'Actual', value: comparison.consumoMesKwh.actual, fill: '#1A4AB0' },
    { name: 'Referencia', value: comparison.consumoMesKwh.referencia, fill: '#64748b' },
  ];

  const facturaData = [
    { name: 'Actual', value: comparison.facturaTotalMes.actual, fill: '#10b981' },
    { name: 'Referencia', value: comparison.facturaTotalMes.referencia, fill: '#94a3b8' },
  ];

  const ahorroData = [
    {
      name: 'kWh/mes',
      value: Math.abs(comparison.consumoMesKwh.ahorro),
      fill: comparison.consumoMesKwh.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.consumoMesKwh.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    },
    {
      name: 'S/ factura/mes',
      value: Math.abs(comparison.facturaTotalMes.ahorro),
      fill: comparison.facturaTotalMes.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.facturaTotalMes.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    },
    {
      name: 'S/ energía/año',
      value: Math.abs(comparison.gastoEnergiaAnio.ahorro),
      fill: comparison.gastoEnergiaAnio.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.gastoEnergiaAnio.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    },
  ];

  return (
    <div className="dashboard-charts-grid comparacion-charts-grid">
      <ComparacionBarPanel
        title="Consumo mensual (kWh)"
        subtitle="Reporte actual vs reporte de referencia"
        data={kwhData}
        formatValue={formatKwh}
        valueLabel="Consumo"
      />
      <ComparacionBarPanel
        title="Total factura mensual (S/)"
        subtitle="Total del mes (energía + cargos + IGV) — actual vs referencia"
        data={facturaData}
        formatValue={formatSoles}
        valueLabel="Total factura"
      />
      <ComparacionVariacionPanel data={ahorroData} sinVariacion={sinVariacion} />
    </div>
  );
}
