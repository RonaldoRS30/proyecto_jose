import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import AdminLayout from '../layouts/AdminLayout';
import ClientLayout from '../layouts/ClientLayout';

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const ClientesPage = lazy(() => import('../pages/admin/ClientesPage'));
const ClienteDetallePage = lazy(() => import('../pages/admin/ClienteDetallePage'));
const CodigosPage = lazy(() => import('../pages/admin/CodigosPage'));
const RecomendacionesPage = lazy(() => import('../pages/admin/RecomendacionesPage'));
const ConfigPage = lazy(() => import('../pages/admin/ConfigPage'));

const ClientDashboard = lazy(() => import('../pages/client/ClientDashboard'));
const ElectrodomesticosPage = lazy(() => import('../pages/client/ElectrodomesticosPage'));
const FantasmaPage = lazy(() => import('../pages/client/FantasmaPage'));
const IluminacionPage = lazy(() => import('../pages/client/IluminacionPage'));
const HistorialPage = lazy(() => import('../pages/client/HistorialPage'));
const ReportesPage = lazy(() => import('../pages/client/ReportesPage'));
const ComparacionPage = lazy(() => import('../pages/client/ComparacionPage'));
const PerfilPage = lazy(() => import('../pages/client/PerfilPage'));

function RouteFallback() {
  return (
    <div className="page-skeleton page-skeleton--inline" aria-busy="true" aria-live="polite">
      <div className="page-skeleton-block page-skeleton-block--title" />
      <div className="dashboard-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="page-skeleton-card" />
        ))}
      </div>
      <p className="page-skeleton-hint">Cargando…</p>
    </div>
  );
}

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
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route index element={<AdminDashboard />} />
                  <Route path="clientes" element={<ClientesPage />} />
                  <Route path="clientes/:id" element={<ClienteDetallePage />} />
                  <Route path="codigos" element={<CodigosPage />} />
                  <Route path="recomendaciones" element={<RecomendacionesPage />} />
                  <Route path="configuracion" element={<ConfigPage />} />
                  <Route path="reportes" element={<ReportesPage admin />} />
                </Routes>
              </Suspense>
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/cliente/*"
        element={
          <ProtectedRoute role="cliente">
            <ClientLayout>
              <Suspense fallback={<RouteFallback />}>
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
              </Suspense>
            </ClientLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
