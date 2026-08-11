const { calcularFacturaMensual, crearFacturaVacia, DEFAULT_TARIFF } = require('./calculationEngine');
const { resolveTarifaFromCliente } = require('./tarifaService');
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
 * Enriquece un cálculo con factura recalculada (subtotal = kWh × tarifa + cargos).
 */
function enrichCalculo(calculo, options = {}) {
  const configMap = options.configMap || {};
  const precioKwhActual = options.precioKwhActual ?? getPrecioKwhParaCalculo(calculo, configMap);
  const plain = aplicarTarifaDinamica(calculo, precioKwhActual);
  const factura = buildFacturaParaCalculo(plain);
  const tarifa = resolveTarifaFromCliente(plain.cliente, configMap);

  return {
    ...plain,
    factura_total_mes: factura.totalMes,
    resumen_json: {
      ...(plain.resumen_json || {}),
      factura,
      precioKwh: precioKwhActual,
    },
    tarifa: {
      precioKwh: precioKwhActual,
      fuente: tarifa.fuente,
      globalPrecio: tarifa.globalPrecio,
    },
  };
}

function enrichCalculos(calculos, configMap = {}) {
  return calculos.map((c) => enrichCalculo(c, { configMap }));
}

function recalcGasto(consumo, precioKwh) {
  return roundNum(parseFloat(consumo || 0) * parseFloat(precioKwh));
}

function recalcTotalesGasto(totales, precioKwh) {
  if (!totales) return totales;
  return {
    ...totales,
    gastoDiario: recalcGasto(totales.consumoDia, precioKwh),
    gastoMensual: recalcGasto(totales.consumoMes, precioKwh),
    gastoAnual: recalcGasto(totales.consumoAnio, precioKwh),
  };
}

/**
 * Recalcula gastos en S/ usando la tarifa actual (consumo kWh × precio).
 * No modifica la base de datos; solo la respuesta API.
 */
function aplicarTarifaDinamica(calculo, precioKwh) {
  const plain = calculo?.toJSON ? calculo.toJSON() : { ...calculo };
  const storedPrecio = parseFloat(plain.precio_kwh);
  const p = parseFloat(precioKwh);

  if (!p || (storedPrecio === p && !plain.tarifa_dinamica)) {
    return plain;
  }

  const out = {
    ...plain,
    precio_kwh: p,
    precio_kwh_guardado: plain.precio_kwh_guardado ?? plain.precio_kwh,
    tarifa_dinamica: storedPrecio !== p,
    gasto_diario_total: recalcGasto(plain.consumo_dia_total, p),
    gasto_mensual_total: recalcGasto(plain.consumo_mes_total, p),
    gasto_anual_total: recalcGasto(plain.consumo_anio_total, p),
  };

  if (out.detalles?.length) {
    out.detalles = out.detalles.map((d) => ({
      ...d,
      gasto_diario: recalcGasto(d.consumo_dia, p),
      gasto_mensual: recalcGasto(d.consumo_mes, p),
      gasto_anual: recalcGasto(d.consumo_anio, p),
    }));
  }

  if (out.resumen_json) {
    const rj = { ...out.resumen_json, precioKwh: p };
    const rg = rj.resumenGeneral || {};

    rj.resumenGeneral = {
      ...rg,
      gastoDiario: recalcGasto(rg.consumoDia ?? plain.consumo_dia_total, p),
      gastoMensual: recalcGasto(rg.consumoMes ?? plain.consumo_mes_total, p),
      gastoAnual: recalcGasto(rg.consumoAnio ?? plain.consumo_anio_total, p),
    };

    if (Array.isArray(rj.dispositivos)) {
      rj.dispositivos = rj.dispositivos.map((d) => ({
        ...d,
        gastoDiario: recalcGasto(d.consumoDia, p),
        gastoMensual: recalcGasto(d.consumoMes, p),
        gastoAnual: recalcGasto(d.consumoAnio, p),
      }));
    }

    if (rj.modulos) {
      const modulos = { ...rj.modulos };
      ['aparatos', 'fantasma', 'iluminacion'].forEach((key) => {
        if (modulos[key]?.totales) {
          modulos[key] = {
            ...modulos[key],
            totales: recalcTotalesGasto(modulos[key].totales, p),
            detalles: modulos[key].detalles?.map((d) => ({
              ...d,
              gastoDiario: recalcGasto(d.consumoDia, p),
              gastoMensual: recalcGasto(d.consumoMes, p),
              gastoAnual: recalcGasto(d.consumoAnio, p),
            })),
          };
        }
      });
      rj.modulos = modulos;
    }

    out.resumen_json = rj;
  }

  return out;
}

function getPrecioKwhParaCalculo(calculo, configMap = {}) {
  const plain = calculo?.toJSON ? calculo.toJSON() : calculo;
  if (plain.cliente) {
    return resolveTarifaFromCliente(plain.cliente, configMap).precioKwh;
  }
  return parseFloat(plain.precio_kwh) || parseFloat(configMap.precioKwh) || DEFAULT_TARIFF.precioKwh;
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

const FACTURA_AGG_KEYS = [
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

function facturaFieldsFromCalculo(calculo) {
  const f = calculo.resumen_json?.factura || buildFacturaParaCalculo(calculo);
  return {
    consumoKwh: f.consumoEnergiaKwh ?? f.consumoEnergiaLinea ?? 0,
    gastoEnergia: f.gastoEnergiaMensual ?? 0,
    cargoFijo: f.cargoFijo ?? 0,
    mantReposicion: f.mantReposicion ?? 0,
    alumbradoPublico: f.alumbradoPublico ?? 0,
    interesCompensatorio: f.interesCompensatorio ?? 0,
    subtotal: f.subtotal ?? 0,
    igv: f.igv ?? 0,
    electrificacionRural: f.electrificacionRural ?? 0,
    totalMes: f.totalMes ?? 0,
  };
}

function averageFacturaFromCalculos(calculos) {
  if (!calculos?.length) return null;
  const sums = Object.fromEntries(FACTURA_AGG_KEYS.map((k) => [k, 0]));
  calculos.forEach((c) => {
    const f = facturaFieldsFromCalculo(c);
    FACTURA_AGG_KEYS.forEach((k) => {
      sums[k] += parseFloat(f[k]) || 0;
    });
  });
  const n = calculos.length;
  return Object.fromEntries(
    FACTURA_AGG_KEYS.map((k) => [k, roundNum(sums[k] / n)]),
  );
}

function buildFacturaPorMes(calculos) {
  if (!calculos?.length) return [];
  const byMes = new Map();
  calculos.forEach((c) => {
    const plain = c?.toJSON ? c.toJSON() : c;
    const d = plain.created_at ? new Date(plain.created_at) : null;
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

function averageModulosFromCalculos(calculos) {
  const sums = { aparato: 0, iluminacion: 0, fantasma: 0 };
  let count = 0;

  calculos.forEach((c) => {
    const mods = getTotalesPorModulo(c);
    if (!mods.length) return;
    mods.forEach((m) => {
      if (sums[m.key] != null) sums[m.key] += m.totales.consumoMes || 0;
    });
    count += 1;
  });

  if (count === 0) return [];

  return [
    { key: 'aparato', name: MOD_LABELS.aparato, consumoMes: roundNum(sums.aparato / count) },
    { key: 'iluminacion', name: MOD_LABELS.iluminacion, consumoMes: roundNum(sums.iluminacion / count) },
    { key: 'fantasma', name: MOD_LABELS.fantasma, consumoMes: roundNum(sums.fantasma / count) },
  ].filter((row) => row.consumoMes > 0);
}

module.exports = {
  aplicarTarifaDinamica,
  buildFacturaParaCalculo,
  enrichCalculo,
  enrichCalculos,
  getPrecioKwhParaCalculo,
  getResumenParaCalculo,
  getTotalesPorModulo,
  MOD_LABELS,
  averageFacturaFromCalculos,
  buildFacturaPorMes,
  averageModulosFromCalculos,
};
