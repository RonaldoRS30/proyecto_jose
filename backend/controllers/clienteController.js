const { body } = require('express-validator');
const clienteService = require('../services/clienteService');
const { getPdfContacto, updatePdfContacto } = require('../services/configuracionService');
const { asyncHandler } = require('../utils/errorHandler');

const validateCliente = [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('tipo_cliente')
    .optional()
    .isIn(['natural', 'empresa'])
    .withMessage('Tipo de cliente inválido'),
];

const listar = asyncHandler(async (req, res) => {
  const result = await clienteService.listarClientes(req.query);
  res.json({ success: true, ...result });
});

const crear = [
  ...validateCliente,
  asyncHandler(async (req, res) => {
    const cliente = await clienteService.crearCliente(req.body);
    res.status(201).json({ success: true, data: cliente });
  }),
];

const obtener = asyncHandler(async (req, res) => {
  const cliente = await clienteService.obtenerCliente(req.params.id);
  res.json({ success: true, data: cliente });
});

const actualizar = asyncHandler(async (req, res) => {
  const cliente = await clienteService.actualizarCliente(req.params.id, req.body);
  res.json({ success: true, data: cliente });
});

const eliminar = asyncHandler(async (req, res) => {
  const result = await clienteService.eliminarCliente(req.params.id);
  res.json({ success: true, ...result });
});

const toggle = asyncHandler(async (req, res) => {
  const cliente = await clienteService.toggleCliente(req.params.id);
  res.json({ success: true, data: cliente });
});

const estadisticas = asyncHandler(async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;
  const stats = await clienteService.getEstadisticasAdmin({
    fechaDesde: fecha_desde || null,
    fechaHasta: fecha_hasta || null,
  });
  res.json({ success: true, data: stats });
});

const miPerfil = asyncHandler(async (req, res) => {
  const cliente = await clienteService.obtenerCliente(req.user.clienteId || req.user.id);
  res.json({ success: true, data: cliente });
});

const actualizarMiTarifa = asyncHandler(async (req, res) => {
  const clienteId = req.user.clienteId || req.user.id;
  const { tarifa_kwh } = req.body;
  if (tarifa_kwh !== null && tarifa_kwh !== undefined && (isNaN(tarifa_kwh) || Number(tarifa_kwh) < 0)) {
    return res.status(400).json({ success: false, message: 'Tarifa inválida' });
  }
  const cliente = await clienteService.actualizarCliente(clienteId, {
    tarifa_kwh: tarifa_kwh ? parseFloat(tarifa_kwh) : null,
  });
  res.json({ success: true, data: cliente });
});

const detalleAdmin = asyncHandler(async (req, res) => {
  const data = await clienteService.obtenerClienteDetalleAdmin(req.params.id);
  res.json({ success: true, data });
});

const exportResumen = asyncHandler(async (req, res) => {
  const data = await clienteService.getResumenExportClientes();
  res.json({ success: true, data });
});

const getContactoReporte = asyncHandler(async (req, res) => {
  const data = await getPdfContacto();
  res.json({ success: true, data });
});

const actualizarContactoReporte = asyncHandler(async (req, res) => {
  const { email, telefono, web } = req.body;
  if (!email?.trim() || !telefono?.trim() || !web?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Correo, teléfono y página web son obligatorios',
    });
  }
  const data = await updatePdfContacto({
    email: email.trim(),
    telefono: telefono.trim(),
    web: web.trim(),
  });
  res.json({ success: true, data });
});

module.exports = {
  listar,
  crear,
  obtener,
  actualizar,
  eliminar,
  toggle,
  estadisticas,
  miPerfil,
  actualizarMiTarifa,
  detalleAdmin,
  exportResumen,
  getContactoReporte,
  actualizarContactoReporte,
};
