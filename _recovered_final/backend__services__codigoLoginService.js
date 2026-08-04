const jwt = require('jsonwebtoken');
const { CodigoAcceso, Cliente, HistorialAcceso } = require('../models');
const { AppError } = require('../utils/errorHandler');

const loginConCodigo = async (codigo, meta = {}) => {
  const codigoAcceso = await CodigoAcceso.findOne({
    where: { codigo: codigo.toUpperCase(), activo: true },
    include: [{ model: Cliente, as: 'cliente' }],
  });

  if (!codigoAcceso) {
    await HistorialAcceso.create({
      tipo: 'cliente',
      ip: meta.ip,
      user_agent: meta.userAgent,
      exitoso: false,
    });
    throw new AppError('Código de acceso inválido o inactivo', 401);
  }

  if (!codigoAcceso.cliente) {
    throw new AppError('Cliente no encontrado para este código', 403);
  }

  if (codigoAcceso.fecha_expiracion && new Date() > codigoAcceso.fecha_expiracion) {
    throw new AppError('Código de acceso expirado', 401);
  }

  await HistorialAcceso.create({
    cliente_id: codigoAcceso.cliente_id,
    codigo_id: codigoAcceso.id,
    tipo: 'cliente',
    ip: meta.ip,
    user_agent: meta.userAgent,
    exitoso: true,
  });

  const token = jwt.sign(
    {
      id: codigoAcceso.cliente.id,
      clienteId: codigoAcceso.cliente.id,
      role: 'cliente',
      nombre: codigoAcceso.cliente.nombre,
      codigoId: codigoAcceso.id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  return {
    token,
    cliente: {
      id: codigoAcceso.cliente.id,
      nombre: codigoAcceso.cliente.nombre,
      apellido: codigoAcceso.cliente.apellido,
      empresa_distribuidora: codigoAcceso.cliente.empresa_distribuidora,
      tarifa: codigoAcceso.cliente.tarifa,
    },
  };
};

module.exports = { loginConCodigo };
