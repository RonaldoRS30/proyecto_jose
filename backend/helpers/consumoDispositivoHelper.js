const { PLANTILLAS_EFICIENCIA } = require('../constants/plantillasEficiencia');

function normalizeNombre(nombre) {
  return String(nombre || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function usaCiclosDiarios(device) {
  if (!device?.eficiencia_energetica && !device?.eficienciaEnergetica) return false;
  const plantilla = device.plantilla_eficiencia || device.plantillaEficiencia;
  if (plantilla !== 'energia_tiempo_potencia') return false;
  if (device.eficiencia_config?.horas_uso_como_ciclos) return true;
  return normalizeNombre(device.nombre).includes('lavadora');
}

function calcularConsumoDiaDispositivo(device) {
  const cantidad = Number(device.cantidad) || 0;
  const usoDiario = Number(device.horasDiarias ?? device.horas_diarias ?? device.horas_uso_dia) || 0;

  if (usaCiclosDiarios(device)) {
    const kwhCiclo = Number(device.kwh_por_ciclo ?? device.kwhPorCiclo) || 0;
    return cantidad * usoDiario * kwhCiclo;
  }

  const potenciaW = Number(device.potenciaW ?? device.potencia_w) || 0;
  return (cantidad * potenciaW * usoDiario) / 1000;
}

/** Días del mes en que se usa el equipo (1–31). Por defecto 30 si no viene informado. */
function resolveDiasUsoMes(device) {
  const raw = device?.dias_uso_mes ?? device?.diasUsoMes ?? null;
  const n = Number(raw);
  if (Number.isFinite(n) && Number.isInteger(n) && n >= 1 && n <= 31) return n;
  return 30;
}

module.exports = {
  usaCiclosDiarios,
  calcularConsumoDiaDispositivo,
  resolveDiasUsoMes,
  PLANTILLAS_EFICIENCIA,
};
