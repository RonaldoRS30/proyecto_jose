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
assertEqual(ref.gastoDiario, 2.94, 'Refrigerador gasto diario');
assertEqual(ref.gastoMensual, 88.27, 'Refrigerador gasto mensual');
assertEqual(ref.gastoAnual, 1073.98, 'Refrigerador gasto anual');

// Lavadora 1067 W — réplica fila Excel (G=32, F=1.0667, J=19.62)
const lav = calcularDispositivo({ cantidad: 1, horasDiarias: 1, potenciaW: 1067 });
assertEqual(lav.consumoDia, 1.0667, 'Lavadora consumo día');
assertEqual(lav.consumoMes, 32.01, 'Lavadora consumo mes');
assertEqual(lav.consumoAnio, 389.46, 'Lavadora consumo año');
assertEqual(lav.gastoDiario, 0.65, 'Lavadora gasto diario');
assertEqual(lav.gastoMensual, 19.62, 'Lavadora gasto mensual');

// Lavadora EE: consumo = cantidad × ciclos/día × kWh/ciclo
const lavEe = calcularDispositivo({
  nombre: 'Lavadora',
  cantidad: 1,
  horasDiarias: 1,
  potenciaW: 1067,
  eficiencia_energetica: true,
  plantilla_eficiencia: 'energia_tiempo_potencia',
  kwh_por_ciclo: 1.6,
});
assertEqual(lavEe.consumoDia, 1.6, 'Lavadora EE consumo día (1 ciclo × 1.6 kWh)');
assertEqual(lavEe.consumoMes, 48, 'Lavadora EE consumo mes');

const lavEeMulti = calcularDispositivo({
  nombre: 'Lavadora',
  cantidad: 3,
  horasDiarias: 2,
  potenciaW: 1067,
  eficiencia_energetica: true,
  plantilla_eficiencia: 'energia_tiempo_potencia',
  kwh_por_ciclo: 1.6,
});
assertEqual(lavEeMulti.consumoDia, 9.6, 'Lavadora EE 3 equipos × 2 ciclos × 1.6 kWh');

// Licuadora: 500 W, 15 min/día (0.25 h), solo 4 días al mes
const licuadora = calcularDispositivo({
  nombre: 'Licuadora',
  cantidad: 1,
  horasDiarias: 0.25,
  potenciaW: 500,
  dias_uso_mes: 4,
});
assertEqual(licuadora.consumoMes, 0.5, 'Licuadora consumo mes (4 días × 0.125 kWh/día uso)');
assertEqual(licuadora.consumoDia, 0.0167, 'Licuadora consumo día promedio calendario');

// 3 equipos ejemplo Excel (Lavadora + Horno + Licuadora)
const ejemploExcel = calcularCompleto({
  aparatos: [
    { nombre: 'Lavadora', cantidad: 1, horasDiarias: 1, potenciaW: 1067, categoria: 'Lavandería' },
    { nombre: 'Horno', cantidad: 1, horasDiarias: 1, potenciaW: 1100, categoria: 'Cocina' },
    { nombre: 'Licuadora', cantidad: 1, horasDiarias: 1, potenciaW: 300, categoria: 'Cocina' },
  ],
  fantasma: [],
  iluminacion: [],
});
assertEqual(ejemploExcel.resumenGeneral.consumoMes, 74, 'Excel total kWh/mes');
assertEqual(ejemploExcel.resumenGeneral.consumoDia, 2.47, 'Excel total kWh/día');
assertEqual(ejemploExcel.resumenGeneral.gastoMensual, 45.36, 'Excel total gasto/mes');
assertEqual(ejemploExcel.factura.subtotal, 67.76, 'Excel subtotal factura');
assertEqual(ejemploExcel.factura.totalMes, 84.967, 'Excel total del mes');

// Factura Excel solo refrigerador (144 kWh/mes)
const facturaRef = calcularFacturaMensual(144);
assertEqual(facturaRef.consumoEnergiaKwh, 144, 'Factura consumo kWh mes');
assertEqual(facturaRef.consumoEnergiaLinea, 88.27, 'Factura línea consumo energía (J41 S/)');
assertEqual(facturaRef.gastoEnergiaMensual, 88.27, 'Gasto energía mensual S/');
assertEqual(facturaRef.subtotal, 110.67, 'Subtotal factura');
assertEqual(facturaRef.igv, 19.921, 'IGV 18%');
assertEqual(facturaRef.totalMes, 135.601, 'Total del mes');

// Cálculo completo multi-equipo
const resultado = calcularCompleto({
  aparatos: [
    { nombre: 'Refrigerador', cantidad: 1, horasDiarias: 24, potenciaW: 200, categoria: 'Cocina' },
  ],
  fantasma: [],
  iluminacion: [],
});

assertEqual(resultado.resumenGeneral.gastoDiario, 2.94, 'Resumen gasto diario');
assertEqual(resultado.resumenGeneral.gastoMensual, 88.27, 'Resumen gasto mensual');
assertEqual(resultado.factura.totalMes, 135.601, 'Total factura refrigerador');

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
assertEqual(tresEquipos.resumenGeneral.gastoMensual, 152.64, 'Excel J41 gasto/mes (× tarifa)');
assertEqual(tresEquipos.resumenGeneral.consumoDia, 8.3, 'Excel F total día');
assertEqual(tresEquipos.factura.subtotal, 175.03, 'Excel C48 subtotal');
assertEqual(tresEquipos.factura.igv, 31.505, 'Excel C49 IGV');
assertEqual(tresEquipos.factura.totalMes, 211.545, 'Excel C51 total mes');

const vacio = calcularCompleto({ aparatos: [], fantasma: [], iluminacion: [] });
assertEqual(vacio.resumenGeneral.cantidadEquipos, 0, 'Sin equipos cantidad');
assertEqual(vacio.resumenGeneral.consumoMes, 0, 'Sin equipos consumo mes');
assertEqual(vacio.factura.totalMes, 0, 'Sin equipos factura total');

console.log(`\n=== Resultados: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
