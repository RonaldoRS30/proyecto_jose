const express = require('express');
const clienteController = require('../controllers/clienteController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', authenticate, authorizeRoles('admin'), clienteController.listar);
router.post('/extraer-tarifa-recibo', authenticate, authorizeRoles('admin', 'cliente'), clienteController.extraerTarifaRecibo);
router.post('/', authenticate, authorizeRoles('admin'), clienteController.crear);
router.get('/estadisticas', authenticate, authorizeRoles('admin'), clienteController.estadisticas);
router.get('/export-resumen', authenticate, authorizeRoles('admin'), clienteController.exportResumen);
router.get('/mi-perfil', authenticate, authorizeRoles('cliente'), clienteController.miPerfil);
router.put('/mi-perfil', authenticate, authorizeRoles('cliente'), clienteController.actualizarMiPerfil);
router.put('/mi-perfil/tarifa', authenticate, authorizeRoles('cliente'), clienteController.actualizarMiTarifa);
router.get('/:id/detalle', authenticate, authorizeRoles('admin'), clienteController.detalleAdmin);
router.get('/:id', authenticate, authorizeRoles('admin'), clienteController.obtener);
router.put('/:id', authenticate, authorizeRoles('admin'), clienteController.actualizar);
router.delete('/:id', authenticate, authorizeRoles('admin'), clienteController.eliminar);
router.patch('/:id/toggle', authenticate, authorizeRoles('admin'), clienteController.toggle);

module.exports = router;
