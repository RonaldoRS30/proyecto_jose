/**
 * Aplica cambios de esquema pendientes (columnas nuevas) sin usar sync({ alter: true }).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const MIGRATIONS = [
  {
    table: 'clientes',
    column: 'tarifa_kwh',
    sql: 'ALTER TABLE clientes ADD COLUMN tarifa_kwh DECIMAL(10,4) NULL AFTER tarifa',
  },
  {
    table: 'clientes',
    column: 'tipo_cliente',
    sql: "ALTER TABLE clientes ADD COLUMN tipo_cliente ENUM('natural','empresa') NOT NULL DEFAULT 'natural' AFTER tarifa_kwh",
  },
  {
    table: 'clientes',
    column: 'alumbrado_publico',
    sql: 'ALTER TABLE clientes ADD COLUMN alumbrado_publico DECIMAL(10,2) NULL AFTER potencia_contratada',
  },
  {
    table: 'calculos',
    column: 'origen',
    sql: "ALTER TABLE calculos ADD COLUMN origen ENUM('calculo','recibo') NOT NULL DEFAULT 'calculo' AFTER factura_total_mes",
  },
  {
    table: 'calculos',
    column: 'periodo_facturacion',
    sql: 'ALTER TABLE calculos ADD COLUMN periodo_facturacion DATE NULL AFTER origen',
  },
  {
    table: 'electrodomesticos',
    column: 'eficiencia_energetica',
    sql: 'ALTER TABLE electrodomesticos ADD COLUMN eficiencia_energetica TINYINT(1) NOT NULL DEFAULT 0 AFTER potencia_w',
  },
  {
    table: 'electrodomesticos',
    column: 'tipo_eficiencia',
    sql: "ALTER TABLE electrodomesticos ADD COLUMN tipo_eficiencia ENUM('lavadora','refrigerador') NULL AFTER eficiencia_energetica",
  },
  {
    table: 'electrodomesticos',
    column: 'kwh_por_ciclo',
    sql: 'ALTER TABLE electrodomesticos ADD COLUMN kwh_por_ciclo DECIMAL(10,4) NULL AFTER tipo_eficiencia',
  },
  {
    table: 'electrodomesticos',
    column: 'horas_por_ciclo',
    sql: 'ALTER TABLE electrodomesticos ADD COLUMN horas_por_ciclo DECIMAL(10,4) NULL AFTER kwh_por_ciclo',
  },
  {
    table: 'electrodomesticos',
    column: 'kwh_anual',
    sql: 'ALTER TABLE electrodomesticos ADD COLUMN kwh_anual DECIMAL(10,2) NULL AFTER horas_por_ciclo',
  },
];

async function columnExists(conn, dbName, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [dbName, table, column]
  );
  return Number(rows[0].cnt) > 0;
}

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
    database: dbName,
    multipleStatements: true,
  });

  let applied = 0;

  for (const migration of MIGRATIONS) {
    const exists = await columnExists(conn, dbName, migration.table, migration.column);
    if (exists) {
      console.log(`[OK] ${migration.table}.${migration.column} ya existe.`);
      continue;
    }

    await conn.query(migration.sql);
    applied += 1;
    console.log(`[OK] Columna agregada: ${migration.table}.${migration.column}`);
  }

  const hasTipoCliente = await columnExists(conn, dbName, 'clientes', 'tipo_cliente');
  if (hasTipoCliente) {
    const [result] = await conn.query(
      "UPDATE clientes SET tipo_cliente = 'empresa' WHERE (apellido IS NULL OR TRIM(apellido) = '') AND tipo_cliente = 'natural'"
    );
    if (result.affectedRows > 0) {
      console.log(`[OK] tipo_cliente sincronizado en ${result.affectedRows} registro(s).`);
    }
  }

  await conn.end();

  if (applied === 0) {
    console.log('[OK] Esquema de base de datos al día.');
  } else {
    console.log(`[OK] Migraciones aplicadas: ${applied}`);
  }
}

main().catch((err) => {
  if (err.code === 'ECONNREFUSED') {
    console.error('[ERROR] No se pudo conectar a MySQL.');
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('[ERROR] Usuario o contraseña incorrectos en backend/.env');
  } else {
    console.error('[ERROR]', err.message);
  }
  process.exit(1);
});
