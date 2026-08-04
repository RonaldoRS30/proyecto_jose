const { Electrodomestico } = require('../models');
const { AppError } = require('../utils/errorHandler');

const listarPorCliente = async (clienteId, modulo = null) => {
  const where = { cliente_id: clienteId, activo: true };
  if (modulo) where.modulo = modulo;
  return Electrodomestico.findAll({ where, order: [['created_at', 'DESC']] });
};

const listarPaginado = async (clienteId, { modulo = null, page = 1, limit = 8 } = {}) => {
  const where = { cliente_id: clienteId, activo: true };
  if (modulo) where.modulo = modulo;
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 8;
  const { count, rows } = await Electrodomestico.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: l,
    offset: (p - 1) * l,
  });
  return { total: count, page: p, limit: l, data: rows };
};

const crear = async (clienteId, data) => {
  return Electrodomestico.create({ ...data, cliente_id: clienteId });
};

const actualizar = async (id, clienteId, data) => {
  const item = await Electrodomestico.findOne({ where: { id, cliente_id: clienteId } });
  if (!item) throw new AppError('Electrodoméstico no encontrado', 404);
  await item.update(data);
  return item;
};

const eliminar = async (id, clienteId) => {
  const item = await Electrodomestico.findOne({ where: { id, cliente_id: clienteId } });
  if (!item) throw new AppError('Electrodoméstico no encontrado', 404);
  await item.destroy();
  return { message: 'Eliminado correctamente' };
};

const toCalcInput = (items) =>
  items.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    categoria: e.categoria,
    cantidad: e.cantidad,
    horasDiarias: parseFloat(e.horas_uso_dia),
    potenciaW: parseFloat(e.potencia_w),
    recomendacion_id: e.recomendacion_id || null,
  }));

module.exports = { listarPorCliente, listarPaginado, crear, actualizar, eliminar, toCalcInput };
