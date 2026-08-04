/**
 * Crea la base de datos si no existe (antes de iniciar el servidor).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function main() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'consumo_electrico';

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();

  console.log(`[OK] Base de datos "${dbName}" lista.`);
}

main().catch((err) => {
  if (err.code === 'ECONNREFUSED') {
    console.error('[ERROR] No se pudo conectar a MySQL. Verifique que este encendido.');
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('[ERROR] Usuario o contraseña incorrectos en backend/.env');
  } else {
    console.error('[ERROR]', err.message);
  }
  process.exit(1);
});
