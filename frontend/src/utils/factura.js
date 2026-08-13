import { roundNumber } from './helpers';

const DEFAULT_TARIFF = {
  cargoFijo: 2.26,
  mantReposicion: 1.68,
  alumbradoPublico: 17.64,
  interesCompensatorio: 0.82,
  igvRate: 0.18,
  electrificacionRural: 5.01,
  precioKwh: 0.613,
};

/**
 * Recalcula subtotal, IGV y total según Excel (C43–C51).
 * C43 = suma gasto mensual (J) de apartados + fantasma + luces.
 * gastoEnergia = suma columnas GASTO MENSUAL por equipo.
 */
export function buildFactura(factura, precioKwh, consumoMesFallback, options = {}) {
  const cantidadEquipos = options.cantidadEquipos ?? null;
  if (cantidadEquipos === 0) {
    return {
      consumoKwh: 0,
      gastoEnergia: 0,
      cargoFijo: 0,
      mantReposicion: 0,
      alumbradoPublico: 0,
      interesCompensatorio: 0,
      subtotal: 0,
      igv: 0,
      electrificacionRural: 0,
      totalMes: 0,
      precioKwh: parseFloat(precioKwh) || DEFAULT_TARIFF.precioKwh,
      igvRate: factura?.igvRate ?? DEFAULT_TARIFF.igvRate,
    };
  }

  const consumoKwh = roundNumber(
    Number(
      factura?.consumoEnergiaKwh
      ?? consumoMesFallback
      ?? 0
    )
  );
  const cargoFijo = factura?.cargoFijo ?? DEFAULT_TARIFF.cargoFijo;
  const mantReposicion = factura?.mantReposicion ?? DEFAULT_TARIFF.mantReposicion;
  const alumbradoPublico = factura?.alumbradoPublico ?? DEFAULT_TARIFF.alumbradoPublico;
  const interesCompensatorio = factura?.interesCompensatorio ?? DEFAULT_TARIFF.interesCompensatorio;
  const igvRate = factura?.igvRate ?? DEFAULT_TARIFF.igvRate;
  const electrificacionRural = factura?.electrificacionRural ?? DEFAULT_TARIFF.electrificacionRural;
  const precio = parseFloat(precioKwh ?? factura?.precioKwh) || DEFAULT_TARIFF.precioKwh;
  const gastoEnergia = roundNumber(
    factura?.gastoEnergiaMensual
    ?? factura?.consumoEnergiaLinea
    ?? consumoKwh * precio
  );

  const subtotal = roundNumber(
    gastoEnergia + cargoFijo + mantReposicion + alumbradoPublico + interesCompensatorio
  );
  const igv = roundNumber(subtotal * igvRate);
  const totalMes = roundNumber(subtotal + igv + electrificacionRural);

  return {
    consumoKwh,
    precioKwh: precio,
    gastoEnergia,
    gastoEnergiaMensual: gastoEnergia,
    consumoEnergiaLinea: gastoEnergia,
    cargoFijo,
    mantReposicion,
    alumbradoPublico,
    interesCompensatorio,
    subtotal,
    igv,
    electrificacionRural,
    totalMes,
    igvRate,
  };
}

/** Misma lógica que backend facturaHelper.getCantidadEquiposCalculo */
function getCantidadEquiposCalculo(calculo) {
  if (!calculo) return 0;

  const fromResumen = calculo.resumen_json?.resumenGeneral?.cantidadEquipos;
  if (fromResumen != null && fromResumen > 0) return fromResumen;

  const fromDispositivos = calculo.resumen_json?.dispositivos?.length ?? 0;
  if (fromDispositivos > 0) return fromDispositivos;

  const fromDetalles = calculo.detalles?.length ?? 0;
  if (fromDetalles > 0) return fromDetalles;

  const consumoMes = parseFloat(calculo.consumo_mes_total ?? 0);
  if (consumoMes > 0) return 1;

  return fromResumen ?? 0;
}

function normalizeFacturaResult(factura) {
  if (!factura) return factura;
  const totalMes = parseFloat(factura.totalMes);
  return {
    ...factura,
    totalMes: Number.isFinite(totalMes) ? totalMes : 0,
  };
}

/** Total factura recalculado desde un registro de cálculo (historial/reportes). */
export function buildFacturaFromCalculo(calculo) {
  if (!calculo) {
    return buildFactura(null, DEFAULT_TARIFF.precioKwh, 0, { cantidadEquipos: 0 });
  }

  if (calculo.origen === 'recibo' || calculo.resumen_json?.origen === 'recibo') {
    const total = parseFloat(calculo.factura_total_mes ?? calculo.resumen_json?.total_a_pagar ?? 0);
    return normalizeFacturaResult({
      ...buildFactura(null, DEFAULT_TARIFF.precioKwh, 0, { cantidadEquipos: 0 }),
      totalMes: Number.isFinite(total) ? total : 0,
    });
  }

  const precioKwh = (
    calculo.tarifa?.precioKwh
    ?? calculo.resumen_json?.precioKwh
    ?? calculo.precio_kwh
  );
  const storedFactura = calculo.resumen_json?.factura;
  const storedTotal = parseFloat(storedFactura?.totalMes);
  if (Number.isFinite(storedTotal) && storedTotal > 0) {
    return normalizeFacturaResult(storedFactura);
  }

  const columnTotal = parseFloat(calculo.factura_total_mes);
  if (Number.isFinite(columnTotal) && columnTotal > 0) {
    const base = buildFactura(
      storedFactura,
      precioKwh,
      calculo.consumo_mes_total,
      { cantidadEquipos: Math.max(getCantidadEquiposCalculo(calculo), 1) },
    );
    return { ...base, totalMes: columnTotal };
  }

  return buildFactura(
    storedFactura,
    precioKwh,
    calculo.consumo_mes_total,
    { cantidadEquipos: getCantidadEquiposCalculo(calculo) },
  );
}

export { DEFAULT_TARIFF };
