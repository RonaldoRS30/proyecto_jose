/** Redes que se muestran como iconos en login y PDF */
import { onlyDigits } from './contactoValidation';

export const SOCIAL_DISPLAY_ORDER = ['instagram', 'facebook', 'tiktok', 'whatsapp'];

/** Orden completo (contacto extendido; no usado en promo/PDF) */
export const CONTACT_LINK_ORDER = [
  'instagram',
  'facebook',
  'tiktok',
  'whatsapp',
  'correo',
  'web',
];

export const CONTACT_LOGO_FILES = {
  instagram: 'instagram.png',
  facebook: 'facebook.png',
  tiktok: 'tiktok.png',
  whatsapp: 'whatsapp.png',
  correo: 'correo.png',
  web: 'web.png',
};

export const SOCIAL_NETWORKS = [
  { id: 'instagram', label: 'Instagram', logo: 'instagram.png' },
  { id: 'facebook', label: 'Facebook', logo: 'facebook.png' },
  { id: 'tiktok', label: 'TikTok', logo: 'tiktok.png' },
  { id: 'whatsapp', label: 'WhatsApp', logo: 'whatsapp.png' },
];

export function contactLogoUrl(id, baseUrl = '/') {
  const file = CONTACT_LOGO_FILES[id] || SOCIAL_NETWORKS.find((n) => n.id === id)?.logo;
  if (!file) return '';
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}icons/contact/${file}`;
}

export function webHref(web) {
  const w = (web || '').trim();
  if (!w) return '';
  return /^https?:\/\//i.test(w) ? w : `https://${w.replace(/^\/\//, '')}`;
}

export function linkHref(url) {
  const u = (url || '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/\//, '')}`;
}

export function whatsappHref(telefono, customUrl) {
  const raw = String(customUrl || '').trim();
  if (raw) {
    if (/^https?:\/\//i.test(raw) || /wa\.me|whatsapp\.com/i.test(raw)) {
      return linkHref(raw);
    }
    const urlDigits = onlyDigits(raw);
    if (urlDigits.length === 9) return `https://wa.me/51${urlDigits}`;
    if (urlDigits.length === 11 && urlDigits.startsWith('51')) return `https://wa.me/${urlDigits}`;
    return linkHref(raw);
  }
  const digits = onlyDigits(telefono);
  if (digits.length === 9) return `https://wa.me/51${digits}`;
  return '';
}

export function mapContactoFromApi(d) {
  return {
    email: d.email ?? '',
    telefono: d.telefono ?? '',
    web: d.web ?? '',
    emailNombre: d.emailNombre ?? '',
    webNombre: d.webNombre ?? '',
    empresaNombre: d.empresaNombre ?? '',
    empresaTagline: d.empresaTagline ?? '',
    social: {
      instagram: {
        url: d.social?.instagram?.url ?? '',
        nombre: d.social?.instagram?.nombre ?? 'Instagram',
      },
      facebook: {
        url: d.social?.facebook?.url ?? '',
        nombre: d.social?.facebook?.nombre ?? 'Facebook',
      },
      tiktok: {
        url: d.social?.tiktok?.url ?? '',
        nombre: d.social?.tiktok?.nombre ?? 'TikTok',
      },
      whatsapp: {
        url: d.social?.whatsapp?.url ?? '',
        nombre: d.social?.whatsapp?.nombre ?? 'WhatsApp',
      },
    },
  };
}

export function buildSocialLinks(contacto, baseUrl = '/') {
  return buildContactLinks(contacto, baseUrl).filter((link) =>
    SOCIAL_DISPLAY_ORDER.includes(link.id)
  );
}

export function buildContactInfoItems(contacto) {
  const c = contacto || {};
  const email = (c.email || '').trim();
  const web = (c.web || '').trim();
  const digits = String(c.telefono || '').replace(/\D/g, '');

  const items = [
    {
      id: 'correo',
      label: 'Correo',
      value: email,
      href: email ? `mailto:${email}` : '',
    },
    {
      id: 'telefono',
      label: 'Teléfono',
      value: digits.length === 9
        ? `+51 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
        : digits,
      href: digits.length === 9 ? `tel:+51${digits}` : '',
    },
    {
      id: 'web',
      label: 'Web',
      value: web,
      href: webHref(web),
    },
  ];

  return items.filter((item) => item.value);
}

export function buildContactLinks(contacto, baseUrl = '/') {
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

  return CONTACT_LINK_ORDER.map((id) => {
    const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return {
      ...items[id],
      logo: `${base}icons/contact/${CONTACT_LOGO_FILES[id]}`,
    };
  });
}
