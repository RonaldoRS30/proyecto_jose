const express = require('express');
const reporteController = require('../controllers/reporteController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/contacto-publico', reporteController.getContactoPublico);
router.post('/pdf-comparacion', authenticate, authorizeRoles('admin', 'cliente'), reporteController.generarPDFComparacion);
router.post('/pdf', authenticate, authorizeRoles('admin', 'cliente'), reporteController.generarPDF);
router.get('/:calculoId/excel', authenticate, authorizeRoles('admin', 'cliente'), reporteController.generarExcel);
router.get('/:id/download', authenticate, authorizeRoles('admin', 'cliente'), reporteController.descargar);
router.get('/:id', authenticate, authorizeRoles('admin', 'cliente'), async (req, res, next) => {
  req.params.id = req.params.id;
  const reporteService = require('../services/reporteService');
  const clienteId = req.user.role === 'cliente' ? req.user.clienteId || req.user.id : null;
  try {
    const reporte = await reporteService.obtenerReporte(req.params.id, clienteId);
    res.json({ success: true, data: reporte });
  } catch (e) {
    next(e);
  }
});

const configRouter = express.Router();
configRouter.get('/', authenticate, authorizeRoles('admin'), reporteController.listarConfig);
configRouter.put('/', authenticate, authorizeRoles('admin'), reporteController.actualizarConfig);
configRouter.get('/contacto-pdf', authenticate, authorizeRoles('admin'), reporteController.getContactoPdfConfig);
configRouter.put('/contacto-pdf', authenticate, authorizeRoles('admin'), reporteController.actualizarContactoPdfConfig);

module.exports = { router, configRouter };
