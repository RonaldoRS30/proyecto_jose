const assert = require('assert');
const {
  extractTarifaFromText,
  extractDatosReciboFromText,
} = require('../helpers/reciboTarifaExtractor');

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

const extraSamples = [
  {
    name: 'Luz del Sur potencia contratada',
    text: 'DATOS DEL SUMINISTRO Potencia Contratada 3.00 kW Medidor MONOFÁSICO',
    potencia: '3.00 KW',
    alumbrado: null,
  },
  {
    name: 'Potencia contratada sin kW',
    text: 'Potencia Contratada: 5.00 KW Tarifa BT5B Residencial',
    potencia: '5.00 KW',
    alumbrado: null,
  },
  {
    name: 'Alumbrado público detalle importes',
    text: 'DETALLE DE IMPORTES Alumbrado Público 28.00 SUBTOTAL Mes Actual',
    potencia: null,
    alumbrado: 28,
  },
  {
    name: 'Alumbrado público factura PDF',
    text: 'Alumbrado público 12.60 SUBTOTAL IGV',
    potencia: null,
    alumbrado: 12.6,
  },
  {
    name: 'Luz del Sur labels luego importes',
    text: 'Cargo Fijo Mant. y Reposición de Conexión Alumbrado Público Interés Compensatorio SUBTOTAL 2.26 1.68 17.64 0.82 301.62',
    tarifa: null,
    potencia: null,
    alumbrado: 17.64,
  },
  {
    name: 'PLUZ columnas invertidas',
    text: 'CH-20 3.00 kW MONOFÁSICO Alimentador Potencia Contratada 663kWh al precio de S/ 0.6291 1.69 2.34 417.09 1.91 28.00 451.03 SUBTOTAL Mes Actual Cargo Fijo Alumbrado Público',
    tarifa: 0.6291,
    potencia: '3.00 KW',
    alumbrado: 28,
  },
  {
    name: 'Electrocentro Potencia y AlumbradoPublico',
    text: 'DATOS DEL SUMINISTRO DE CONSUMO Potencia 0.85 kW Consumo 2.00 kWh IMPORTES FACTURADOS Cargo Fijo 3.55 Ene.Activa(S/ 0.3462 x 2.0000 kWh) 0.69 AlumbradoPublico (Alicuota : S/ 0.7368) 0.74 Interés Compensatorio 0.02 SUB TOTAL 5.00',
    tarifa: 0.3462,
    potencia: '0.85 KW',
    alumbrado: 0.74,
  },
  {
    name: 'Electrocentro AlumbradoPublico sin paréntesis',
    text: 'Potencia 1.20 kW AlumbradoPublico 12.35 SUB TOTAL',
    tarifa: null,
    potencia: '1.20 KW',
    alumbrado: 12.35,
  },
];

let extraPassed = 0;
for (const sample of extraSamples) {
  const result = extractDatosReciboFromText(sample.text);
  if (sample.tarifa != null) {
    assert.strictEqual(result.tarifa_kwh, sample.tarifa, `${sample.name} tarifa`);
  }
  assert.strictEqual(result.potencia_contratada, sample.potencia, `${sample.name} potencia`);
  assert.strictEqual(result.alumbrado_publico, sample.alumbrado, `${sample.name} alumbrado`);
  extraPassed += 1;
}

console.log(`reciboTarifaExtractor extras: ${extraPassed}/${extraSamples.length} OK`);

const { extractEmpresaDistribuidoraFromText } = require('../helpers/reciboDistribuidoraExtractor');

const distribuidoraSamples = [
  {
    name: 'PLUZ por RUC y razón social',
    text: 'Pluz Energía Perú S.A.A. R.U.C N° 20269985900 Paseo del Bosque 500 Urb. Chacarilla del Estanque San Borja',
    empresa: 'PLUZ PERU',
  },
  {
    name: 'PLUZ por logo/texto',
    text: 'PLUZ PERU recibo de luz al precio de S/ 0.6291',
    empresa: 'PLUZ PERU',
  },
  {
    name: 'Luz del Sur por RUC y dirección',
    text: 'LUZ DEL SUR S.A.A. AV. CANAVAL Y MOREYRA 380 SAN ISIDRO - LIMA RUC 20331898008',
    empresa: 'Luz del Sur',
  },
  {
    name: 'Luz del Sur encabezado',
    text: 'LUZ DEL SUR Precio kWh (S/.) 0.6130 Importe',
    empresa: 'Luz del Sur',
  },
  {
    name: 'Sin distribuidora conocida',
    text: 'Recibo genérico de energía 0.5000 kWh',
    empresa: null,
  },
];

let distPassed = 0;
for (const sample of distribuidoraSamples) {
  const result = extractEmpresaDistribuidoraFromText(sample.text);
  assert.strictEqual(
    result.empresa_distribuidora,
    sample.empresa,
    `${sample.name}: esperado ${sample.empresa}, obtuvo ${result.empresa_distribuidora} (${result.metodo})`,
  );
  distPassed += 1;
}

console.log(`reciboDistribuidoraExtractor: ${distPassed}/${distribuidoraSamples.length} OK`);

const {
  extractTotalAPagarFromText,
  extractPeriodoFacturacionFromText,
} = require('../helpers/reciboTarifaExtractor');

const totalSamples = [
  {
    name: 'PLUZ total enmascarado',
    text: 'Lima Norte S/******538.50 _________________________________',
    total: 538.5,
  },
  {
    name: 'Luz del Sur total antes emision',
    text: 'GANCHO-CHOSICA - LIMA 0005212 361.10 Fecha de Emisión:15-Jul-2025',
    total: 361.1,
  },
  {
    name: 'TOTAL DEL MES fallback',
    text: 'Cargo Fijo SUBTOTAL 00 TOTAL DEL MES 361.05',
    total: 361.05,
  },
  {
    name: 'Periodo lectura PLUZ',
    text: 'TOTAL A PAGAR Lectura Actual (23/06/2026) S/******538.50',
    total: 538.5,
    periodo: '2026-06-01',
  },
];

let totalPassed = 0;
for (const sample of totalSamples) {
  const result = extractTotalAPagarFromText(sample.text);
  assert.strictEqual(result.total_a_pagar, sample.total, `${sample.name} total`);
  if (sample.periodo) {
    const periodo = extractPeriodoFacturacionFromText(sample.text.replace(/\s+/g, ' '));
    assert.strictEqual(periodo, sample.periodo, `${sample.name} periodo`);
  }
  totalPassed += 1;
}

console.log(`reciboTarifaExtractor totales: ${totalPassed}/${totalSamples.length} OK`);
