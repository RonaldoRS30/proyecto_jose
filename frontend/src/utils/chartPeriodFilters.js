export const CHART_PERIOD_PRESETS = [
  { label: 'Esta semana', value: 'semana' },
  { label: 'Este mes', value: 'mes' },
  { label: 'Mes pasado', value: 'mes_pasado' },
  { label: 'Últimos 3 meses', value: '3meses' },
  { label: 'Últimos 6 meses', value: '6meses' },
  { label: 'Este año', value: 'anio' },
  { label: 'Todo', value: 'todo' },
];

export const ADMIN_PERIOD_PRESETS = [
  { label: 'Hoy', value: 'hoy' },
  ...CHART_PERIOD_PRESETS,
];

export function getChartPresetDates(preset) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = now.getMonth();
  const dd = now.getDate();
  const fmt = (d) => d.toISOString().slice(0, 10);

  switch (preset) {
    case 'hoy':
      return { desde: fmt(new Date(yyyy, mm, dd)), hasta: fmt(new Date(yyyy, mm, dd)) };
    case 'semana': {
      const day = now.getDay();
      return {
        desde: fmt(new Date(yyyy, mm, dd - (day === 0 ? 6 : day - 1))),
        hasta: fmt(now),
      };
    }
    case 'mes':
      return { desde: fmt(new Date(yyyy, mm, 1)), hasta: fmt(now) };
    case 'mes_pasado':
      return { desde: fmt(new Date(yyyy, mm - 1, 1)), hasta: fmt(new Date(yyyy, mm, 0)) };
    case '3meses':
      return { desde: fmt(new Date(yyyy, mm - 2, 1)), hasta: fmt(now) };
    case '6meses':
      return { desde: fmt(new Date(yyyy, mm - 5, 1)), hasta: fmt(now) };
    case 'anio':
      return { desde: fmt(new Date(yyyy, 0, 1)), hasta: fmt(now) };
    default:
      return { desde: '', hasta: '' };
  }
}

export function formatMesLabel(fechaStr) {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function aggregateCalculosByMonth(calculos) {
  const byMonth = {};
  calculos.forEach((c) => {
    const key = formatMesLabel(c.created_at);
    if (!byMonth[key]) {
      byMonth[key] = { mes: key, consumoMes: 0, gastoMensual: 0, count: 0 };
    }
    byMonth[key].consumoMes += parseFloat(c.consumo_mes_total) || 0;
    byMonth[key].gastoMensual += parseFloat(c.gasto_mensual_total) || 0;
    byMonth[key].count += 1;
  });

  return Object.values(byMonth).map((row) => ({
    mes: row.mes,
    consumoMes: Math.round((row.consumoMes / row.count) * 100) / 100,
    gastoMensual: Math.round((row.gastoMensual / row.count) * 100) / 100,
    totalCalculos: row.count,
  }));
}
