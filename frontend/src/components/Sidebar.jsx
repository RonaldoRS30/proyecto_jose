import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Menu, X, Building2, UserRound } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import GuardedNavLink from './GuardedNavLink';
import MobileBottomNav from './MobileBottomNav';
import { getSidebarUserDisplay, isClienteEmpresa } from '../utils/clienteDisplay';

export default function Sidebar({ items }) {
  const { darkMode, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userDisplay = useMemo(() => getSidebarUserDisplay(user), [user]);
  const isEmpresa = user?.role === 'cliente' && isClienteEmpresa(user);

  return (
    <>
      {!mobileOpen && (
        <button
          type="button"
          className="btn btn-secondary mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>
      )}

      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <div className="sidebar-logo">
              <img src={`${import.meta.env.BASE_URL}logo-electrixstudio.png`} alt="ElectrixStudio" />
            </div>
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={20} />
            </button>
          </div>
          {userDisplay && (
            <div className="sidebar-user-card" aria-label="Usuario en sesión">
              <div className="sidebar-user-avatar" aria-hidden="true">
                <span>{userDisplay.initials}</span>
                <span className="sidebar-user-avatar-icon">
                  {user?.role === 'admin' ? <UserRound size={12} /> : (isEmpresa ? <Building2 size={12} /> : <UserRound size={12} />)}
                </span>
              </div>
              <div className="sidebar-user-info">
                <p className="sidebar-user-name" title={userDisplay.name}>
                  {userDisplay.name}
                </p>
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <GuardedNavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onAfterNavigate={() => setMobileOpen(false)}
            >
              <item.icon size={18} />
              {item.label}
            </GuardedNavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="nav-item" onClick={toggleTheme}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? 'Modo Claro' : 'Modo Oscuro'}
          </button>
          <button type="button" className="nav-item nav-item-danger" onClick={handleLogout}>
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <MobileBottomNav items={items} onOpenMenu={() => setMobileOpen(true)} />
    </>
  );
}
