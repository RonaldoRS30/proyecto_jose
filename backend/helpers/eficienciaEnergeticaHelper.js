const { roundNum } = require('../utils/format');
const { AppError } = require('../utils/errorHandler');
const { Recomendacion } = require('../models');
const {
  HORAS_REFRIGERADOR_DIA,
  PLANTILLAS_EFICIENCIA,
  minutosToHoras,
  calcPotenciaFromPlantilla,
  calcEnergiaPotenciaTiempo,
  isValidPlantilla,
  detectLegacyPlantilla,
  parseMinutosEnteros,
} = require('../constants/plantillasEficiencia');

function clearEficienciaFields(out) {
  out.eficiencia_energetica = false;
  out.plantilla_eficiencia = null;
  out.tipo_eficiencia = null;
  out.kwh_por_ciclo = null;
  out.horas_por_ciclo = null;
  out.minutos_por_ciclo = null;
  out.kwh_anual = null;
  out.btu_h = null;
  out.hp = null;
}

function parsePositive(value, message) {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError(message, 400);
  }
  return n;
}

function parseMinutosPositive(value, message) {
  const m = parseMinutosEnteros(value);
  if (m == null) throw new AppError(message, 400);
  return m;
}

async function resolvePlantilla(data, recomendacion = null) {
  if (data.plantilla_eficiencia && isValidPlantilla(data.plantilla_eficiencia)) {
    return data.plantilla_eficiencia;
  }

  let rec = recomendacion;
  if (!rec && data.recomendacion_id) {
    rec = await Recomendacion.findByPk(data.recomendacion_id);
  }

  if (rec?.eficiencia_habilitada && rec.plantilla_eficiencia) {
    return rec.plantilla_eficiencia;
  }

  const legacy = detectLegacyPlantilla(data.nombre);
  if (legacy) return legacy;

  return null;
}

function applyPlantillaCalculations(plantillaId, out, config = {}) {
  const plantilla = PLANTILLAS_EFICIENCIA[plantillaId];
  if (!plantilla) {
    throw new AppError('Plantilla de eficiencia energética no válida.', 400);
  }

  out.plantilla_eficiencia = plantillaId;
  out.tipo_eficiencia = null;
  out.eficiencia_energetica = true;

  const minutosComoHorasUso = Boolean(config?.minutos_como_horas_uso);

  switch (plantillaId) {
    case 'energia_tiempo_potencia': {
      const kwh = parsePositive(out.kwh_por_ciclo, 'Indique el consumo por ciclo (kWh).');
      const minutos = parseMinutosPositive(out.minutos_por_ciclo, 'Indique la duración en minutos (número entero).');
      const horas = minutosToHoras(minutos);
      out.kwh_por_ciclo = roundNum(kwh, 4);
      out.minutos_por_ciclo = minutos;
      out.horas_por_ciclo = horas;
      out.kwh_anual = null;
      out.btu_h = null;
      out.hp = null;
      out.potencia_w = calcPotenciaFromPlantilla(plantillaId, out);
      if (minutosComoHorasUso) {
        out.horas_uso_dia = horas;
      }
      break;
    }
    case 'energia_anual_potencia': {
      const kwhAnual = parsePositive(out.kwh_anual, 'Indique el consumo anual (kWh/año).');
      out.kwh_anual = roundNum(kwhAnual, 2);
      out.kwh_por_ciclo = null;
      out.horas_por_ciclo = null;
      out.minutos_por_ciclo = null;
      out.btu_h = null;
      out.hp = null;
      out.potencia_w = calcPotenciaFromPlantilla(plantillaId, out);
      out.horas_uso_dia = HORAS_REFRIGERADOR_DIA;
      break;
    }
    case 'btu_potencia': {
      const btu = parsePositive(out.btu_h, 'Indique la capacidad en BTU/h.');
      out.btu_h = roundNum(btu, 2);
      out.kwh_por_ciclo = null;
      out.horas_por_ciclo = null;
      out.minutos_por_ciclo = null;
      out.kwh_anual = null;
      out.hp = null;
      out.potencia_w = calcPotenciaFromPlantilla(plantillaId, out);
      break;
    }
    case 'hp_potencia': {
      const hp = parsePositive(out.hp, 'Indique la potencia nominal en HP.');
      out.hp = roundNum(hp, 4);
      out.kwh_por_ciclo = null;
      out.horas_por_ciclo = null;
      out.minutos_por_ciclo = null;
      out.kwh_anual = null;
      out.btu_h = null;
      out.potencia_w = calcPotenciaFromPlantilla(plantillaId, out);
      break;
    }
    case 'potencia_tiempo_energia': {
      const potencia = parsePositive(out.potencia_w, 'Indique la potencia (W).');
      const minutos = parseMinutosPositive(out.minutos_por_ciclo, 'Indique el tiempo de uso en minutos (número entero).');
      const horas = minutosToHoras(minutos);
      out.potencia_w = roundNum(potencia, 4);
      out.minutos_por_ciclo = minutos;
      out.horas_por_ciclo = horas;
      out.kwh_por_ciclo = calcEnergiaPotenciaTiempo(out.potencia_w, out.minutos_por_ciclo);
      out.kwh_anual = null;
      out.btu_h = null;
      out.hp = null;
      if (minutosComoHorasUso) {
        out.horas_uso_dia = horas;
      }
      break;
    }
    default:
      throw new AppError('Plantilla de eficiencia energética no soportada.', 400);
  }

  if (out.potencia_w == null || out.potencia_w <= 0) {
    throw new AppError('No se pudo calcular la potencia desde la etiqueta de eficiencia.', 400);
  }

  out.potencia_w = roundNum(out.potencia_w, 4);
  return out;
}

/**
 * Normaliza payload antes de crear/actualizar electrodoméstico.
 */
async function applyEficienciaToPayload(data, { recomendacion = null } = {}) {
  const out = { ...data };
  const activo = Boolean(out.eficiencia_energetica);

  if (!activo) {
    clearEficienciaFields(out);
    return out;
  }

  const plantillaId = await resolvePlantilla(out, recomendacion);
  if (!plantillaId) {
    throw new AppError(
      'La eficiencia energética no está habilitada para este equipo. Desactive la opción o seleccione un equipo del catálogo configurado.',
      400,
    );
  }

  let config = out.eficiencia_config || {};
  if (recomendacion?.eficiencia_config) {
    config = { ...recomendacion.eficiencia_config, ...config };
  } else if (out.recomendacion_id && !recomendacion) {
    const rec = await Recomendacion.findByPk(out.recomendacion_id);
    if (rec?.eficiencia_config) {
      config = { ...rec.eficiencia_config, ...config };
    }
  }

  return applyPlantillaCalculations(plantillaId, out, config);
}

/** Compatibilidad con tests y código legacy */
function detectTipoEficiencia(nombre) {
  const legacy = detectLegacyPlantilla(nombre);
  if (legacy === 'energia_tiempo_potencia') return 'lavadora';
  if (legacy === 'energia_anual_potencia') return 'refrigerador';
  return null;
}

function calcPotenciaWLavadora(kwhPorCiclo, horasPorCiclo) {
  const minutos = Number(horasPorCiclo) * 60;
  return calcPotenciaFromPlantilla('energia_tiempo_potencia', {
    kwh_por_ciclo: kwhPorCiclo,
    minutos_por_ciclo: minutos,
  });
}

function calcPotenciaWRefrigerador(kwhAnual) {
  return calcPotenciaFromPlantilla('energia_anual_potencia', { kwh_anual: kwhAnual });
}

function calcPotenciaFromEficiencia(tipo, inputs) {
  if (tipo === 'lavadora') {
    return calcPotenciaWLavadora(inputs.kwh_por_ciclo, inputs.horas_por_ciclo);
  }
  if (tipo === 'refrigerador') {
    return calcPotenciaWRefrigerador(inputs.kwh_anual);
  }
  if (isValidPlantilla(tipo)) {
    return calcPotenciaFromPlantilla(tipo, inputs);
  }
  return null;
}

module.exports = {
  HORAS_REFRIGERADOR_DIA,
  detectTipoEficiencia,
  calcPotenciaWLavadora,
  calcPotenciaWRefrigerador,
  calcPotenciaFromEficiencia,
  applyEficienciaToPayload,
  applyPlantillaCalculations,
  resolvePlantilla,
};
