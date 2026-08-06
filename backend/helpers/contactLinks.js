const path = require('path');
const fs = require('fs');
const { onlyDigits } = require('./contactoValidation');

const SOCIAL_DISPLAY_ORDER = ['instagram', 'facebook', 'tiktok'];

const CONTACT_LINK_ORDER = [
  'instagram',
  'facebook',
  'tiktok',
  'whatsapp',
  'correo',
  'web',
];

const CONTACT_LOGO_FILES = {
  instagram: 'instagram.png',
  facebook: 'facebook.png',
  tiktok: 'tiktok.png',
  whatsapp: 'whatsapp.png',
  correo: 'correo.png',
  web: 'web.png',
};

const ICONS_DIR = path.join(__dirname, '..', 'assets', 'icons', 'contact');

function webHref(web) {
  const w = (web || '').trim();
  if (!w) return '';
  return /^https?:\/\//i.test(w) ? w : `https://${w.replace(/^\/\//, '')}`;
}

function linkHref(url) {
  const u = (url || '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/\//, '')}`;
}

function whatsappHref(telefono, customUrl) {
  const custom = linkHref(customUrl);
  if (custom) return custom;
  const digits = onlyDigits(telefono);
  if (digits.length === 9) return `https://wa.me/51${digits}`;
  return '';
}

function buildSocialLinks(contacto) {
  return buildContactLinks(contacto).filter((link) => SOCIAL_DISPLAY_ORDER.includes(link.id));
}

function buildContactInfoItems(contacto) {
  const c = contacto || {};
  const email = (c.email || '').trim();
  const web = (c.web || '').trim();
  const digits = String(c.telefono || '').replace(/\D/g, '');
  const telefonoDisplay = digits.length === 9
    ? `+51 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    : digits;

  return [
    { id: 'correo', label: 'Correo', value: email, href: email ? `mailto:${email}` : '' },
    { id: 'telefono', label: 'Teléfono', value: telefonoDisplay, href: digits.length === 9 ? `tel:+51${digits}` : '' },
    { id: 'web', label: 'Web', value: web, href: webHref(web) },
  ].filter((item) => item.value);
}

function buildContactLinks(contacto) {
  const c = contacto || {};
  const social = c.social || {};
  const fromRedes = c.redes || [];
  const findRed = (id) => fromRedes.find((r) => r.id === id);

  const instagram = findRed('instagram') || social.instagram || {};
  const facebook = findRed('facebook') || social.facebook || {};
  const tiktok = findRed('tiktok') || social.tiktok || {};
  const whatsapp = social.whatsapp || {};

  const email = (c.email || '').trim();
  const web = (c.web || '').trim();

  const items = {
    instagram: {
      id: 'instagram',
      nombre: (instagram.nombre || 'Instagram').trim(),
      href: linkHref(instagram.url),
    },
    facebook: {
      id: 'facebook',
      nombre: (facebook.nombre || 'Facebook').trim(),
      href: linkHref(facebook.url),
    },
    tiktok: {
      id: 'tiktok',
      nombre: (tiktok.nombre || 'TikTok').trim(),
      href: linkHref(tiktok.url),
    },
    whatsapp: {
      id: 'whatsapp',
      nombre: (whatsapp.nombre || 'WhatsApp').trim(),
      href: whatsappHref(c.telefono, whatsapp.url),
    },
    correo: {
      id: 'correo',
      nombre: (c.emailNombre || email || 'Correo').trim(),
      href: email ? `mailto:${email}` : '',
    },
    web: {
      id: 'web',
      nombre: (c.webNombre || web || 'Sitio web').trim(),
      href: webHref(web),
    },
  };

  return CONTACT_LINK_ORDER.map((id) => ({
    ...items[id],
    logoPath: path.join(ICONS_DIR, CONTACT_LOGO_FILES[id]),
    hasLogo: fs.existsSync(path.join(ICONS_DIR, CONTACT_LOGO_FILES[id])),
  }));
}

module.exports = {
  CONTACT_LINK_ORDER,
  SOCIAL_DISPLAY_ORDER,
  buildContactLinks,
  buildSocialLinks,
  buildContactInfoItems,
};
