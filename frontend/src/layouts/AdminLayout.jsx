import {
  LayoutDashboard, Users, Key, Settings, BarChart3, Lightbulb,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

const adminNav = [
  { path: '/admin', label: 'Dashboard', shortLabel: 'Inicio', icon: LayoutDashboard, exact: true },
  { path: '/admin/clientes', label: 'Clientes', shortLabel: 'Clientes', icon: Users },
  { path: '/admin/codigos', label: 'Códigos', shortLabel: 'Códigos', icon: Key },
  { path: '/admin/recomendaciones', label: 'Recomendaciones', shortLabel: 'Consejos', icon: Lightbulb },
  { path: '/admin/configuracion', label: 'Configuración', shortLabel: 'Config', icon: Settings },
  { path: '/admin/reportes', label: 'Reportes', shortLabel: 'Reportes', icon: BarChart3 },
];

export default function AdminLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar items={adminNav} />
      <main className="main-content has-bottom-nav">{children}</main>
    </div>
  );
}
