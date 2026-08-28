export const HORAS_ANIO = 8760;
export const HORAS_REFRIGERADOR_DIA = 24;

export const PLANTILLAS_EFICIENCIA = {
  energia_tiempo_potencia: {
    id: 'energia_tiempo_potencia',
    label: 'Potencia desde energía + tiempo',
    description: 'P(W) = (kWh ÷ horas) × 1000. El tiempo se ingresa en minutos.',
    fields: ['kwh_por_ciclo', 'minutos_por_ciclo'],
    defaultLabels: {
      kwh_por_ciclo: 'Consumo por ciclo (kWh)',
      minutos_por_ciclo: 'Duración (minutos)',
    },
    locksHorasUsoDia: false,
  },
  energia_anual_potencia: {
    id: 'energia_anual_potencia',
    label: 'Potencia desde consumo anual',
    description: 'P(W) = (kWh/año ÷ 8760) × 1000',
    fields: ['kwh_anual'],
    defaultLabels: {
      kwh_anual: 'Consumo anual (kWh/año)',
    },
    locksHorasUsoDia: true,
    horasUsoDiaFijas: 24,
  },
  btu_potencia: {
    id: 'btu_potencia',
    label: 'Potencia desde BTU/h',
    description: 'P(W) = (BTU/h ÷ 3412.142) × 1000',
    fields: ['btu_h'],
    defaultLabels: {
      btu_h: 'Capacidad (BTU/h)',
    },
    locksHorasUsoDia: false,
  },
  hp_potencia: {
    id: 'hp_potencia',
    label: 'Potencia desde HP',
    description: 'P(W) = HP × 746',
    fields: ['hp'],
    defaultLabels: {
      hp: 'Potencia nominal (HP)',
    },
    locksHorasUsoDia: false,
  },
  potencia_tiempo_energia: {
    id: 'potencia_tiempo_energia',
    label: 'Energía desde potencia + tiempo',
    description: 'E(kWh) = P(W) × (minutos/60) ÷ 1000',
    fields: ['potencia_w', 'minutos_por_ciclo'],
    defaultLabels: {
      potencia_w: 'Potencia (W)',
      minutos_por_ciclo: 'Tiempo de uso (minutos)',
    },
    locksHorasUsoDia: false,
    potenciaFromUser: true,
  },
};

export const PLANTILLA_OPTIONS = Object.values(PLANTILLAS_EFICIENCIA).map((p) => ({
  value: p.id,
  label: p.label,
}));

function parseMinutosEnteros(value) {
  if (value === '' || value == null) return null;
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) return null;
  const n = parseInt(str, 10);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function minutosToHoras(minutos) {
  const m = parseMinutosEnteros(minutos);
  if (m == null) return null;
  return Math.round((m / 60) * 10000) / 10000;
}

export { minutosToHoras, parseMinutosEnteros };

export function sanitizeMinutosInput(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Entero positivo editable (vacío permitido mientras escribe). */
export function sanitizePositiveIntegerInput(value, { max = null } = {}) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  let n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (max != null && n > max) n = max;
  return String(n);
}

export function calcPotenciaEnergiaTiempo(kwhPorCiclo, minutosPorCiclo) {
  const horas = minutosToHoras(minutosPorCiclo);
  const e = Number(kwhPorCiclo);
  if (horas == null || !Number.isFinite(e) || e <= 0) return null;
  return Math.round((e / horas) * 1000 * 10000) / 10000;
}

export function calcPotenciaEnergiaAnual(kwhAnual) {
  const e = Number(kwhAnual);
  if (!Number.isFinite(e) || e <= 0) return null;
  return Math.round((e / HORAS_ANIO) * 1000 * 10000) / 10000;
}

export function calcPotenciaBtu(btuH) {
  const b = Number(btuH);
  if (!Number.isFinite(b) || b <= 0) return null;
  return Math.round((b / 3412.142) * 1000 * 10000) / 10000;
}

export function calcPotenciaHp(hp) {
  const h = Number(hp);
  if (!Number.isFinite(h) || h <= 0) return null;
  return Math.round(h * 746 * 10000) / 10000;
}

export function calcEnergiaPotenciaTiempo(potenciaW, minutosPorCiclo) {
  const horas = minutosToHoras(minutosPorCiclo);
  const p = Number(potenciaW);
  if (horas == null || !Number.isFinite(p) || p <= 0) return null;
  return Math.round((p * horas) / 1000 * 10000) / 10000;
}

export function calcPotenciaFromPlantilla(plantillaId, inputs) {
  switch (plantillaId) {
    case 'energia_tiempo_potencia':
      return calcPotenciaEnergiaTiempo(inputs.kwh_por_ciclo, inputs.minutos_por_ciclo);
    case 'energia_anual_potencia':
      return calcPotenciaEnergiaAnual(inputs.kwh_anual);
    case 'btu_potencia':
      return calcPotenciaBtu(inputs.btu_h);
    case 'hp_potencia':
      return calcPotenciaHp(inputs.hp);
    case 'potencia_tiempo_energia':
      return Number(inputs.potencia_w) > 0 ? Number(inputs.potencia_w) : null;
    default:
      return null;
  }
}

export function getFieldLabel(plantillaId, field, config = {}) {
  const plantilla = PLANTILLAS_EFICIENCIA[plantillaId];
  if (!plantilla) return field;
  return config?.labels?.[field] || plantilla.defaultLabels[field] || field;
}

function normalizeNombre(nombre) {
  return String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function matchCatalogEficiencia(nombre, recomendacionId, catalogo = []) {
  if (!catalogo.length) return null;
  if (recomendacionId) {
    const byId = catalogo.find((c) => Number(c.recomendacion_id || c.id) === Number(recomendacionId));
    if (byId?.eficiencia_habilitada && byId.plantilla_eficiencia) return byId;
  }
  const n = normalizeNombre(nombre);
  if (!n) return null;
  return catalogo.find((c) => {
    if (!c.eficiencia_habilitada || !c.plantilla_eficiencia) return false;
    if (normalizeNombre(c.nombre) === n) return true;
    const aliases = Array.isArray(c.aliases) ? c.aliases : [];
    return aliases.some((a) => normalizeNombre(a) === n || n.includes(normalizeNombre(a)));
  }) || null;
}
