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
    };
  }

  const factura = buildFacturaFromCalculo(calculo);

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
    facturaTotalMes: parseFloat(factura.totalMes ?? calculo.factura_total_mes ?? 0),
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
  const diferencia = roundNumber(actualVal - refVal);
  const ahorro = roundNumber(refVal - actualVal);
  const pctAhorro = refVal ? roundNumber(((refVal - actualVal) / refVal) * 100) : null;
  return {
    actual: roundNumber(actualVal),
    referencia: roundNumber(refVal),
    diferencia,
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
  };
  result.tieneVariacion = hasComparacionVariacion(result);
  return result;
}

export function findReciboReferencia(calculos) {
  if (!calculos?.length) return null;
  return calculos.find(isEscenarioInicial) ?? calculos.find(isReciboRegistro) ?? null;
}

/** Elige par por defecto: cálculo más reciente vs recibo inicial o segundo cálculo distinto. */
export function pickComparacionDefaults(calculos) {
  if (!calculos?.length) return { actualId: '', referenciaId: '' };

  const list = [...calculos].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  const reciboRef = findReciboReferencia(list);
  const calculosEstimados = list.filter((c) => !isReciboRegistro(c));

  if (reciboRef && calculosEstimados.length >= 1) {
    return {
      actualId: String(calculosEstimados[0].id),
      referenciaId: String(reciboRef.id),
    };
  }

  if (list.length === 1) {
    return { actualId: String(list[0].id), referenciaId: '' };
  }

  const actual = calculosEstimados[0] ?? list[0];
  const actualM = extractCalculoMetrics(actual);
  const referencia = list.find((c) => {
    if (String(c.id) === String(actual.id)) return false;
    const m = extractCalculoMetrics(c);
    return m.consumoMesKwh !== actualM.consumoMesKwh
      || m.facturaTotalMes !== actualM.facturaTotalMes;
  }) ?? list.find((c) => String(c.id) !== String(actual.id)) ?? list[1];

  return {
    actualId: String(actual.id),
    referenciaId: String(referencia.id),
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
  if (!comparison) return { kwh: [], factura: [], gasto: [], ahorro: [] };

  const showConsumo = metricas.consumoKwh !== false;
  const showTotal = metricas.totalFactura !== false;
  const showGasto = metricas.gastoEnergia !== false;

  const refLabel = comparison.referenciaEsRecibo ? 'Recibo real' : 'Referencia';
  const actualLabel = comparison.actualEsRecibo ? 'Recibo real' : 'Escenario';

  const ahorro = [];
  if (showConsumo) {
    ahorro.push({
      name: 'kWh/mes',
      value: Math.abs(comparison.consumoMesKwh.ahorro),
      fill: comparison.consumoMesKwh.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.consumoMesKwh.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    });
  }
  if (showGasto) {
    ahorro.push({
      name: 'S/ energía/mes',
      value: Math.abs(comparison.gastoEnergiaMes.ahorro),
      fill: comparison.gastoEnergiaMes.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.gastoEnergiaMes.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    });
  }
  if (showTotal) {
    ahorro.push({
      name: 'S/ total/mes',
      value: Math.abs(comparison.facturaTotalMes.ahorro),
      fill: comparison.facturaTotalMes.ahorro >= 0 ? '#10b981' : '#ef4444',
      tipo: comparison.facturaTotalMes.ahorro >= 0 ? 'Ahorro' : 'Aumento',
    });
  }

  return {
    kwh: showConsumo ? [
      { name: actualLabel, value: comparison.consumoMesKwh.actual, fill: '#1A4AB0' },
      { name: refLabel, value: comparison.consumoMesKwh.referencia, fill: '#64748b' },
    ] : [],
    factura: showTotal ? [
      { name: actualLabel, value: comparison.facturaTotalMes.actual, fill: '#10b981' },
      { name: refLabel, value: comparison.facturaTotalMes.referencia, fill: '#94a3b8' },
    ] : [],
    gasto: showGasto ? [
      { name: actualLabel, value: comparison.gastoEnergiaMes.actual, fill: '#0ea5e9' },
      { name: refLabel, value: comparison.gastoEnergiaMes.referencia, fill: '#94a3b8' },
    ] : [],
    ahorro,
  };
}

export const COMPARACION_METRICAS = [
  { key: 'consumoKwh', label: 'Consumo por energía (kWh)', field: 'consumoMesKwh', unit: 'kWh' },
  { key: 'gastoEnergia', label: 'Gasto por energía (S/mes)', field: 'gastoEnergiaMes', unit: 'S/' },
  { key: 'totalFactura', label: 'Total a pagar (S/mes)', field: 'facturaTotalMes', unit: 'S/' },
];
