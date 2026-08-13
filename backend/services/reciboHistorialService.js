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

/**
 * Registra o actualiza el total del recibo real en historial (origen = recibo).
 */
async function registrarReciboEnHistorial(clienteId, datos, filename = null) {
  const total = roundNum(Number(datos.total_a_pagar), 2);
  if (!clienteId || !total || total <= 0) return null;

  const periodo = normalizePeriodo(datos.periodo_facturacion);
  const consumoKwh = datos.consumo_kwh != null
    ? roundNum(Number(datos.consumo_kwh), 3)
    : null;

  const resumenRecibo = {
    origen: 'recibo',
    total_a_pagar: total,
    consumo_kwh: consumoKwh,
    tarifa_kwh: datos.tarifa_kwh ?? null,
    potencia_contratada: datos.potencia_contratada ?? null,
    alumbrado_publico: datos.alumbrado_publico ?? null,
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
    factura_total_mes: total,
    gasto_mensual_total: total,
    resumen_json: resumenRecibo,
  };

  const existing = await Calculo.findOne({
    where: { cliente_id: clienteId, origen: 'recibo', periodo_facturacion: periodo },
  });

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
