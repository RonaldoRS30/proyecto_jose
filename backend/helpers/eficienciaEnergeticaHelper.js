const { roundNum } = require('../utils/format');
const { AppError } = require('../utils/errorHandler');

const HORAS_ANIO = 8760; // 365 × 24
const HORAS_REFRIGERADOR_DIA = 24;

function normalizeNombre(nombre) {
  return String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Equipos compatibles con etiqueta de eficiencia (Excel CALCULADORA).
 */
function detectTipoEficiencia(nombre) {
  const n = normalizeNombre(nombre);
  if (!n) return null;
  if (n.includes('lavadora')) return 'lavadora';
  if (n.includes('refrigerador') || n.includes('nevera') || n.includes('refri')) {
    return 'refrigerador';
  }
  return null;
}

function calcPotenciaWLavadora(kwhPorCiclo, horasPorCiclo) {
  const e = Number(kwhPorCiclo);
  const t = Number(horasPorCiclo);
  if (!Number.isFinite(e) || e <= 0 || !Number.isFinite(t) || t <= 0) return null;
  return roundNum((e / t) * 1000, 4);
}

function calcPotenciaWRefrigerador(kwhAnual) {
  const e = Number(kwhAnual);
  if (!Number.isFinite(e) || e <= 0) return null;
  return roundNum((e / HORAS_ANIO) * 1000, 4);
}

function calcPotenciaFromEficiencia(tipo, inputs) {
  if (tipo === 'lavadora') {
    return calcPotenciaWLavadora(inputs.kwh_por_ciclo, inputs.horas_por_ciclo);
  }
  if (tipo === 'refrigerador') {
    return calcPotenciaWRefrigerador(inputs.kwh_anual);
  }
  return null;
}

/**
 * Normaliza payload antes de crear/actualizar electrodoméstico.
 */
function applyEficienciaToPayload(data) {
  const out = { ...data };
  const activo = Boolean(out.eficiencia_energetica);

  if (!activo) {
    out.eficiencia_energetica = false;
    out.tipo_eficiencia = null;
    out.kwh_por_ciclo = null;
    out.horas_por_ciclo = null;
    out.kwh_anual = null;
    return out;
  }

  const tipo = detectTipoEficiencia(out.nombre);
  if (!tipo) {
    throw new AppError(
      'La eficiencia energética solo aplica a Lavadora o Refrigerador. Desactive la opción o cambie el nombre.',
      400,
    );
  }

  out.tipo_eficiencia = tipo;
  out.eficiencia_energetica = true;

  if (tipo === 'lavadora') {
    const kwh = parseFloat(out.kwh_por_ciclo);
    const horas = parseFloat(out.horas_por_ciclo);
    if (!Number.isFinite(kwh) || kwh <= 0) {
      throw new AppError('Indique el consumo por ciclo (kWh/ciclo) de la etiqueta.', 400);
    }
    if (!Number.isFinite(horas) || horas <= 0) {
      throw new AppError('Indique la duración del ciclo (horas/ciclo) de la etiqueta.', 400);
    }
    out.kwh_por_ciclo = roundNum(kwh, 4);
    out.horas_por_ciclo = roundNum(horas, 4);
    out.kwh_anual = null;
    out.potencia_w = calcPotenciaWLavadora(out.kwh_por_ciclo, out.horas_por_ciclo);
  } else {
    const kwhAnual = parseFloat(out.kwh_anual);
    if (!Number.isFinite(kwhAnual) || kwhAnual <= 0) {
      throw new AppError('Indique el consumo anual (kWh/año) de la etiqueta.', 400);
    }
    out.kwh_anual = roundNum(kwhAnual, 2);
    out.kwh_por_ciclo = null;
    out.horas_por_ciclo = null;
    out.potencia_w = calcPotenciaWRefrigerador(out.kwh_anual);
    out.horas_uso_dia = HORAS_REFRIGERADOR_DIA;
  }

  if (out.potencia_w == null || out.potencia_w <= 0) {
    throw new AppError('No se pudo calcular la potencia desde la etiqueta de eficiencia.', 400);
  }

  return out;
}

module.exports = {
  HORAS_ANIO,
  HORAS_REFRIGERADOR_DIA,
  detectTipoEficiencia,
  calcPotenciaWLavadora,
  calcPotenciaWRefrigerador,
  calcPotenciaFromEficiencia,
  applyEficienciaToPayload,
};
