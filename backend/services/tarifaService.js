const { Cliente } = require('../models');
const { getConfigMap } = require('./configuracionService');
const { DEFAULT_TARIFF } = require('./calculationEngine');

function resolveTarifaFromCliente(cliente, config = {}) {
  const globalPrecio = parseFloat(config.precioKwh ?? DEFAULT_TARIFF.precioKwh);
  const personal = cliente?.tarifa_kwh;

  if (personal != null && personal !== '') {
    return {
      precioKwh: parseFloat(personal),
      fuente: 'cliente',
      globalPrecio,
    };
  }

  return {
    precioKwh: globalPrecio,
    fuente: 'global',
    globalPrecio,
  };
}

async function resolveTarifa(clienteId) {
  const [cliente, config] = await Promise.all([
    Cliente.findByPk(clienteId, { attributes: ['id', 'tarifa_kwh'] }),
    getConfigMap(),
  ]);
  return resolveTarifaFromCliente(cliente, config);
}

async function applyConfigTarifa(config, clienteId) {
  const cliente = await Cliente.findByPk(clienteId, {
    attributes: ['id', 'tarifa_kwh', 'alumbrado_publico'],
  });
  const tarifa = resolveTarifaFromCliente(cliente, config);
  config.precioKwh = tarifa.precioKwh;

  const alumbradoCliente = cliente?.alumbrado_publico;
  if (alumbradoCliente != null && alumbradoCliente !== '') {
    const parsed = parseFloat(alumbradoCliente);
    if (Number.isFinite(parsed) && parsed >= 0) {
      config.alumbradoPublico = parsed;
    }
  }

  return { config, tarifa };
}

module.exports = {
  resolveTarifa,
  resolveTarifaFromCliente,
  applyConfigTarifa,
};
