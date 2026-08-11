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
  pdf_contacto_email: 'contacto@electrixstudio.com',
  pdf_contacto_telefono: '987654321',
  pdf_contacto_web: 'www.electrixstudio.com',
  pdf_contacto_email_nombre: '',
  pdf_contacto_web_nombre: '',
  pdf_empresa_nombre: 'ELECTRIXSTUDIO',
  pdf_empresa_tagline: 'Auditoría & Soluciones de Eficiencia Energética',
  pdf_social_instagram_url: '',
  pdf_social_instagram_nombre: 'Instagram',
  pdf_social_facebook_url: '',
  pdf_social_facebook_nombre: 'Facebook',
  pdf_social_tiktok_url: '',
  pdf_social_tiktok_nombre: 'TikTok',
  pdf_social_whatsapp_url: '',
  pdf_social_whatsapp_nombre: 'WhatsApp',
};

const PDF_CONTACT_KEYS = [
  'pdf_contacto_email',
  'pdf_contacto_telefono',
  'pdf_contacto_web',
  'pdf_contacto_email_nombre',
  'pdf_contacto_web_nombre',
  'pdf_empresa_nombre',
  'pdf_empresa_tagline',
  'pdf_social_instagram_url',
  'pdf_social_instagram_nombre',
  'pdf_social_facebook_url',
  'pdf_social_facebook_nombre',
  'pdf_social_tiktok_url',
  'pdf_social_tiktok_nombre',
  'pdf_social_whatsapp_url',
  'pdf_social_whatsapp_nombre',
];

const SOCIAL_NETWORKS = [
  { id: 'instagram', urlKey: 'pdf_social_instagram_url', nombreKey: 'pdf_social_instagram_nombre', defaultNombre: 'Instagram' },
  { id: 'facebook', urlKey: 'pdf_social_facebook_url', nombreKey: 'pdf_social_facebook_nombre', defaultNombre: 'Facebook' },
  { id: 'tiktok', urlKey: 'pdf_social_tiktok_url', nombreKey: 'pdf_social_tiktok_nombre', defaultNombre: 'TikTok' },
  { id: 'whatsapp', urlKey: 'pdf_social_whatsapp_url', nombreKey: 'pdf_social_whatsapp_nombre', defaultNombre: 'WhatsApp' },
];

const buildRedesFromMap = (map) => SOCIAL_NETWORKS.map(({ id, urlKey, nombreKey, defaultNombre }) => ({
  id,
  url: (map[urlKey] || '').trim(),
  nombre: (map[nombreKey] || defaultNombre).trim() || defaultNombre,
}));

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
  };
};

const actualizarConfig = async (clave, valor) => {
  if (!clave || String(clave).trim() === '') {
    throw new Error('Clave de configuración requerida');
  }
  const valorStr = valor === null || valor === undefined ? '' : String(valor);
  const [config] = await Configuracion.findOrCreate({
    where: { clave },
    defaults: { valor: valorStr, descripcion: `Configuración: ${clave}` },
  });
  await config.update({ valor: valorStr });
  return config;
};

const listarTodas = async () => {
  await seedDefaults();
  return Configuracion.findAll({ order: [['clave', 'ASC']] });
};

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
    emailNombre: map.pdf_contacto_email_nombre || '',
    webNombre: map.pdf_contacto_web_nombre || '',
    empresaNombre: map.pdf_empresa_nombre || DEFAULT_CONFIG.pdf_empresa_nombre,
    empresaTagline: map.pdf_empresa_tagline || DEFAULT_CONFIG.pdf_empresa_tagline,
    redes: buildRedesFromMap(map),
    social: {
      instagram: {
        url: map.pdf_social_instagram_url || '',
        nombre: map.pdf_social_instagram_nombre || DEFAULT_CONFIG.pdf_social_instagram_nombre,
      },
      facebook: {
        url: map.pdf_social_facebook_url || '',
        nombre: map.pdf_social_facebook_nombre || DEFAULT_CONFIG.pdf_social_facebook_nombre,
      },
      tiktok: {
        url: map.pdf_social_tiktok_url || '',
        nombre: map.pdf_social_tiktok_nombre || DEFAULT_CONFIG.pdf_social_tiktok_nombre,
      },
      whatsapp: {
        url: map.pdf_social_whatsapp_url || '',
        nombre: map.pdf_social_whatsapp_nombre || DEFAULT_CONFIG.pdf_social_whatsapp_nombre,
      },
    },
  };
};

const updatePdfContacto = async (payload = {}) => {
  await seedDefaults();

  const updates = {
    pdf_contacto_email: payload.email,
    pdf_contacto_telefono: payload.telefono,
    pdf_contacto_web: payload.web,
    pdf_contacto_email_nombre: payload.emailNombre,
    pdf_contacto_web_nombre: payload.webNombre,
    pdf_empresa_nombre: payload.empresaNombre,
    pdf_empresa_tagline: payload.empresaTagline,
    pdf_social_instagram_url: payload.social?.instagram?.url,
    pdf_social_instagram_nombre: payload.social?.instagram?.nombre,
    pdf_social_facebook_url: payload.social?.facebook?.url,
    pdf_social_facebook_nombre: payload.social?.facebook?.nombre,
    pdf_social_tiktok_url: payload.social?.tiktok?.url,
    pdf_social_tiktok_nombre: payload.social?.tiktok?.nombre,
    pdf_social_whatsapp_url: payload.social?.whatsapp?.url,
    pdf_social_whatsapp_nombre: payload.social?.whatsapp?.nombre,
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
  PDF_CONTACT_KEYS,
};
