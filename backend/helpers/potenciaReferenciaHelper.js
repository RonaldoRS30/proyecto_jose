const { matchRecomendacion } = require('../services/recomendacionMatcher');

const MODULO_LABEL = {
  aparato: 'Electrodomésticos',
  fantasma: 'Consumo fantasma',
  iluminacion: 'Iluminación',
};

const HORAS_EPS = 0.0001;

function referenciaTieneLimites(ref) {
  if (!ref) return false;
  const refW = parseFloat(ref.potencia_w);
  const refH = parseFloat(ref.horas_uso_dia);
  return (Number.isFinite(refW) && refW > 0) || (Number.isFinite(refH) && refH > 0);
}

function findReferenciaForDetalle(detalle, recomendaciones, recomendacionIdExtra = null) {
  const recId = detalle.recomendacion_id || recomendacionIdExtra;
  if (recId) {
    const byId = recomendaciones.find((r) => Number(r.id) === Number(recId));
    if (byId && referenciaTieneLimites(byId)) return byId;
  }

  return recomendaciones.find(
    (r) => referenciaTieneLimites(r) && matchRecomendacion(detalle.nombre, r, detalle.modulo),
  ) || null;
}

/**
 * Equipos cuya potencia o tiempo de uso diario superan la referencia del catálogo (recomendaciones).
 * Ordenados por consumo mensual (mayor primero).
 */
function getEquiposExcedenReferenciaCatalogo(detalles, recomendaciones, electroMap = {}) {
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
    const excedePotencia = Number.isFinite(refW) && refW > 0
      && Number.isFinite(actualW) && actualW > refW;

    const refH = parseFloat(ref.horas_uso_dia);
    const actualH = parseFloat(detalle.horas_uso_dia);
    const excedeHoras = Number.isFinite(refH) && refH > 0
      && Number.isFinite(actualH) && actualH > refH + HORAS_EPS;

    if (!excedePotencia && !excedeHoras) return;

    items.push({
      nombre: detalle.nombre,
      modulo: detalle.modulo,
      moduloLabel: MODULO_LABEL[detalle.modulo] || detalle.modulo,
      potencia_w: Number.isFinite(actualW) ? actualW : 0,
      potencia_referencia_w: Number.isFinite(refW) && refW > 0 ? refW : null,
      exceso_w: excedePotencia ? actualW - refW : 0,
      excede_potencia: excedePotencia,
      horas_uso_dia: Number.isFinite(actualH) ? actualH : 0,
      horas_referencia_dia: Number.isFinite(refH) && refH > 0 ? refH : null,
      exceso_horas_dia: excedeHoras ? actualH - refH : 0,
      excede_horas: excedeHoras,
      consumo_mes: parseFloat(detalle.consumo_mes) || 0,
      gasto_mensual: parseFloat(detalle.gasto_mensual) || 0,
      referencia_nombre: ref.nombre,
    });
  });

  return items.sort((a, b) => b.consumo_mes - a.consumo_mes);
}

/** @deprecated Alias — misma función, ahora incluye exceso de horas de uso. */
function getEquiposExcedenPotenciaReferencia(detalles, recomendaciones, electroMap = {}) {
  return getEquiposExcedenReferenciaCatalogo(detalles, recomendaciones, electroMap);
}

function mapDispositivosToDetalles(dispositivos = []) {
  return dispositivos.map((d) => ({
    nombre: d.nombre,
    modulo: d.modulo,
    potencia_w: d.potenciaW ?? d.potencia_w,
    horas_uso_dia: d.horasDiarias ?? d.horas_uso_dia ?? d.horas_diarias,
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
  return getEquiposExcedenReferenciaCatalogo(detalles, recomendaciones, electroMap);
}

module.exports = {
  MODULO_LABEL,
  getEquiposExcedenReferenciaCatalogo,
  getEquiposExcedenPotenciaReferencia,
  getExcedentesFromDispositivos,
  mapDispositivosToDetalles,
  buildElectroRecomendacionMap,
};
