import { buildSocialLinks, buildContactInfoItems } from '../utils/contactLinks';
import { ContactInfoIcon } from './ContactInfoIcons';

const DEFAULTS = {
  empresaNombre: 'ELECTRIXSTUDIO',
  empresaTagline: 'Auditoría & Soluciones de Eficiencia Energética',
  web: 'www.electrixstudio.com',
  email: 'contacto@electrixstudio.com',
  telefono: '987654321',
};

function ContactInfoRow({ id, label, value, href }) {
  const content = (
    <>
      <span className="auth-promo-contact-label">
        <ContactInfoIcon type={id} size={11} />
        {label}
      </span>
      <span className={`auth-promo-contact-value auth-promo-contact-value--${id}`}>{value}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} className="auth-promo-contact-row auth-promo-contact-row--link" target={id === 'web' ? '_blank' : undefined} rel={id === 'web' ? 'noopener noreferrer' : undefined}>
        {content}
      </a>
    );
  }

  return <div className="auth-promo-contact-row">{content}</div>;
}

function SocialLinkItem({ id, logo, nombre, href }) {
  const isEmpty = !href;
  const className = `auth-promo-social-link auth-promo-social-link--${id}${isEmpty ? ' auth-promo-social-link--empty' : ''}`;

  const content = (
    <>
      <span className="auth-promo-social-link-icon">
        <img src={logo} alt="" aria-hidden="true" />
      </span>
      <span className="auth-promo-social-link-name">{nombre}</span>
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
    <span className={className} title={`${nombre} — configure en Configuración`}>
      {content}
    </span>
  );
}

export default function AuthPromoContact({ contacto, featured = false }) {
  const c = { ...DEFAULTS, ...contacto };
  const base = import.meta.env.BASE_URL || '/';
  const socialLinks = buildSocialLinks(c, base);
  const contactInfo = buildContactInfoItems(c);

  return (
    <footer className={`auth-promo-contact${featured ? ' auth-promo-contact--featured' : ''}`}>
      <div className="auth-promo-contact-accent" aria-hidden="true" />
      <div className="auth-promo-contact-inner">
        <div className="auth-promo-contact-main">
          <div className="auth-promo-contact-brand">
            <strong>{c.empresaNombre}</strong>
            <span>{c.empresaTagline}</span>
          </div>
          {contactInfo.length > 0 && (
            <div className="auth-promo-contact-rows">
              {contactInfo.map((item) => (
                <ContactInfoRow key={item.id} {...item} />
              ))}
            </div>
          )}
        </div>

        <section className="auth-promo-contact-social" aria-label="Redes sociales">
          <span className="auth-promo-social-heading">Redes sociales</span>
          <div className="auth-promo-social-links">
            {socialLinks.map((item) => (
              <SocialLinkItem key={item.id} {...item} />
            ))}
          </div>
        </section>
      </div>
    </footer>
  );
}
