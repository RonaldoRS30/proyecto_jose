const express = require('express');
const electroController = require('../controllers/electrodomesticoController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin', 'cliente'));

router.get('/', electroController.listar);
router.post('/', electroController.crear);
router.put('/:id', electroController.actualizar);
router.delete('/:id', electroController.eliminar);

module.exports = router;
