import axios from 'axios';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = `${BASE}/login`;
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const adminLogin = (email, password) =>
  api.post('/admin/login', { email, password });

export const clienteLogin = (codigo) =>
  api.post('/clientes/login-codigo', { codigo });

export const changeAdminPassword = (passwordActual, passwordNueva) =>
  api.patch('/admin/password', {
    password_actual: passwordActual,
    password_nueva: passwordNueva,
  });

// Clientes
export const getClientes = (params) => api.get('/clientes', { params });
export const getCliente = (id) => api.get(`/clientes/${id}`);
export const getClienteDetalle = (id) => api.get(`/clientes/${id}/detalle`);
export const createCliente = (data) => api.post('/clientes', data);

export const extraerTarifaRecibo = (file, clienteId = null) => {
  const formData = new FormData();
  formData.append('recibo', file);
  if (clienteId != null && clienteId !== '') {
    formData.append('cliente_id', String(clienteId));
  }
  return api.post('/clientes/extraer-tarifa-recibo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const registrarReciboHistorialCliente = (clienteId, datos) =>
  api.post(`/clientes/${clienteId}/recibo-historial`, datos);
export const updateCliente = (id, data) => api.put(`/clientes/${id}`, data);
export const deleteCliente = (id) => api.delete(`/clientes/${id}`);
export const toggleCliente = (id) => api.patch(`/clientes/${id}/toggle`);
export const getEstadisticas = (params) => api.get('/clientes/estadisticas', { params });
export const getClientesExportResumen = () => api.get('/clientes/export-resumen');
export const getMiPerfil = () => api.get('/clientes/mi-perfil');
export const updateMiPerfil = (payload) => api.put('/clientes/mi-perfil', payload);
export const updateMiTarifa = (payload) => api.put('/clientes/mi-perfil/tarifa', payload);
export const getContactoPublico = () => api.get('/reportes/contacto-publico');

// Códigos
export const generarCodigo = (data) => api.post('/codigos/generar', data);
export const getCodigos = (params) => api.get('/codigos', { params });
export const updateCodigo = (id, data) => api.put(`/codigos/${id}`, data);

// Electrodomésticos
export const getElectrodomesticos = (params) => api.get('/electrodomesticos', { params });
export const getMarcaModeloCatalog = () => api.get('/electrodomesticos/catalogo-marca-modelo');
export const createElectrodomestico = (data) => api.post('/electrodomesticos', data);
export const updateElectrodomestico = (id, data) => api.put(`/electrodomesticos/${id}`, data);
export const deleteElectrodomestico = (id) => api.delete(`/electrodomesticos/${id}`);

// Recomendaciones
export const getRecomendaciones = (params) => api.get('/recomendaciones', { params });
export const createRecomendacion = (data) => api.post('/recomendaciones', data);
export const updateRecomendacion = (id, data) => api.put(`/recomendaciones/${id}`, data);
export const deleteRecomendacion = (id) => api.delete(`/recomendaciones/${id}`);
export const toggleRecomendacion = (id) => api.patch(`/recomendaciones/${id}/toggle`);

// Cálculos
export const getCalculoPreview = () => api.get('/calculos/preview');
export const ejecutarCalculo = () => api.post('/calculos');
export const getCalculos = (params) => api.get('/calculos', { params });
export const getCalculo = (id) => api.get(`/calculos/${id}`);

// Reportes
export const generarPDF = (calculoId) => api.post('/reportes/pdf', { calculo_id: calculoId });
export const generarPDFComparacion = (calculoIdActual, calculoIdReferencia) =>
  api.post('/reportes/pdf-comparacion', {
    calculo_id_actual: calculoIdActual,
    calculo_id_referencia: calculoIdReferencia,
  });
export const downloadReporte = (id) =>
  api.get(`/reportes/${id}/download`, { responseType: 'blob' });
export const downloadExcelReporte = (calculoId) =>
  api.get(`/reportes/${calculoId}/excel`, { responseType: 'blob' });

// Configuración
export const getConfiguraciones = () => api.get('/configuraciones');
export const updateConfiguracion = (clave, valor) =>
  api.put('/configuraciones', { clave, valor });
export const getContactoPdfConfig = () => api.get('/configuraciones/contacto-pdf');
export const updateContactoPdfConfig = (data) => api.put('/configuraciones/contacto-pdf', data);
