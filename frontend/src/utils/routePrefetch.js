/** Precarga chunks de rutas antes del clic para navegación más rápida. */

const loaders = {
  '/admin': () => import('../pages/admin/AdminDashboard'),
  '/admin/clientes': () => import('../pages/admin/ClientesPage'),
  '/admin/codigos': () => import('../pages/admin/CodigosPage'),
  '/admin/recomendaciones': () => import('../pages/admin/RecomendacionesPage'),
  '/admin/configuracion': () => import('../pages/admin/ConfigPage'),
  '/admin/reportes': () => import('../pages/client/ReportesPage'),
  '/cliente': () => import('../pages/client/ClientDashboard'),
  '/cliente/electrodomesticos': () => import('../pages/client/ElectrodomesticosPage'),
  '/cliente/fantasma': () => import('../pages/client/FantasmaPage'),
  '/cliente/iluminacion': () => import('../pages/client/IluminacionPage'),
  '/cliente/historial': () => import('../pages/client/HistorialPage'),
  '/cliente/reportes': () => import('../pages/client/ReportesPage'),
  '/cliente/comparacion': () => import('../pages/client/ComparacionPage'),
  '/cliente/perfil': () => import('../pages/client/PerfilPage'),
};

const loaded = new Set();

function normalizePath(path) {
  if (!path) return '';
  const base = path.replace(/\/+$/, '') || '/';
  if (base === '/admin' || base === '/cliente') return base;
  return base;
}

export function prefetchRoute(path) {
  const key = normalizePath(typeof path === 'string' ? path : path?.pathname);
  const loader = loaders[key];
  if (!loader || loaded.has(key)) return;
  loaded.add(key);
  loader().catch(() => {
    loaded.delete(key);
  });
}

export function prefetchAdminShell() {
  return import('../pages/admin/AdminDashboard').catch(() => {});
}

export function prefetchClientShell() {
  return import('../pages/client/ClientDashboard').catch(() => {});
}

export function prefetchOnIdle(callback) {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 300);
  }
}
