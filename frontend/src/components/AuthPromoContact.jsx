import { Globe, Mail, Phone } from 'lucide-react';
import { SocialIcon } from './SocialIcons';

const DEFAULTS = {
  empresaNombre: 'ELECTRIXSTUDIO',
  empresaTagline: 'Auditoría & Soluciones de Eficiencia Energética',
  web: 'www.electrixstudio.com',
  email: 'contacto@electrixstudio.com',
  telefono: '+51 987 654 321',
};

const SOCIAL_NETWORKS = [
  { id: 'facebook', defaultNombre: 'Facebook' },
  { id: 'instagram', defaultNombre: 'Instagram' },
  { id: 'tiktok', defaultNombre: 'TikTok' },
];

function webHref(web) {
  const w = (web || '').trim();
  if (!w) return '#';
  return /^https?:\/\//i.test(w) ? w : `https://${w.replace(/^\/\//, '')}`;
}

function linkHref(url) {
  const u = (url || '').trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^\/\//, '')}`;
}

function buildSocialList(contacto) {
  const social = contacto?.social || {};
  const fromRedes = contacto?.redes || [];

  return SOCIAL_NETWORKS.map(({ id, defaultNombre }) => {
    const fromArray = fromRedes.find((r) => r.id === id);
    return {
      id,
      url: (fromArray?.url || social[id]?.url || '').trim(),
      nombre: (fromArray?.nombre || social[id]?.nombre || defaultNombre).trim() || defaultNombre,
    };
  });
}

function SocialItem({ id, url, nombre }) {
  const href = linkHref(url);
  const isEmpty = !href;
  const className = `auth-promo-social-item auth-promo-social-item--${id}${isEmpty ? ' auth-promo-social-item--empty' : ''}`;

  const content = (
    <>
      <span className={`auth-promo-social-icon auth-promo-social-icon--${id}`}>
        <SocialIcon network={id} size={13} />
      </span>
      <span className="auth-promo-social-name">{nombre}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        title={nombre}
      >
        {content}
      </a>
    );
  }

  return (
    <span className={className} title={`${nombre} — configure el enlace en Configuración`}>
      {content}
    </span>
  );
}

export default function AuthPromoContact({ contacto, featured = false }) {
  const c = { ...DEFAULTS, ...contacto };
  const redes = buildSocialList(c);

  const rows = [
    { icon: Globe, label: 'Sitio web', value: c.web, href: webHref(c.web), external: true },
    { icon: Mail, label: 'Correo', value: c.email, href: `mailto:${c.email}`, external: false },
    { icon: Phone, label: 'Teléfono', value: c.telefono, href: `tel:${c.telefono.replace(/\s/g, '')}`, external: false },
  ];

  return (
    <footer className={`auth-promo-contact${featured ? ' auth-promo-contact--featured' : ''}`}>
      <div className="auth-promo-contact-accent" aria-hidden="true" />
      <div className="auth-promo-contact-inner">
        <div className="auth-promo-contact-main">
          <div className="auth-promo-contact-brand">
            <strong>{c.empresaNombre}</strong>
            <span>{c.empresaTagline}</span>
          </div>
          <div className="auth-promo-contact-rows">
            {rows.map(({ icon: Icon, label, value, href, external }) => (
              <div key={label} className="auth-promo-contact-row">
                <span className="auth-promo-contact-label">
                  <Icon size={12} />
                  {label}
                </span>
                <a
                  href={href}
                  className="auth-promo-contact-value"
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {value}
                </a>
              </div>
            ))}
          </div>
        </div>

        <aside className="auth-promo-contact-aside" aria-label="Redes sociales">
          <span className="auth-promo-social-heading">Síguenos</span>
          <div className="auth-promo-social">
            {redes.map(({ id, url, nombre }) => (
              <SocialItem key={id} id={id} url={url} nombre={nombre} />
            ))}
          </div>
        </aside>
      </div>
    </footer>
  );
}
