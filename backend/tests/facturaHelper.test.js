/**
 * Test factura en reportes PDF — subtotal = gasto mensual (J41) + cargos (Excel C43-C51)
 * Ejecutar: npm run test:factura
 */
const { buildFacturaParaCalculo } = require('../services/facturaHelper');

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  const diff = Math.abs(actual - expected);
  if (diff < 0.02) {
    passed++;
    console.log(`  ✓ ${label}: ${actual}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}: esperado ${expected}, obtenido ${actual}`);
  }
}

console.log('\n=== Test Factura Reportes (Excel C43 = J41) ===\n');

const calculoLegacy = {
  consumo_mes_total: 144,
  consumo_dia_total: 4.8,
  gasto_mensual_total: 88.272,
  precio_kwh: 0.613,
  resumen_json: {
    factura: {
      subtotal: 110.67,
      igv: 19.92,
      totalMes: 135.6,
      consumoEnergiaLinea: 88.272,
      gastoEnergiaMensual: 88.272,
    },
  },
};

const factura = buildFacturaParaCalculo(calculoLegacy);

assertEqual(factura.consumoEnergiaKwh, 144, 'kWh mes (G41 referencia)');
assertEqual(factura.consumoEnergiaLinea, 88.272, 'Línea consumo energía S/ (C43 = J41)');
assertEqual(factura.gastoEnergiaMensual, 88.272, 'Gasto energía mensual (J41)');
assertEqual(
  factura.subtotal,
  88.272 + 2.26 + 1.68 + 17.64 + 0.82,
  'Subtotal = gasto mensual + cargo fijo + mant + alumbrado + interés'
);
assertEqual(factura.subtotal, 110.672, 'Subtotal refrigerador');
assertEqual(factura.igv, 19.921, 'IGV 18% sobre subtotal');
assertEqual(factura.totalMes, 135.603, 'Total del mes');

const { enrichCalculo } = require('../services/facturaHelper');
const enriched = enrichCalculo(calculoLegacy);
assertEqual(enriched.factura_total_mes, 135.603, 'enrichCalculo factura_total_mes');
assertEqual(enriched.resumen_json.factura.subtotal, 110.672, 'enrichCalculo subtotal en JSON');

console.log(`\n=== Resultados: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
