/**
 * Motor de Cálculo - Réplica exacta de fórmulas del Excel
 * Fuente: CÁLCULO - CONSUMO ELÉCTRICO.xlsx
 *
 * Fórmulas por dispositivo (filas 5+ en todas las hojas):
 *   G = ROUND((C * E * D) / 1000 * 30, 0)  → Consumo mensual kWh
 *   F = ROUND(G / 30, 4)                   → Consumo diario kWh (derivado del mes)
 *   H = ROUND(G / 30 * 365, 2)             → Consumo anual kWh
 *   I = ROUND(precioKwh * F, 2)            → Gasto diario S/
 *   J = ROUND(precioKwh * G, 2)            → Gasto mensual S/
 *   K = ROUND(precioKwh * H, 2)            → Gasto anual S/
 *
 * Fila TOTALES: consumo con 2 decimales; gastos = ROUND(consumo_total * precioKwh, 2)
 *
 * Hoja CALCULADORA - Facturación mensual (C43-C51):
 *   C43 = J41 → suma gasto mensual (S/) de electrodomésticos + fantasma + luces
 *   C44-C47 → cargos fijos en S/
 *   C48 = C43+C44+C45+C46+C47 → SUBTOTAL
 *   C49 = C48*0.18 → IGV
 *   C50 → Electrificación Rural
 *   C51 = C49+C50+C48 → TOTAL DEL MES
 *
 * G41 sigue siendo kWh/mes (referencia). J41 = suma columna GASTO MENSUAL por equipo.
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

const {
  calcularConsumoDiaDispositivo,
} = require('../helpers/consumoDispositivoHelper');

/**
 * Calcula métricas de un dispositivo individual
 * @param {Object} device - { cantidad, horasDiarias, potenciaW, ...eficiencia }
 * @param {number} precioKwh - Precio por kWh (J1 en Excel)
 * @returns {Object} Resultados del dispositivo
 */
function calcularDispositivo(device, precioKwh = DEFAULT_TARIFF.precioKwh) {
  const cantidad = Number(device.cantidad) || 0;
  const horasDiarias = Number(device.horasDiarias ?? device.horas_diarias) || 0;
  const potenciaW = Number(device.potenciaW ?? device.potencia_w) || 0;

  const consumoDiaRaw = calcularConsumoDiaDispositivo({
    ...device,
    cantidad,
    horasDiarias,
    potenciaW,
  });
  const consumoMes = round(consumoDiaRaw * DEFAULT_TARIFF.diasMes, KWH_MONTH);
  const consumoDia = round(consumoMes / DEFAULT_TARIFF.diasMes, KWH_DAY);
  const consumoAnio = round((consumoMes / DEFAULT_TARIFF.diasMes) * DEFAULT_TARIFF.diasAnio, KWH_YEAR);
  const gastoDiario = round(precioKwh * consumoDia, MONEY);
  const gastoMensual = round(precioKwh * consumoMes, MONEY);
  const gastoAnual = round(precioKwh * consumoAnio, MONEY);

  return {
    consumoDia,
    consumoMes,
    consumoAnio,
    gastoDiario,
    gastoMensual,
    gastoAnual,
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

  totales.consumoDia = round(totales.consumoDia, KWH_TOTAL);
  totales.consumoMes = round(totales.consumoMes, KWH_TOTAL);
  totales.consumoAnio = round(totales.consumoAnio, KWH_TOTAL);
  totales.gastoDiario = round(totales.consumoDia * precioKwh, MONEY);
  totales.gastoMensual = round(totales.consumoMes * precioKwh, MONEY);
  totales.gastoAnual = round(totales.consumoAnio * precioKwh, MONEY);
  totales.demandaKw = round(totales.demandaKw);

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

function calcularFacturaMensual(consumoMensualTotal, tariff = {}, gastoMensualTotal = null) {
  const t = { ...DEFAULT_TARIFF, ...tariff };
  const kwhMes = round(Number(consumoMensualTotal) || 0, KWH_TOTAL);
  const gastoEnergiaMensual = round(
    gastoMensualTotal != null && gastoMensualTotal !== ''
      ? Number(gastoMensualTotal)
      : kwhMes * t.precioKwh,
    MONEY
  );
  // C43 = J41 (Excel): suma gasto mensual de todos los equipos listados
  const consumoEnergiaLinea = gastoEnergiaMensual;

  const cargoFijo = t.cargoFijo;
  const mantReposicion = t.mantReposicion;
  const alumbradoPublico = t.alumbradoPublico;
  const interesCompensatorio = t.interesCompensatorio;

  // C48 = C43 + cargos fijos (réplica Excel)
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

  const consumoDiarioTotal =
    moduloAparatos.totales.consumoDia +
    moduloFantasma.totales.consumoDia +
    moduloIluminacion.totales.consumoDia;

  const resumenGeneral = {
    consumoDia: round(consumoDiarioTotal, KWH_TOTAL),
    consumoMes: round(consumoMensualTotal, KWH_TOTAL),
    consumoAnio: round(
      moduloAparatos.totales.consumoAnio +
        moduloFantasma.totales.consumoAnio +
        moduloIluminacion.totales.consumoAnio,
      KWH_TOTAL
    ),
    gastoDiario: round(
      round(consumoDiarioTotal, KWH_TOTAL) * precioKwh,
      MONEY
    ),
    gastoMensual: round(
      round(consumoMensualTotal, KWH_TOTAL) * precioKwh,
      MONEY
    ),
    gastoAnual: round(
      round(
        moduloAparatos.totales.consumoAnio +
          moduloFantasma.totales.consumoAnio +
          moduloIluminacion.totales.consumoAnio,
        KWH_TOTAL
      ) * precioKwh,
      MONEY
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
    : calcularFacturaMensual(consumoMensualTotal, tariff, resumenGeneral.gastoMensual);

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

const {
  roundNum,
  DECIMALS_KWH_DAY: KWH_DAY,
  DECIMALS_KWH_MONTH: KWH_MONTH,
  DECIMALS_KWH_YEAR: KWH_YEAR,
  DECIMALS_KWH_TOTAL: KWH_TOTAL,
  DECIMALS_MONEY: MONEY,
} = require('../utils/format');

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
