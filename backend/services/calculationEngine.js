/**
 * Motor de Cálculo - Réplica exacta de fórmulas del Excel
 * Fuente: CÁLCULO - CONSUMO ELÉCTRICO.xlsx
 *
 * Fórmulas por dispositivo (filas 5+ en todas las hojas):
 *   F = (C * E * D) / 1000          → Consumo diario kWh
 *   G = F * 30                      → Consumo mensual kWh
 *   H = F * 365                     → Consumo anual kWh
 *   I = precioKwh * F               → Gasto diario
 *   J = precioKwh * G               → Gasto mensual
 *   K = precioKwh * H               → Gasto anual
 *
 * Hoja CALCULADORA - Facturación mensual (C43-C51):
 *   C43 = G41 → Consumo Energía (kWh mensual, valor numérico usado en suma)
 *   C44-C47 → cargos fijos en S/
 *   C48 = C43+C44+C45+C46+C47 → SUBTOTAL
 *   C49 = C48*0.18 → IGV
 *   C50 → Electrificación Rural
 *   C51 = C49+C50+C48 → TOTAL DEL MES
 *
 * Nota: En columnas I,J,K el gasto en S/ = precioKwh × consumo (I=F*precio, J=G*precio, K=H*precio)
 *       La fila "Consumo de Energía" del recibo usa kWh (G41), no el gasto en soles (J41).
 */

const DEFAULT_TARIFF = {
  precioKwh: 0.613,
  cargoFijo: 2.26,
  mantReposicion: 1.68,
  alumbradoPublico: 17.64,
  interesCompensatorio: 0.82,
  igvRate: 0.18,
  electrificacionRural: 5.01,
  diasMes: 30,
  diasAnio: 365,
};

/**
 * Calcula métricas de un dispositivo individual
 * @param {Object} device - { cantidad, horasDiarias, potenciaW }
 * @param {number} precioKwh - Precio por kWh (J1 en Excel)
 * @returns {Object} Resultados del dispositivo
 */
function calcularDispositivo(device, precioKwh = DEFAULT_TARIFF.precioKwh) {
  const cantidad = Number(device.cantidad) || 0;
  const horasDiarias = Number(device.horasDiarias ?? device.horas_diarias) || 0;
  const potenciaW = Number(device.potenciaW ?? device.potencia_w) || 0;

  // F = (C * E * D) / 1000
  const consumoDia = (cantidad * potenciaW * horasDiarias) / 1000;
  // G = F * 30
  const consumoMes = consumoDia * DEFAULT_TARIFF.diasMes;
  // H = F * 365
  const consumoAnio = consumoDia * DEFAULT_TARIFF.diasAnio;
  // I = precioKwh * F
  const gastoDiario = precioKwh * consumoDia;
  // J = precioKwh * G
  const gastoMensual = precioKwh * consumoMes;
  // K = precioKwh * H
  const gastoAnual = precioKwh * consumoAnio;

  return {
    consumoDia: round(consumoDia),
    consumoMes: round(consumoMes),
    consumoAnio: round(consumoAnio),
    gastoDiario: round(gastoDiario),
    gastoMensual: round(gastoMensual),
    gastoAnual: round(gastoAnual),
    demandaKw: round((cantidad * potenciaW) / 1000),
  };
}

/**
 * Calcula totales de una lista de dispositivos
 * @param {Array} devices
 * @param {number} precioKwh
 * @returns {Object}
 */
function calcularTotales(devices, precioKwh = DEFAULT_TARIFF.precioKwh) {
  const detalles = devices.map((d) => ({
    ...d,
    ...calcularDispositivo(d, precioKwh),
  }));

  const totales = detalles.reduce(
    (acc, item) => ({
      consumoDia: acc.consumoDia + item.consumoDia,
      consumoMes: acc.consumoMes + item.consumoMes,
      consumoAnio: acc.consumoAnio + item.consumoAnio,
      gastoDiario: acc.gastoDiario + item.gastoDiario,
      gastoMensual: acc.gastoMensual + item.gastoMensual,
      gastoAnual: acc.gastoAnual + item.gastoAnual,
      demandaKw: acc.demandaKw + item.demandaKw,
    }),
    {
      consumoDia: 0,
      consumoMes: 0,
      consumoAnio: 0,
      gastoDiario: 0,
      gastoMensual: 0,
      gastoAnual: 0,
      demandaKw: 0,
    }
  );

  Object.keys(totales).forEach((k) => {
    totales[k] = round(totales[k]);
  });

  return { detalles, totales };
}

/**
 * Facturación mensual completa (hoja CALCULADORA C43-C51)
 */
function crearFacturaVacia() {
  return {
    consumoEnergiaKwh: 0,
    consumoEnergiaLinea: 0,
    gastoEnergiaMensual: 0,
    consumoEnergia: 0,
    cargoFijo: 0,
    mantReposicion: 0,
    alumbradoPublico: 0,
    interesCompensatorio: 0,
    subtotal: 0,
    igv: 0,
    electrificacionRural: 0,
    totalMes: 0,
  };
}

function calcularFacturaMensual(consumoMensualTotal, tariff = {}) {
  const t = { ...DEFAULT_TARIFF, ...tariff };
  const kwhMes = round(Number(consumoMensualTotal));

  const gastoEnergiaMensual = round(kwhMes * t.precioKwh);
  // Representado en kWh (Fórmula idéntica a tu Excel)
  const consumoEnergiaLinea = kwhMes;

  const cargoFijo = t.cargoFijo;
  const mantReposicion = t.mantReposicion;
  const alumbradoPublico = t.alumbradoPublico;
  const interesCompensatorio = t.interesCompensatorio;

  // C48 = Gasto en Soles + cargos fijos
  const subtotal = round(
    consumoEnergiaLinea + cargoFijo + mantReposicion + alumbradoPublico + interesCompensatorio
  );
  // C49 = C48*0.18
  const igv = round(subtotal * t.igvRate);
  const electrificacionRural = t.electrificacionRural;
  // C51 = C49+C50+C48
  const totalMes = round(igv + electrificacionRural + subtotal);

  return {
    precioKwh: t.precioKwh,
    consumoEnergiaKwh: kwhMes,
    consumoEnergiaLinea,
    gastoEnergiaMensual,
    // Alias legacy
    consumoEnergia: consumoEnergiaLinea,
    cargoFijo,
    mantReposicion,
    alumbradoPublico,
    interesCompensatorio,
    subtotal,
    igv,
    electrificacionRural,
    totalMes,
  };
}

/**
 * Comparación LED vs incandescente (hoja 3.CONSUMO LUCES N7)
 * N7 = (J7 - J6) / J6
 */
function calcularAhorroLed(gastoMensualLed, gastoMensualIncandescente) {
  if (!gastoMensualIncandescente || gastoMensualIncandescente === 0) return 0;
  return round((gastoMensualLed - gastoMensualIncandescente) / gastoMensualIncandescente);
}

/**
 * Cálculo completo del sistema (todos los módulos)
 */
function calcularCompleto({ aparatos = [], fantasma = [], iluminacion = [] }, config = {}) {
  const precioKwh = config.precioKwh ?? DEFAULT_TARIFF.precioKwh;
  const tariff = { ...DEFAULT_TARIFF, ...config };

  const moduloAparatos = calcularTotales(aparatos, precioKwh);
  const moduloFantasma = calcularTotales(fantasma, precioKwh);
  const moduloIluminacion = calcularTotales(iluminacion, precioKwh);

  const todosDispositivos = [
    ...moduloAparatos.detalles.map((d) => ({ ...d, modulo: 'aparato' })),
    ...moduloFantasma.detalles.map((d) => ({ ...d, modulo: 'fantasma' })),
    ...moduloIluminacion.detalles.map((d) => ({ ...d, modulo: 'iluminacion' })),
  ];

  const consumoMensualTotal =
    moduloAparatos.totales.consumoMes +
    moduloFantasma.totales.consumoMes +
    moduloIluminacion.totales.consumoMes;

  const resumenGeneral = {
    consumoDia: round(
      moduloAparatos.totales.consumoDia +
        moduloFantasma.totales.consumoDia +
        moduloIluminacion.totales.consumoDia
    ),
    consumoMes: round(consumoMensualTotal),
    consumoAnio: round(
      moduloAparatos.totales.consumoAnio +
        moduloFantasma.totales.consumoAnio +
        moduloIluminacion.totales.consumoAnio
    ),
    gastoDiario: round(
      moduloAparatos.totales.gastoDiario +
        moduloFantasma.totales.gastoDiario +
        moduloIluminacion.totales.gastoDiario
    ),
    gastoMensual: round(
      moduloAparatos.totales.gastoMensual +
        moduloFantasma.totales.gastoMensual +
        moduloIluminacion.totales.gastoMensual
    ),
    gastoAnual: round(
      moduloAparatos.totales.gastoAnual +
        moduloFantasma.totales.gastoAnual +
        moduloIluminacion.totales.gastoAnual
    ),
    demandaTotal: round(
      moduloAparatos.totales.demandaKw +
        moduloFantasma.totales.demandaKw +
        moduloIluminacion.totales.demandaKw
    ),
    cantidadEquipos: todosDispositivos.length,
  };

  const factura = todosDispositivos.length === 0
    ? crearFacturaVacia()
    : calcularFacturaMensual(consumoMensualTotal, tariff);

  return {
    precioKwh,
    modulos: {
      aparatos: moduloAparatos,
      fantasma: moduloFantasma,
      iluminacion: moduloIluminacion,
    },
    resumenGeneral,
    factura,
    dispositivos: todosDispositivos,
  };
}

const { roundNum } = require('../utils/format');

const round = roundNum;

module.exports = {
  DEFAULT_TARIFF,
  calcularDispositivo,
  calcularTotales,
  crearFacturaVacia,
  calcularFacturaMensual,
  calcularAhorroLed,
  calcularCompleto,
};
