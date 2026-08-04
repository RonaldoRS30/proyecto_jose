const { body } = require('express-validator');
const clienteService = require('../services/clienteService');
const { asyncHandler } = require('../utils/errorHandler');

const validateCliente = [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
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
  const stats = await clienteService.getEstadisticasAdmin();
  res.json({ success: true, data: stats });
});

const miPerfil = asyncHandler(async (req, res) => {
  const cliente = await clienteService.obtenerCliente(req.user.clienteId || req.user.id);
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

module.exports = { listar, crear, obtener, actualizar, eliminar, toggle, estadisticas, miPerfil, detalleAdmin, exportResumen };
