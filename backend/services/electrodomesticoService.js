const { Electrodomestico } = require('../models');
const { AppError } = require('../utils/errorHandler');

const { registerMarcaModelo } = require('./marcaModeloCatalogService');

function normalizeNombreEquipo(nombre) {
  return String(nombre || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function findDuplicadoPorNombre(clienteId, modulo, nombre, excludeId = null) {
  const buscado = normalizeNombreEquipo(nombre);
  if (!buscado) return null;

  const excludedId = excludeId != null && excludeId !== ''
    ? parseInt(excludeId, 10)
    : null;

  const items = await Electrodomestico.findAll({
    where: { cliente_id: clienteId, modulo, activo: true },
    attributes: ['id', 'nombre'],
  });

  return items.find(
    (item) => {
      if (excludedId != null && Number(item.id) === excludedId) return false;
      return normalizeNombreEquipo(item.nombre) === buscado;
    },
  ) || null;
}

function errorNombreDuplicado(duplicado, isEdit = false) {
  throw new AppError(
    isEdit
      ? `Ya existe otro equipo llamado «${duplicado.nombre}». Elija un nombre distinto.`
      : `Ya existe un equipo llamado «${duplicado.nombre}». Puede editarlo desde la lista en lugar de agregar uno nuevo.`,
    409,
  );
}

function validateHorasUsoDia(data) {
  if (data.horas_uso_dia === undefined) return;
  const horas = parseFloat(data.horas_uso_dia);
  if (!Number.isFinite(horas) || horas <= 0) {
    throw new AppError('Las horas de uso por día deben ser mayores a 0.', 400);
  }
}

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
  validateHorasUsoDia(data);
  const duplicado = await findDuplicadoPorNombre(clienteId, data.modulo, data.nombre);
  if (duplicado) errorNombreDuplicado(duplicado);
  const item = await Electrodomestico.create({ ...data, cliente_id: clienteId });
  await registerMarcaModelo({ marca: data.marca, modelo: data.modelo });
  return item;
};

const actualizar = async (id, clienteId, data) => {
  const item = await Electrodomestico.findOne({ where: { id, cliente_id: clienteId } });
  if (!item) throw new AppError('Electrodoméstico no encontrado', 404);
  validateHorasUsoDia(data);
  if (data.nombre !== undefined) {
    const duplicado = await findDuplicadoPorNombre(clienteId, item.modulo, data.nombre, id);
    if (duplicado) errorNombreDuplicado(duplicado, true);
  }
  await item.update(data);
  await registerMarcaModelo({ marca: data.marca ?? item.marca, modelo: data.modelo ?? item.modelo });
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