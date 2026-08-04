/**
 * Fondo animado — tema consumo eléctrico / red energética
 */
export default function AuthBackground() {
  const particles = Array.from({ length: 14 }, (_, i) => i);

  return (
    <div className="auth-bg" aria-hidden="true">
      <div className="auth-bg-base" />

      <div className="auth-bg-gradient auth-bg-gradient-1" />
      <div className="auth-bg-gradient auth-bg-gradient-2" />
      <div className="auth-bg-gradient auth-bg-gradient-3" />

      <svg className="auth-bg-circuit" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="authEnergyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(26, 74, 176, 0)" />
            <stop offset="40%" stopColor="rgba(96, 165, 250, 0.9)" />
            <stop offset="60%" stopColor="rgba(147, 197, 253, 1)" />
            <stop offset="100%" stopColor="rgba(26, 74, 176, 0)" />
          </linearGradient>
          <filter id="authGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Red de circuitos — trazos base */}
        <g className="auth-circuit-tracks">
          <path d="M-20 180 H320 V420 H680 V260 H1100 V520 H1460" />
          <path d="M-20 620 H240 V380 H520 V720 H860 V480 H1200 V780 H1460" />
          <path d="M180 -20 V900 M520 -20 V900 M920 -20 V900 M1240 -20 V900" />
          <path d="M80 340 H560 M400 120 V680 M760 200 H1320 M1040 40 V860" />
        </g>

        {/* Pulsos de energía recorriendo la red */}
        <g className="auth-circuit-flows" filter="url(#authGlow)">
          <path className="auth-circuit-flow auth-circuit-flow-1" d="M-20 180 H320 V420 H680 V260 H1100 V520 H1460" />
          <path className="auth-circuit-flow auth-circuit-flow-2" d="M-20 620 H240 V380 H520 V720 H860 V480 H1200 V780 H1460" />
          <path className="auth-circuit-flow auth-circuit-flow-3" d="M520 -20 V380 H860 V480 H1200 V780" />
          <path className="auth-circuit-flow auth-circuit-flow-4" d="M80 340 H560 V120 H1040 V680" />
        </g>

        {/* Nodos de la red */}
        <g className="auth-circuit-nodes">
          <circle cx="320" cy="180" r="4" className="auth-node auth-node-1" />
          <circle cx="680" cy="420" r="5" className="auth-node auth-node-2" />
          <circle cx="520" cy="380" r="4" className="auth-node auth-node-3" />
          <circle cx="860" cy="480" r="5" className="auth-node auth-node-4" />
          <circle cx="520" cy="340" r="3" className="auth-node auth-node-5" />
          <circle cx="1040" cy="680" r="4" className="auth-node auth-node-6" />
          <circle cx="1200" cy="780" r="5" className="auth-node auth-node-7" />
        </g>

        {/* Arco tipo medidor / consumo */}
        <g className="auth-power-gauge" transform="translate(1180, 120)">
          <path className="auth-gauge-track" d="M 0 80 A 80 80 0 0 1 160 80" />
          <path className="auth-gauge-fill" d="M 0 80 A 80 80 0 0 1 160 80" />
          <circle cx="80" cy="80" r="6" className="auth-gauge-core" />
        </g>
      </svg>

      <div className="auth-bg-grid" />
      <div className="auth-bg-glow" />
      <div className="auth-bg-scanline" />

      <div className="auth-bg-particles">
        {particles.map((i) => (
          <span key={i} className="auth-particle" style={{ '--i': i }} />
        ))}
      </div>

      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />
      <div className="auth-bg-orb auth-bg-orb-3" />

      <div className="auth-bg-bolt auth-bg-bolt-1" />
      <div className="auth-bg-bolt auth-bg-bolt-2" />
    </div>
  );
}
