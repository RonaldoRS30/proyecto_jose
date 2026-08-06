import { Globe, Mail, Phone } from 'lucide-react';

const DEFAULTS = {
  empresaNombre: 'ELECTRIXSTUDIO',
  empresaTagline: 'Auditoría & Soluciones de Eficiencia Energética',
  web: 'www.electrixstudio.com',
  email: 'contacto@electrixstudio.com',
  telefono: '+51 987 654 321',
};

function webHref(web) {
  const w = (web || '').trim();
  if (!w) return '#';
  return /^https?:\/\//i.test(w) ? w : `https://${w.replace(/^\/\//, '')}`;
}

export default function AuthPromoContact({ contacto, featured = false }) {
  const c = { ...DEFAULTS, ...contacto };

  const rows = [
    { icon: Globe, label: 'Sitio web', value: c.web, href: webHref(c.web), external: true },
    { icon: Mail, label: 'Correo', value: c.email, href: `mailto:${c.email}`, external: false },
    { icon: Phone, label: 'Teléfono', value: c.telefono, href: `tel:${c.telefono.replace(/\s/g, '')}`, external: false },
  ];

  return (
    <footer className={`auth-promo-contact${featured ? ' auth-promo-contact--featured' : ''}`}>
      <div className="auth-promo-contact-accent" aria-hidden="true" />
      <div className="auth-promo-contact-inner">
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
    </footer>
  );
}
