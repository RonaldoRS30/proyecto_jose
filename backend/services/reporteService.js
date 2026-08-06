const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Reporte, Calculo, Cliente, DetalleCalculo, Electrodomestico } = require('../models');
const { AppError } = require('../utils/errorHandler');
const { formatNum } = require('../utils/format');
const {
  buildFacturaParaCalculo,
  enrichCalculo,
  getResumenParaCalculo,
  getTotalesPorModulo,
  MOD_LABELS,
} = require('./facturaHelper');
const { getConfigMap, getPdfContacto } = require('./configuracionService');
const {
  drawHeaderBand,
  drawClientePanel,
  drawResumenPanel,
  drawModuloResumen,
  drawEquiposTable,
  drawRecomendacionesPanel,
  drawFacturaRecibo,
  drawFooter,
} = require('./pdfReciboLayout');
const recomendacionService = require('./recomendacionService');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'reportes');

const ensureDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};

const generarReportePDF = async (calculoId, clienteId) => {
  ensureDir();

  const where = { id: calculoId };
  if (clienteId != null && clienteId !== '') {
    where.cliente_id = clienteId;
  }

  const calculo = await Calculo.findOne({
    where,
    include: [
      { model: Cliente, as: 'cliente' },
      { model: DetalleCalculo, as: 'detalles' },
    ],
  });

  if (!calculo) throw new AppError('Cálculo no encontrado', 404);

  const configMap = await getConfigMap();
  const contactoPdf = await getPdfContacto();
  const calculoEnriquecido = enrichCalculo(calculo, { configMap });

  const clienteIdReporte = calculoEnriquecido.cliente_id;
  const cliente = calculoEnriquecido.cliente;
  const resumen = getResumenParaCalculo(calculoEnriquecido);
  const factura = buildFacturaParaCalculo(calculoEnriquecido);
  const totalesModulos = getTotalesPorModulo(calculoEnriquecido);
  const detalles = calculoEnriquecido.detalles || [];
  const electroIds = detalles
    .filter((d) => d.electrodomestico_id)
    .map((d) => d.electrodomestico_id);

  let electroMap = {};
  if (electroIds.length > 0) {
    const electros = await Electrodomestico.findAll({
      where: { id: electroIds },
      attributes: ['id', 'recomendacion_id'],
    });
    electroMap = Object.fromEntries(electros.map((e) => [e.id, e.recomendacion_id]));
  }

  const equiposParaMatch = detalles.map((detalle) => ({
    nombre: detalle.nombre,
    modulo: detalle.modulo,
    recomendacion_id: detalle.recomendacion_id || electroMap[detalle.electrodomestico_id] || null,
  }));

  const recomendaciones = await recomendacionService.obtenerParaEquipos(equiposParaMatch);

  const filename = `reporte_${clienteIdReporte}_${calculoId}_${Date.now()}.pdf`;
  const filepath = path.join(UPLOADS_DIR, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 42, size: 'A4', bufferPages: true });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.y = 42;

    drawHeaderBand(doc, {
      calculoId,
      fecha: calculoEnriquecido.created_at,
      precioKwh: formatNum(calculoEnriquecido.precio_kwh),
    });

    drawClientePanel(doc, cliente);
    drawResumenPanel(doc, resumen, formatNum);
    drawModuloResumen(doc, totalesModulos, formatNum);

    const modulos = ['aparato', 'fantasma', 'iluminacion'];
    modulos.forEach((mod) => {
      const items = (calculoEnriquecido.detalles || []).filter((d) => d.modulo === mod);
      if (items.length > 0) {
        drawEquiposTable(doc, MOD_LABELS[mod], items, formatNum);
      }
    });

    drawRecomendacionesPanel(doc, recomendaciones);

    drawFacturaRecibo(doc, factura, formatNum);
    drawFooter(doc, contactoPdf);

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const stats = fs.statSync(filepath);

  const reporte = await Reporte.create({
    calculo_id: calculoId,
    cliente_id: clienteIdReporte,
    nombre_archivo: filename,
    ruta_archivo: filepath,
    tamano_bytes: stats.size,
  });

  return reporte;
};

const obtenerReporte = async (id, clienteId = null) => {
  const where = { id };
  if (clienteId) where.cliente_id = clienteId;
  const reporte = await Reporte.findOne({ where });
  if (!reporte) throw new AppError('Reporte no encontrado', 404);
  return reporte;
};

module.exports = { generarReportePDF, obtenerReporte, UPLOADS_DIR };
