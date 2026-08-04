require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');
const { errorHandler } = require('./utils/errorHandler');
const { seedAdmin } = require('./seeders/seedAdmin');
const { seedDefaults } = require('./services/configuracionService');
const { seedRecomendaciones } = require('./seeders/seedRecomendaciones');

const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const codigoRoutes = require('./routes/codigoRoutes');
const electrodomesticoRoutes = require('./routes/electrodomesticoRoutes');
const recomendacionRoutes = require('./routes/recomendacionRoutes');
const calculoRoutes = require('./routes/calculoRoutes');
const { router: reporteRoutes, configRouter } = require('./routes/reporteRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

const parseCorsOrigins = () =>
  (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const isDemoTunnelOrigin = (origin) => {
  if (!origin) return true;
  try {
    const { hostname } = new URL(origin);
    return (
      hostname.endsWith('.trycloudflare.com') ||
      hostname.endsWith('.ngrok-free.app') ||
      hostname.endsWith('.ngrok.io') ||
      hostname.endsWith('.loca.lt')
    );
  } catch {
    return false;
  }
};

const allowDemoTunnel =
  process.env.DEMO_TUNNEL === 'true' || process.env.NODE_ENV !== 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = parseCorsOrigins();
      if (
        !origin ||
        allowed.includes(origin) ||
        (allowDemoTunnel && isDemoTunnelOrigin(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API Consumo Eléctrico operativa' });
});

app.use('/api', authRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/codigos', codigoRoutes);
app.use('/api/electrodomesticos', electrodomesticoRoutes);
app.use('/api/recomendaciones', recomendacionRoutes);
app.use('/api/calculos', calculoRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/configuraciones', configRouter);

app.use(errorHandler);

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Conexión MySQL establecida');

    await sequelize.sync();
    console.log('✓ Modelos sincronizados');

    await seedAdmin();
    await seedDefaults();
    await seedRecomendaciones();

    app.listen(PORT, () => {
      console.log(`✓ Servidor en http://localhost:${PORT}`);
    });
  } catch (error) {
    const msg = error.message || 'Error desconocido';
    if (error.original?.code === 'ECONNREFUSED') {
      console.error('Error al iniciar: No se pudo conectar a MySQL.');
      console.error('  - Verifique que MySQL este encendido (puerto 3306).');
      console.error('  - Cree la base de datos: consumo_electrico');
      console.error('  - Revise usuario/contraseña en backend/.env');
    } else if (error.original?.code === 'ER_BAD_DB_ERROR') {
      console.error('Error al iniciar: La base de datos no existe.');
      console.error('  Ejecute en MySQL: CREATE DATABASE consumo_electrico;');
    } else if (error.original?.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('Error al iniciar: Usuario o contraseña de MySQL incorrectos.');
      console.error('  Revise DB_USER y DB_PASSWORD en backend/.env');
    } else {
      console.error('Error al iniciar:', msg);
      if (error.original?.message) console.error('  Detalle:', error.original.message);
    }
    process.exit(1);
  }
};

start();

module.exports = app;
