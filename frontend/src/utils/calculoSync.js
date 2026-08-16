import { isReciboRegistro } from './calculoRegistro';

const NUM_EPS = 0.05;

export const numDiff = (a, b) => Math.abs(parseFloat(a || 0) - parseFloat(b || 0)) > NUM_EPS;

export function previewPrecioKwh(preview) {
  return preview?.precioKwh ?? preview?.tarifa?.precioKwh;
}

/**
 * Indica si el último cálculo estimado guardado refleja la vista actual (equipos + tarifa + facturación).
 */
export function isCalculoSincronizado(preview, ultimoCalculo) {
  if (!preview?.resumenGeneral) return false;
  if (!ultimoCalculo || isReciboRegistro(ultimoCalculo)) return false;

  const rg = preview.resumenGeneral;
  const storedRg = ultimoCalculo.resumen_json?.resumenGeneral ?? {};

  if (numDiff(ultimoCalculo.consumo_mes_total, rg.consumoMes)) return false;
  if (numDiff(ultimoCalculo.precio_kwh, previewPrecioKwh(preview))) return false;

  const previewEquipos = rg.cantidadEquipos ?? 0;
  const storedEquipos = storedRg.cantidadEquipos
    ?? ultimoCalculo.resumen_json?.dispositivos?.length
    ?? 0;
  if (previewEquipos !== storedEquipos) return false;

  const previewAlumbrado = preview.factura?.alumbradoPublico;
  const storedAlumbrado = ultimoCalculo.resumen_json?.factura?.alumbradoPublico;
  if (previewAlumbrado != null && storedAlumbrado != null && numDiff(previewAlumbrado, storedAlumbrado)) {
    return false;
  }

  return true;
}

export function hasCambiosPendientes(preview, ultimoCalculo) {
  if (!preview?.resumenGeneral) return false;
  const equipos = preview.resumenGeneral.cantidadEquipos ?? 0;
  if (equipos === 0) return false;
  if (!ultimoCalculo || isReciboRegistro(ultimoCalculo)) return true;
  return !isCalculoSincronizado(preview, ultimoCalculo);
}

export function isSoloConfigFacturacionPendiente(preview, ultimoCalculo) {
  if (!preview?.resumenGeneral || !ultimoCalculo || isReciboRegistro(ultimoCalculo)) return false;
  const consumoIgual = !numDiff(ultimoCalculo.consumo_mes_total, preview.resumenGeneral.consumoMes);
  const equiposIguales = (preview.resumenGeneral.cantidadEquipos ?? 0)
    === (ultimoCalculo.resumen_json?.resumenGeneral?.cantidadEquipos
      ?? ultimoCalculo.resumen_json?.dispositivos?.length ?? 0);
  const tarifaIgual = !numDiff(ultimoCalculo.precio_kwh, previewPrecioKwh(preview));
  const previewAlumbrado = preview.factura?.alumbradoPublico;
  const storedAlumbrado = ultimoCalculo.resumen_json?.factura?.alumbradoPublico;
  const alumbradoDistinto = previewAlumbrado != null && storedAlumbrado != null
    && numDiff(previewAlumbrado, storedAlumbrado);
  return consumoIgual && equiposIguales && tarifaIgual && alumbradoDistinto;
}
