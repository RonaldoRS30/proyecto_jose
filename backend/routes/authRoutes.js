const express = require('express');
const { adminLogin, clienteLoginCodigo, adminChangePassword } = require('../controllers/authController');

const router = express.Router();

router.post('/admin/login', adminLogin);
router.patch('/admin/password', adminChangePassword);
router.post('/clientes/login-codigo', clienteLoginCodigo);

module.exports = router;
