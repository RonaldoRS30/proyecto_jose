const assert = require('assert');
const {
  getEquiposExcedenReferenciaCatalogo,
} = require('../helpers/potenciaReferenciaHelper');

const recomendaciones = [
  {
    id: 1,
    nombre: 'Bombilla incandescente',
    modulo: 'iluminacion',
    potencia_w: 100,
    horas_uso_dia: 6,
  },
  {
    id: 2,
    nombre: 'Ducha eléctrica',
    modulo: 'aparato',
    potencia_w: 5500,
    horas_uso_dia: 0.25,
  },
];

const detalles = [
  {
    nombre: 'Bombilla incandescente',
    modulo: 'iluminacion',
    potencia_w: 150,
    horas_uso_dia: 4,
    consumo_mes: 10,
    gasto_mensual: 6,
    recomendacion_id: 1,
  },
  {
    nombre: 'Ducha eléctrica',
    modulo: 'aparato',
    potencia_w: 5500,
    horas_uso_dia: 1,
    consumo_mes: 80,
    gasto_mensual: 50,
    recomendacion_id: 2,
  },
  {
    nombre: 'Equipo ok',
    modulo: 'aparato',
    potencia_w: 50,
    horas_uso_dia: 1,
    consumo_mes: 2,
    gasto_mensual: 1,
    recomendacion_id: null,
  },
];

const items = getEquiposExcedenReferenciaCatalogo(detalles, recomendaciones);

assert.strictEqual(items.length, 2, 'debe detectar potencia y horas por separado');

const bombilla = items.find((i) => i.nombre === 'Bombilla incandescente');
assert.ok(bombilla?.excede_potencia, 'bombilla excede potencia');
assert.strictEqual(bombilla.excede_horas, false, 'bombilla no excede horas');

const ducha = items.find((i) => i.nombre === 'Ducha eléctrica');
assert.strictEqual(ducha?.excede_potencia, false, 'ducha no excede potencia');
assert.ok(ducha?.excede_horas, 'ducha excede horas sugeridas');
assert.ok(Math.abs(ducha.exceso_horas_dia - 0.75) < 0.001, 'exceso horas ducha');

console.log('potenciaReferenciaHelper.test.js OK');
