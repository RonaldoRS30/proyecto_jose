import {
  HORAS_REFRIGERADOR_DIA,
  calcPotenciaFromPlantilla,
  calcEnergiaPotenciaTiempo,
  minutosToHoras,
  matchCatalogEficiencia,
  PLANTILLAS_EFICIENCIA,
} from './plantillasEficiencia';

export { HORAS_REFRIGERADOR_DIA, HORAS_ANIO } from './plantillasEficiencia';
export { matchCatalogEficiencia, PLANTILLAS_EFICIENCIA, getFieldLabel } from './plantillasEficiencia';

/** @deprecated Use matchCatalogEficiencia + plantilla_eficiencia */
export function detectTipoEficiencia(nombre) {
  const n = String(nombre || '').trim().toLowerCase();
  if (n.includes('lavadora')) return 'lavadora';
  if (n.includes('refrigerador') || n.includes('nevera') || n.includes('refri')) return 'refrigerador';
  return null;
}

export function calcPotenciaWLavadora(kwhPorCiclo, horasPorCiclo) {
  const minutos = Number(horasPorCiclo) * 60;
  return calcPotenciaFromPlantilla('energia_tiempo_potencia', {
    kwh_por_ciclo: kwhPorCiclo,
    minutos_por_ciclo: minutos,
  });
}

export function calcPotenciaWRefrigerador(kwhAnual) {
  return calcPotenciaFromPlantilla('energia_anual_potencia', { kwh_anual: kwhAnual });
}

export function calcPotenciaFromEficiencia(plantillaId, form) {
  if (!plantillaId) return null;
  return calcPotenciaFromPlantilla(plantillaId, form);
}

export function calcEnergiaPreview(plantillaId, form) {
  if (plantillaId !== 'potencia_tiempo_energia') return null;
  return calcEnergiaPotenciaTiempo(form.potencia_w, form.minutos_por_ciclo);
}

export function horasFromMinutos(minutos) {
  return minutosToHoras(minutos);
}

export function resolveEficienciaConfig(form, catalogo) {
  return matchCatalogEficiencia(form.nombre, form.recomendacion_id, catalogo);
}

export function getPlantillaMeta(plantillaId) {
  return PLANTILLAS_EFICIENCIA[plantillaId] || null;
}

function normalizeNombre(nombre) {
  return String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** Lavadora + EE: el campo de uso diario representa ciclos, no horas. */
export function usaCiclosDiariosLavadora(form, catalogEntry = null) {
  if (!form?.eficiencia_energetica) return false;
  const plantilla = form.plantilla_eficiencia || catalogEntry?.plantilla_eficiencia;
  if (plantilla !== 'energia_tiempo_potencia') return false;
  if (catalogEntry?.eficiencia_config?.horas_uso_como_ciclos) return true;
  return normalizeNombre(form.nombre).includes('lavadora');
}

export function labelUsoDiario(form, catalogEntry = null) {
  if (usaCiclosDiariosLavadora(form, catalogEntry)) return 'Cantidad de ciclos por día';
  return 'Horas de uso por día';
}

export const emptyEficienciaFields = {
  eficiencia_energetica: false,
  plantilla_eficiencia: null,
  tipo_eficiencia: null,
  kwh_por_ciclo: '',
  horas_por_ciclo: '',
  minutos_por_ciclo: '',
  kwh_anual: '',
  btu_h: '',
  hp: '',
};

export function eficienciaFieldsFromItem(item) {
  const minutos = item.minutos_por_ciclo ?? (
    item.horas_por_ciclo != null && item.horas_por_ciclo !== ''
      ? Math.round(Number(item.horas_por_ciclo) * 60)
      : ''
  );
  return {
    eficiencia_energetica: Boolean(item.eficiencia_energetica),
    plantilla_eficiencia: item.plantilla_eficiencia
      || (item.tipo_eficiencia === 'lavadora' ? 'energia_tiempo_potencia' : null)
      || (item.tipo_eficiencia === 'refrigerador' ? 'energia_anual_potencia' : null),
    tipo_eficiencia: item.tipo_eficiencia ?? null,
    kwh_por_ciclo: item.kwh_por_ciclo ?? '',
    horas_por_ciclo: item.horas_por_ciclo ?? '',
    minutos_por_ciclo: minutos,
    kwh_anual: item.kwh_anual ?? '',
    btu_h: item.btu_h ?? '',
    hp: item.hp ?? '',
  };
}
