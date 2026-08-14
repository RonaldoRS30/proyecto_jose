const assert = require('assert');
const {
  detectTipoEficiencia,
  calcPotenciaWLavadora,
  calcPotenciaWRefrigerador,
  applyEficienciaToPayload,
  applyPlantillaCalculations,
} = require('../helpers/eficienciaEnergeticaHelper');
const {
  calcPotenciaEnergiaTiempo,
  calcPotenciaBtu,
  calcPotenciaHp,
  calcEnergiaPotenciaTiempo,
} = require('../constants/plantillasEficiencia');

assert.strictEqual(detectTipoEficiencia('Lavadora'), 'lavadora');
assert.strictEqual(detectTipoEficiencia('Refrigerador'), 'refrigerador');
assert.strictEqual(detectTipoEficiencia('Microondas'), null);

const potLav = calcPotenciaWLavadora(1.6, 1.5);
assert.ok(Math.abs(potLav - 1066.6667) < 0.001, `Lavadora W: ${potLav}`);

const potLavMin = calcPotenciaEnergiaTiempo(1.6, 90);
assert.ok(Math.abs(potLavMin - 1066.6667) < 0.001, `Lavadora min W: ${potLavMin}`);

const potRef = calcPotenciaWRefrigerador(333);
assert.ok(Math.abs(potRef - 38.0137) < 0.001, `Refrigerador W: ${potRef}`);

const potBtu = calcPotenciaBtu(9000);
assert.ok(Math.abs(potBtu - 2637.6393) < 0.01, `BTU W: ${potBtu}`);

const potHp = calcPotenciaHp(0.5);
assert.strictEqual(potHp, 373);

const energiaPt = calcEnergiaPotenciaTiempo(800, 15);
assert.ok(Math.abs(energiaPt - 0.2) < 0.001, `Energia P*t: ${energiaPt}`);

(async () => {
  const lavPayload = await applyEficienciaToPayload({
    nombre: 'Lavadora',
    eficiencia_energetica: true,
    plantilla_eficiencia: 'energia_tiempo_potencia',
    kwh_por_ciclo: 1.6,
    minutos_por_ciclo: 90,
    minutos_uso_dia: 60,
    horas_uso_dia: 1,
    cantidad: 1,
  });
  assert.strictEqual(lavPayload.plantilla_eficiencia, 'energia_tiempo_potencia');
  assert.ok(Math.abs(lavPayload.potencia_w - 1066.6667) < 0.001);
  assert.ok(Math.abs(lavPayload.horas_por_ciclo - 1.5) < 0.001);

  const refPayload = await applyEficienciaToPayload({
    nombre: 'Refrigerador',
    eficiencia_energetica: true,
    plantilla_eficiencia: 'energia_anual_potencia',
    kwh_anual: 333,
    horas_uso_dia: 8,
  });
  assert.strictEqual(refPayload.plantilla_eficiencia, 'energia_anual_potencia');
  assert.strictEqual(refPayload.horas_uso_dia, 24);
  assert.ok(Math.abs(refPayload.potencia_w - 38.0137) < 0.001);

  const duchaPayload = applyPlantillaCalculations('energia_tiempo_potencia', {
    nombre: 'Ducha',
    kwh_por_ciclo: 0.925,
    minutos_por_ciclo: 15,
    horas_uso_dia: 1,
  }, { minutos_como_horas_uso: true });
  assert.ok(Math.abs(duchaPayload.horas_uso_dia - 0.25) < 0.001);

  const manual = await applyEficienciaToPayload({
    nombre: 'Licuadora',
    eficiencia_energetica: false,
    potencia_w: 300,
    kwh_anual: 999,
  });
  assert.strictEqual(manual.eficiencia_energetica, false);
  assert.strictEqual(manual.kwh_anual, null);

  console.log(`eficienciaEnergetica: OK (lav ${potLav} W, ref ${potRef} W, btu ${potBtu} W)`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
