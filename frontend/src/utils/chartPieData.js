import { formatMesLabel } from './chartPeriodFilters';

/** Convierte filas { name, value } con porcentaje calculado. Agrupa el resto en "Otros". */
export function toPieChartData(rows, { nameKey = 'name', valueKey = 'value', maxItems = 6, otrosLabel = 'Otros' } = {}) {
  const sorted = [...rows]
    .map((row) => ({
      name: String(row[nameKey] ?? ''),
      value: Number(row[valueKey]) || 0,
    }))
    .filter((row) => row.name && row.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = sorted.reduce((sum, row) => sum + row.value, 0);
  if (!total) return [];

  const top = sorted.slice(0, maxItems);
  const rest = sorted.slice(maxItems);
  const otrosValue = rest.reduce((sum, row) => sum + row.value, 0);

  const result = top.map((row) => ({
    ...row,
    percent: Math.round((row.value / total) * 1000) / 10,
  }));

  if (otrosValue > 0) {
    result.push({
      name: otrosLabel,
      value: otrosValue,
      percent: Math.round((otrosValue / total) * 1000) / 10,
    });
  }

  return result;
}

export function aggregateCalculoTotalsByMonth(calculos = []) {
  const byMonth = {};
  calculos.forEach((c) => {
    const key = formatMesLabel(c.created_at);
    if (!byMonth[key]) {
      byMonth[key] = { mes: key, consumoTotal: 0, gastoTotal: 0, totalCalculos: 0 };
    }
    byMonth[key].consumoTotal += parseFloat(c.consumo_mes_total) || 0;
    byMonth[key].gastoTotal += parseFloat(c.gasto_mensual_total) || 0;
    byMonth[key].totalCalculos += 1;
  });

  return Object.values(byMonth).map((row) => ({
    mes: row.mes,
    consumoTotal: Math.round(row.consumoTotal * 100) / 100,
    gastoTotal: Math.round(row.gastoTotal * 100) / 100,
    totalCalculos: row.totalCalculos,
  }));
}
