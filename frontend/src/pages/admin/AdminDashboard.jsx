import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, UserX, Calculator, FileText, Zap, AlertTriangle,
  BarChart3, LayoutDashboard, Activity, ChevronRight,
  KeyRound, Settings, UserCog,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import DashboardTabs from '../../components/DashboardTabs';
import DashboardPeriodFilters from '../../components/DashboardPeriodFilters';
import AdminDashboardCharts from '../../components/AdminDashboardCharts';
import AdminExcedentesPotenciaAlert, { AdminExcedentesEmptyState } from '../../components/AdminExcedentesPotenciaAlert';
import ResponsiveList, { ListCard } from '../../components/ResponsiveList';
import { getEstadisticas } from '../../services/api';
import { formatNumber, formatCurrency, formatDate } from '../../utils/helpers';
import { buildFacturaFromCalculo } from '../../utils/factura';
import { ADMIN_PERIOD_PRESETS, getChartPresetDates } from '../../utils/chartPeriodFilters';

const getFacturaTotal = (c) => buildFacturaFromCalculo(c).totalMes;

const QUICK_LINKS = [
  { path: '/admin/clientes', label: 'Gestionar clientes', icon: UserCog },
  { path: '/admin/codigos', label: 'Gestionar códigos', icon: KeyRound },
  { path: '/admin/reportes', label: 'Ver reportes PDF', icon: FileText },
  { path: '/admin/configuracion', label: 'Configurar precio kWh', icon: Settings },
];

const formatMesLabel = (mes) => {
  if (!mes) return '';
  const [year, month] = mes.split('-');
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('resumen');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('6meses');
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const loadedOnce = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!loadedOnce.current) setLoading(true);
    try {
      let desde;
      let hasta;
      if (isCustom) {
        desde = customDesde;
        hasta = customHasta;
      } else {
        const dates = getChartPresetDates(preset);
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
      loadedOnce.current = true;
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
  };

  const chartData = (stats?.consumoPorMes || []).map((d) => ({
    ...d,
    mesLabel: formatMesLabel(d.mes),
  }));

  const alertCount = stats?.alertasExcedentesPotencia?.length ?? 0;
  const appliedLabel = stats?.filtrosAplicados?.fechaDesde
    ? `${stats.filtrosAplicados.fechaDesde} → ${stats.filtrosAplicados.fechaHasta || 'hoy'}`
    : null;

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'graficos', label: 'Gráficos', icon: BarChart3 },
    { id: 'alertas', label: 'Alertas', icon: AlertTriangle, badge: alertCount },
    { id: 'actividad', label: 'Actividad', icon: Activity },
  ];

  if (loading && !stats) {
    return (
      <div className="admin-dashboard page-skeleton" aria-busy="true" aria-live="polite">
        <PageHeader title="Dashboard" subtitle="Preparando resumen del sistema..." />
        <div className="page-skeleton-tabs" />
        <div className="dashboard-kpi-grid admin-dashboard-kpi">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="page-skeleton-card" />
          ))}
        </div>
        <p className="page-skeleton-hint">Cargando estadísticas…</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general del sistema"
      />

      <DashboardTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      <div className="dashboard-panel" role="tabpanel">
        <DashboardPeriodFilters
          presets={ADMIN_PERIOD_PRESETS}
          preset={preset}
          onPresetChange={handlePreset}
          customDesde={customDesde}
          customHasta={customHasta}
          onCustomDesdeChange={setCustomDesde}
          onCustomHastaChange={setCustomHasta}
          onCustomApply={handleCustomApply}
          isCustom={isCustom}
          onRefresh={fetchStats}
          loading={loading}
          appliedLabel={appliedLabel}
        />

        {activeTab === 'resumen' && (
          <div className="dashboard-resumen">
            {alertCount > 0 && (
              <button
                type="button"
                className="dashboard-alert-banner"
                onClick={() => setActiveTab('alertas')}
              >
                <AlertTriangle size={18} aria-hidden />
                <span>
                  <strong>{alertCount} cliente{alertCount > 1 ? 's' : ''}</strong>
                  {' '}con equipos que superan la potencia de referencia
                </span>
                <ChevronRight size={18} aria-hidden />
              </button>
            )}

            <div className="dashboard-kpi-grid admin-dashboard-kpi">
              <StatCard icon={Users} label="Clientes registrados" value={stats?.totalClientes ?? 0} color="#2563eb" />
              <StatCard icon={UserCheck} label="Clientes activos" value={stats?.clientesActivos ?? 0} color="#10b981" />
              <StatCard icon={UserX} label="Clientes inactivos" value={stats?.clientesInactivos ?? 0} color="#ef4444" />
              <StatCard icon={Calculator} label="Cálculos en período" value={stats?.totalCalculos ?? 0} color="#8b5cf6" />
              <StatCard icon={FileText} label="Reportes generados" value={stats?.totalReportes ?? 0} color="#f59e0b" />
              <StatCard icon={Zap} label="Consumo prom. (kWh/mes)" value={formatNumber(stats?.consumoPromedio ?? 0)} color="#06b6d4" />
            </div>

            <div className="dashboard-section">
              <h3 className="dashboard-section__title">Accesos rápidos</h3>
              <div className="dashboard-modulo-list">
                {QUICK_LINKS.map(({ path, label, icon: Icon }) => (
                  <Link key={path} to={path} className="dashboard-modulo-row">
                    <div className="dashboard-modulo-row__left">
                      <span className="dashboard-modulo-row__icon" style={{ color: 'var(--primary)' }}>
                        <Icon size={18} aria-hidden />
                      </span>
                      <span className="dashboard-modulo-row__name">{label}</span>
                    </div>
                    <ChevronRight size={16} className="dashboard-modulo-row__chevron" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'graficos' && (
          <div className="dashboard-graficos">
            <AdminDashboardCharts
              chartData={chartData}
              loading={loading}
              totalCalculos={stats?.totalCalculos ?? 0}
              facturaPromedio={stats?.facturaPromedio ?? null}
              facturaPorMes={stats?.facturaPorMes ?? []}
            />
          </div>
        )}

        {activeTab === 'alertas' && (
          <div className="dashboard-alertas">
            {loading ? (
              <div className="loading" style={{ minHeight: 200 }}>Cargando alertas...</div>
            ) : alertCount > 0 ? (
              <AdminExcedentesPotenciaAlert alertas={stats.alertasExcedentesPotencia} />
            ) : (
              <AdminExcedentesEmptyState />
            )}
          </div>
        )}

        {activeTab === 'actividad' && (
          <div className="dashboard-actividad">
            <div className="card">
              <div className="card-header">
                <h3>Actividad reciente</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <ResponsiveList
                  loading={loading}
                  empty={!stats?.actividadReciente?.length}
                  emptyMessage="No hay cálculos en este período."
                  emptyIcon={Calculator}
                  items={stats?.actividadReciente ?? []}
                  tableHead={(
                    <tr>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Cons. mes</th>
                      <th>Factura</th>
                    </tr>
                  )}
                  renderTableRow={(c) => (
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
                  )}
                  renderCard={(c) => (
                    <ListCard
                      key={c.id}
                      title={c.cliente ? (
                        <Link to={`/admin/clientes/${c.cliente.id}`}>
                          {c.cliente.nombre} {c.cliente.apellido || ''}
                        </Link>
                      ) : '—'}
                      subtitle={formatDate(c.created_at)}
                      featured={{ label: 'Factura estimada', value: formatCurrency(getFacturaTotal(c)) }}
                      fields={[
                        { label: 'Consumo mes', value: `${formatNumber(c.consumo_mes_total)} kWh` },
                      ]}
                    />
                  )}
                />
              </div>
            </div>

            <Link to="/admin/clientes" className="dashboard-link-center">
              Ver todos los clientes →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
