const assert = require('assert');
const { normalizeNombreEquipo } = require('../helpers/nombreEquipoHelper');

assert.strictEqual(normalizeNombreEquipo('Refrigeradora'), 'refrigeradora');
assert.strictEqual(normalizeNombreEquipo('  Refrigeradora  '), 'refrigeradora');
assert.strictEqual(normalizeNombreEquipo('Refrigeradora'), normalizeNombreEquipo('refrigeradora'));
assert.strictEqual(normalizeNombreEquipo('Refrigeradora'), normalizeNombreEquipo('Refrigeradora '));
assert.strictEqual(normalizeNombreEquipo('Televisión'), 'television');
assert.strictEqual(normalizeNombreEquipo('  Horno   microondas  '), 'horno microondas');

console.log('nombreEquipoHelper.test.js: OK');
