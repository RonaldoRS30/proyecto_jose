import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plug, Zap, DollarSign, TrendingUp, Calculator,
  CalendarDays, RefreshCw, BarChart2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import {
  ConsumoPorEquipoChart, ConsumoPorCategoriaChart, ConsumoMensualChart,
  GastoPorEquipoChart, GastoResumenChart,
} from '../../components/ConsumoCharts';
import FacturaBreakdown from '../../components/FacturaBreakdown';
import ExcedentesPotenciaAlert from '../../components/ExcedentesPotenciaAlert';
import { useCalculo } from '../../contexts/CalculoContext';
import { useAlert } from '../../contexts/ConfirmContext';
import { getCalculos } from '../../services/api';
import { formatNumber, formatCurrency, MODULOS, roundNumber } from '../../utils/helpers';

const PRESETS = [
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
    case 'semana': {
      const day = now.getDay();
      return { desde: fmt(new Date(yyyy, mm, dd - (day === 0 ? 6 : day - 1))), hasta: fmt(now) };
    }
    case 'mes': return { desde: fmt(new Date(yyyy, mm, 1)), hasta: fmt(now) };
    case 'mes_pasado': return { desde: fmt(new Date(yyyy, mm - 1, 1)), hasta: fmt(new Date(yyyy, mm, 0)) };
    case '3meses': return { desde: fmt(new Date(yyyy, mm - 2, 1)), hasta: fmt(now) };
    case '6meses': return { desde: fmt(new Date(yyyy, mm - 5, 1)), hasta: fmt(now) };
    case 'anio': return { desde: fmt(new Date(yyyy, 0, 1)), hasta: fmt(now) };
    default: return { desde: '', hasta: '' };
  }
};

const formatMesLabel = (fechaStr) => {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #2b2b40', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
      <p style={{ color: '#aaa', margin: '0 0 6px' }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function ClientDashboard() {
  const alert = useAlert();
  const {
    loading,
    calculating,
    ejecutarCalculo,
    hasEquipos,
    resumenGeneral: rg,
    modulos,
    factura,
    precioKwh,
    tarifaFuente,
    dispositivos,
    ultimoCalculo,
    excedentesPotencia,
  } = useCalculo();

  const [preset, setPreset] = useState('6meses');
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [historialData, setHistorialData] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);

  const fetchHistorial = useCallback(async () => {
    setHistorialLoading(true);
    try {
      let desde, hasta;
      if (isCustom) { desde = customDesde; hasta = customHasta; }
      else { const d = getPresetDates(preset); desde = d.desde; hasta = d.hasta; }

      const params = { page: 1, limit: 100 };
      if (desde) params.fecha_desde = desde;
      if (hasta) params.fecha_hasta = hasta;

      const { data } = await getCalculos(params);
      const calculos = (data.data ?? []).reverse();

      // Aggregate by month
      const byMonth = {};
      calculos.forEach((c) => {
        const key = formatMesLabel(c.created_at);
        if (!byMonth[key]) byMonth[key] = { mes: key, consumoMes: 0, gastoMensual: 0, count: 0 };
        byMonth[key].consumoMes += parseFloat(c.consumo_mes_total) || 0;
        byMonth[key].gastoMensual += parseFloat(c.gasto_mensual_total) || 0;
        byMonth[key].count += 1;
      });

      setHistorialData(Object.values(byMonth).map((row) => ({
        mes: row.mes,
        consumoMes: Math.round((row.consumoMes / row.count) * 100) / 100,
        gastoMensual: Math.round((row.gastoMensual / row.count) * 100) / 100,
        totalCalculos: row.count,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setHistorialLoading(false);
    }
  }, [preset, isCustom, customDesde, customHasta]);

  useEffect(() => { fetchHistorial(); }, [fetchHistorial, precioKwh]);

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

  const handlePreset = (p) => { setPreset(p); setIsCustom(false); };
  const handleCustomApply = () => { setIsCustom(true); setPreset(''); };

  if (loading) return <div className="loading">Cargando dashboard...</div>;

  const chartEquipos = dispositivos.map((d) => ({
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
    dispositivos.reduce((acc, d) => {
      acc[d.categoria] = (acc[d.categoria] || 0) + d.consumoMes;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: roundNumber(value) })) : [];

  const chartModulos = hasEquipos ? Object.entries(modulos).map(([key, val]) => ({
    modulo: MODULOS[key]?.label || key,
    consumoMes: val.totales?.consumoMes || 0,
    gastoMensual: val.totales?.gastoMensual || 0,
  })) : [];

  return (
    <div>
      <PageHeader
        title="Inicio"
        subtitle={
          ultimoCalculo
            ? 'Centro de control — un solo cálculo para todos los módulos'
            : 'Registre equipos y ejecute el cálculo para sincronizar todo el sistema'
        }
        action={{
          label: 'Ejecutar Cálculo',
          icon: Calculator,
          onClick: handleCalcular,
          disabled: calculating || !hasEquipos,
          loadingLabel: 'Calculando...',
        }}
      />

      {/* Tarifa kWh destacada (solo lectura) */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid #e11d48' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(225, 29, 72, 0.12)', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} style={{ color: '#e11d48' }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: '#a0aec0', fontWeight: 500 }}>Tarifa kWh (S/)</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#e11d48', letterSpacing: '-0.5px' }}>
              S/ {precioKwh ?? 0.613}
            </div>
            <div style={{ fontSize: '11px', color: '#718096', marginTop: '4px' }}>
              {tarifaFuente === 'cliente' ? 'Tarifa personalizada' : 'Tarifa global del sistema'}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>


          <Link to="/cliente/perfil" style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px', display: 'inline-block' }}>
            Editar desde Mi Perfil →
          </Link>
        </div>
      </div>

      {hasEquipos && excedentesPotencia.length > 0 && (
        <ExcedentesPotenciaAlert items={excedentesPotencia} />
      )}

      {/* Stats actuales */}
      <div className="cards-grid">
        <StatCard icon={Plug} label="Electrodomésticos" value={rg.cantidadEquipos ?? 0} color="#1A4AB0" />
        <StatCard icon={Zap} label="Consumo Diario" value={`${formatNumber(rg.consumoDia ?? 0)} kWh`} color="#3b82f6" />
        <StatCard icon={Zap} label="Consumo Mensual" value={`${formatNumber(rg.consumoMes ?? 0)} kWh`} color="#10b981" />
        <StatCard icon={Zap} label="Consumo Anual" value={`${formatNumber(rg.consumoAnio ?? 0)} kWh`} color="#8b5cf6" />
        <StatCard icon={DollarSign} label="Gasto Diario" value={formatCurrency(rg.gastoDiario ?? 0)} color="#2563d4" />
        <StatCard icon={DollarSign} label="Gasto Mensual" value={formatCurrency(rg.gastoMensual ?? 0)} color="#f59e0b" />
        <StatCard icon={DollarSign} label="Gasto Anual" value={formatCurrency(rg.gastoAnual ?? 0)} color="#10b981" />
        <StatCard icon={TrendingUp} label="Demanda Total" value={`${formatNumber(rg.demandaTotal ?? 0)} kW`} color="#06b6d4" />
      </div>

      {hasEquipos && factura && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header"><h3>Estimación Factura Mensual</h3></div>
          <div className="card-body">
            <FacturaBreakdown factura={factura} precioKwh={precioKwh} consumoMesFallback={rg.consumoMes} />
          </div>
        </div>
      )}

      {/* Sección de filtros históricos */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <CalendarDays size={15} style={{ color: '#7c6ef5' }} />
          <span style={{ color: '#aaa', fontSize: '13px', fontWeight: 500 }}>Historial de consumo por período</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchHistorial}
            disabled={historialLoading}
            style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={13} className={historialLoading ? 'spin' : ''} />
            Actualizar
          </button>
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
          <span style={{ fontSize: '13px', color: '#aaa' }}>Rango:</span>
          <input type="date" className="form-control" style={{ width: 'auto', fontSize: '13px', padding: '5px 10px' }}
            value={customDesde} onChange={(e) => setCustomDesde(e.target.value)} />
          <span style={{ color: '#aaa' }}>→</span>
          <input type="date" className="form-control" style={{ width: 'auto', fontSize: '13px', padding: '5px 10px' }}
            value={customHasta} onChange={(e) => setCustomHasta(e.target.value)} />
          <button type="button" className="btn btn-primary" style={{ padding: '5px 14px', fontSize: '13px' }}
            onClick={handleCustomApply} disabled={!customDesde && !customHasta}>
            Aplicar
          </button>
        </div>
      </div>

      {/* Gráficos históricos */}
      {historialData.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: '#4f46e5' }} />
              <h3>Consumo Promedio por Mes (kWh)</h3>
            </div>
            <div className="card-body" style={{ paddingTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={historialData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2d" />
                  <XAxis dataKey="mes" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="consumoMes" name="kWh" stroke="#4f46e5"
                    fill="url(#colorKwh)" strokeWidth={2} dot={{ fill: '#4f46e5', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={16} style={{ color: '#10b981' }} />
              <h3>Gasto Mensual y Cálculos (S/)</h3>
            </div>
            <div className="card-body" style={{ paddingTop: '0.5rem' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={historialData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2d" />
                  <XAxis dataKey="mes" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#888', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#aaa' }} />
                  <Bar yAxisId="left" dataKey="gastoMensual" name="Gasto (S/)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="totalCalculos" name="N° cálculos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        !historialLoading && (
          <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '1.5rem', color: '#888' }}>
            <BarChart2 size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '14px' }}>No hay cálculos en el período seleccionado.</p>
          </div>
        )
      )}

      {/* Gráficos actuales */}
      <div className="charts-grid">
        <div className="card card-chart">
          <div className="card-header"><h3>Gasto por Equipo (S/)</h3></div>
          <div className="card-body"><GastoPorEquipoChart data={chartEquipos} /></div>
        </div>
        <div className="card card-chart">
          <div className="card-header"><h3>Resumen de Gastos</h3></div>
          <div className="card-body"><GastoResumenChart data={chartGastosResumen} /></div>
        </div>
        <div className="card card-chart">
          <div className="card-header"><h3>Consumo por Equipo (kWh)</h3></div>
          <div className="card-body"><ConsumoPorEquipoChart data={chartEquipos} /></div>
        </div>
        <div className="card card-chart">
          <div className="card-header"><h3>Distribución por Categoría</h3></div>
          <div className="card-body"><ConsumoPorCategoriaChart data={chartCategorias} /></div>
        </div>
        <div className="card card-chart">
          <div className="card-header"><h3>Consumo por Módulo</h3></div>
          <div className="card-body"><ConsumoMensualChart data={chartModulos} /></div>
        </div>
      </div>
    </div>
  );
}
