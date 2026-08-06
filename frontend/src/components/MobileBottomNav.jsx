import { Menu } from 'lucide-react';
import GuardedNavLink from './GuardedNavLink';

export default function MobileBottomNav({ items, onOpenMenu }) {
  const primaryItems = items.slice(0, 4);

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación principal">
      {primaryItems.map((item) => (
        <GuardedNavLink
          key={item.path}
          to={item.path}
          end={item.exact ?? false}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.shortLabel || item.label.split(' ')[0]}</span>
            </>
          )}
        </GuardedNavLink>
      ))}
      <button type="button" className="bottom-nav-item" onClick={onOpenMenu} aria-label="Más opciones">
        <Menu size={20} />
        <span>Más</span>
      </button>
    </nav>
  );
}
