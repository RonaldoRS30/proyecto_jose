import { NavLink, useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Menu, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import MobileBottomNav from './MobileBottomNav';

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
              <img src="/logo-electrixstudio.png" alt="ElectrixStudio" />
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
          {user && (
            <p className="sidebar-user">{user.nombre || user.email}</p>
          )}
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
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
