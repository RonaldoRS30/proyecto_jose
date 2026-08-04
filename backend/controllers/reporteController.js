const path = require('path');
const fs = require('fs');
const reporteService = require('../services/reporteService');
const configuracionService = require('../services/configuracionService');
const { asyncHandler } = require('../utils/errorHandler');

const generarPDF = asyncHandler(async (req, res) => {
  const clienteId =
    req.user.role === 'cliente' ? req.user.clienteId || req.user.id : req.body.cliente_id;
  const { calculo_id } = req.body;
  const reporte = await reporteService.generarReportePDF(calculo_id, clienteId);
  res.status(201).json({ success: true, data: reporte });
});

const descargar = asyncHandler(async (req, res) => {
  const clienteId = req.user.role === 'cliente' ? req.user.clienteId || req.user.id : null;
  const reporte = await reporteService.obtenerReporte(req.params.id, clienteId);

  if (!fs.existsSync(reporte.ruta_archivo)) {
    return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
  }

  res.download(reporte.ruta_archivo, reporte.nombre_archivo);
});

const listarConfig = asyncHandler(async (req, res) => {
  const configs = await configuracionService.listarTodas();
  res.json({ success: true, data: configs });
});

const actualizarConfig = asyncHandler(async (req, res) => {
  const { clave, valor } = req.body;
  const config = await configuracionService.actualizarConfig(clave, valor);
  res.json({ success: true, data: config });
});

module.exports = { generarPDF, descargar, listarConfig, actualizarConfig };
