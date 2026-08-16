import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, User, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatNumber, formatChartKwh, formatDate } from '../utils/helpers';
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

function formatHorasUso(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  if (n > 0 && n < 1) {
    const mins = Math.round(n * 60);
    if (Math.abs(mins / 60 - n) < 0.01) {
      return `${mins} min (${formatNumber(n, decimals)} h)`;
    }
  }
  return `${formatNumber(n, decimals)} h`;
}

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

function HorasTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div style={chartTooltipStyle}>
      <p style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--text)' }}>{row.nombreCompleto}</p>
      <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--text-muted)' }}>{row.moduloLabel}</p>
      <p style={{ margin: '4px 0', color: '#64748b' }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, background: '#94a3b8', borderRadius: 2, marginRight: 6 }} />
        Uso sugerido: <strong>{formatHorasUso(row.referencia)}</strong>
      </p>
      <p style={{ margin: '4px 0', color: '#f59e0b' }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', borderRadius: 2, marginRight: 6 }} />
        Su registro: <strong>{formatHorasUso(row.registrada)}</strong>
      </p>
      <p style={{ margin: '8px 0 0', paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
        Supera la referencia en +{formatHorasUso(row.exceso)}
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

function alertaBadges(item) {
  const badges = [];
  if (item.excede_potencia) badges.push('Potencia');
  if (item.excede_horas) badges.push('Tiempo de uso');
  return badges.join(' · ') || 'Referencia';
}

export default function ExcedentesPotenciaAlert({ items = [], adminCliente = null, compact = false }) {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';
  const useDetailCards = bp !== 'desktop';

  if (!items.length) return null;

  const potenciaItems = items.filter((i) => i.excede_potencia);
  const horasItems = items.filter((i) => i.excede_horas);

  const chartDataPotencia = potenciaItems.map((item) => ({
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

  const chartDataHoras = horasItems.map((item) => ({
    label: item.nombre?.length > (isMobile ? 14 : 20)
      ? `${item.nombre.slice(0, isMobile ? 14 : 20)}…`
      : item.nombre,
    nombreCompleto: item.nombre,
    moduloLabel: item.moduloLabel,
    referencia: Number(item.horas_referencia_dia) || 0,
    registrada: Number(item.horas_uso_dia) || 0,
    exceso: Number(item.exceso_horas_dia) || 0,
    consumoMes: Number(item.consumo_mes) || 0,
    gastoMensual: Number(item.gasto_mensual) || 0,
  }));

  const chartDataConsumo = items.map((item) => ({
    label: item.nombre?.length > (isMobile ? 14 : 20)
      ? `${item.nombre.slice(0, isMobile ? 14 : 20)}…`
      : item.nombre,
    nombreCompleto: item.nombre,
    moduloLabel: item.moduloLabel,
    consumoMes: Number(item.consumo_mes) || 0,
    gastoMensual: Number(item.gasto_mensual) || 0,
  }));

  const totalConsumo = items.reduce((s, i) => s + (i.consumo_mes || 0), 0);
  const totalExcesoW = items.reduce((s, i) => s + (i.exceso_w || 0), 0);
  const totalExcesoHoras = items.reduce((s, i) => s + (i.exceso_horas_dia || 0), 0);
  const chartHeight = Math.max(
    isMobile ? 200 : 220,
    Math.max(chartDataPotencia.length, chartDataHoras.length, 1) * (isMobile ? 52 : isTablet ? 48 : 46) + (isMobile ? 64 : 72),
  );

  return (
    <div className={`card excedentes-potencia-alert ${adminCliente ? 'excedentes-potencia-alert--admin' : ''}`}>
      {adminCliente && (
        <div className="excedentes-potencia-admin-client">
          <div className="excedentes-potencia-admin-client__main">
            <User size={18} aria-hidden />
            <div>
              <Link to={`/admin/clientes/${adminCliente.clienteId}`} className="excedentes-potencia-admin-client__name">
                {adminCliente.clienteNombre}
              </Link>
              <p className="excedentes-potencia-admin-client__meta">
                {adminCliente.clienteDocumento && <>DNI/RUC: {adminCliente.clienteDocumento} · </>}
                Último cálculo: {formatDate(adminCliente.fecha)}
              </p>
            </div>
          </div>
          <div className="excedentes-potencia-admin-client__stats">
            <span>{formatChartKwh(adminCliente.consumoMesTotal)}</span>
            <span>{formatCurrency(adminCliente.gastoMensualTotal)}</span>
            <Link
              to={`/admin/reportes?cliente_id=${adminCliente.clienteId}`}
              className="btn btn-secondary btn-sm excedentes-potencia-admin-client__report-btn"
            >
              <ExternalLink size={13} aria-hidden />
              <span className="excedentes-potencia-admin-client__report-text">Reportes</span>
            </Link>
          </div>
        </div>
      )}

      <div className="excedentes-potencia-alert__header">
        {!compact && (
          <>
            <div className="excedentes-potencia-alert__icon-wrap">
              <AlertTriangle size={22} aria-hidden />
            </div>
            <div className="excedentes-potencia-alert__titles">
              <h3>Equipos que superan la referencia del catálogo</h3>
              <p>
                Estos equipos superan la potencia normal máx. (W) y/o las horas de uso sugeridas
                configuradas en Admin → Recomendaciones.
              </p>
            </div>
          </>
        )}
        {compact && (
          <div className="excedentes-potencia-alert__titles excedentes-potencia-alert__titles--compact">
            <h3>Detalle de equipos en alerta</h3>
            <p>Comparación con potencia y tiempo de uso de referencia del catálogo.</p>
          </div>
        )}
      </div>

      <div className="excedentes-potencia-alert__summary">
        <div className="excedentes-potencia-stat">
          <span className="excedentes-potencia-stat__label">Equipos detectados</span>
          <strong className="excedentes-potencia-stat__value">{items.length}</strong>
        </div>
        {potenciaItems.length > 0 && (
          <div className="excedentes-potencia-stat">
            <span className="excedentes-potencia-stat__label">Exceso total potencia</span>
            <strong className="excedentes-potencia-stat__value excedentes-potencia-stat__value--warn">
              +{formatNumber(totalExcesoW, 0)} W
            </strong>
          </div>
        )}
        {horasItems.length > 0 && (
          <div className="excedentes-potencia-stat">
            <span className="excedentes-potencia-stat__label">Exceso total tiempo de uso</span>
            <strong className="excedentes-potencia-stat__value excedentes-potencia-stat__value--hours">
              +{formatHorasUso(totalExcesoHoras)}
            </strong>
          </div>
        )}
        <div className="excedentes-potencia-stat">
          <span className="excedentes-potencia-stat__label">Consumo mensual asociado</span>
          <strong className="excedentes-potencia-stat__value">{formatChartKwh(totalConsumo)}</strong>
        </div>
      </div>

      <div className="excedentes-potencia-charts-grid">
        {chartDataPotencia.length > 0 && (
          <div className="excedentes-potencia-chart-panel">
            <div className="excedentes-potencia-chart-panel__head">
              <h4>1. Comparación de potencia (W)</h4>
              <p>Potencia normal máx. del catálogo vs. potencia registrada</p>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartDataPotencia}
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
                <Legend verticalAlign="top" align="right" iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                <Bar dataKey="referencia" name="Límite de referencia" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={isMobile ? 10 : 12} />
                <Bar dataKey="registrada" name="Potencia de su equipo" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={isMobile ? 10 : 12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartDataHoras.length > 0 && (
          <div className="excedentes-potencia-chart-panel">
            <div className="excedentes-potencia-chart-panel__head">
              <h4>{chartDataPotencia.length > 0 ? '2.' : '1.'} Comparación de tiempo de uso (h/día)</h4>
              <p>Horas de uso sugeridas del catálogo vs. tiempo registrado por el cliente</p>
            </div>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartDataHoras}
                layout="vertical"
                margin={{ top: 8, right: isMobile ? 8 : 20, left: 4, bottom: isMobile ? 28 : 20 }}
                barGap={2}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => formatHorasUso(v, 2)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={isMobile ? 100 : 130}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip content={<HorasTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }} />
                <Legend verticalAlign="top" align="right" iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                <Bar dataKey="referencia" name="Uso sugerido" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={isMobile ? 10 : 12} />
                <Bar dataKey="registrada" name="Su registro" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={isMobile ? 10 : 12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="excedentes-potencia-chart-panel">
          <div className="excedentes-potencia-chart-panel__head">
            <h4>
              {(chartDataPotencia.length > 0 ? 1 : 0) + (chartDataHoras.length > 0 ? 1 : 0) + 1}
              . Consumo mensual (kWh)
            </h4>
            <p>Impacto en energía consumida al mes por cada equipo en alerta</p>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartDataConsumo}
              layout="vertical"
              margin={{ top: 8, right: isMobile ? 8 : 20, left: 4, bottom: isMobile ? 28 : 20 }}
              barCategoryGap="22%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => formatNumber(v)} />
              <YAxis
                type="category"
                dataKey="label"
                width={isMobile ? 100 : 130}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <Tooltip content={<ConsumoTooltip />} cursor={{ fill: 'rgba(26, 74, 176, 0.06)' }} />
              <Legend verticalAlign="top" align="right" iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
              <Bar dataKey="consumoMes" name="Consumo mensual" fill="#1A4AB0" radius={[0, 4, 4, 0]} barSize={isMobile ? 14 : 16} />
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
                badge={(
                  <span className="badge badge-warning">
                    {item.moduloLabel} · {alertaBadges(item)}
                  </span>
                )}
                featured={{
                  label: item.excede_potencia ? 'Exceso potencia' : 'Exceso tiempo de uso',
                  value: item.excede_potencia
                    ? `+${formatNumber(item.exceso_w, 0)} W`
                    : `+${formatHorasUso(item.exceso_horas_dia)}`,
                }}
                fields={[
                  ...(item.excede_potencia ? [
                    { label: 'Su potencia', value: `${formatNumber(item.potencia_w, 0)} W` },
                    { label: 'Referencia catálogo', value: `${formatNumber(item.potencia_referencia_w, 0)} W` },
                  ] : []),
                  ...(item.excede_horas ? [
                    { label: 'Su tiempo de uso/día', value: formatHorasUso(item.horas_uso_dia) },
                    { label: 'Referencia catálogo', value: formatHorasUso(item.horas_referencia_dia) },
                  ] : []),
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
                  <th>Alerta</th>
                  <th>Su potencia (W)</th>
                  <th>Ref. potencia (W)</th>
                  <th>Su uso/día</th>
                  <th>Ref. uso/día</th>
                  <th>Consumo/mes</th>
                  <th>Gasto/mes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`table-${item.modulo}-${item.nombre}`}>
                    <td><strong>{item.nombre}</strong></td>
                    <td><span className="badge badge-warning">{item.moduloLabel}</span></td>
                    <td>{alertaBadges(item)}</td>
                    <td className={item.excede_potencia ? 'excedentes-potencia-td-excess' : ''}>
                      {item.excede_potencia ? formatNumber(item.potencia_w, 0) : '—'}
                    </td>
                    <td>{item.potencia_referencia_w != null ? formatNumber(item.potencia_referencia_w, 0) : '—'}</td>
                    <td className={item.excede_horas ? 'excedentes-potencia-td-hours' : ''}>
                      {item.excede_horas ? formatHorasUso(item.horas_uso_dia) : '—'}
                    </td>
                    <td>{item.horas_referencia_dia != null ? formatHorasUso(item.horas_referencia_dia) : '—'}</td>
                    <td>{formatChartKwh(item.consumo_mes)}</td>
                    <td>{formatCurrency(item.gasto_mensual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
}
