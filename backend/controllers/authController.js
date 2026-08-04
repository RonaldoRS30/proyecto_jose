const { body, validationResult } = require('express-validator');
const { loginAdmin, changeAdminPassword } = require('../services/authService');
const { loginConCodigo } = require('../services/codigoLoginService');
const { asyncHandler, AppError } = require('../utils/errorHandler');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }
  next();
};

const adminLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await loginAdmin(req.body.email, req.body.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ success: true, data: result });
  }),
];

const clienteLoginCodigo = [
  body('codigo').notEmpty().withMessage('Código requerido'),
  validate,
  asyncHandler(async (req, res) => {
    const result = await loginConCodigo(req.body.codigo, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ success: true, data: result });
  }),
];

const adminChangePassword = [
  authenticate,
  authorizeRoles('admin'),
  body('password_actual').notEmpty().withMessage('Contraseña actual requerida'),
  body('password_nueva')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
  validate,
  asyncHandler(async (req, res) => {
    const admin = await changeAdminPassword(
      req.user.id,
      req.body.password_actual,
      req.body.password_nueva
    );
    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
      data: admin,
    });
  }),
];

module.exports = { adminLogin, clienteLoginCodigo, adminChangePassword };
