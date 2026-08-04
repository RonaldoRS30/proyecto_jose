const codigoService = require('../services/codigoService');
const { asyncHandler } = require('../utils/errorHandler');

const generar = asyncHandler(async (req, res) => {
  const { cliente_id, dias_validez } = req.body;
  const codigo = await codigoService.generarCodigo(cliente_id, req.user.id, dias_validez);
  res.status(201).json({ success: true, data: codigo });
});

const listar = asyncHandler(async (req, res) => {
  const codigos = await codigoService.listarCodigos(req.query.cliente_id);
  res.json({ success: true, data: codigos });
});

const actualizar = asyncHandler(async (req, res) => {
  const codigo = await codigoService.actualizarCodigo(req.params.id, req.body);
  res.json({ success: true, data: codigo });
});

module.exports = { generar, listar, actualizar };
