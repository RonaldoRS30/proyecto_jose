const assert = require('assert');
const { extractTarifaFromText } = require('../helpers/reciboTarifaExtractor');

const samples = [
  {
    name: 'Electro Sur Este PRECIO UNIT',
    text: 'CONSUMO FACTURADO 1296.00 kW.h PRECIO UNIT. S/. /kW.h: 0.8855',
    expected: 0.8855,
  },
  {
    name: 'Luz del Sur Precio kWh directo',
    text: 'Importe (S/) Precio kWh (S/.) 0.6130 136.64',
    expected: 0.613,
  },
  {
    name: 'Luz del Sur formula X',
    text: '55050.40 - 54827.50 = 222.90 X 1.0000 = 222.90 X 0.6130 Importe Precio kWh (S/.)',
    expected: 0.613,
  },
  {
    name: 'Luz del Sur formula antes del encabezado',
    text: '55050.40 - 54827.50 = 222.90 X 1.0000 = 222.90 X 0.6130 Última lectura Precio kWh (S/.)',
    expected: 0.613,
  },
  {
    name: 'Luz del Sur columnas PDF',
    text: 'Última lectura Lectura anterior Energía Precio kWh (S/.) 55050.40 54827.50 222.90 1.0000 222.90 0.6130',
    expected: 0.613,
  },
  {
    name: 'Luz del Sur encabezado lejos del valor',
    text: 'Precio kWh (S/.) Importe Consumo de energía 136.64 datos 55050.40 54827.50 222.90 1.0000 222.90 0.6130',
    expected: 0.613,
  },
  {
    name: 'HIDRANDINA Ene.Activa',
    text: 'Ene.Activa(S/ 0.6894 x 23.0000 kWh) 15.86',
    expected: 0.6894,
  },
  {
    name: 'ENOSA Ene.Activa',
    text: 'Ene.Activa(S/ 0.6937 x 81.0000 kWh) 56.19',
    expected: 0.6937,
  },
  {
    name: 'ElectroOriente Precio unitario',
    text: '0.7097Precio unitario S/./kWh -0.18Redondeo',
    expected: 0.7097,
  },
  {
    name: 'PLUZ al precio de',
    text: '663kWh al precio de S/ 0.6291 Días de Lectura',
    expected: 0.6291,
  },
  {
    name: 'precio KWH parentesis',
    text: 'precio KWH(S/.) 0.6130 consumo',
    expected: 0.613,
  },
  {
    name: 'Electro Sur Este otro monto',
    text: 'PRECIO UNIT. S/. /kW.h: 1.1240 energia',
    expected: 1.124,
  },
];

let passed = 0;
for (const sample of samples) {
  const result = extractTarifaFromText(sample.text);
  assert.strictEqual(
    result.tarifa_kwh,
    sample.expected,
    `${sample.name}: esperado ${sample.expected}, obtuvo ${result.tarifa_kwh} (${result.metodo})`,
  );
  passed += 1;
}

console.log(`reciboTarifaExtractor: ${passed}/${samples.length} OK`);
