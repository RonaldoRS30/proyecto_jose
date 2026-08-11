import {

  LayoutDashboard, Plug, Ghost, Lightbulb, History,

  FileText, User, GitCompare,

} from 'lucide-react';

import Sidebar from '../components/Sidebar';

import CalculoStatusBanner from '../components/CalculoStatusBanner';

import { CalculoProvider } from '../contexts/CalculoContext';



const clientNav = [

  { path: '/cliente', label: 'Inicio', shortLabel: 'Inicio', icon: LayoutDashboard, exact: true },

  { path: '/cliente/electrodomesticos', label: 'Mis Electrodomésticos', shortLabel: 'Equipos', icon: Plug },

  { path: '/cliente/fantasma', label: 'Consumo Fantasma', shortLabel: 'Fantasma', icon: Ghost },

  { path: '/cliente/iluminacion', label: 'Iluminación', shortLabel: 'Luces', icon: Lightbulb },

  { path: '/cliente/historial', label: 'Historial', shortLabel: 'Historial', icon: History },

  { path: '/cliente/reportes', label: 'Reportes', shortLabel: 'Reportes', icon: FileText },

  { path: '/cliente/comparacion', label: 'Comparación', shortLabel: 'Comparar', icon: GitCompare },

  { path: '/cliente/perfil', label: 'Mi Perfil', shortLabel: 'Perfil', icon: User },

];



export default function ClientLayout({ children }) {

  return (

    <CalculoProvider>

      <div className="app-layout">

        <Sidebar items={clientNav} />

        <main className="main-content has-bottom-nav">

          <CalculoStatusBanner />

          {children}

        </main>

      </div>

    </CalculoProvider>

  );

}

