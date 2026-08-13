const { body } = require('express-validator');
const clienteService = require('../services/clienteService');
const { extractTarifaFromRecibo } = require('../services/reciboTarifaService');
const { registrarReciboEnHistorial } = require('../services/reciboHistorialService');
const { uploadRecibo } = require('../middlewares/uploadReciboMiddleware');
const { asyncHandler } = require('../utils/errorHandler');

const validateCliente = [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('tipo_cliente')
    .optional()
    .isIn(['natural', 'empresa'])
    .withMessage('Tipo de cliente inválido'),
  body('tarifa_kwh')
    .notEmpty()
    .withMessage('La tarifa eléctrica es obligatoria')
    .isFloat({ min: 0 })
    .withMessage('La tarifa eléctrica debe ser un número válido'),
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

const actualizarMiPerfil = asyncHandler(async (req, res) => {
  const clienteId = req.user.clienteId || req.user.id;
  const cliente = await clienteService.actualizarPerfilCliente(clienteId, req.body);
  res.json({ success: true, data: cliente });
});

const actualizarMiTarifa = actualizarMiPerfil;

const detalleAdmin = asyncHandler(async (req, res) => {
  const data = await clienteService.obtenerClienteDetalleAdmin(req.params.id);
  res.json({ success: true, data });
});

const exportResumen = asyncHandler(async (req, res) => {
  const data = await clienteService.getResumenExportClientes();
  res.json({ success: true, data });
});

const extraerTarifaRecibo = [
  uploadRecibo.single('recibo'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Seleccione un PDF o foto del recibo de luz.',
      });
    }

    try {
      const result = await extractTarifaFromRecibo(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
      );

      const clienteId = req.user?.role === 'cliente'
        ? (req.user.clienteId || req.user.id)
        : (req.body?.cliente_id || req.query?.cliente_id || null);

      let historialRecibo = null;
      if (clienteId && result.total_a_pagar != null) {
        historialRecibo = await registrarReciboEnHistorial(
          Number(clienteId),
          result,
          req.file.originalname,
        );
      }

      if (result.tarifa_kwh == null) {
        return res.status(422).json({
          success: false,
          ...result,
          historial_recibo: historialRecibo ? { id: historialRecibo.id } : null,
        });
      }
      return res.json({
        success: true,
        data: result,
        historial_recibo: historialRecibo ? { id: historialRecibo.id } : null,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'No se pudo procesar el archivo.',
      });
    }
  }),
];

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
  actualizarMiPerfil,
  detalleAdmin,
  exportResumen,
  extraerTarifaRecibo,
};
