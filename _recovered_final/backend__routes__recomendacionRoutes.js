const express = require('express');
const recomendacionController = require('../controllers/recomendacionController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin', 'cliente'));

router.get('/', recomendacionController.listar);
router.get('/:id', authorizeRoles('admin'), recomendacionController.obtener);
router.post('/', authorizeRoles('admin'), recomendacionController.crear);
router.put('/:id', authorizeRoles('admin'), recomendacionController.actualizar);
router.delete('/:id', authorizeRoles('admin'), recomendacionController.eliminar);
router.patch('/:id/toggle', authorizeRoles('admin'), recomendacionController.toggle);

module.exports = router;
