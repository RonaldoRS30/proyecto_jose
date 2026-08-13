const assert = require('assert');
const {
  detectTipoEficiencia,
  calcPotenciaWLavadora,
  calcPotenciaWRefrigerador,
  applyEficienciaToPayload,
  HORAS_ANIO,
} = require('../helpers/eficienciaEnergeticaHelper');

assert.strictEqual(detectTipoEficiencia('Lavadora'), 'lavadora');
assert.strictEqual(detectTipoEficiencia('Refrigerador'), 'refrigerador');
assert.strictEqual(detectTipoEficiencia('Microondas'), null);

const potLav = calcPotenciaWLavadora(1.6, 1.5);
assert.ok(Math.abs(potLav - 1066.6667) < 0.001, `Lavadora W: ${potLav}`);

const potRef = calcPotenciaWRefrigerador(333);
assert.ok(Math.abs(potRef - 38.0137) < 0.001, `Refrigerador W: ${potRef}`);

const lavPayload = applyEficienciaToPayload({
  nombre: 'Lavadora',
  eficiencia_energetica: true,
  kwh_por_ciclo: 1.6,
  horas_por_ciclo: 1.5,
  horas_uso_dia: 1,
  cantidad: 1,
});
assert.strictEqual(lavPayload.tipo_eficiencia, 'lavadora');
assert.ok(Math.abs(lavPayload.potencia_w - 1066.6667) < 0.001);

const refPayload = applyEficienciaToPayload({
  nombre: 'Refrigerador',
  eficiencia_energetica: true,
  kwh_anual: 333,
  horas_uso_dia: 8,
});
assert.strictEqual(refPayload.tipo_eficiencia, 'refrigerador');
assert.strictEqual(refPayload.horas_uso_dia, 24);
assert.ok(Math.abs(refPayload.potencia_w - 38.0137) < 0.001);

const manual = applyEficienciaToPayload({
  nombre: 'Licuadora',
  eficiencia_energetica: false,
  potencia_w: 300,
  kwh_anual: 999,
});
assert.strictEqual(manual.eficiencia_energetica, false);
assert.strictEqual(manual.kwh_anual, null);

console.log(`eficienciaEnergetica: OK (8760 h/año, lavadora ${potLav} W, ref ${potRef} W)`);
