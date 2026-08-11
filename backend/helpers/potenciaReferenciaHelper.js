const { matchRecomendacion } = require('../services/recomendacionMatcher');

const MODULO_LABEL = {
  aparato: 'Electrodomésticos',
  fantasma: 'Consumo fantasma',
  iluminacion: 'Iluminación',
};

function findReferenciaForDetalle(detalle, recomendaciones, recomendacionIdExtra = null) {
  const recId = detalle.recomendacion_id || recomendacionIdExtra;
  if (recId) {
    const byId = recomendaciones.find((r) => Number(r.id) === Number(recId));
    if (byId && byId.potencia_w != null) return byId;
  }

  return recomendaciones.find(
    (r) => r.potencia_w != null && matchRecomendacion(detalle.nombre, r, detalle.modulo),
  ) || null;
}

/**
 * Equipos de los 3 módulos cuya potencia registrada supera la referencia del catálogo.
 * Ordenados por consumo mensual (mayor primero).
 */
function getEquiposExcedenPotenciaReferencia(detalles, recomendaciones, electroMap = {}) {
  const items = [];

  (detalles || []).forEach((detalle) => {
    const ref = findReferenciaForDetalle(
      detalle,
      recomendaciones,
      electroMap[detalle.electrodomestico_id],
    );
    if (!ref) return;

    const refW = parseFloat(ref.potencia_w);
    const actualW = parseFloat(detalle.potencia_w);
    if (!Number.isFinite(refW) || refW <= 0 || !Number.isFinite(actualW)) return;
    if (actualW <= refW) return;

    items.push({
      nombre: detalle.nombre,
      modulo: detalle.modulo,
      moduloLabel: MODULO_LABEL[detalle.modulo] || detalle.modulo,
      potencia_w: actualW,
      potencia_referencia_w: refW,
      exceso_w: actualW - refW,
      consumo_mes: parseFloat(detalle.consumo_mes) || 0,
      gasto_mensual: parseFloat(detalle.gasto_mensual) || 0,
      referencia_nombre: ref.nombre,
    });
  });

  return items.sort((a, b) => b.consumo_mes - a.consumo_mes);
}

function mapDispositivosToDetalles(dispositivos = []) {
  return dispositivos.map((d) => ({
    nombre: d.nombre,
    modulo: d.modulo,
    potencia_w: d.potenciaW ?? d.potencia_w,
    consumo_mes: d.consumoMes ?? d.consumo_mes,
    gasto_mensual: d.gastoMensual ?? d.gasto_mensual,
    recomendacion_id: d.recomendacion_id ?? null,
    electrodomestico_id: d.id ?? d.electrodomestico_id ?? null,
  }));
}

function buildElectroRecomendacionMap(electrodomesticos = []) {
  return Object.fromEntries(
    electrodomesticos
      .filter((e) => e.recomendacion_id)
      .map((e) => [e.id, e.recomendacion_id]),
  );
}

function getExcedentesFromDispositivos(dispositivos, electrodomesticos, recomendaciones) {
  const detalles = mapDispositivosToDetalles(dispositivos);
  const electroMap = buildElectroRecomendacionMap(electrodomesticos);
  return getEquiposExcedenPotenciaReferencia(detalles, recomendaciones, electroMap);
}

module.exports = {
  MODULO_LABEL,
  getEquiposExcedenPotenciaReferencia,
  getExcedentesFromDispositivos,
  mapDispositivosToDetalles,
  buildElectroRecomendacionMap,
};
