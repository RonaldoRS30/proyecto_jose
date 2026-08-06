const fs = require('fs');
const reporteService = require('../services/reporteService');
const excelService = require('../services/excelService');
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
  if (!clave) {
    return res.status(400).json({ success: false, message: 'Clave requerida' });
  }
  const config = await configuracionService.actualizarConfig(clave, valor);
  res.json({ success: true, data: config });
});

const getContactoPdfConfig = asyncHandler(async (req, res) => {
  const data = await configuracionService.getPdfContacto();
  res.json({ success: true, data });
});

const actualizarContactoPdfConfig = asyncHandler(async (req, res) => {
  const {
    email, telefono, web, empresaNombre, empresaTagline, social,
  } = req.body;

  if (!email?.trim() || !telefono?.trim() || !web?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Correo, teléfono y página web son obligatorios',
    });
  }

  const data = await configuracionService.updatePdfContacto({
    email: email.trim(),
    telefono: telefono.trim(),
    web: web.trim(),
    empresaNombre: empresaNombre?.trim(),
    empresaTagline: empresaTagline?.trim(),
    social,
  });
  res.json({ success: true, data });
});

const getContactoPublico = asyncHandler(async (req, res) => {
  const data = await configuracionService.getPdfContacto();
  res.json({ success: true, data });
});

const generarExcel = asyncHandler(async (req, res) => {
  const { calculoId } = req.params;
  const excelPath = await excelService.generarExcel(calculoId);
  res.download(excelPath, `calculo_${calculoId}_detalles_graficos.xlsx`, (err) => {
    if (!err) {
      try { fs.unlinkSync(excelPath); } catch (e) { /* ignore */ }
    }
  });
});

module.exports = {
  generarPDF,
  descargar,
  listarConfig,
  actualizarConfig,
  getContactoPdfConfig,
  actualizarContactoPdfConfig,
  getContactoPublico,
  generarExcel,
};
