const express = require('express');
const reporteController = require('../controllers/reporteController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post('/pdf', authenticate, authorizeRoles('admin', 'cliente'), reporteController.generarPDF);
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

module.exports = { router, configRouter };
