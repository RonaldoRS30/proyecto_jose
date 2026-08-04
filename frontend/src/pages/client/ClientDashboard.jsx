import { Plug, Zap, DollarSign, TrendingUp, Calculator } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import {
  ConsumoPorEquipoChart, ConsumoPorCategoriaChart, ConsumoMensualChart,
  GastoPorEquipoChart, GastoResumenChart,
} from '../../components/ConsumoCharts';
import FacturaBreakdown from '../../components/FacturaBreakdown';
import { useCalculo } from '../../contexts/CalculoContext';
import { useAlert } from '../../contexts/ConfirmContext';
import { formatNumber, formatCurrency, MODULOS, roundNumber } from '../../utils/helpers';

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
    dispositivos,
    ultimoCalculo,
  } = useCalculo();

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

      <div className="cards-grid">
        <StatCard icon={Plug} label="Electrodomésticos" value={rg.cantidadEquipos ?? 0} color="#1A4AB0" />
        <StatCard icon={Zap} label="Consumo Mensual" value={`${formatNumber(rg.consumoMes ?? 0)} kWh`} color="#10b981" />
        <StatCard icon={DollarSign} label="Gasto Diario" value={formatCurrency(rg.gastoDiario ?? 0)} color="#2563d4" />
        <StatCard icon={DollarSign} label="Gasto Mensual" value={formatCurrency(rg.gastoMensual ?? 0)} color="#f59e0b" />
        <StatCard icon={DollarSign} label="Gasto Anual" value={formatCurrency(rg.gastoAnual ?? 0)} color="#10b981" />
        <StatCard icon={TrendingUp} label="Demanda Total" value={`${formatNumber(rg.demandaTotal ?? 0)} kW`} color="#06b6d4" />
      </div>

      {hasEquipos && factura && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header"><h3>Estimación Factura Mensual</h3></div>
          <div className="card-body">
            <FacturaBreakdown
              factura={factura}
              precioKwh={precioKwh}
              consumoMesFallback={rg.consumoMes}
            />
          </div>
        </div>
      )}

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
