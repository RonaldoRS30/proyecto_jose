import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { formatNumber } from '../utils/helpers';
import {
  averageFacturaFromCalculos,
  buildFacturaPorMesFromCalculos,
} from '../utils/excelChartData';
import { EvolucionHistoricaChart } from './ConsumoCharts';
import { DashboardMesTooltip, DashboardChartPanel } from './DashboardChartPanel';
import ExcelCalculoChartsBlock from './ExcelCalculoCharts';

const formatKwh = (v) => `${formatNumber(v)} kWh`;
const formatCount = (v) => `${Math.round(Number(v) || 0)} cálculos`;

export default function ClientHistorialCharts({
  historialRaw = [],
  historialByMonth = [],
  loading,
}) {
  const facturaPromedio = useMemo(
    () => averageFacturaFromCalculos(historialRaw),
    [historialRaw],
  );

  const facturaPorMes = useMemo(
    () => buildFacturaPorMesFromCalculos(historialRaw),
    [historialRaw],
  );

  const facturaTrend = useMemo(() => {
    const mesLabels = Object.fromEntries(
      historialByMonth.map((r) => [r.mesKey || r.mes, r.mes]),
    );
    return facturaPorMes.map((row) => ({
      ...row,
      mesLabel: mesLabels[row.mes] || row.mes,
    }));
  }, [facturaPorMes, historialByMonth]);

  const precioKwh = historialRaw.length
    ? (
      historialRaw[historialRaw.length - 1]?.tarifa?.precioKwh
      ?? historialRaw[historialRaw.length - 1]?.resumen_json?.precioKwh
      ?? historialRaw[historialRaw.length - 1]?.precio_kwh
    )
    : null;

  if (loading) {
    return <div className="loading" style={{ minHeight: 200 }}>Cargando historial...</div>;
  }

  if (!historialRaw.length) {
    return (
      <div className="dashboard-empty">
        <BarChart2 size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} aria-hidden />
        <p>No hay cálculos en el período seleccionado.</p>
        <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
          Cambie el filtro de período o ejecute un cálculo desde Inicio.
        </p>
      </div>
    );
  }

  const evolucionData = historialRaw.map((c) => ({
    fecha: new Date(c.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    consumoMes: parseFloat(c.consumo_mes_total) || 0,
    gastoDiario: parseFloat(c.gasto_diario_total) || 0,
    gastoMensual: parseFloat(c.gasto_mensual_total) || 0,
    gastoAnual: parseFloat(c.gasto_anual_total) || 0,
  }));

  const monthData = historialByMonth.map((row) => ({
    ...row,
    mesLabel: row.mes,
  }));

  return (
    <div className="dashboard-charts-stack">
      <p className="dashboard-chart-meta">
        {historialRaw.length} cálculo{historialRaw.length !== 1 ? 's' : ''} · Desglose de factura estimada
      </p>

      <div className="dashboard-charts-grid">
        <DashboardChartPanel
          title="Evolución por cálculo"
          subtitle="Cada punto es un cálculo guardado — consumo y gasto en el tiempo"
          wide
        >
          <div className="chart-evolucion-wrap">
            <EvolucionHistoricaChart data={evolucionData} />
          </div>
        </DashboardChartPanel>

        <ExcelCalculoChartsBlock
          facturaPromedio={facturaPromedio}
          facturaTrend={facturaTrend}
          precioKwh={precioKwh}
          showTrends={facturaTrend.length > 0}
        />

        <DashboardChartPanel
          title="Consumo promedio por mes"
          subtitle="Promedio kWh/mes de sus cálculos en cada mes"
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="clientChartKwh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A4AB0" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1A4AB0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mesLabel" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} width={48} />
              <Tooltip content={<DashboardMesTooltip formatValue={formatKwh} />} />
              <Area
                type="monotone"
                dataKey="consumoMes"
                name="Consumo prom."
                stroke="#1A4AB0"
                fill="url(#clientChartKwh)"
                strokeWidth={2}
                dot={{ r: 3, fill: '#1A4AB0' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </DashboardChartPanel>

        <DashboardChartPanel
          title="Cálculos por mes"
          subtitle="Cuántos cálculos guardó cada mes"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
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
