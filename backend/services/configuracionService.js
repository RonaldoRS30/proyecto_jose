const { Configuracion } = require('../models');
const { DEFAULT_TARIFF } = require('./calculationEngine');

const DEFAULT_CONFIG = {
  precio_kwh: String(DEFAULT_TARIFF.precioKwh),
  cargo_fijo: String(DEFAULT_TARIFF.cargoFijo),
  mant_reposicion: String(DEFAULT_TARIFF.mantReposicion),
  alumbrado_publico: String(DEFAULT_TARIFF.alumbradoPublico),
  interes_compensatorio: String(DEFAULT_TARIFF.interesCompensatorio),
  igv_rate: String(DEFAULT_TARIFF.igvRate),
  electrificacion_rural: String(DEFAULT_TARIFF.electrificacionRural),
  umbral_alerta_consumo_pct: '30',
};

const seedDefaults = async () => {
  for (const [clave, valor] of Object.entries(DEFAULT_CONFIG)) {
    await Configuracion.findOrCreate({
      where: { clave },
      defaults: { valor, descripcion: `Configuración: ${clave}` },
    });
  }
};

const getConfigMap = async () => {
  const configs = await Configuracion.findAll();
  const map = {};
  configs.forEach((c) => {
    map[c.clave] = c.valor;
  });
  return {
    precioKwh: parseFloat(map.precio_kwh || DEFAULT_TARIFF.precioKwh),
    cargoFijo: parseFloat(map.cargo_fijo || DEFAULT_TARIFF.cargoFijo),
    mantReposicion: parseFloat(map.mant_reposicion || DEFAULT_TARIFF.mantReposicion),
    alumbradoPublico: parseFloat(map.alumbrado_publico || DEFAULT_TARIFF.alumbradoPublico),
    interesCompensatorio: parseFloat(
      map.interes_compensatorio || DEFAULT_TARIFF.interesCompensatorio
    ),
    igvRate: parseFloat(map.igv_rate || DEFAULT_TARIFF.igvRate),
    electrificacionRural: parseFloat(
      map.electrificacion_rural || DEFAULT_TARIFF.electrificacionRural
    ),
    umbralAlertaConsumoPct: parseFloat(map.umbral_alerta_consumo_pct || 30),
  };
};

const actualizarConfig = async (clave, valor) => {
  const config = await Configuracion.findOne({ where: { clave } });
  if (!config) throw new Error(`Configuración ${clave} no encontrada`);
  await config.update({ valor: String(valor) });
  return config;
};

const listarTodas = () => Configuracion.findAll();

module.exports = { seedDefaults, getConfigMap, actualizarConfig, listarTodas };
