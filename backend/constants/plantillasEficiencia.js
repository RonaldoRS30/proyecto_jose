const HORAS_ANIO = 8760;
const BTU_A_KW = 3412.142;
const HP_A_W = 746;

const PLANTILLAS_EFICIENCIA = {
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
    description: 'E(kWh) = P(W) × (minutos/60) ÷ 1000. La potencia la ingresa el usuario.',
    fields: ['potencia_w', 'minutos_por_ciclo'],
    defaultLabels: {
      potencia_w: 'Potencia (W)',
      minutos_por_ciclo: 'Tiempo de uso (minutos)',
    },
    locksHorasUsoDia: false,
    potenciaFromUser: true,
  },
};

const PLANTILLA_IDS = Object.keys(PLANTILLAS_EFICIENCIA);

function minutosToHoras(minutos) {
  const m = parseMinutosEnteros(minutos);
  if (m == null) return null;
  return Math.round((m / 60) * 10000) / 10000;
}

function parseMinutosEnteros(value) {
  if (value === '' || value == null) return null;
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) return null;
  const n = parseInt(str, 10);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function calcPotenciaEnergiaTiempo(kwhPorCiclo, minutosPorCiclo) {
  const horas = minutosToHoras(minutosPorCiclo);
  const e = Number(kwhPorCiclo);
  if (horas == null || !Number.isFinite(e) || e <= 0) return null;
  return Math.round((e / horas) * 1000 * 10000) / 10000;
}

function calcPotenciaEnergiaAnual(kwhAnual) {
  const e = Number(kwhAnual);
  if (!Number.isFinite(e) || e <= 0) return null;
  return Math.round((e / HORAS_ANIO) * 1000 * 10000) / 10000;
}

function calcPotenciaBtu(btuH) {
  const b = Number(btuH);
  if (!Number.isFinite(b) || b <= 0) return null;
  return Math.round((b / BTU_A_KW) * 1000 * 10000) / 10000;
}

function calcPotenciaHp(hp) {
  const h = Number(hp);
  if (!Number.isFinite(h) || h <= 0) return null;
  return Math.round(h * HP_A_W * 10000) / 10000;
}

function calcEnergiaPotenciaTiempo(potenciaW, minutosPorCiclo) {
  const horas = minutosToHoras(minutosPorCiclo);
  const p = Number(potenciaW);
  if (horas == null || !Number.isFinite(p) || p <= 0) return null;
  return Math.round((p * horas) / 1000 * 10000) / 10000;
}

function calcPotenciaFromPlantilla(plantillaId, inputs) {
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

function getFieldLabel(plantillaId, field, config = {}) {
  const plantilla = PLANTILLAS_EFICIENCIA[plantillaId];
  if (!plantilla) return field;
  const custom = config?.labels?.[field];
  if (custom) return custom;
  return plantilla.defaultLabels[field] || field;
}

function isValidPlantilla(id) {
  return PLANTILLA_IDS.includes(id);
}

/** Compatibilidad con registros antiguos por nombre */
function detectLegacyPlantilla(nombre) {
  const n = String(nombre || '').trim().toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (!n) return null;
  if (n.includes('lavadora')) return 'energia_tiempo_potencia';
  if (n.includes('refrigerador') || n.includes('nevera') || n.includes('refri')) {
    return 'energia_anual_potencia';
  }
  return null;
}

module.exports = {
  HORAS_ANIO,
  HORAS_REFRIGERADOR_DIA: 24,
  BTU_A_KW,
  HP_A_W,
  PLANTILLAS_EFICIENCIA,
  PLANTILLA_IDS,
  minutosToHoras,
  calcPotenciaEnergiaTiempo,
  calcPotenciaEnergiaAnual,
  calcPotenciaBtu,
  calcPotenciaHp,
  calcEnergiaPotenciaTiempo,
  calcPotenciaFromPlantilla,
  getFieldLabel,
  isValidPlantilla,
  detectLegacyPlantilla,
  parseMinutosEnteros,
};
