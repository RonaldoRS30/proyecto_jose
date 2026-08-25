import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plug, Zap, DollarSign, Calculator, Ghost, Lightbulb,
  Receipt, BarChart3, AlertTriangle, History, ChevronRight,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import DashboardTabs from '../../components/DashboardTabs';
import DashboardChartFilters from '../../components/DashboardChartFilters';
import ClientHistorialCharts from '../../components/ClientHistorialCharts';
import { DashboardChartPanel } from '../../components/DashboardChartPanel';
import ExcelCalculoChartsBlock from '../../components/ExcelCalculoCharts';
import {
  facturaFromPreview,
} from '../../utils/excelChartData';
import { isReciboRegistro } from '../../utils/calculoRegistro';
import {
  ConsumoPorEquipoChart, ConsumoPorCategoriaChart, ConsumoMensualChart,
  GastoPorEquipoChart, GastoResumenChart,
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

const MODULO_LINKS = [
  { key: 'aparatos', path: '/cliente/electrodomesticos', icon: Plug, modKey: 'aparato' },
  { key: 'iluminacion', path: '/cliente/iluminacion', icon: Lightbulb, modKey: 'iluminacion' },
  { key: 'fantasma', path: '/cliente/fantasma', icon: Ghost, modKey: 'fantasma' },
];

function DashboardSkeleton() {
  return (
    <div className="client-dashboard page-skeleton" aria-busy="true" aria-live="polite">
      <PageHeader title="Inicio" subtitle="Preparando su resumen de consumo..." />
      <div className="page-skeleton-tabs" />
      <div className="dashboard-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="page-skeleton-card" />
        ))}
      </div>
      <div className="page-skeleton-block" />
      <p className="page-skeleton-hint">Cargando cálculos…</p>
    </div>
  );
}

export default function ClientDashboard() {
  const alert = useAlert();
  const [activeTab, setActiveTab] = useState('resumen');
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
    tarifaCambiada,
    configFacturacionCambiada,
    resumenGeneral: rg,
    modulos,
    factura,
    precioKwh,
    tarifaFuente,
    dispositivos,
    ultimoCalculo,
    historialSyncKey,
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
  }, [activeTab, dataSource, fetchHistorial, precioKwh, historialSyncKey]);

  const handleDataSourceChange = (source) => {
    setDataSource(source);
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
      await alert({
        title: 'Cálculo guardado',
        message: 'Se agregó un nuevo escenario estimado a su historial.',
        variant: 'success',
      });
    } catch (e) {
      await alert({
        title: 'Error al calcular',
        message: e.response?.data?.message || 'No se pudo ejecutar el cálculo.',
        variant: 'error',
      });
    }
  };

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

  const chartGastosCategoria = hasEquipos ? Object.entries(
    filteredDispositivos.reduce((acc, d) => {
      acc[d.categoria] = (acc[d.categoria] || 0) + (d.gastoMensual || 0);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value: roundNumber(value) })) : [];

  const facturaPreview = useMemo(
    () => facturaFromPreview(factura, precioKwh, rg.consumoMes, filteredDispositivos.length),
    [factura, precioKwh, rg.consumoMes, filteredDispositivos.length],
  );

  const alertCount = excedentesPotencia?.length ?? 0;

  if (loading) return <DashboardSkeleton />;

  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: Zap },
    { id: 'factura', label: 'Factura', icon: Receipt },
    { id: 'graficos', label: 'Gráficos', icon: BarChart3 },
    { id: 'alertas', label: 'Alertas', icon: AlertTriangle, badge: alertCount },
  ];

  const renderActualCharts = () => {
    if (!hasEquipos) {
      return (
        <div className="dashboard-empty">
          <p>Registre equipos en los módulos para ver gráficos.</p>
        </div>
      );
    }
    if (chartEquipos.length === 0 && moduloFilter !== 'todos') {
      return (
        <div className="dashboard-empty">
          <p>No hay equipos en el módulo seleccionado.</p>
        </div>
      );
    }

    return (
      <div className="dashboard-charts-stack">
        <p className="dashboard-chart-meta">
          Cálculo actual · {filteredDispositivos.length} equipo{filteredDispositivos.length !== 1 ? 's' : ''} · Desglose de factura estimada
        </p>
        <div className="dashboard-charts-grid">
          <ExcelCalculoChartsBlock
            facturaPromedio={facturaPreview}
            precioKwh={precioKwh}
            showTrends={false}
          />

          <DashboardChartPanel title="Gasto por equipo" subtitle="Gasto mensual estimado (S/) por equipo">
            <GastoPorEquipoChart data={chartEquipos} />
          </DashboardChartPanel>
          <DashboardChartPanel title="Consumo por equipo" subtitle="Consumo mensual (kWh) por equipo">
            <ConsumoPorEquipoChart data={chartEquipos} />
          </DashboardChartPanel>
          <DashboardChartPanel title="Consumo por categoría" subtitle="kWh/mes agrupados por tipo de equipo">
            <ConsumoPorCategoriaChart data={chartCategorias} />
          </DashboardChartPanel>
          <DashboardChartPanel title="Gasto por categoría" subtitle="Gasto mensual (S/) por categoría — barras">
            <GastoPorEquipoChart data={chartGastosCategoria.map((c) => ({ nombre: c.name, gastoMensual: c.value }))} />
          </DashboardChartPanel>
          <DashboardChartPanel title="Consumo y gasto por módulo" subtitle="Electrodomésticos, iluminación y consumo fantasma">
            <ConsumoMensualChart data={chartModulos} />
          </DashboardChartPanel>
          <DashboardChartPanel title="Resumen de gastos" subtitle="Totales diario, mensual y anual" wide>
            <GastoResumenChart data={chartGastosResumen} />
          </DashboardChartPanel>
        </div>
      </div>
    );
  };

  return (
    <div className="client-dashboard">
      <PageHeader
        title="Inicio"
        subtitle={
          ultimoCalculo && !isReciboRegistro(ultimoCalculo)
            ? `Último cálculo estimado: ${formatDate(ultimoCalculo.created_at)}`
            : 'Registre equipos y ejecute el cálculo estimado (el recibo PDF es solo referencia)'
        }
        action={{
          label: 'Ejecutar Reporte',
          icon: Calculator,
          onClick: handleCalcular,
          disabled: calculating || !hasEquipos,
          loading: calculating,
          loadingLabel: 'Calculando...',
          title: !hasEquipos
            ? 'Registre al menos un equipo en Electrodomésticos, Iluminación o Consumo fantasma'
            : undefined,
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
                  {configFacturacionCambiada || tarifaCambiada
                    ? 'Tarifa/facturación cambió — ejecute cálculo'
                    : 'Cambios sin guardar — ejecute cálculo'}
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
              showModuloFilter={dataSource === 'actual'}
              onRefresh={fetchHistorial}
              loading={historialLoading}
            />

            {dataSource === 'historial' ? (
              <ClientHistorialCharts
                historialRaw={historialRaw}
                historialByMonth={historialByMonth}
                loading={historialLoading}
              />
            ) : renderActualCharts()}

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
