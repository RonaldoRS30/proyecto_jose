const { Calculo } = require('../models');
const { roundNum } = require('../utils/format');

function currentPeriodoFacturacion() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}-01`;
}

function normalizePeriodo(value) {
  if (!value) return currentPeriodoFacturacion();
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return currentPeriodoFacturacion();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}-01`;
}

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

/**
 * Registra o actualiza el recibo PDF en historial (origen = recibo) — escenario inicial informativo.
 */
async function registrarReciboEnHistorial(clienteId, datos, filename = null) {
  if (!clienteId) return null;

  const total = datos.total_a_pagar != null
    ? roundNum(Number(datos.total_a_pagar), 2)
    : null;
  const consumoKwh = datos.consumo_kwh != null
    ? roundNum(Number(datos.consumo_kwh), 3)
    : null;

  const hasTotal = total != null && total > 0;
  const hasConsumo = consumoKwh != null && consumoKwh > 0;
  if (!hasTotal && !hasConsumo) return null;

  const periodo = normalizePeriodo(datos.periodo_facturacion);

  const existing = await Calculo.findOne({
    where: { cliente_id: clienteId, origen: 'recibo', periodo_facturacion: periodo },
  });

  const priorCount = await Calculo.count({ where: { cliente_id: clienteId } });
  const escenarioInicial = existing
    ? Boolean(parseResumenJson(existing.resumen_json)?.escenario_inicial)
    : priorCount === 0;

  const resumenRecibo = {
    origen: 'recibo',
    escenario_inicial: escenarioInicial,
    total_a_pagar: hasTotal ? total : null,
    consumo_kwh: consumoKwh,
    tarifa_kwh: datos.tarifa_kwh ?? null,
    potencia_contratada: datos.potencia_contratada ?? null,
    alumbrado_publico: datos.alumbrado_publico ?? null,
    electrificacion_rural: datos.electrificacion_rural ?? null,
    empresa_distribuidora: datos.empresa_distribuidora ?? null,
    periodo_facturacion: periodo,
    nombre_archivo: filename,
    metodos: datos.metodos ?? null,
  };

  const payload = {
    cliente_id: clienteId,
    origen: 'recibo',
    periodo_facturacion: periodo,
    precio_kwh: datos.tarifa_kwh ?? null,
    consumo_mes_total: consumoKwh,
    factura_total_mes: hasTotal ? total : 0,
    gasto_mensual_total: hasTotal ? total : null,
    resumen_json: resumenRecibo,
  };

  if (existing) {
    await existing.update(payload);
    return existing;
  }

  return Calculo.create(payload);
}

module.exports = {
  registrarReciboEnHistorial,
  normalizePeriodoFacturacion: normalizePeriodo,
  currentPeriodoFacturacion,
};
