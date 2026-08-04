const express = require('express');
const calcController = require('../controllers/calculoController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('admin', 'cliente'));

router.get('/preview', calcController.preview);
router.post('/', calcController.ejecutar);
router.get('/', calcController.listar);
router.get('/:id', calcController.obtener);

module.exports = router;
