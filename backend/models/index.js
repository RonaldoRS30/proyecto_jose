const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Administrador = sequelize.define(
  'Administrador',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'administradores' }
);

const Cliente = sequelize.define(
  'Cliente',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo_interno: { type: DataTypes.STRING(20), unique: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    apellido: { type: DataTypes.STRING(150), allowNull: true },
    documento: { type: DataTypes.STRING(20), allowNull: true },
    email: { type: DataTypes.STRING(150), allowNull: true },
    telefono: { type: DataTypes.STRING(20), allowNull: true },
    direccion: { type: DataTypes.STRING(255), allowNull: true },
    empresa_distribuidora: { type: DataTypes.STRING(100), defaultValue: 'Luz del Sur' },
    tarifa: { type: DataTypes.STRING(50), defaultValue: 'BT5B residencial' },
    tarifa_kwh: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
    tipo_cliente: {
      type: DataTypes.ENUM('natural', 'empresa'),
      defaultValue: 'natural',
    },
    potencia_contratada: { type: DataTypes.STRING(20), defaultValue: '10 KW' },
    alumbrado_publico: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    medidor: { type: DataTypes.STRING(50), defaultValue: '3φ - 3 hilos' },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    notas: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'clientes' }
);

const CodigoAcceso = sequelize.define(
  'CodigoAcceso',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    usado: { type: DataTypes.BOOLEAN, defaultValue: false },
    fecha_expiracion: { type: DataTypes.DATE, allowNull: true },
    generado_por: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'codigos_acceso' }
);

const Electrodomestico = sequelize.define(
  'Electrodomestico',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    categoria: { type: DataTypes.STRING(50), allowNull: false },
    modulo: {
      type: DataTypes.ENUM('aparato', 'fantasma', 'iluminacion'),
      defaultValue: 'aparato',
    },
    marca: { type: DataTypes.STRING(100), allowNull: true },
    modelo: { type: DataTypes.STRING(100), allowNull: true },
    potencia_w: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    cantidad: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    horas_uso_dia: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
    dias_uso_mes: { type: DataTypes.INTEGER, defaultValue: 30 },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    recomendacion_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'electrodomesticos' }
);

const Calculo = sequelize.define(
  'Calculo',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    precio_kwh: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0.613 },
    consumo_dia_total: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    consumo_mes_total: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    consumo_anio_total: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    gasto_diario_total: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    gasto_mensual_total: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    gasto_anual_total: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    demanda_total: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    factura_total_mes: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    origen: {
      type: DataTypes.ENUM('calculo', 'recibo'),
      defaultValue: 'calculo',
    },
    periodo_facturacion: { type: DataTypes.DATEONLY, allowNull: true },
    resumen_json: { type: DataTypes.JSON, allowNull: true },
  },
  { tableName: 'calculos' }
);

const DetalleCalculo = sequelize.define(
  'DetalleCalculo',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    calculo_id: { type: DataTypes.INTEGER, allowNull: false },
    electrodomestico_id: { type: DataTypes.INTEGER, allowNull: true },
    recomendacion_id: { type: DataTypes.INTEGER, allowNull: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    modulo: { type: DataTypes.STRING(20), allowNull: false },
    categoria: { type: DataTypes.STRING(50), allowNull: true },
    cantidad: { type: DataTypes.INTEGER, defaultValue: 1 },
    potencia_w: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    horas_uso_dia: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
    consumo_dia: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    consumo_mes: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    consumo_anio: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    gasto_diario: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    gasto_mensual: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
    gasto_anual: { type: DataTypes.DECIMAL(12, 4), defaultValue: 0 },
  },
  { tableName: 'detalle_calculos' }
);

const Reporte = sequelize.define(
  'Reporte',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    calculo_id: { type: DataTypes.INTEGER, allowNull: false },
    cliente_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre_archivo: { type: DataTypes.STRING(255), allowNull: false },
    ruta_archivo: { type: DataTypes.STRING(500), allowNull: false },
    tamano_bytes: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'reportes' }
);

const Configuracion = sequelize.define(
  'Configuracion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    clave: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    valor: { type: DataTypes.TEXT, allowNull: false },
    descripcion: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: 'configuraciones' }
);

const HistorialAcceso = sequelize.define(
  'HistorialAcceso',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    cliente_id: { type: DataTypes.INTEGER, allowNull: true },
    codigo_id: { type: DataTypes.INTEGER, allowNull: true },
    tipo: { type: DataTypes.ENUM('cliente', 'admin'), defaultValue: 'cliente' },
    ip: { type: DataTypes.STRING(45), allowNull: true },
    user_agent: { type: DataTypes.STRING(500), allowNull: true },
    exitoso: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { tableName: 'historial_accesos' }
);

const Recomendacion = sequelize.define(
  'Recomendacion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    texto: { type: DataTypes.TEXT, allowNull: false },
    aliases: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    categoria: { type: DataTypes.STRING(50), defaultValue: 'Otros' },
    modulo: {
      type: DataTypes.ENUM('aparato', 'fantasma', 'iluminacion'),
      defaultValue: 'aparato',
    },
    potencia_w: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    horas_uso_dia: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    orden: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: 'recomendaciones' }
);

// Relaciones
Cliente.hasMany(CodigoAcceso, { foreignKey: 'cliente_id', as: 'codigos' });
CodigoAcceso.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

Cliente.hasMany(Electrodomestico, { foreignKey: 'cliente_id', as: 'electrodomesticos' });
Electrodomestico.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

Cliente.hasMany(Calculo, { foreignKey: 'cliente_id', as: 'calculos' });
Calculo.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

Calculo.hasMany(DetalleCalculo, { foreignKey: 'calculo_id', as: 'detalles' });
DetalleCalculo.belongsTo(Calculo, { foreignKey: 'calculo_id', as: 'calculo' });

Calculo.hasMany(Reporte, { foreignKey: 'calculo_id', as: 'reportes' });
Reporte.belongsTo(Calculo, { foreignKey: 'calculo_id', as: 'calculo' });
Reporte.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

Cliente.hasMany(HistorialAcceso, { foreignKey: 'cliente_id', as: 'historial' });
HistorialAcceso.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

Administrador.hasMany(CodigoAcceso, { foreignKey: 'generado_por', as: 'codigosGenerados' });

module.exports = {
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
  Recomendacion,
};
