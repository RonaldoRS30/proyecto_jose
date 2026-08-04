const bcrypt = require('bcryptjs');
const { Administrador } = require('../models');

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL || 'admin@sistema.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';

  const existing = await Administrador.findOne({ where: { email } });
  if (existing) return;

  const hashed = await bcrypt.hash(password, 12);
  await Administrador.create({
    nombre: 'Administrador',
    email,
    password: hashed,
    activo: true,
  });

  console.log(`✓ Admin creado: ${email}`);
};

module.exports = { seedAdmin };
