import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import ClientLayout from '../layouts/ClientLayout';
import LoginPage from '../pages/auth/LoginPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ClientesPage from '../pages/admin/ClientesPage';
import ClienteDetallePage from '../pages/admin/ClienteDetallePage';
import CodigosPage from '../pages/admin/CodigosPage';
import RecomendacionesPage from '../pages/admin/RecomendacionesPage';
import ConfigPage from '../pages/admin/ConfigPage';
import ClientDashboard from '../pages/client/ClientDashboard';
import ElectrodomesticosPage from '../pages/client/ElectrodomesticosPage';
import FantasmaPage from '../pages/client/FantasmaPage';
import IluminacionPage from '../pages/client/IluminacionPage';
import HistorialPage from '../pages/client/HistorialPage';
import ReportesPage from '../pages/client/ReportesPage';
import ComparacionPage from '../pages/client/ComparacionPage';
import PerfilPage from '../pages/client/PerfilPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="clientes" element={<ClientesPage />} />
                <Route path="clientes/:id" element={<ClienteDetallePage />} />
                <Route path="codigos" element={<CodigosPage />} />
                <Route path="recomendaciones" element={<RecomendacionesPage />} />
                <Route path="configuracion" element={<ConfigPage />} />
                <Route path="reportes" element={<ReportesPage admin />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/cliente/*"
        element={
          <ProtectedRoute role="cliente">
            <ClientLayout>
              <Routes>
                <Route index element={<ClientDashboard />} />
                <Route path="electrodomesticos" element={<ElectrodomesticosPage />} />
                <Route path="fantasma" element={<FantasmaPage />} />
                <Route path="iluminacion" element={<IluminacionPage />} />
                <Route path="historial" element={<HistorialPage />} />
                <Route path="reportes" element={<ReportesPage />} />
                <Route path="comparacion" element={<ComparacionPage />} />
                <Route path="perfil" element={<PerfilPage />} />
              </Routes>
            </ClientLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
