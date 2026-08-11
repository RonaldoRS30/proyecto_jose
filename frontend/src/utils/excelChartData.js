import { roundNumber } from './helpers';
import { buildFactura, buildFacturaFromCalculo } from './factura';

export const EXCEL_CHART_COLORS = {
  c43: '#1A4AB0',
  cargoFijo: '#6366f1',
  mant: '#8b5cf6',
  alumbrado: '#a855f7',
  interes: '#c084fc',
  subtotal: '#0ea5e9',
  igv: '#f59e0b',
  electRural: '#10b981',
  total: '#dc2626',
  gastoEnergia: '#1A4AB0',
  cargosFijos: '#64748b',
  aparato: '#1A4AB0',
  iluminacion: '#f59e0b',
  fantasma: '#8b5cf6',
};

const FACTURA_KEYS = [
  'consumoKwh',
  'gastoEnergia',
  'cargoFijo',
  'mantReposicion',
  'alumbradoPublico',
  'interesCompensatorio',
  'subtotal',
  'igv',
  'electrificacionRural',
  'totalMes',
];

export function normalizeFacturaChart(factura) {
  if (!factura) return null;
  const consumoKwh = Number(
    factura.consumoKwh
    ?? factura.consumoEnergiaKwh
    ?? factura.consumoEnergiaLinea
    ?? 0,
  );
  const gastoEnergia = Number(
    factura.gastoEnergia
    ?? factura.gastoEnergiaMensual
    ?? 0,
  );
  return {
    consumoKwh,
    gastoEnergia,
    cargoFijo: Number(factura.cargoFijo ?? 0),
    mantReposicion: Number(factura.mantReposicion ?? 0),
    alumbradoPublico: Number(factura.alumbradoPublico ?? 0),
    interesCompensatorio: Number(factura.interesCompensatorio ?? 0),
    subtotal: Number(factura.subtotal ?? 0),
    igv: Number(factura.igv ?? 0),
    electrificacionRural: Number(factura.electrificacionRural ?? 0),
    totalMes: Number(factura.totalMes ?? 0),
  };
}

/** Líneas del subtotal Excel C43–C47 */
export function buildSubtotalCompositionData(factura) {
  const f = normalizeFacturaChart(factura);
  if (!f) return [];
  return [
    { key: 'kwh', name: 'Consumo kWh', value: f.consumoKwh, color: EXCEL_CHART_COLORS.c43 },
    { key: 'cargoFijo', name: 'Cargo fijo', value: f.cargoFijo, color: EXCEL_CHART_COLORS.cargoFijo },
    { key: 'mant', name: 'Mant. conexión', value: f.mantReposicion, color: EXCEL_CHART_COLORS.mant },
    { key: 'alumbrado', name: 'Alumbrado público', value: f.alumbradoPublico, color: EXCEL_CHART_COLORS.alumbrado },
    { key: 'interes', name: 'Interés compens.', value: f.interesCompensatorio, color: EXCEL_CHART_COLORS.interes },
  ].filter((row) => row.value > 0);
}

/** Pasos hacia el total C48 → C51 */
export function buildFacturaStepsData(factura) {
  const f = normalizeFacturaChart(factura);
  if (!f || f.totalMes <= 0) return [];
  return [
    { name: 'Subtotal', value: f.subtotal, color: EXCEL_CHART_COLORS.subtotal },
    { name: 'IGV 18%', value: f.igv, color: EXCEL_CHART_COLORS.igv },
    { name: 'Elect. rural', value: f.electrificacionRural, color: EXCEL_CHART_COLORS.electRural },
    { name: 'Total mes', value: f.totalMes, color: EXCEL_CHART_COLORS.total },
  ];
}

/** Gasto tarifario (columna J) vs cargos fijos C44–C47 */
export function buildGastoVsCargosData(factura, precioKwh) {
  const f = normalizeFacturaChart(factura);
  if (!f) return [];
  const gastoEnergia = f.gastoEnergia > 0
    ? f.gastoEnergia
    : roundNumber(f.consumoKwh * (Number(precioKwh) || 0));
  const cargosFijos = roundNumber(
    f.cargoFijo + f.mantReposicion + f.alumbradoPublico + f.interesCompensatorio,
  );
  return [
    { name: 'Gasto por energía', shortName: 'Energía', value: gastoEnergia, color: EXCEL_CHART_COLORS.gastoEnergia },
    { name: 'Cargos fijos', shortName: 'Cargos', value: cargosFijos, color: EXCEL_CHART_COLORS.cargosFijos },
  ].filter((row) => row.value > 0);
}

/** Un solo circular: partes del total factura */
export function buildTotalFacturaPieData(factura) {
  const f = normalizeFacturaChart(factura);
  if (!f || f.totalMes <= 0) return [];
  return [
    { name: 'Subtotal', value: f.subtotal, color: EXCEL_CHART_COLORS.subtotal },
    { name: 'IGV', value: f.igv, color: EXCEL_CHART_COLORS.igv },
    { name: 'Elect. rural', value: f.electrificacionRural, color: EXCEL_CHART_COLORS.electRural },
  ].filter((row) => row.value > 0);
}

export function averageFacturas(facturas) {
  if (!facturas?.length) return null;
  const sums = Object.fromEntries(FACTURA_KEYS.map((k) => [k, 0]));
  facturas.forEach((raw) => {
    const f = normalizeFacturaChart(raw);
    if (!f) return;
    FACTURA_KEYS.forEach((k) => { sums[k] += f[k] || 0; });
  });
  const n = facturas.length;
  return Object.fromEntries(
    FACTURA_KEYS.map((k) => [k, roundNumber(sums[k] / n)]),
  );
}

export function facturaFromCalculoRecord(calculo) {
  if (!calculo) return null;
  const built = buildFacturaFromCalculo(calculo);
  return normalizeFacturaChart(built);
}

export function averageFacturaFromCalculos(calculos) {
  if (!calculos?.length) return null;
  const facturas = calculos.map((c) => facturaFromCalculoRecord(c)).filter(Boolean);
  return averageFacturas(facturas);
}

export function buildFacturaPorMesFromCalculos(calculos) {
  if (!calculos?.length) return [];
  const byMes = new Map();
  calculos.forEach((c) => {
    const d = c.created_at ? new Date(c.created_at) : null;
    if (!d || Number.isNaN(d.getTime())) return;
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMes.has(mes)) byMes.set(mes, []);
    byMes.get(mes).push(c);
  });

  return Array.from(byMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, group]) => ({
      mes,
      ...averageFacturaFromCalculos(group),
      totalCalculos: group.length,
    }));
}

export function averageModulosFromCalculos(calculos) {
  const sums = { aparato: 0, iluminacion: 0, fantasma: 0 };
  let count = 0;

  calculos.forEach((c) => {
    const mod = c.resumen_json?.modulos;
    if (!mod) return;
    sums.aparato += mod.aparatos?.totales?.consumoMes || 0;
    sums.iluminacion += mod.iluminacion?.totales?.consumoMes || 0;
    sums.fantasma += mod.fantasma?.totales?.consumoMes || 0;
    count += 1;
  });

  if (count === 0) return [];

  return [
    { key: 'aparato', name: 'Electrodomésticos', consumoMes: roundNumber(sums.aparato / count), color: EXCEL_CHART_COLORS.aparato },
    { key: 'iluminacion', name: 'Iluminación', consumoMes: roundNumber(sums.iluminacion / count), color: EXCEL_CHART_COLORS.iluminacion },
    { key: 'fantasma', name: 'Consumo fantasma', consumoMes: roundNumber(sums.fantasma / count), color: EXCEL_CHART_COLORS.fantasma },
  ].filter((row) => row.consumoMes > 0);
}

/** Factura Excel desde preview en vivo (dashboard actual) */
export function facturaFromPreview(factura, precioKwh, consumoMesFallback, cantidadEquipos) {
  const built = buildFactura(factura, precioKwh, consumoMesFallback, { cantidadEquipos });
  return normalizeFacturaChart(built);
}

export function modulosFromPreview(modulos) {
  if (!modulos) return [];
  const map = [
    { modKey: 'aparatos', key: 'aparato', name: 'Electrodomésticos', color: EXCEL_CHART_COLORS.aparato },
    { modKey: 'iluminacion', key: 'iluminacion', name: 'Iluminación', color: EXCEL_CHART_COLORS.iluminacion },
    { modKey: 'fantasma', key: 'fantasma', name: 'Consumo fantasma', color: EXCEL_CHART_COLORS.fantasma },
  ];
  return map
    .map(({ modKey, key, name, color }) => ({
      key,
      name,
      color,
      consumoMes: roundNumber(modulos[modKey]?.totales?.consumoMes || 0),
    }))
    .filter((row) => row.consumoMes > 0);
}
