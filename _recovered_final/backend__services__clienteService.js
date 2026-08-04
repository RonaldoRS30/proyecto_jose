const { Op } = require('sequelize');
const {
  sequelize,
  Cliente,
  CodigoAcceso,
  Electrodomestico,
  Calculo,
  Reporte,
  HistorialAcceso,
} = require('../models');
const { generarCodigoInterno } = require('../helpers/codigoHelper');
const { roundNum } = require('../utils/format');

const listarClientes = async ({ search, activo, acceso, page = 1, limit = 8 }) => {
  const where = {};
  if (activo !== undefined && activo !== '') {
    where.activo = activo === 'true' || activo === true;
  }
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { apellido: { [Op.like]: `%${search}%` } },
      { documento: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { codigo_interno: { [Op.like]: `%${search}%` } },
    ];
  }

  let codigosInclude = { model: CodigoAcceso, as: 'codigos', required: false };
  if (acceso === 'true' || acceso === true) {
    codigosInclude = {
      model: CodigoAcceso,
      as: 'codigos',
      where: { activo: true },
      required: true,
    };
  } else if (acceso === 'false' || acceso === false) {
    where[Op.and] = [
      ...(where[Op.and] || []),
      sequelize.literal(
        'NOT EXISTS (SELECT 1 FROM codigos_acceso ca WHERE ca.cliente_id = Cliente.id AND ca.activo = true)',
      ),
    ];
  }

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const { count, rows } = await Cliente.findAndCountAll({
    where,
    include: [codigosInclude],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
    distinct: true,
  });

  return {
    total: count,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    data: rows,
  };
};

const crearCliente = async (data) => {
  const codigo_interno = data.codigo_interno || generarCodigoInterno();
  return Cliente.create({ ...data, codigo_interno });
};

const obtenerCliente = async (id) => {
  const cliente = await Cliente.findByPk(id, {
    include: [
      { model: CodigoAcceso, as: 'codigos' },
      { model: Electrodomestico, as: 'electrodomesticos' },
    ],
  });
  if (!cliente) throw new AppError('Cliente no encontrado', 404);
  return cliente;
};

const actualizarCliente = async (id, data) => {
  const cliente = await obtenerCliente(id);
  await cliente.update(data);
  return cliente;
};

const eliminarCliente = async (id) => {
  const cliente = await obtenerCliente(id);
  await cliente.destroy();
  return { message: 'Cliente eliminado' };
};

const toggleCliente = async (id) => {
  const cliente = await obtenerCliente(id);
  await cliente.update({ activo: !cliente.activo });
  return cliente;
};

const getEstadisticasAdmin = async () => {
  const [totalClientes, clientesActivos, totalCalculos, totalReportes] = await Promise.all([
    Cliente.count(),
    Cliente.count({ where: { activo: true } }),
    Calculo.count(),
    Reporte.count(),
  ]);

  const calculos = await Calculo.findAll({
    attributes: ['consumo_mes_total', 'gasto_mensual_total'],
  });

  const consumoPromedio =
    calculos.length > 0
      ? calculos.reduce((s, c) => s + parseFloat(c.consumo_mes_total), 0) / calculos.length
      : 0;

  return {
    totalClientes,
    clientesActivos,
    clientesInactivos: totalClientes - clientesActivos,
    totalCalculos,
    totalReportes,
    consumoPromedio: roundNum(consumoPromedio),
  };
};

module.exports = {
  listarClientes,
  crearCliente,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente,
  toggleCliente,
  getEstadisticasAdmin,
};
