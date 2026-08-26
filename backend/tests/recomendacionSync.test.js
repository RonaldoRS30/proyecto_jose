const assert = require('assert');
const {
  findRecomendacionByNombreModulo,
  obtenerParaEquipos,
} = require('../services/recomendacionService');

const catalogoFantasma = [
  { id: 10, nombre: 'Stand-by computadora', modulo: 'fantasma' },
  { id: 11, nombre: 'TV apagada', modulo: 'fantasma' },
];

const match = findRecomendacionByNombreModulo(catalogoFantasma, 'stand-by computadora', 'fantasma');
assert.ok(match, 'Debe encontrar recomendación por nombre normalizado');
assert.strictEqual(match.id, 10);

const otroModulo = findRecomendacionByNombreModulo(catalogoFantasma, 'Stand-by computadora', 'aparato');
assert.strictEqual(otroModulo, null, 'No debe cruzar módulos distintos');

const inexistente = findRecomendacionByNombreModulo(catalogoFantasma, 'Equipo nuevo', 'fantasma');
assert.strictEqual(inexistente, null);

console.log('✓ recomendacionSync.test.js');
