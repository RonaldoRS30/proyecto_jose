export const HORAS_ANIO = 8760;
export const HORAS_REFRIGERADOR_DIA = 24;

function normalizeNombre(nombre) {
  return String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function detectTipoEficiencia(nombre) {
  const n = normalizeNombre(nombre);
  if (!n) return null;
  if (n.includes('lavadora')) return 'lavadora';
  if (n.includes('refrigerador') || n.includes('nevera') || n.includes('refri')) {
    return 'refrigerador';
  }
  return null;
}

export function calcPotenciaWLavadora(kwhPorCiclo, horasPorCiclo) {
  const e = Number(kwhPorCiclo);
  const t = Number(horasPorCiclo);
  if (!Number.isFinite(e) || e <= 0 || !Number.isFinite(t) || t <= 0) return null;
  return Math.round((e / t) * 1000 * 10000) / 10000;
}

export function calcPotenciaWRefrigerador(kwhAnual) {
  const e = Number(kwhAnual);
  if (!Number.isFinite(e) || e <= 0) return null;
  return Math.round((e / HORAS_ANIO) * 1000 * 10000) / 10000;
}

export function calcPotenciaFromEficiencia(tipo, form) {
  if (tipo === 'lavadora') {
    return calcPotenciaWLavadora(form.kwh_por_ciclo, form.horas_por_ciclo);
  }
  if (tipo === 'refrigerador') {
    return calcPotenciaWRefrigerador(form.kwh_anual);
  }
  return null;
}

export const emptyEficienciaFields = {
  eficiencia_energetica: false,
  tipo_eficiencia: null,
  kwh_por_ciclo: '',
  horas_por_ciclo: '',
  kwh_anual: '',
};
