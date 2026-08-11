import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, Info } from 'lucide-react';
import { formatCurrency, formatNumber, formatChartKwh } from '../utils/helpers';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { ListCard } from './ResponsiveList';

const chartTooltipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  fontSize: '13px',
  boxShadow: 'var(--shadow)',
  padding: '12px 14px',
  maxWidth: '280px',
};

function PotenciaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div style={chartTooltipStyle}>
      <p style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--text)' }}>{row.nombreCompleto}</p>
      <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-muted)' }}>{row.moduloLabel}</p>
      <p style={{ margin: '4px 0', color: '#64748b' }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, background: '#94a3b8', borderRadius: 2, marginRight: 6 }} />
        Límite referencia: <strong>{formatNumber(row.referencia, 0)} W</strong>
      </p>
      <p style={{ margin: '4px 0', color: '#ef4444' }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 6 }} />
        Su equipo registrado: <strong>{formatNumber(row.registrada, 0)} W</strong>
      </p>
      <p style={{ margin: '8px 0 0', paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
        Supera la referencia en +{formatNumber(row.exceso, 0)} W
      </p>
    </div>
  );
}

function ConsumoTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div style={chartTooltipStyle}>
      <p style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--text)' }}>{row.nombreCompleto}</p>
      <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-muted)' }}>{row.moduloLabel}</p>
      <p style={{ margin: '4px 0', color: 'var(--primary)' }}>
        Consumo mensual: <strong>{formatChartKwh(row.consumoMes)}</strong>
      </p>
      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
        Gasto estimado: <strong>{formatCurrency(row.gastoMensual)}</strong>
      </p>
    </div>
  );
}

export default function ExcedentesPotenciaAlert({ items = [] }) {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const useDetailCards = bp !== 'desktop';

  if (!items.length) return null;

  const chartData = items.map((item) => ({
    label: item.nombre?.length > (isMobile ? 14 : 20)
      ? `${item.nombre.slice(0, isMobile ? 14 : 20)}…`
      : item.nombre,
    nombreCompleto: item.nombre,
    moduloLabel: item.moduloLabel,
    referencia: Number(item.potencia_referencia_w) || 0,
    registrada: Number(item.potencia_w) || 0,
    exceso: Number(item.exceso_w) || 0,
    consumoMes: Number(item.consumo_mes) || 0,
    gastoMensual: Number(item.gasto_mensual) || 0,
  }));

  const totalConsumo = items.reduce((s, i) => s + (i.consumo_mes || 0), 0);
  const totalExcesoW = items.reduce((s, i) => s + (i.exceso_w || 0), 0);
  const chartHeight = Math.max(220, chartData.length * (isMobile ? 52 : 46) + 72);

  return (
    <div className="card excedentes-potencia-alert">
      <div className="excedentes-potencia-alert__header">
        <div className="excedentes-potencia-alert__icon-wrap">
          <AlertTriangle size={22} aria-hidden />
        </div>
        <div className="excedentes-potencia-alert__titles">
          <h3>Equipos que superan la potencia normal de referencia</h3>
          <p>
            Estos equipos tienen una potencia (W) mayor al límite recomendado en el catálogo.
            Revise los gráficos para comparar su registro con la referencia.
          </p>
        </div>
      </div>

      <div className="excedentes-potencia-alert__summary">
        <div className="excedentes-potencia-stat">
          <span className="excedentes-potencia-stat__label">Equipos detectados</span>
          <strong className="excedentes-potencia-stat__value">{items.length}</strong>
        </div>
        <div className="excedentes-potencia-stat">
          <span className="excedentes-potencia-stat__label">Exceso total de potencia</span>
          <strong className="excedentes-potencia-stat__value excedentes-potencia-stat__value--warn">
            +{formatNumber(totalExcesoW, 0)} W
          </strong>
        </div>
        <div className="excedentes-potencia-stat">
          <span className="excedentes-potencia-stat__label">Consumo mensual asociado</span>
          <strong className="excedentes-potencia-stat__value">{formatChartKwh(totalConsumo)}</strong>
        </div>
      </div>



      <div className="excedentes-potencia-charts-grid">
        <div className="excedentes-potencia-chart-panel">
          <div className="excedentes-potencia-chart-panel__head">
            <h4>1. Comparación de potencia (W)</h4>
            <p>Referencia del catálogo vs. potencia registrada en su equipo</p>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: isMobile ? 8 : 20, left: 4, bottom: isMobile ? 28 : 20 }}
              barGap={2}
              barCategoryGap="18%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v) => `${formatNumber(v, 0)} W`}
                label={!isMobile ? {
                  value: 'Potencia (Watts)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: 'var(--text-muted)',
                  fontSize: 11,
                } : undefined}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={isMobile ? 100 : 130}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <Tooltip content={<PotenciaTooltip />} cursor={{ fill: 'rgba(26, 74, 176, 0.06)' }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              />
              <Bar
                dataKey="referencia"
                name="Límite de referencia"
                fill="#94a3b8"
                radius={[0, 4, 4, 0]}
                barSize={isMobile ? 10 : 12}
              />
              <Bar
                dataKey="registrada"
                name="Potencia de su equipo"
                fill="#ef4444"
                radius={[0, 4, 4, 0]}
                barSize={isMobile ? 10 : 12}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="excedentes-potencia-chart-panel">
          <div className="excedentes-potencia-chart-panel__head">
            <h4>2. Consumo mensual (kWh)</h4>
            <p>Impacto en energía consumida al mes por cada equipo</p>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: isMobile ? 8 : 20, left: 4, bottom: isMobile ? 28 : 20 }}
              barCategoryGap="22%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={(v) => formatNumber(v)}
                label={!isMobile ? {
                  value: 'Consumo (kWh / mes)',
                  position: 'insideBottom',
                  offset: -12,
                  fill: 'var(--text-muted)',
                  fontSize: 11,
                } : undefined}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={isMobile ? 100 : 130}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <Tooltip content={<ConsumoTooltip />} cursor={{ fill: 'rgba(26, 74, 176, 0.06)' }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
              />
              <Bar
                dataKey="consumoMes"
                name="Consumo mensual"
                fill="#1A4AB0"
                radius={[0, 4, 4, 0]}
                barSize={isMobile ? 14 : 16}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <details className="excedentes-potencia-details">
        <summary>Ver tabla detallada de equipos</summary>
        {useDetailCards ? (
          <div className="data-cards-grid data-cards-single excedentes-potencia-cards">
            {items.map((item) => (
              <ListCard
                key={`card-${item.modulo}-${item.nombre}`}
                className="list-card-equipo excedentes-potencia-card"
                title={item.nombre}
                badge={<span className="badge badge-warning">{item.moduloLabel}</span>}
                featured={{
                  label: 'Exceso sobre referencia',
                  value: `+${formatNumber(item.exceso_w, 0)} W`,
                }}
                fields={[
                  { label: 'Su potencia', value: `${formatNumber(item.potencia_w, 0)} W` },
                  { label: 'Referencia catálogo', value: `${formatNumber(item.potencia_referencia_w, 0)} W` },
                  { label: 'Consumo mensual', value: formatChartKwh(item.consumo_mes) },
                  { label: 'Gasto mensual', value: formatCurrency(item.gasto_mensual), highlight: true },
                ]}
              />
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>Módulo</th>
                  <th>Su potencia (W)</th>
                  <th>Referencia (W)</th>
                  <th>Exceso (W)</th>
                  <th>Consumo/mes</th>
                  <th>Gasto/mes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`table-${item.modulo}-${item.nombre}`}>
                    <td><strong>{item.nombre}</strong></td>
                    <td><span className="badge badge-warning">{item.moduloLabel}</span></td>
                    <td>{formatNumber(item.potencia_w, 0)}</td>
                    <td>{formatNumber(item.potencia_referencia_w, 0)}</td>
                    <td className="excedentes-potencia-td-excess">+{formatNumber(item.exceso_w, 0)}</td>
                    <td>{formatChartKwh(item.consumo_mes)}</td>
                    <td>{formatCurrency(item.gasto_mensual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>

      <p className="excedentes-potencia-footnote">
        La potencia de referencia proviene del catálogo configurado en Admin → Recomendaciones.
        Valores comerciales aproximados; pueden variar según modelo y uso real del equipo.
      </p>
    </div>
  );
}
