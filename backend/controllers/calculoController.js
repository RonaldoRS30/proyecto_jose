const calcService = require('../services/calculationService');
const { asyncHandler } = require('../utils/errorHandler');

const getClienteId = (req) => {
  if (req.user?.role === 'cliente') return req.user.clienteId || req.user.id;
  const query = req.query || {};
  const body = req.body || {};
  return query.cliente_id || body.cliente_id || null;
};

const getClienteIdForList = (req) => {
  if (req.user?.role === 'cliente') return req.user.clienteId || req.user.id;
  return req.query?.cliente_id || null;
};

const ejecutar = asyncHandler(async (req, res) => {
  const clienteId = getClienteId(req);
  if (!clienteId) {
    return res.status(400).json({ success: false, message: 'cliente_id es requerido' });
  }
  const result = await calcService.ejecutarCalculo(clienteId);
  res.status(201).json({ success: true, data: result });
});

const preview = asyncHandler(async (req, res) => {
  const clienteId = getClienteId(req);
  if (!clienteId) {
    return res.status(400).json({ success: false, message: 'cliente_id es requerido' });
  }
  const result = await calcService.previewCalculo(clienteId);
  res.json({ success: true, data: result });
});

const listar = asyncHandler(async (req, res) => {
  const filters = req.user?.role === 'cliente'
    ? { clienteId: getClienteIdForList(req) }
    : {
        clienteId: req.query?.cliente_id || null,
        search: req.query?.search || null,
        fechaDesde: req.query?.fecha_desde || null,
        fechaHasta: req.query?.fecha_hasta || null,
      };

  if (req.query?.page || req.query?.limit) {
    const result = await calcService.listarCalculos({
      ...filters,
      page: req.query.page || 1,
      limit: req.query.limit || 8,
    });
    return res.json({ success: true, ...result });
  }

  const calculos = await calcService.listarCalculos(filters);
  res.json({ success: true, data: calculos });
});

const obtener = asyncHandler(async (req, res) => {
  const clienteId = req.user.role === 'cliente' ? getClienteId(req) : null;
  const calculo = await calcService.obtenerCalculo(req.params.id, clienteId);
  res.json({ success: true, data: calculo });
});

module.exports = { ejecutar, preview, listar, obtener };
