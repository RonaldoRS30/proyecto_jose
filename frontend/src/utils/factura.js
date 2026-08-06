import { roundNumber } from './helpers';

const DEFAULT_TARIFF = {
  cargoFijo: 2.26,
  mantReposicion: 1.68,
  alumbradoPublico: 17.64,
  interesCompensatorio: 0.82,
  igvRate: 0.18,
  electrificacionRural: 5.01,
};

/**
 * Recalcula subtotal, IGV y total según Excel (C43–C51).
 * Subtotal = kWh mensual + cargo fijo + mant. + alumbrado + interés.
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
      igvRate: factura?.igvRate ?? DEFAULT_TARIFF.igvRate,
    };
  }

  const consumoKwh = roundNumber(
    Number(
      factura?.consumoEnergiaKwh
      ?? consumoMesFallback
      ?? factura?.consumoEnergia // fallback para registros legacy muy antiguos
      ?? 0
    )
  );
  const cargoFijo = factura?.cargoFijo ?? DEFAULT_TARIFF.cargoFijo;
  const mantReposicion = factura?.mantReposicion ?? DEFAULT_TARIFF.mantReposicion;
  const alumbradoPublico = factura?.alumbradoPublico ?? DEFAULT_TARIFF.alumbradoPublico;
  const interesCompensatorio = factura?.interesCompensatorio ?? DEFAULT_TARIFF.interesCompensatorio;
  const igvRate = factura?.igvRate ?? DEFAULT_TARIFF.igvRate;
  const electrificacionRural = factura?.electrificacionRural ?? DEFAULT_TARIFF.electrificacionRural;
  const precio = parseFloat(precioKwh) || 0.613;
  const gastoEnergia = roundNumber(factura?.gastoEnergiaMensual ?? consumoKwh * precio);

  const subtotal = roundNumber(
    consumoKwh + cargoFijo + mantReposicion + alumbradoPublico + interesCompensatorio
  );
  const igv = roundNumber(subtotal * igvRate);
  const totalMes = roundNumber(subtotal + igv + electrificacionRural);

  return {
    consumoKwh,
    gastoEnergia,
    gastoEnergiaMensual: gastoEnergia,
    consumoEnergiaLinea: consumoKwh,
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

/** Total factura recalculado desde un registro de cálculo (historial/reportes). */
export function buildFacturaFromCalculo(calculo) {
  const cantidadEquipos = (
    calculo.resumen_json?.resumenGeneral?.cantidadEquipos
    ?? calculo.resumen_json?.dispositivos?.length
    ?? calculo.detalles?.length
    ?? 0
  );
  return buildFactura(
    calculo.resumen_json?.factura,
    calculo.precio_kwh,
    calculo.consumo_mes_total,
    { cantidadEquipos }
  );
}

export { DEFAULT_TARIFF };
