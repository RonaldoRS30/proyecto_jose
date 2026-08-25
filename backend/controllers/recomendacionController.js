const { body, validationResult } = require('express-validator');
const recomendacionService = require('../services/recomendacionService');
const { asyncHandler, AppError } = require('../utils/errorHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }
  next();
};

const listar = asyncHandler(async (req, res) => {
  const soloActivas = req.user.role === 'cliente' || req.query.activas === '1';
  const { modulo } = req.query;
  if (req.user.role === 'admin') {
    await recomendacionService.syncRecomendacionesDesdeEquipos();
  }
  const data = await recomendacionService.listar({ soloActivas, modulo: modulo || null });
  res.json({ success: true, data });
});

const obtener = asyncHandler(async (req, res) => {
  const data = await recomendacionService.obtener(req.params.id);
  res.json({ success: true, data });
});

const crear = [
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('texto').trim().notEmpty().withMessage('Texto de recomendación requerido'),
  validate,
  asyncHandler(async (req, res) => {
    const data = await recomendacionService.crear(req.body);
    res.status(201).json({ success: true, data });
  }),
];

const actualizar = [
  body('nombre').optional().trim().notEmpty().withMessage('Nombre requerido'),
  body('texto').optional().trim().notEmpty().withMessage('Texto requerido'),
  validate,
  asyncHandler(async (req, res) => {
    const data = await recomendacionService.actualizar(req.params.id, req.body);
    res.json({ success: true, data });
  }),
];

const eliminar = asyncHandler(async (req, res) => {
  const result = await recomendacionService.eliminar(req.params.id);
  res.json({ success: true, ...result });
});

const toggle = asyncHandler(async (req, res) => {
  const data = await recomendacionService.toggleActivo(req.params.id);
  res.json({ success: true, data });
});

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  toggle,
};
