import { roundNumber } from './helpers';
import { buildFacturaFromCalculo } from './factura';
import { isReciboRegistro, isEscenarioInicial } from './calculoRegistro';

function parseResumenJson(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

export function extractCalculoMetrics(calculo) {
  if (!calculo) return null;

  const rj = parseResumenJson(calculo.resumen_json);
  const esRecibo = isReciboRegistro(calculo);

  if (esRecibo) {
    const consumoMesKwh = parseFloat(calculo.consumo_mes_total ?? rj?.consumo_kwh ?? 0);
    const precioKwh = parseFloat(calculo.precio_kwh ?? rj?.tarifa_kwh ?? 0);
    const facturaTotalMes = parseFloat(
      calculo.factura_total_mes ?? rj?.total_a_pagar ?? calculo.gasto_mensual_total ?? 0,
    );
    const gastoEnergiaMes = precioKwh > 0 && consumoMesKwh > 0
      ? roundNumber(consumoMesKwh * precioKwh)
      : 0;

    return {
      id: calculo.id,
      fecha: calculo.created_at,
      esRecibo: true,
      precioKwh,
      consumoMesKwh: roundNumber(consumoMesKwh),
      consumoAnioKwh: roundNumber(consumoMesKwh * 12),
      gastoEnergiaMes,
      gastoEnergiaAnio: roundNumber(gastoEnergiaMes * 12),
      facturaTotalMes: roundNumber(facturaTotalMes),
      facturaTotalAnio: roundNumber(facturaTotalMes * 12),
    };
  }

  const factura = buildFacturaFromCalculo(calculo);
  const facturaTotalMes = parseFloat(factura.totalMes ?? calculo.factura_total_mes ?? 0);

  return {
    id: calculo.id,
    fecha: calculo.created_at,
    esRecibo: false,
    precioKwh: parseFloat(
      calculo.tarifa?.precioKwh
      ?? calculo.resumen_json?.precioKwh
      ?? calculo.precio_kwh
      ?? 0,
    ),
    consumoMesKwh: parseFloat(calculo.consumo_mes_total ?? 0),
    consumoAnioKwh: parseFloat(calculo.consumo_anio_total ?? 0),
    gastoEnergiaMes: parseFloat(
      calculo.gasto_mensual_total
      ?? factura.gastoEnergia
      ?? factura.gastoEnergiaMensual
      ?? 0,
    ),
    gastoEnergiaAnio: parseFloat(calculo.gasto_anual_total ?? 0),
    facturaTotalMes: roundNumber(facturaTotalMes),
    facturaTotalAnio: roundNumber(facturaTotalMes * 12),
  };
}

export function formatCalculoOptionDetail(calculo) {
  const m = extractCalculoMetrics(calculo);
  const fecha = new Date(calculo.created_at).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${fecha} · ${roundNumber(m.consumoMesKwh)} kWh · S/ ${roundNumber(m.facturaTotalMes)}`;
}

export function getComparacionOptionBadge(calculo) {
  if (!isReciboRegistro(calculo)) {
    return { text: 'Cálculo', variant: 'calculo' };
  }
  if (isEscenarioInicial(calculo)) {
    return { text: 'Recibo real', variant: 'recibo' };
  }
  return { text: 'Recibo', variant: 'recibo' };
}

export function buildComparacionSelectOptions(calculos) {
  return (calculos ?? []).map((c) => {
    const badge = getComparacionOptionBadge(c);
    const detail = formatCalculoOptionDetail(c);
    return {
      value: String(c.id),
      calculo: c,
      esRecibo: badge.variant === 'recibo',
      badge,
      label: detail,
      searchText: `${badge.text} ${badge.variant === 'recibo' ? 'recibo real pdf' : 'calculo estimado'} ${detail}`,
    };
  });
}

export function formatCalculoOptionLabel(calculo) {
  const badge = getComparacionOptionBadge(calculo);
  return `${badge.text} · ${formatCalculoOptionDetail(calculo)}`;
}

function buildMetricPair(actualVal, refVal) {
  const ahorro = roundNumber(refVal - actualVal);
  const rawPct = refVal ? ((refVal - actualVal) / refVal) * 100 : null;
  const pctAhorro = rawPct != null ? roundNumber(Math.max(0, rawPct)) : null;
  return {
    actual: roundNumber(actualVal),
    referencia: roundNumber(refVal),
    diferencia: roundNumber(Math.abs(actualVal - refVal)),
    ahorro,
    pctAhorro,
  };
}

export function compareCalculos(actual, referencia) {
  const A = extractCalculoMetrics(actual);
  const B = extractCalculoMetrics(referencia);
  if (!A || !B) return null;

  const result = {
    actual: A,
    referencia: B,
    referenciaEsRecibo: B.esRecibo,
    actualEsRecibo: A.esRecibo,
    tarifaDistinta: Math.abs(A.precioKwh - B.precioKwh) > 0.001,
    consumoMesKwh: buildMetricPair(A.consumoMesKwh, B.consumoMesKwh),
    consumoAnioKwh: buildMetricPair(A.consumoAnioKwh, B.consumoAnioKwh),
    gastoEnergiaMes: buildMetricPair(A.gastoEnergiaMes, B.gastoEnergiaMes),
    gastoEnergiaAnio: buildMetricPair(A.gastoEnergiaAnio, B.gastoEnergiaAnio),
    facturaTotalMes: buildMetricPair(A.facturaTotalMes, B.facturaTotalMes),
    facturaTotalAnio: buildMetricPair(A.facturaTotalAnio, B.facturaTotalAnio),
  };
  result.tieneVariacion = hasComparacionVariacion(result);
  return result;
}

export function findReciboReferencia(calculos) {
  if (!calculos?.length) return null;
  return calculos.find(isEscenarioInicial) ?? calculos.find(isReciboRegistro) ?? null;
}

/** Elige par por defecto: recibo más reciente (o escenario inicial) y cálculo estimado más reciente. */
export function pickComparacionDefaults(calculos) {
  if (!calculos?.length) return { reciboId: '', calculoId: '' };

  const list = [...calculos].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  const recibos = list.filter(isReciboRegistro);
  const calculosEstimados = list.filter((c) => !isReciboRegistro(c));

  const recibo = findReciboReferencia(recibos) ?? recibos[0] ?? null;
  const calculo = calculosEstimados[0] ?? null;

  return {
    reciboId: recibo ? String(recibo.id) : '',
    calculoId: calculo ? String(calculo.id) : '',
  };
}

export function compareCalculosVsRecibo(calculosEstimados, recibo) {
  if (!recibo || !calculosEstimados?.length) return [];
  return calculosEstimados.map((calculo) => ({
    calculo,
    comparison: compareCalculos(calculo, recibo),
  })).filter((row) => row.comparison);
}

export function hasComparacionVariacion(comparison, metricKeys = null) {
  if (!comparison) return false;
  const keys = metricKeys ?? ['consumoMesKwh', 'gastoEnergiaMes', 'gastoEnergiaAnio', 'facturaTotalMes'];
  return keys.some((k) => Math.abs(comparison[k]?.diferencia ?? 0) > 0.001);
}

export function formatAhorroLabel(ahorro, pct, unit = '') {
  const abs = Math.abs(ahorro ?? 0);
  if (abs < 0.001) return 'Sin variación';
  const sign = ahorro >= 0 ? 'Ahorro' : 'Aumento';
  const pctTxt = pct != null ? ` (${Math.abs(pct).toFixed(1)}%)` : '';
  if (unit === 'kWh') return `${sign}: ${roundNumber(abs)} kWh${pctTxt}`;
  if (unit === 'S/') return `${sign}: S/ ${roundNumber(abs)}${pctTxt}`;
  return `${sign}: ${roundNumber(abs)}${pctTxt}`;
}

export function buildComparacionBarData(comparison, metricas = {}) {
  if (!comparison) return { kwh: [], factura: [], facturaAnio: [], gasto: [], ahorro: [] };

  const showConsumo = metricas.consumoKwh !== false;
  const showTotal = metricas.totalFactura !== false;
  const showGasto = metricas.gastoEnergia !== false;
  const showAnual = metricas.ahorroAnual !== false;

  const refLabel = comparison.referenciaEsRecibo ? 'Recibo' : 'Referencia';
  const actualLabel = comparison.actualEsRecibo ? 'Recibo' : 'Cálculo estimado';

  const ahorro = [];
  if (showConsumo) {
    ahorro.push({
      name: 'Ahorro de consumo mensual',
      valueUnit: 'kwh',
      value: Math.abs(comparison.consumoMesKwh.ahorro),
      fill: comparison.consumoMesKwh.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.consumoMesKwh.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    });
  }
  if (showGasto) {
    ahorro.push({
      name: 'Ahorro de gasto por energía (mes)',
      valueUnit: 'soles',
      value: Math.abs(comparison.gastoEnergiaMes.ahorro),
      fill: comparison.gastoEnergiaMes.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.gastoEnergiaMes.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    });
  }
  if (showTotal) {
    ahorro.push({
      name: 'Ahorro en total a pagar (mes)',
      valueUnit: 'soles',
      value: Math.abs(comparison.facturaTotalMes.ahorro),
      fill: comparison.facturaTotalMes.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.facturaTotalMes.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    });
  }
  if (metricas.ahorroAnual) {
    ahorro.push({
      name: 'Ahorro en total a pagar (año)',
      valueUnit: 'soles',
      value: Math.abs(comparison.facturaTotalAnio.ahorro),
      fill: comparison.facturaTotalAnio.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.facturaTotalAnio.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    });
  }

  return {
    kwh: showConsumo ? [
      { name: refLabel, value: comparison.consumoMesKwh.referencia, fill: '#64748b' },
      { name: actualLabel, value: comparison.consumoMesKwh.actual, fill: '#1A4AB0' },
    ] : [],
    factura: showTotal ? [
      { name: refLabel, value: comparison.facturaTotalMes.referencia, fill: '#94a3b8' },
      { name: actualLabel, value: comparison.facturaTotalMes.actual, fill: '#10b981' },
    ] : [],
    gasto: showGasto ? [
      { name: refLabel, value: comparison.gastoEnergiaMes.referencia, fill: '#94a3b8' },
      { name: actualLabel, value: comparison.gastoEnergiaMes.actual, fill: '#0ea5e9' },
    ] : [],
    facturaAnio: showAnual ? [
      { name: refLabel, value: comparison.facturaTotalAnio.referencia, fill: '#94a3b8' },
      { name: actualLabel, value: comparison.facturaTotalAnio.actual, fill: '#8b5cf6' },
    ] : [],
    ahorro,
  };
}

export const COMPARACION_METRICAS = [
  { key: 'consumoKwh', label: 'Consumo por energía (kWh)', field: 'consumoMesKwh', unit: 'kWh' },
  { key: 'gastoEnergia', label: 'Gasto por energía (S/mes)', field: 'gastoEnergiaMes', unit: 'S/' },
  { key: 'totalFactura', label: 'Total a pagar (S/mes)', field: 'facturaTotalMes', unit: 'S/' },
  { key: 'ahorroAnual', label: 'Ahorro en años (S/año)', field: 'facturaTotalAnio', unit: 'S/' },
];
