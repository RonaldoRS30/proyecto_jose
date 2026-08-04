const electroService = require('../services/electrodomesticoService');
const { asyncHandler } = require('../utils/errorHandler');

const getClienteId = (req) => {
  if (req.user.role === 'cliente') return req.user.clienteId || req.user.id;
  return req.query.cliente_id || req.body.cliente_id;
};

const listar = asyncHandler(async (req, res) => {
  const clienteId = getClienteId(req);
  const { modulo, page, limit } = req.query;

  if (page || limit) {
    const result = await electroService.listarPaginado(clienteId, {
      modulo: modulo || null,
      page: page || 1,
      limit: limit || 8,
    });
    return res.json({ success: true, ...result });
  }

  const items = await electroService.listarPorCliente(clienteId, modulo);
  res.json({ success: true, data: items });
});

const crear = asyncHandler(async (req, res) => {
  const clienteId = getClienteId(req);
  const item = await electroService.crear(clienteId, req.body);
  res.status(201).json({ success: true, data: item });
});

const actualizar = asyncHandler(async (req, res) => {
  const clienteId = getClienteId(req);
  const item = await electroService.actualizar(req.params.id, clienteId, req.body);
  res.json({ success: true, data: item });
});

const eliminar = asyncHandler(async (req, res) => {
  const clienteId = getClienteId(req);
  const result = await electroService.eliminar(req.params.id, clienteId);
  res.json({ success: true, ...result });
});

module.exports = { listar, crear, actualizar, eliminar };
