import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { formatNumber } from '../utils/helpers';
import { DashboardMesTooltip, DashboardChartPanel } from './DashboardChartPanel';
import ExcelCalculoChartsBlock from './ExcelCalculoCharts';

const formatKwh = (v) => `${formatNumber(v)} kWh`;
const formatCount = (v) => `${Math.round(Number(v) || 0)} cálculos`;

export default function AdminDashboardCharts({
  chartData = [],
  facturaPromedio = null,
  facturaPorMes = [],
  loading,
  totalCalculos = 0,
}) {
  const facturaTrend = useMemo(() => {
    const mesLabels = Object.fromEntries(chartData.map((r) => [r.mes, r.mesLabel]));
    return facturaPorMes.map((row) => ({
      ...row,
      mesLabel: mesLabels[row.mes] || row.mes,
    }));
  }, [chartData, facturaPorMes]);

  if (loading) {    return <div className="loading" style={{ minHeight: 200 }}>Cargando gráficos...</div>;
  }

  if (!chartData.length) {
    return (
      <div className="dashboard-empty">
        <BarChart2 size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} aria-hidden />
        <p>No hay cálculos en el período seleccionado.</p>
        <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>Prueba cambiando el filtro de fecha.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-charts-stack">
      <p className="dashboard-chart-meta">
        {totalCalculos} cálculo{totalCalculos !== 1 ? 's' : ''} en el período · Desglose de factura estimada
      </p>

      <div className="dashboard-charts-grid">
        <ExcelCalculoChartsBlock
          facturaPromedio={facturaPromedio}
          facturaTrend={facturaTrend}
          showTrends={facturaTrend.length > 0}
        />
        <DashboardChartPanel
          title="Consumo kWh promedio por mes"
          subtitle="Promedio de kWh/mes por cálculo en cada mes"
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="adminChartKwh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A4AB0" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1A4AB0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mesLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} width={48} />
              <Tooltip content={<DashboardMesTooltip formatValue={formatKwh} />} />
              <Area type="monotone" dataKey="consumoPromedio" name="Consumo prom." stroke="#1A4AB0" fill="url(#adminChartKwh)" strokeWidth={2} dot={{ fill: '#1A4AB0', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </DashboardChartPanel>

        <DashboardChartPanel
          title="Cálculos registrados por mes"
          subtitle="Cantidad de cálculos guardados en cada mes"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mesLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={36} />
              <Tooltip content={<DashboardMesTooltip formatValue={formatCount} />} />
              <Bar dataKey="totalCalculos" name="N° cálculos" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartPanel>
      </div>
    </div>
  );
}