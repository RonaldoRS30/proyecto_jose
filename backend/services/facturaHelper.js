const { calcularFacturaMensual, crearFacturaVacia, DEFAULT_TARIFF } = require('./calculationEngine');
const { roundNum } = require('../utils/format');

/**
 * Tarifa usada en el cálculo (precio del registro + cargos guardados o defaults).
 */
function tariffFromCalculo(calculo) {
  const stored = calculo.resumen_json?.factura || {};
  return {
    precioKwh: parseFloat(calculo.precio_kwh) || DEFAULT_TARIFF.precioKwh,
    cargoFijo: stored.cargoFijo ?? DEFAULT_TARIFF.cargoFijo,
    mantReposicion: stored.mantReposicion ?? DEFAULT_TARIFF.mantReposicion,
    alumbradoPublico: stored.alumbradoPublico ?? DEFAULT_TARIFF.alumbradoPublico,
    interesCompensatorio: stored.interesCompensatorio ?? DEFAULT_TARIFF.interesCompensatorio,
    igvRate: stored.igvRate ?? DEFAULT_TARIFF.igvRate,
    electrificacionRural: stored.electrificacionRural ?? DEFAULT_TARIFF.electrificacionRural,
  };
}

function getCantidadEquiposCalculo(calculo) {
  const plain = calculo?.toJSON ? calculo.toJSON() : calculo;
  const fromResumen = plain.resumen_json?.resumenGeneral?.cantidadEquipos;
  if (fromResumen != null && fromResumen > 0) return fromResumen;

  const fromDispositivos = plain.resumen_json?.dispositivos?.length ?? 0;
  if (fromDispositivos > 0) return fromDispositivos;

  const fromDetalles = plain.detalles?.length ?? 0;
  if (fromDetalles > 0) return fromDetalles;

  const consumoMes = parseFloat(plain.consumo_mes_total ?? 0);
  if (consumoMes > 0) return 1;

  return fromResumen ?? 0;
}

/**
 * Recalcula factura según Excel — no depende de resumen_json obsoleto.
 */
function buildFacturaParaCalculo(calculo) {
  const plain = calculo?.toJSON ? calculo.toJSON() : calculo;
  if (getCantidadEquiposCalculo(plain) === 0) {
    return crearFacturaVacia();
  }
  const consumoMes = parseFloat(
    plain.consumo_mes_total ?? plain.resumen_json?.resumenGeneral?.consumoMes ?? 0
  );
  return calcularFacturaMensual(consumoMes, tariffFromCalculo(plain));
}

/**
 * Enriquece un cálculo con factura recalculada (subtotal = kWh + cargos).
 */
function enrichCalculo(calculo) {
  const plain = calculo?.toJSON ? calculo.toJSON() : { ...calculo };
  const factura = buildFacturaParaCalculo(plain);
  return {
    ...plain,
    factura_total_mes: factura.totalMes,
    resumen_json: {
      ...(plain.resumen_json || {}),
      factura,
    },
  };
}

function enrichCalculos(calculos) {
  return calculos.map((c) => enrichCalculo(c));
}

/**
 * Resumen general priorizando columnas del cálculo guardado.
 */
function getResumenParaCalculo(calculo) {
  const rg = calculo.resumen_json?.resumenGeneral || {};
  return {
    consumoDia: calculo.consumo_dia_total ?? rg.consumoDia ?? 0,
    consumoMes: calculo.consumo_mes_total ?? rg.consumoMes ?? 0,
    consumoAnio: calculo.consumo_anio_total ?? rg.consumoAnio ?? 0,
    gastoDiario: calculo.gasto_diario_total ?? rg.gastoDiario ?? 0,
    gastoMensual: calculo.gasto_mensual_total ?? rg.gastoMensual ?? 0,
    gastoAnual: calculo.gasto_anual_total ?? rg.gastoAnual ?? 0,
    demandaTotal: calculo.demanda_total ?? rg.demandaTotal ?? 0,
  };
}

const MOD_LABELS = {
  aparato: 'Electrodomésticos',
  fantasma: 'Consumo Fantasma',
  iluminacion: 'Iluminación',
};

/**
 * Totales por módulo desde resumen_json o agregando detalles.
 */
function getTotalesPorModulo(calculo) {
  const modulos = calculo.resumen_json?.modulos || {};
  const detalles = calculo.detalles || [];
  const keys = ['aparato', 'fantasma', 'iluminacion'];

  return keys.map((key) => {
    const fromResumen = modulos[key === 'aparato' ? 'aparatos' : key]?.totales;
    if (fromResumen) {
      return { key, label: MOD_LABELS[key], totales: fromResumen };
    }

    const items = detalles.filter((d) => d.modulo === key);
    if (items.length === 0) return null;

    const totales = items.reduce(
      (acc, d) => ({
        consumoDia: acc.consumoDia + parseFloat(d.consumo_dia || 0),
        consumoMes: acc.consumoMes + parseFloat(d.consumo_mes || 0),
        consumoAnio: acc.consumoAnio + parseFloat(d.consumo_anio || 0),
        gastoDiario: acc.gastoDiario + parseFloat(d.gasto_diario || 0),
        gastoMensual: acc.gastoMensual + parseFloat(d.gasto_mensual || 0),
        gastoAnual: acc.gastoAnual + parseFloat(d.gasto_anual || 0),
      }),
      {
        consumoDia: 0,
        consumoMes: 0,
        consumoAnio: 0,
        gastoDiario: 0,
        gastoMensual: 0,
        gastoAnual: 0,
      }
    );

    Object.keys(totales).forEach((k) => {
      totales[k] = roundNum(totales[k]);
    });

    return { key, label: MOD_LABELS[key], totales };
  }).filter(Boolean);
}

module.exports = {
  buildFacturaParaCalculo,
  enrichCalculo,
  enrichCalculos,
  getResumenParaCalculo,
  getTotalesPorModulo,
  MOD_LABELS,
};
