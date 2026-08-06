/** Iconos simples para datos de contacto (no logos de marca) */
export function IconMail({ size = 12, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconPhone({ size = 12, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.5 4h3l1.5 5-2 1.5a11 11 0 005 5L17 13.5 22 15v3a2 2 0 01-2.2 2 17 17 0 01-8.6-3.3A17 17 0 014.2 6.2 2 2 0 016.5 4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconGlobe({ size = 12, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const ICON_MAP = {
  correo: IconMail,
  telefono: IconPhone,
  web: IconGlobe,
};

export function ContactInfoIcon({ type, size = 12, className }) {
  const Icon = ICON_MAP[type];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}
