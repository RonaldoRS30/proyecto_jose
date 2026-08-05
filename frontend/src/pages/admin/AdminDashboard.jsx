import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, UserX, Calculator, FileText, Zap, AlertTriangle,
  CalendarDays, BarChart2, TrendingUp, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import StatCard from '../../components/StatCard';
import { getEstadisticas } from '../../services/api';
import { formatNumber, formatCurrency, formatDate } from '../../utils/helpers';
import { buildFacturaFromCalculo } from '../../utils/factura';

const getFacturaTotal = (c) => buildFacturaFromCalculo(c).totalMes;

const PRESETS = [
  { label: 'Hoy', value: 'hoy' },
  { label: 'Esta semana', value: 'semana' },
  { label: 'Este mes', value: 'mes' },
  { label: 'Mes pasado', value: 'mes_pasado' },
  { label: 'Últimos 3 meses', value: '3meses' },
  { label: 'Últimos 6 meses', value: '6meses' },
  { label: 'Este año', value: 'anio' },
  { label: 'Todo', value: 'todo' },
];

const getPresetDates = (preset) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = now.getMonth();
  const dd = now.getDate();

  const fmt = (d) => d.toISOString().slice(0, 10);

  switch (preset) {
    case 'hoy': return { desde: fmt(new Date(yyyy, mm, dd)), hasta: fmt(new Date(yyyy, mm, dd)) };
    case 'semana': {
      const day = now.getDay();
      const start = new Date(yyyy, mm, dd - (day === 0 ? 6 : day - 1));
      return { desde: fmt(start), hasta: fmt(now) };
    }
    case 'mes': return { desde: fmt(new Date(yyyy, mm, 1)), hasta: fmt(now) };
    case 'mes_pasado': {
      const start = new Date(yyyy, mm - 1, 1);
      const end = new Date(yyyy, mm, 0);
      return { desde: fmt(start), hasta: fmt(end) };
    }
    case '3meses': return { desde: fmt(new Date(yyyy, mm - 2, 1)), hasta: fmt(now) };
    case '6meses': return { desde: fmt(new Date(yyyy, mm - 5, 1)), hasta: fmt(now) };
    case 'anio': return { desde: fmt(new Date(yyyy, 0, 1)), hasta: fmt(now) };
    case 'todo':
    default: return { desde: '', hasta: '' };
  }
};

const formatMesLabel = (mes) => {
  if (!mes) return '';
  const [year, month] = mes.split('-');
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #2b2b40', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
      <p style={{ color: '#aaa', margin: '0 0 6px' }}>{formatMesLabel(label)}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('6meses');
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      let desde, hasta;
      if (isCustom) {
        desde = customDesde;
        hasta = customHasta;
      } else {
        const dates = getPresetDates(preset);
        desde = dates.desde;
        hasta = dates.hasta;
      }
      const params = {};
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;
      const { data } = await getEstadisticas(params);
      setStats(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [preset, isCustom, customDesde, customHasta]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handlePreset = (p) => {
    setPreset(p);
    setIsCustom(false);
  };

  const handleCustomApply = () => {
    setIsCustom(true);
    setPreset('');
    fetchStats();
  };

  const chartData = (stats?.consumoPorMes || []).map((d) => ({
    ...d,
    mesLabel: formatMesLabel(d.mes),
  }));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Administrador</h1>
          <p className="page-subtitle">Resumen general del sistema</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchStats}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Date Filter */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#aaa', fontSize: '13px' }}>
          <CalendarDays size={15} />
          <span>Filtrar por período</span>
          {stats?.filtrosAplicados?.fechaDesde && (
            <span style={{ marginLeft: 'auto', color: '#7c6ef5', fontSize: '12px' }}>
              {stats.filtrosAplicados.fechaDesde} → {stats.filtrosAplicados.fechaHasta || 'hoy'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePreset(p.value)}
              style={{
                padding: '5px 12px', borderRadius: '20px', border: '1px solid',
                borderColor: preset === p.value && !isCustom ? '#4f46e5' : '#2b2b40',
                background: preset === p.value && !isCustom ? 'rgba(79,70,229,0.15)' : 'transparent',
                color: preset === p.value && !isCustom ? '#7c6ef5' : '#aaa',
                cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#aaa' }}>Rango personalizado:</span>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto', fontSize: '13px', padding: '5px 10px' }}
            value={customDesde}
            onChange={(e) => setCustomDesde(e.target.value)}
          />
          <span style={{ color: '#aaa' }}>→</span>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto', fontSize: '13px', padding: '5px 10px' }}
            value={customHasta}
            onChange={(e) => setCustomHasta(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '5px 14px', fontSize: '13px' }}
            onClick={handleCustomApply}
            disabled={!customDesde && !customHasta}
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="cards-grid" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.3s' }}>
        <StatCard icon={Users} label="Clientes Registrados" value={stats?.totalClientes ?? 0} color="#2563eb" />
        <StatCard icon={UserCheck} label="Clientes Activos" value={stats?.clientesActivos ?? 0} color="#10b981" />
        <StatCard icon={UserX} label="Clientes Inactivos" value={stats?.clientesInactivos ?? 0} color="#ef4444" />
        <StatCard icon={Calculator} label="Cálculos en período" value={stats?.totalCalculos ?? 0} color="#8b5cf6" />
        <StatCard icon={FileText} label="Reportes Generados" value={stats?.totalReportes ?? 0} color="#f59e0b" />
        <StatCard icon={Zap} label="Consumo Promedio (kWh/mes)" value={formatNumber(stats?.consumoPromedio ?? 0)} color="#06b6d4" />
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

          {/* Consumo Mensual Chart */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: '#4f46e5' }} />
              <h3>Consumo Promedio por Mes (kWh)</h3>
            </div>
            <div className="card-body" style={{ paddingTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2d" />
                  <XAxis dataKey="mesLabel" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="consumoPromedio"
                    name="kWh promedio"
                    stroke="#4f46e5"
                    fill="url(#colorConsumo)"
                    strokeWidth={2}
                    dot={{ fill: '#4f46e5', r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gasto y Cálculos Chart */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={16} style={{ color: '#10b981' }} />
              <h3>Gasto Promedio y Cálculos por Mes</h3>
            </div>
            <div className="card-body" style={{ paddingTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2d" />
                  <XAxis dataKey="mesLabel" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#888', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#aaa' }} />
                  <Bar yAxisId="left" dataKey="gastoPromedio" name="Gasto prom. (S/)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="totalCalculos" name="N° cálculos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!loading && chartData.length === 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem', color: '#888' }}>
          <BarChart2 size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <p>No hay cálculos registrados en el período seleccionado.<br />
            <small>Prueba cambiando el filtro de fecha.</small>
          </p>
        </div>
      )}

      {/* Alertas */}
      {stats?.alertasConsumo?.length > 0 && (
        <div className="card admin-alert-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header admin-alert-header">
            <h3><AlertTriangle size={18} /> Alertas de consumo alto</h3>
            <span className="admin-alert-meta">
              Último cálculo &gt; {formatNumber(stats.umbralAlertaConsumo ?? 0)} kWh
              {stats.umbralAlertaConsumoPct != null && (
                <> ({stats.umbralAlertaConsumoPct}% sobre el promedio)</>
              )}
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th><th>Consumo mes</th><th>vs promedio</th><th>Fecha</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.alertasConsumo.map((a) => (
                    <tr key={a.calculoId}>
                      <td><Link to={`/admin/clientes/${a.clienteId}`}>{a.clienteNombre}</Link></td>
                      <td><strong>{formatNumber(a.consumoMes)} kWh</strong></td>
                      <td><span className="badge badge-warning">+{a.porcentajeSobrePromedio}%</span></td>
                      <td>{formatDate(a.fecha)}</td>
                      <td>
                        <Link to={`/admin/reportes?cliente_id=${a.clienteId}`} className="btn btn-secondary btn-sm">
                          Ver reportes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Grid */}
      <div className="admin-detail-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header"><h3>Actividad reciente</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            {stats?.actividadReciente?.length ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th><th>Fecha</th><th>Cons. mes</th><th>Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.actividadReciente.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.cliente ? (
                            <Link to={`/admin/clientes/${c.cliente.id}`}>
                              {c.cliente.nombre} {c.cliente.apellido || ''}
                            </Link>
                          ) : '-'}
                        </td>
                        <td>{formatDate(c.created_at)}</td>
                        <td>{formatNumber(c.consumo_mes_total)} kWh</td>
                        <td>{formatCurrency(getFacturaTotal(c))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ padding: '1.25rem', color: 'var(--text-muted)', margin: 0 }}>
                {loading ? 'Cargando...' : 'No hay cálculos en este período.'}
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Acciones rápidas</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/admin/clientes" className="btn btn-primary">Gestionar Clientes</Link>
            <Link to="/admin/codigos" className="btn btn-secondary">Gestionar Códigos</Link>
            <Link to="/admin/reportes" className="btn btn-secondary">Ver Reportes PDF</Link>
            <Link to="/admin/configuracion" className="btn btn-secondary">Configurar Precio kWh</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
