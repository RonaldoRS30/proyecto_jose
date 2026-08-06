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
  const tarifa = await resolveTarifa(clienteId);
  config.precioKwh = tarifa.precioKwh;
  return { config, tarifa };
}

module.exports = {
  resolveTarifa,
  resolveTarifaFromCliente,
  applyConfigTarifa,
};
