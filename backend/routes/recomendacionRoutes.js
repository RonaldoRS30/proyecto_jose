const express = require('express');
const recomendacionController = require('../controllers/recomendacionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', authenticate, authorizeRoles('admin', 'cliente'), recomendacionController.listar);
router.get('/:id', authenticate, authorizeRoles('admin'), recomendacionController.obtener);
router.post('/', authenticate, authorizeRoles('admin'), recomendacionController.crear);
router.put('/:id', authenticate, authorizeRoles('admin'), recomendacionController.actualizar);
router.delete('/:id', authenticate, authorizeRoles('admin'), recomendacionController.eliminar);
router.patch('/:id/toggle', authenticate, authorizeRoles('admin'), recomendacionController.toggle);

module.exports = router;
