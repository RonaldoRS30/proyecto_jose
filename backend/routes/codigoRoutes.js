const express = require('express');
const codigoController = require('../controllers/codigoController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.post('/generar', authenticate, authorizeRoles('admin'), codigoController.generar);
router.get('/', authenticate, authorizeRoles('admin'), codigoController.listar);
router.put('/:id', authenticate, authorizeRoles('admin'), codigoController.actualizar);

module.exports = router;
