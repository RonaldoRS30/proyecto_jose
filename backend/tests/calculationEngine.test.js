/**
 * Test de réplica exacta de fórmulas Excel
 * Ejecutar: npm run test:calc
 */
const {
  calcularDispositivo,
  calcularCompleto,
  calcularFacturaMensual,
  DEFAULT_TARIFF,
} = require('../services/calculationEngine');

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

console.log('\n=== Test Motor de Cálculo (Excel) ===\n');

// Refrigerador: C=1, D=24, E=200 → F = 4.8 kWh/día
const ref = calcularDispositivo({ cantidad: 1, horasDiarias: 24, potenciaW: 200 });
assertEqual(ref.consumoDia, 4.8, 'Refrigerador consumo día');
assertEqual(ref.consumoMes, 144, 'Refrigerador consumo mes (F*30)');
assertEqual(ref.consumoAnio, 1752, 'Refrigerador consumo año (F*365)');
assertEqual(ref.gastoDiario, 0.613 * 4.8, 'Refrigerador gasto diario');
assertEqual(ref.gastoMensual, 0.613 * 144, 'Refrigerador gasto mensual');
assertEqual(ref.gastoAnual, 0.613 * 1752, 'Refrigerador gasto anual');

// Factura Excel solo refrigerador (144 kWh/mes)
const facturaRef = calcularFacturaMensual(144);
assertEqual(facturaRef.consumoEnergiaKwh, 144, 'Factura consumo kWh mes');
assertEqual(facturaRef.gastoEnergiaMensual, 88.272, 'Gasto energía mensual S/');
assertEqual(facturaRef.subtotal, 166.4, 'Subtotal factura');
assertEqual(facturaRef.igv, 29.952, 'IGV 18%');
assertEqual(facturaRef.totalMes, 201.362, 'Total del mes');

// Cálculo completo multi-equipo
const resultado = calcularCompleto({
  aparatos: [
    { nombre: 'Refrigerador', cantidad: 1, horasDiarias: 24, potenciaW: 200, categoria: 'Cocina' },
  ],
  fantasma: [],
  iluminacion: [],
});

assertEqual(resultado.resumenGeneral.gastoDiario, 2.9424, 'Resumen gasto diario');
assertEqual(resultado.resumenGeneral.gastoMensual, 88.272, 'Resumen gasto mensual');
assertEqual(resultado.factura.totalMes, 201.362, 'Total factura refrigerador');

// 3 equipos activos hoja CALCULADORA (Refrigerador + Lavadora + Secadora)
const tresEquipos = calcularCompleto({
  aparatos: [
    { nombre: 'Refrigerador', cantidad: 1, horasDiarias: 24, potenciaW: 200, categoria: 'Cocina' },
    { nombre: 'Lavadora', cantidad: 1, horasDiarias: 1, potenciaW: 1500, categoria: 'Lavado' },
    { nombre: 'Secadora', cantidad: 1, horasDiarias: 1, potenciaW: 2000, categoria: 'Lavado' },
  ],
  fantasma: [],
  iluminacion: [],
});
assertEqual(tresEquipos.resumenGeneral.consumoMes, 249, 'Excel G41 kWh/mes');
assertEqual(tresEquipos.resumenGeneral.gastoMensual, 152.637, 'Excel J41 gasto/mes (× tarifa)');
assertEqual(tresEquipos.resumenGeneral.consumoDia, 8.3, 'Excel F total día');
assertEqual(tresEquipos.factura.subtotal, 271.4, 'Excel C48 subtotal');
assertEqual(tresEquipos.factura.igv, 48.852, 'Excel C49 IGV');
assertEqual(tresEquipos.factura.totalMes, 325.262, 'Excel C51 total mes');

const vacio = calcularCompleto({ aparatos: [], fantasma: [], iluminacion: [] });
assertEqual(vacio.resumenGeneral.cantidadEquipos, 0, 'Sin equipos cantidad');
assertEqual(vacio.resumenGeneral.consumoMes, 0, 'Sin equipos consumo mes');
assertEqual(vacio.factura.totalMes, 0, 'Sin equipos factura total');

console.log(`\n=== Resultados: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
