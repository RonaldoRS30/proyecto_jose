const { Configuracion } = require('../models');
const { DEFAULT_TARIFF } = require('./calculationEngine');

const DEFAULT_CONFIG = {
  precio_kwh: String(DEFAULT_TARIFF.precioKwh),
  cargo_fijo: String(DEFAULT_TARIFF.cargoFijo),
  mant_reposicion: String(DEFAULT_TARIFF.mantReposicion),
  alumbrado_publico: String(DEFAULT_TARIFF.alumbradoPublico),
  interes_compensatorio: String(DEFAULT_TARIFF.interesCompensatorio),
  igv_rate: String(DEFAULT_TARIFF.igvRate),
  electrificacion_rural: String(DEFAULT_TARIFF.electrificacionRural),
  umbral_alerta_consumo_pct: '30',
  pdf_contacto_email: 'contacto@electrixstudio.com',
  pdf_contacto_telefono: '+51 987 654 321',
  pdf_contacto_web: 'www.electrixstudio.com',
  pdf_empresa_nombre: 'ELECTRIXSTUDIO',
  pdf_empresa_tagline: 'Auditoría & Soluciones de Eficiencia Energética',
};

const PDF_CONTACT_KEYS = [
  'pdf_contacto_email',
  'pdf_contacto_telefono',
  'pdf_contacto_web',
  'pdf_empresa_nombre',
  'pdf_empresa_tagline',
];

const seedDefaults = async () => {
  for (const [clave, valor] of Object.entries(DEFAULT_CONFIG)) {
    await Configuracion.findOrCreate({
      where: { clave },
      defaults: { valor, descripcion: `Configuración: ${clave}` },
    });
  }
};

const getConfigMap = async () => {
  const configs = await Configuracion.findAll();
  const map = {};
  configs.forEach((c) => {
    map[c.clave] = c.valor;
  });
  return {
    precioKwh: parseFloat(map.precio_kwh || DEFAULT_TARIFF.precioKwh),
    cargoFijo: parseFloat(map.cargo_fijo || DEFAULT_TARIFF.cargoFijo),
    mantReposicion: parseFloat(map.mant_reposicion || DEFAULT_TARIFF.mantReposicion),
    alumbradoPublico: parseFloat(map.alumbrado_publico || DEFAULT_TARIFF.alumbradoPublico),
    interesCompensatorio: parseFloat(
      map.interes_compensatorio || DEFAULT_TARIFF.interesCompensatorio
    ),
    igvRate: parseFloat(map.igv_rate || DEFAULT_TARIFF.igvRate),
    electrificacionRural: parseFloat(
      map.electrificacion_rural || DEFAULT_TARIFF.electrificacionRural
    ),
    umbralAlertaConsumoPct: parseFloat(map.umbral_alerta_consumo_pct || 30),
  };
};

const actualizarConfig = async (clave, valor) => {
  const [config] = await Configuracion.findOrCreate({
    where: { clave },
    defaults: { valor: String(valor), descripcion: `Configuración: ${clave}` },
  });
  await config.update({ valor: String(valor) });
  return config;
};

const listarTodas = () => Configuracion.findAll();

const getPdfContacto = async () => {
  await seedDefaults();
  const configs = await Configuracion.findAll({
    where: { clave: PDF_CONTACT_KEYS },
  });
  const map = Object.fromEntries(configs.map((c) => [c.clave, c.valor]));
  return {
    email: map.pdf_contacto_email || DEFAULT_CONFIG.pdf_contacto_email,
    telefono: map.pdf_contacto_telefono || DEFAULT_CONFIG.pdf_contacto_telefono,
    web: map.pdf_contacto_web || DEFAULT_CONFIG.pdf_contacto_web,
    empresaNombre: map.pdf_empresa_nombre || DEFAULT_CONFIG.pdf_empresa_nombre,
    empresaTagline: map.pdf_empresa_tagline || DEFAULT_CONFIG.pdf_empresa_tagline,
  };
};

const updatePdfContacto = async ({ email, telefono, web, empresaNombre, empresaTagline }) => {
  await seedDefaults();
  const updates = {
    pdf_contacto_email: email,
    pdf_contacto_telefono: telefono,
    pdf_contacto_web: web,
    pdf_empresa_nombre: empresaNombre,
    pdf_empresa_tagline: empresaTagline,
  };

  for (const [clave, valor] of Object.entries(updates)) {
    if (valor === undefined) continue;
    const trimmed = String(valor).trim();
    const [config] = await Configuracion.findOrCreate({
      where: { clave },
      defaults: { valor: trimmed, descripcion: `Configuración: ${clave}` },
    });
    await config.update({ valor: trimmed });
  }

  return getPdfContacto();
};

module.exports = {
  seedDefaults,
  getConfigMap,
  actualizarConfig,
  listarTodas,
  getPdfContacto,
  updatePdfContacto,
};
