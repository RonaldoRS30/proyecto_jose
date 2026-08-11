import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plug, Zap, DollarSign, Calculator, Ghost, Lightbulb,
  Receipt, BarChart3, AlertTriangle, History, ChevronRight, BarChart2, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import DashboardTabs from '../../components/DashboardTabs';
import DashboardChartFilters from '../../components/DashboardChartFilters';
import {
  ConsumoPorEquipoChart, ConsumoPorCategoriaChart, ConsumoMensualChart,
  GastoPorEquipoChart, GastoResumenChart, EvolucionHistoricaChart,
} from '../../components/ConsumoCharts';
import FacturaBreakdown from '../../components/FacturaBreakdown';
import ExcedentesPotenciaAlert from '../../components/ExcedentesPotenciaAlert';
import { useCalculo } from '../../contexts/CalculoContext';
import { useAlert } from '../../contexts/ConfirmContext';
import { getCalculos } from '../../services/api';
import {
  formatNumber, formatCurrency, MODULOS, roundNumber, formatDate,
} from '../../utils/helpers';
import {
  getChartPresetDates, aggregateCalculosByMonth,
} from '../../utils/chartPeriodFilters';

const ACTUAL_CHART_OPTIONS = [
  { id: 'gasto-equipo', label: 'Gasto por equipo' },
  { id: 'consumo-equipo', label: 'Consumo por equipo' },
  { id: 'categoria', label: 'Por categoría' },
  { id: 'modulo', label: 'Por módulo' },
  { id: 'resumen-gasto', label: 'Resumen de gastos' },
];

const HISTORIAL_CHART_OPTIONS = [
  { id: 'evolucion', label: 'Evolución por cálculo' },
  { id: 'consumo-promedio', label: 'Consumo promedio / mes' },
  { id: 'gasto-periodo', label: 'Gasto y n° cálculos' },
];

const MODULO_LINKS = [
  { key: 'aparatos', path: '/cliente/electrodomesticos', icon: Plug, modKey: 'aparato' },
  { key: 'iluminacion', path: '/cliente/iluminacion', icon: Lightbulb, modKey: 'iluminacion' },
  { key: 'fantasma', path: '/cliente/fantasma', icon: Ghost, modKey: 'fantasma' },
];

const historialTooltipStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '13px',
};

function HistorialTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={historialTooltipStyle}>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 6px' }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function ClientDashboard() {
  const alert = useAlert();
  const [activeTab, setActiveTab] = useState('resumen');
  const [activeChart, setActiveChart] = useState('gasto-equipo');
  const [dataSource, setDataSource] = useState('actual');
  const [moduloFilter, setModuloFilter] = useState('todos');
  const [preset, setPreset] = useState('6meses');
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [historialRaw, setHistorialRaw] = useState([]);
  const [historialByMonth, setHistorialByMonth] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  const {
    loading,
    calculating,
    ejecutarCalculo,
    hasEquipos,
    hasCambiosSinGuardar,
    resumenGeneral: rg,
    modulos,
    factura,
    precioKwh,
    tarifaFuente,
    dispositivos,
    ultimoCalculo,
    excedentesPotencia,
  } = useCalculo();

  const fetchHistorial = useCallback(async () => {
    setHistorialLoading(true);
    try {
      let desde;
      let hasta;
      if (isCustom) {
        desde = customDesde;
        hasta = customHasta;
      } else {
        const d = getChartPresetDates(preset);
        desde = d.desde;
        hasta = d.hasta;
      }

      const params = { page: 1, limit: 100 };
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;

      const { data } = await getCalculos(params);
      const calculos = data.data ?? [];
      setHistorialRaw([...calculos].reverse());
      setHistorialByMonth(aggregateCalculosByMonth(calculos));
    } catch (e) {
      console.error(e);
      setHistorialRaw([]);
      setHistorialByMonth([]);
    } finally {
      setHistorialLoading(false);
    }
  }, [preset, isCustom, customDesde, customHasta]);

  useEffect(() => {
    if (activeTab === 'graficos' && dataSource === 'historial') {
      fetchHistorial();
    }
  }, [activeTab, dataSource, fetchHistorial, precioKwh, ultimoCalculo?.id]);

  const handleDataSourceChange = (source) => {
    setDataSource(source);
    setActiveChart(source === 'historial' ? 'evolucion' : 'gasto-equipo');
  };

  const handlePreset = (p) => {
    setPreset(p);
    setIsCustom(false);
  };

  const handleCustomApply = () => {
    setIsCustom(true);
    setPreset('');
  };

  const handleCalcular = async () => {
    try {
      await ejecutarCalculo();
    } catch (e) {
      await alert({
        title: 'Error al calcular',
        message: e.response?.data?.message || 'No se pudo ejecutar el cálculo.',
        variant: 'error',
      });
    }
  };

  if (loading) return <div className="loading">Cargando dashboard...</div>;

  const filteredDispositivos = moduloFilter === 'todos'
    ? dispositivos
    : dispositivos.filter((d) => d.modulo === moduloFilter);

  const chartEquipos = filteredDispositivos.map((d) => ({
    nombre: d.nombre?.substring(0, 16),
    consumoMes: d.consumoMes,
    gastoDiario: d.gastoDiario,
    gastoMensual: d.gastoMensual,
    gastoAnual: d.gastoAnual,
  }));

  const chartGastosResumen = hasEquipos ? [
    { periodo: 'Diario', gasto: rg.gastoDiario ?? 0 },
    { periodo: 'Mensual', gasto: rg.gastoMensual ?? 0 },
    { periodo: 'Anual', gasto: rg.gastoAnual ?? 0 },
  ] : [];

  const chartCategorias = hasEquipos ? Object.entries(
    filteredDispositivos.reduce((acc, d) => {
      acc[d.categoria] = (acc[d.categoria] || 0) + d.consumoMes;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value: roundNumber(value) })) : [];

  const chartModulos = hasEquipos ? Object.entries(modulos)
    .filter(([key]) => {
      if (moduloFilter === 'todos') return true;
      const map = { aparatos: 'aparato', iluminacion: 'iluminacion', fantasma: 'fantasma' };
      return map[key] === moduloFilter;
    })
    .map(([key, val]) => ({
      modulo: MODULOS[key]?.label || key,
      consumoMes: val.totales?.consumoMes || 0,
      gastoMensual: val.totales?.gastoMensual || 0,
    })) : [];

  const evolucionData = historialRaw.map((c) => ({
    fecha: new Date(c.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
    consumoMes: parseFloat(c.consumo_mes_total) || 0,
    gastoDiario: parseFloat(c.gasto_diario_total) || 0,
    gastoMensual: parseFloat(c.gasto_mensual_total) || 0,
    gastoAnual: parseFloat(c.gasto_anual_total) || 0,
  }));

  const alertCount = excedentesPotencia?.length ?? 0;
  const chartOptions = dataSource === 'historial' ? HISTORIAL_CHART_OPTIONS : ACTUAL_CHART_OPTIONS;
  const showModuloFilter = ['gasto-equipo', 'consumo-equipo', 'categoria'].includes(activeChart);

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: Zap },
    { id: 'factura', label: 'Factura', icon: Receipt },
    { id: 'graficos', label: 'Gráficos', icon: BarChart3 },
    { id: 'alertas', label: 'Alertas', icon: AlertTriangle, badge: alertCount },
  ];

  const renderActualChart = () => {
    if (!hasEquipos) {
      return (
        <div className="dashboard-empty">
          <p>Registre equipos en los módulos para ver gráficos.</p>
        </div>
      );
    }
    if (chartEquipos.length === 0 && showModuloFilter && moduloFilter !== 'todos') {
      return (
        <div className="dashboard-empty">
          <p>No hay equipos en el módulo seleccionado.</p>
        </div>
      );
    }
    switch (activeChart) {
      case 'consumo-equipo':
        return <ConsumoPorEquipoChart data={chartEquipos} />;
      case 'categoria':
        return <ConsumoPorCategoriaChart data={chartCategorias} />;
      case 'modulo':
        return <ConsumoMensualChart data={chartModulos} />;
      case 'resumen-gasto':
        return <GastoResumenChart data={chartGastosResumen} />;
      default:
        return <GastoPorEquipoChart data={chartEquipos} />;
    }
  };

  const renderHistorialChart = () => {
    if (historialLoading) {
      return <div className="loading" style={{ minHeight: 200 }}>Cargando historial...</div>;
    }
    if (!historialRaw.length) {
      return (
        <div className="dashboard-empty">
          <BarChart2 size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
          <p>No hay cálculos en el período seleccionado.</p>
          <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
            Cambie el filtro de período o ejecute un cálculo desde Inicio.
          </p>
        </div>
      );
    }
    switch (activeChart) {
      case 'consumo-promedio':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={historialByMonth} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="dashColorKwh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A4AB0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1A4AB0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<HistorialTooltip />} />
              <Area
                type="monotone"
                dataKey="consumoMes"
                name="kWh prom."
                stroke="#1A4AB0"
                fill="url(#dashColorKwh)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'gasto-periodo':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={historialByMonth} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip content={<HistorialTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="gastoMensual" name="Gasto (S/)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="totalCalculos" name="N° cálculos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="chart-evolucion-wrap">
            <EvolucionHistoricaChart data={evolucionData} />
          </div>
        );
    }
  };

  return (
    <div className="client-dashboard">
      <PageHeader
        title="Inicio"
        subtitle={
          ultimoCalculo
            ? `Último cálculo: ${formatDate(ultimoCalculo.created_at)}`
            : 'Registre equipos y ejecute el cálculo para sincronizar el sistema'
        }
        action={{
          label: 'Ejecutar Cálculo',
          icon: Calculator,
          onClick: handleCalcular,
          disabled: calculating || !hasEquipos,
          loadingLabel: 'Calculando...',
        }}
      />

      <DashboardTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      <div className="dashboard-panel" role="tabpanel">
        {activeTab === 'resumen' && (
          <div className="dashboard-resumen">
            <div className="dashboard-context-bar">
              <div className="dashboard-tarifa-pill">
                <Zap size={16} aria-hidden />
                <span>Tarifa kWh:</span>
                <strong>S/ {precioKwh ?? 0.613}</strong>
                <small>{tarifaFuente === 'cliente' ? 'Personalizada' : 'Global'}</small>
              </div>
              {hasCambiosSinGuardar && (
                <span className="dashboard-status-chip dashboard-status-chip--warn">
                  Cambios sin guardar — ejecute cálculo
                </span>
              )}
              <Link to="/cliente/perfil" className="dashboard-link-sm">Editar tarifa →</Link>
            </div>

            {alertCount > 0 && (
              <button
                type="button"
                className="dashboard-alert-banner"
                onClick={() => setActiveTab('alertas')}
              >
                <AlertTriangle size={18} aria-hidden />
                <span>
                  <strong>{alertCount} equipo{alertCount > 1 ? 's' : ''}</strong>
                  {' '}supera{alertCount === 1 ? '' : 'n'} la potencia de referencia
                </span>
                <ChevronRight size={18} aria-hidden />
              </button>
            )}

            <div className="dashboard-kpi-grid">
              <StatCard icon={Zap} label="Consumo mensual" value={`${formatNumber(rg.consumoMes ?? 0)} kWh`} color="#10b981" />
              <StatCard icon={DollarSign} label="Gasto mensual" value={formatCurrency(rg.gastoMensual ?? 0)} color="#f59e0b" />
              <StatCard icon={Receipt} label="Factura estimada" value={formatCurrency(factura?.totalMes ?? 0)} color="#1A4AB0" />
              <StatCard icon={Plug} label="Equipos registrados" value={rg.cantidadEquipos ?? 0} color="#2563d4" />
            </div>

            <div className="dashboard-section">
              <h3 className="dashboard-section__title">Resumen por módulo</h3>
              <div className="dashboard-modulo-list">
                {MODULO_LINKS.map(({ key, path, icon: Icon, modKey }) => {
                  const t = modulos[key]?.totales;
                  const meta = MODULOS[modKey];
                  return (
                    <Link key={key} to={path} className="dashboard-modulo-row">
                      <div className="dashboard-modulo-row__left">
                        <span className="dashboard-modulo-row__icon" style={{ color: meta?.color }}>
                          <Icon size={18} aria-hidden />
                        </span>
                        <span className="dashboard-modulo-row__name">{meta?.label || key}</span>
                      </div>
                      <div className="dashboard-modulo-row__stats">
                        <span>{formatNumber(t?.consumoMes ?? 0)} kWh</span>
                        <span className="dashboard-modulo-row__sep">·</span>
                        <span>{formatCurrency(t?.gastoMensual ?? 0)}</span>
                      </div>
                      <ChevronRight size={16} className="dashboard-modulo-row__chevron" aria-hidden />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="dashboard-quick-links">
              <Link to="/cliente/historial" className="dashboard-quick-link">
                <History size={18} aria-hidden />
                <span>Ver historial de cálculos</span>
                <ChevronRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'factura' && (
          <div className="dashboard-factura">
            {hasEquipos && factura ? (
              <div className="card">
                <div className="card-header"><h3>Estimación factura mensual</h3></div>
                <div className="card-body">
                  <FacturaBreakdown factura={factura} precioKwh={precioKwh} consumoMesFallback={rg.consumoMes} />
                </div>
              </div>
            ) : (
              <div className="dashboard-empty">
                <p>Ejecute un cálculo con equipos registrados para ver la factura estimada.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'graficos' && (
          <div className="dashboard-graficos">
            <DashboardChartFilters
              dataSource={dataSource}
              onDataSourceChange={handleDataSourceChange}
              preset={preset}
              onPresetChange={handlePreset}
              customDesde={customDesde}
              customHasta={customHasta}
              onCustomDesdeChange={setCustomDesde}
              onCustomHastaChange={setCustomHasta}
              onCustomApply={handleCustomApply}
              isCustom={isCustom}
              moduloFilter={moduloFilter}
              onModuloFilterChange={setModuloFilter}
              showModuloFilter={showModuloFilter}
              onRefresh={fetchHistorial}
              loading={historialLoading}
            />

            <div className="dashboard-chart-chips">
              {chartOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`dashboard-chart-chip ${activeChart === opt.id ? 'active' : ''}`}
                  onClick={() => setActiveChart(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {dataSource === 'historial' && historialRaw.length > 0 && (
              <p className="dashboard-chart-meta">
                <TrendingUp size={14} aria-hidden />
                {historialRaw.length} cálculo{historialRaw.length !== 1 ? 's' : ''} en el período seleccionado
              </p>
            )}

            <div className="card card-chart dashboard-chart-card">
              <div className="card-body">
                {dataSource === 'historial' ? renderHistorialChart() : renderActualChart()}
              </div>
            </div>

            <Link to="/cliente/historial" className="dashboard-link-center">
              Ver listado completo en Historial →
            </Link>
          </div>
        )}

        {activeTab === 'alertas' && (
          <div className="dashboard-alertas">
            {alertCount > 0 ? (
              <ExcedentesPotenciaAlert items={excedentesPotencia} />
            ) : (
              <div className="dashboard-empty dashboard-empty--success">
                <AlertTriangle size={32} aria-hidden />
                <h3>Todo en orden</h3>
                <p>Ningún equipo supera la potencia de referencia del catálogo.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
