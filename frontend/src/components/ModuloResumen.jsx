import { Zap, DollarSign } from 'lucide-react';
import StatCard from './StatCard';
import { formatNumber, formatCurrency } from '../utils/helpers';

/**
 * Tarjetas de resumen por módulo (electrodomésticos, fantasma, iluminación).
 */
export default function ModuloResumenCards({ totales, color = '#1A4AB0', Icon = Zap }) {
  if (!totales) return null;

  return (
    <div className="cards-grid">
      <StatCard icon={Icon} label="Consumo Diario" value={`${formatNumber(totales.consumoDia)} kWh`} color={color} />
      <StatCard icon={Icon} label="Consumo Mensual" value={`${formatNumber(totales.consumoMes)} kWh`} color={color} />
      <StatCard icon={Icon} label="Consumo Anual" value={`${formatNumber(totales.consumoAnio)} kWh`} color={color} />
      <StatCard icon={DollarSign} label="Gasto Diario" value={formatCurrency(totales.gastoDiario)} color="#2563d4" />
      <StatCard icon={DollarSign} label="Gasto Mensual" value={formatCurrency(totales.gastoMensual)} color="#1A4AB0" />
      <StatCard icon={DollarSign} label="Gasto Anual" value={formatCurrency(totales.gastoAnual)} color="#10b981" />
    </div>
  );
}

/** Campos estándar para ListCard de equipos en cualquier módulo. */
export function getEquipoListFields(calc) {
  if (!calc) {
    return [
      { label: 'Consumo/día', value: '-' },
      { label: 'Gasto/día', value: '-' },
      { label: 'Gasto/mes', value: '-' },
      { label: 'Gasto/año', value: '-' },
    ];
  }
  return [
    { label: 'Consumo/día', value: `${formatNumber(calc.consumoDia)} kWh` },
    { label: 'Consumo/mes', value: `${formatNumber(calc.consumoMes)} kWh` },
    { label: 'Gasto/día', value: formatCurrency(calc.gastoDiario) },
    { label: 'Gasto/mes', value: formatCurrency(calc.gastoMensual), highlight: true },
    { label: 'Gasto/año', value: formatCurrency(calc.gastoAnual) },
  ];
}

/** Celdas estándar de tabla para filas de equipos. */
export function renderEquipoDataCells(calc) {
  if (!calc) {
    return (
      <>
        <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
      </>
    );
  }
  return (
    <>
      <td>{formatNumber(calc.consumoDia)} kWh</td>
      <td>{formatNumber(calc.consumoMes)} kWh</td>
      <td>{formatCurrency(calc.gastoDiario)}</td>
      <td>{formatCurrency(calc.gastoMensual)}</td>
      <td>{formatCurrency(calc.gastoAnual)}</td>
    </>
  );
}

export const EQUIPO_TABLE_HEADERS = (
  <>
    <th>Cons. día</th>
    <th>Cons. mes</th>
    <th>Gasto/día</th>
    <th>Gasto/mes</th>
    <th>Gasto/año</th>
  </>
);
