const jwt = require('jsonwebtoken');
const { CodigoAcceso, Cliente, HistorialAcceso } = require('../models');
const { AppError } = require('../utils/errorHandler');

const loginConCodigo = async (codigoStr, meta = {}) => {
  const codigoNormalizado = String(codigoStr || '').trim().toUpperCase();
  if (!codigoNormalizado) throw new AppError('Código requerido', 400);

  const codigo = await CodigoAcceso.findOne({
    where: { codigo: codigoNormalizado },
    include: [{ model: Cliente, as: 'cliente' }],
  });

  if (!codigo) throw new AppError('Código inválido', 401);
  if (!codigo.activo) throw new AppError('Código deshabilitado. Contacte al administrador.', 403);
  if (codigo.fecha_expiracion && new Date(codigo.fecha_expiracion) < new Date()) {
    throw new AppError('Código expirado', 403);
  }

  await HistorialAcceso.create({
    cliente_id: codigo.cliente_id,
    codigo_id: codigo.id,
    tipo: 'cliente',
    ip: meta.ip,
    user_agent: meta.userAgent,
    exitoso: true,
  });

  const cliente = codigo.cliente;
  const token = jwt.sign(
    {
      id: codigo.cliente_id,
      clienteId: codigo.cliente_id,
      role: 'cliente',
      nombre: cliente?.nombre,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  return {
    token,
    cliente,
  };
};

module.exports = { loginConCodigo };
