const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Administrador, HistorialAcceso } = require('../models');
const { AppError } = require('../utils/errorHandler');

const loginAdmin = async (email, password, meta = {}) => {
  const admin = await Administrador.findOne({ where: { email, activo: true } });
  if (!admin) throw new AppError('Credenciales inválidas', 401);

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) throw new AppError('Credenciales inválidas', 401);

  await HistorialAcceso.create({
    tipo: 'admin',
    ip: meta.ip,
    user_agent: meta.userAgent,
    exitoso: true,
  });

  const token = jwt.sign(
    { id: admin.id, email: admin.email, role: 'admin', nombre: admin.nombre },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  return {
    token,
    admin: { id: admin.id, nombre: admin.nombre, email: admin.email },
  };
};

const changeAdminPassword = async (adminId, currentPassword, newPassword) => {
  const admin = await Administrador.findOne({ where: { id: adminId, activo: true } });
  if (!admin) throw new AppError('Administrador no encontrado', 404);

  const valid = await bcrypt.compare(currentPassword, admin.password);
  if (!valid) throw new AppError('La contraseña actual es incorrecta', 400);

  if (currentPassword === newPassword) {
    throw new AppError('La nueva contraseña debe ser diferente a la actual', 400);
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  admin.password = hashed;
  await admin.save();

  return { id: admin.id, email: admin.email, nombre: admin.nombre };
};

module.exports = { loginAdmin, changeAdminPassword };
