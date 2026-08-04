/**
 * Test factura en reportes PDF — subtotal = kWh + cargos (Excel C43-C51)
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

console.log('\n=== Test Factura Reportes (subtotal Excel) ===\n');

// Simula cálculo guardado con resumen_json VIEJO (subtotal incorrecto en JSON)
const calculoLegacy = {
  consumo_mes_total: 144,
  consumo_dia_total: 4.8,
  precio_kwh: 0.613,
  resumen_json: {
    factura: {
      subtotal: 110.67,
      igv: 19.92,
      totalMes: 135.6,
      consumoEnergiaLinea: 144,
      gastoEnergiaMensual: 88.272,
    },
  },
};

const factura = buildFacturaParaCalculo(calculoLegacy);

assertEqual(factura.consumoEnergiaLinea, 144, 'Línea consumo kWh (C43)');
assertEqual(factura.gastoEnergiaMensual, 88.272, 'Gasto energía referencia (no suma al subtotal)');
assertEqual(
  factura.subtotal,
  144 + 2.26 + 1.68 + 17.64 + 0.82,
  'Subtotal = kWh + cargo fijo + mant + alumbrado + interés'
);
assertEqual(factura.subtotal, 166.4, 'Subtotal refrigerador');
assertEqual(factura.igv, 29.952, 'IGV 18% sobre subtotal');
assertEqual(factura.totalMes, 201.362, 'Total del mes');

const { enrichCalculo } = require('../services/facturaHelper');
const enriched = enrichCalculo(calculoLegacy);
assertEqual(enriched.factura_total_mes, 201.362, 'enrichCalculo factura_total_mes');
assertEqual(enriched.resumen_json.factura.subtotal, 166.4, 'enrichCalculo subtotal en JSON');

console.log(`\n=== Resultados: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
