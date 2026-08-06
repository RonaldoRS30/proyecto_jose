import { useEffect, useState } from 'react';
import { TrendingDown, Lightbulb, ShieldCheck } from 'lucide-react';
import { getContactoPublico } from '../services/api';
import AuthPromoContact from './AuthPromoContact';

const HIGHLIGHTS = [
  { icon: TrendingDown, text: 'Menos costo eléctrico' },
  { icon: Lightbulb, text: 'Eficiencia energética' },
  { icon: ShieldCheck, text: 'Asesoría profesional' },
];

export default function AuthServicesPanel({ introActive = false }) {
  const base = import.meta.env.BASE_URL || '/';
  const [contacto, setContacto] = useState(null);

  useEffect(() => {
    getContactoPublico()
      .then(({ data }) => setContacto(data.data))
      .catch(() => setContacto(null));
  }, []);

  return (
    <aside
      className={`auth-promo${introActive ? ' auth-promo--intro' : ''}`}
      aria-label="ElectrixStudio — servicios"
    >
      <div className="auth-promo-glow" aria-hidden="true" />

      <div className="auth-promo-head">
        <img
          src={`${base}logo-electrixstudio.png`}
          alt="ElectrixStudio"
          className="auth-promo-logo"
        />
        <span className="auth-promo-kit">Kit Express</span>
      </div>

      <h2 className="auth-promo-title">
        Reduce tu costo eléctrico,
        <em> aumenta tu rentabilidad</em>
      </h2>

      <p className="auth-promo-lead">
        Auditoría y soluciones de eficiencia energética para su negocio.
      </p>

      <ul className="auth-promo-highlights">
        {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
          <li
            key={text}
            className="auth-promo-highlight"
            style={introActive ? { '--i': i } : undefined}
          >
            <Icon size={16} strokeWidth={2} />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <AuthPromoContact contacto={contacto} featured />
    </aside>
  );
}
