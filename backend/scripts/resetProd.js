/**
 * Limpia datos operativos para entrega a producción.
 *
 * Conserva: administradores, configuraciones (tarifas).
 * Elimina: clientes, códigos, equipos, cálculos, reportes, historial y PDFs.
 *
 * Uso (PowerShell):
 *   $env:RESET_PROD_CONFIRM="YES"; npm run db:reset-prod
 *
 * Uso (bash):
 *   RESET_PROD_CONFIRM=YES npm run db:reset-prod
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const {
  sequelize,
  Administrador,
  Cliente,
  CodigoAcceso,
  Electrodomestico,
  Calculo,
  DetalleCalculo,
  Reporte,
  Configuracion,
  HistorialAcceso,
} = require('../models');
const { seedAdmin } = require('../seeders/seedAdmin');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'reportes');

const countRows = async () => ({
  clientes: await Cliente.count(),
  codigos: await CodigoAcceso.count(),
  electrodomesticos: await Electrodomestico.count(),
  calculos: await Calculo.count(),
  detalleCalculos: await DetalleCalculo.count(),
  reportes: await Reporte.count(),
  historial: await HistorialAcceso.count(),
  administradores: await Administrador.count(),
  configuraciones: await Configuracion.count(),
});

const clearReportesDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    return 0;
  }

  const files = fs.readdirSync(UPLOADS_DIR);
  let removed = 0;

  for (const file of files) {
    if (file === '.gitkeep') continue;
    const filePath = path.join(UPLOADS_DIR, file);
    if (fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
      removed += 1;
    }
  }

  return removed;
};

async function main() {
  if (process.env.RESET_PROD_CONFIRM !== 'YES') {
    console.error('[ABORTADO] Debe confirmar con RESET_PROD_CONFIRM=YES');
    console.error('');
    console.error('PowerShell:');
    console.error('  $env:RESET_PROD_CONFIRM="YES"; npm run db:reset-prod');
    console.error('');
    console.error('bash:');
    console.error('  RESET_PROD_CONFIRM=YES npm run db:reset-prod');
    process.exit(1);
  }

  const dbName = process.env.DB_NAME || 'consumo_electrico';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@sistema.com';

  console.log('=== Reset de datos para producción ===');
  console.log(`Base de datos: ${dbName}`);
  console.log(`Admin (.env):    ${adminEmail}`);
  console.log('Se conservan:    administradores, configuraciones');
  console.log('');

  await sequelize.authenticate();
  console.log('✓ Conexión MySQL establecida');

  const before = await countRows();
  console.log('Registros actuales:', before);

  if (
    before.clientes === 0 &&
    before.codigos === 0 &&
    before.calculos === 0 &&
    before.reportes === 0
  ) {
    console.log('');
    console.log('No hay datos operativos que limpiar.');
  } else {
    await sequelize.transaction(async (transaction) => {
      await Reporte.destroy({ where: {}, transaction });
      await DetalleCalculo.destroy({ where: {}, transaction });
      await Calculo.destroy({ where: {}, transaction });
      await Electrodomestico.destroy({ where: {}, transaction });
      await HistorialAcceso.destroy({ where: {}, transaction });
      await CodigoAcceso.destroy({ where: {}, transaction });
      await Cliente.destroy({ where: {}, transaction });
    });

    console.log('✓ Datos operativos eliminados de la base de datos');
  }

  const pdfsRemoved = clearReportesDir();
  console.log(`✓ PDFs eliminados: ${pdfsRemoved}`);

  await seedAdmin();

  const admin = await Administrador.findOne({ where: { email: adminEmail } });
  if (!admin) {
    console.warn(`⚠ No existe admin con email ${adminEmail}. Verifique ADMIN_EMAIL en .env`);
  } else {
    console.log(`✓ Admin conservado/creado: ${admin.email}`);
  }

  const after = await countRows();
  console.log('');
  console.log('Estado final:', after);
  console.log('');
  console.log('Listo. La base quedó limpia para entrega a producción.');
}

main()
  .catch((err) => {
    if (err.original?.code === 'ECONNREFUSED') {
      console.error('[ERROR] No se pudo conectar a MySQL.');
    } else if (err.original?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('[ERROR] Usuario o contraseña incorrectos en backend/.env');
    } else {
      console.error('[ERROR]', err.message);
    }
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });
