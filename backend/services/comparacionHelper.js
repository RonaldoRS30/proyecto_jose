const { roundNum } = require('../utils/format');
const { buildFacturaParaCalculo } = require('./facturaHelper');

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

function isReciboRegistro(calculo) {
  const rj = parseResumenJson(calculo?.resumen_json);
  return calculo?.origen === 'recibo' || rj?.origen === 'recibo';
}

function extractCalculoMetrics(calculo) {
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
      ? roundNum(consumoMesKwh * precioKwh)
      : 0;

    return {
      id: calculo.id,
      fecha: calculo.created_at,
      esRecibo: true,
      precioKwh,
      consumoMesKwh: roundNum(consumoMesKwh),
      consumoAnioKwh: roundNum(consumoMesKwh * 12),
      gastoEnergiaMes,
      gastoEnergiaAnio: roundNum(gastoEnergiaMes * 12),
      facturaTotalMes: roundNum(facturaTotalMes),
    };
  }

  const factura = buildFacturaParaCalculo(calculo);
  return {
    id: calculo.id,
    fecha: calculo.created_at,
    esRecibo: false,
    precioKwh: parseFloat(calculo.precio_kwh ?? factura.precioKwh ?? 0),
    consumoMesKwh: parseFloat(calculo.consumo_mes_total ?? 0),
    consumoAnioKwh: parseFloat(calculo.consumo_anio_total ?? 0),
    gastoEnergiaMes: parseFloat(
      calculo.gasto_mensual_total ?? factura.gastoEnergiaMensual ?? 0,
    ),
    gastoEnergiaAnio: parseFloat(calculo.gasto_anual_total ?? 0),
    facturaTotalMes: parseFloat(factura.totalMes ?? calculo.factura_total_mes ?? 0),
  };
}

function buildMetricPair(actualVal, refVal) {
  const diferencia = roundNum(actualVal - refVal);
  const ahorro = roundNum(refVal - actualVal);
  const pctAhorro = refVal ? roundNum(((refVal - actualVal) / refVal) * 100) : null;
  return {
    actual: roundNum(actualVal),
    referencia: roundNum(refVal),
    diferencia,
    ahorro,
    pctAhorro,
  };
}

function compareCalculos(actual, referencia) {
  const A = extractCalculoMetrics(actual);
  const B = extractCalculoMetrics(referencia);
  if (!A || !B) return null;

  return {
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
}

function formatDatePE(date) {
  return new Date(date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

module.exports = {
  extractCalculoMetrics,
  compareCalculos,
  formatDatePE,
  isReciboRegistro,
};
