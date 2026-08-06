const assert = require('assert');
const { normalizeClientePayload } = require('../helpers/clienteTipoHelper');

const base = {
  nombre: 'Juan',
  apellido: 'Pérez',
  documento: '12345678',
  email: 'juan@test.com',
  tarifa_kwh: 0.613,
};

const natural = normalizeClientePayload({ ...base, tipo_cliente: 'natural' });
assert.strictEqual(natural.tipo_cliente, 'natural');
assert.strictEqual(natural.apellido, 'Pérez');
assert.strictEqual(natural.documento, '12345678');

const empresa = normalizeClientePayload({
  nombre: 'Electrix SAC',
  apellido: '',
  documento: '20123456789',
  tipo_cliente: 'empresa',
  tarifa_kwh: 0.7,
});
assert.strictEqual(empresa.tipo_cliente, 'empresa');
assert.strictEqual(empresa.apellido, null);

let threw = false;
try {
  normalizeClientePayload({
    nombre: 'Electrix SAC',
    apellido: 'NoDebe',
    documento: '20123456789',
    tipo_cliente: 'empresa',
    tarifa_kwh: 0.7,
  });
} catch (e) {
  threw = true;
  assert.match(e.message, /apellido/i);
}
assert.ok(threw, 'empresa con apellido debe fallar');

threw = false;
try {
  normalizeClientePayload({
    nombre: 'Juan',
    apellido: '',
    documento: '12345678',
    tipo_cliente: 'natural',
    tarifa_kwh: 0.613,
  });
} catch (e) {
  threw = true;
  assert.match(e.message, /apellido/i);
}
assert.ok(threw, 'natural sin apellido debe fallar');

threw = false;
try {
  normalizeClientePayload({
    ...base,
    tarifa_kwh: '',
    tipo_cliente: 'natural',
  });
} catch (e) {
  threw = true;
  assert.match(e.message, /tarifa/i);
}
assert.ok(threw, 'sin tarifa_kwh debe fallar');

console.log('clienteTipoHelper.test.js OK');
