import { roundNumber } from './helpers';
import { buildFacturaFromCalculo } from './factura';

export function extractCalculoMetrics(calculo) {
  if (!calculo) return null;

  const factura = buildFacturaFromCalculo(calculo);

  return {
    id: calculo.id,
    fecha: calculo.created_at,
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

export function formatCalculoOptionLabel(calculo) {
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

/** Elige par por defecto: el más reciente vs el primer cálculo con datos distintos. */
export function pickComparacionDefaults(calculos) {
  if (!calculos?.length) return { actualId: '', referenciaId: '' };
  const list = [...calculos].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
  if (list.length === 1) {
    return { actualId: String(list[0].id), referenciaId: '' };
  }
  const actual = list[0];
  const actualM = extractCalculoMetrics(actual);
  const referencia = list.find((c) => {
    if (String(c.id) === String(actual.id)) return false;
    const m = extractCalculoMetrics(c);
    return m.consumoMesKwh !== actualM.consumoMesKwh
      || m.facturaTotalMes !== actualM.facturaTotalMes;
  }) ?? list[1];
  return {
    actualId: String(actual.id),
    referenciaId: String(referencia.id),
  };
}

export function hasComparacionVariacion(comparison) {
  if (!comparison) return false;
  const keys = ['consumoMesKwh', 'gastoEnergiaMes', 'gastoEnergiaAnio', 'facturaTotalMes'];
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

export function buildComparacionBarData(comparison) {
  if (!comparison) return { kwh: [], gasto: [], ahorro: [] };

  return {
    kwh: [
      { name: 'Actual', value: comparison.consumoMesKwh.actual, fill: '#1A4AB0' },
      { name: 'Referencia', value: comparison.consumoMesKwh.referencia, fill: '#64748b' },
    ],
    gasto: [
      { name: 'Actual', value: comparison.gastoEnergiaMes.actual, fill: '#10b981' },
      { name: 'Referencia', value: comparison.gastoEnergiaMes.referencia, fill: '#94a3b8' },
    ],
    ahorro: [
      {
        name: 'kWh/mes',
        value: Math.abs(comparison.consumoMesKwh.ahorro),
        fill: comparison.consumoMesKwh.ahorro >= 0 ? '#10b981' : '#ef4444',
      },
      {
        name: 'S/ energía/mes',
        value: Math.abs(comparison.gastoEnergiaMes.ahorro),
        fill: comparison.gastoEnergiaMes.ahorro >= 0 ? '#10b981' : '#ef4444',
      },
    ],
  };
}
