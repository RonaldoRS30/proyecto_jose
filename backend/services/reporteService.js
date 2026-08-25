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
  applyPdfPageMargins,
  PDF_BOTTOM_MARGIN,
  MARGIN,
} = require('./pdfReciboLayout');
const { drawChartsSection, drawComparacionSection } = require('./pdfChartsLayout');
const { compareCalculos, formatDatePE, isReciboRegistro } = require('./comparacionHelper');
const { getEquiposExcedenPotenciaReferencia } = require('../helpers/potenciaReferenciaHelper');
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

  await recomendacionService.syncRecomendacionesDesdeEquipos();

  if (electroIds.length > 0) {
    const electrosActualizados = await Electrodomestico.findAll({
      where: { id: electroIds },
      attributes: ['id', 'recomendacion_id'],
    });
    electroMap = Object.fromEntries(electrosActualizados.map((e) => [e.id, e.recomendacion_id]));
  }

  const equiposParaMatch = detalles.map((detalle) => ({
    nombre: detalle.nombre,
    modulo: detalle.modulo,
    recomendacion_id: detalle.recomendacion_id || electroMap[detalle.electrodomestico_id] || null,
  }));

  const recomendaciones = await recomendacionService.obtenerParaEquipos(equiposParaMatch);
  const catalogoReferencia = await recomendacionService.listar({ soloActivas: true });
  const excedentesPotencia = getEquiposExcedenPotenciaReferencia(
    detalles,
    catalogoReferencia,
    electroMap,
  );

  const filename = `reporte_${clienteIdReporte}_${calculoId}_${Date.now()}.pdf`;
  const filepath = path.join(UPLOADS_DIR, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: {
        top: MARGIN,
        bottom: PDF_BOTTOM_MARGIN,
        left: MARGIN,
        right: MARGIN,
      },
    });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.on('pageAdded', () => applyPdfPageMargins(doc));
    applyPdfPageMargins(doc);
    doc.y = MARGIN;

    drawHeaderBand(doc, {
      calculoId,
      fecha: calculoEnriquecido.created_at,
      precioKwh: formatNum(calculoEnriquecido.precio_kwh),
      contacto: contactoPdf,
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

    drawChartsSection(doc, {
      detalles,
      totalesModulos,
      resumen,
      excedentesPotencia,
    });

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

const loadCalculoParaReporte = async (calculoId, clienteId) => {
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
  return calculo;
};

const generarComparacionPDF = async (actualId, referenciaId, clienteId) => {
  ensureDir();

  if (String(actualId) === String(referenciaId)) {
    throw new AppError('Seleccione dos cálculos distintos para comparar', 400);
  }

  const configMap = await getConfigMap();
  const contactoPdf = await getPdfContacto();

  const [calculoActual, calculoReferencia] = await Promise.all([
    loadCalculoParaReporte(actualId, clienteId),
    loadCalculoParaReporte(referenciaId, clienteId),
  ]);

  if (isReciboRegistro(calculoActual)) {
    throw new AppError(
      'El escenario actual debe ser un cálculo estimado. Use el recibo PDF solo como referencia.',
      400,
    );
  }

  const actualEnriquecido = enrichCalculo(calculoActual, { configMap });
  const referenciaEnriquecido = enrichCalculo(calculoReferencia, { configMap });
  const comparacion = compareCalculos(actualEnriquecido, referenciaEnriquecido);

  if (!comparacion) {
    throw new AppError('No se pudo calcular la comparación', 400);
  }

  const cliente = actualEnriquecido.cliente;
  const clienteIdReporte = actualEnriquecido.cliente_id;

  const filename = `comparacion_${clienteIdReporte}_${actualId}_vs_${referenciaId}_${Date.now()}.pdf`;
  const filepath = path.join(UPLOADS_DIR, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: {
        top: MARGIN,
        bottom: PDF_BOTTOM_MARGIN,
        left: MARGIN,
        right: MARGIN,
      },
    });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.on('pageAdded', () => applyPdfPageMargins(doc));
    applyPdfPageMargins(doc);
    doc.y = MARGIN;

    drawHeaderBand(doc, {
      calculoId: actualId,
      fecha: actualEnriquecido.created_at,
      precioKwh: formatNum(actualEnriquecido.precio_kwh),
      contacto: contactoPdf,
    });

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1A4AB0')
      .text('Comparación de reportes', MARGIN, doc.y);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b')
      .text(
        `Actual #${actualId} (${formatDatePE(actualEnriquecido.created_at)}) vs Referencia #${referenciaId} (${formatDatePE(referenciaEnriquecido.created_at)})`,
        MARGIN,
        doc.y,
        { width: 595.28 - MARGIN * 2 },
      );
    doc.moveDown(0.8);

    drawClientePanel(doc, cliente);

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A4AB0')
      .text('Resumen de ahorro', MARGIN, doc.y);
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor('#1f2937')
      .text(
        `kWh/mes: ${comparacion.consumoMesKwh.ahorro >= 0 ? 'Ahorro' : 'Aumento'} de ${formatNum(Math.abs(comparacion.consumoMesKwh.ahorro))} kWh (${comparacion.consumoMesKwh.pctAhorro ?? 0}%)`,
        MARGIN,
        doc.y,
      { width: 595.28 - MARGIN * 2 },
    );
    doc.moveDown(0.3);
    doc.text(
      `Energía S/mes: ${comparacion.gastoEnergiaMes.ahorro >= 0 ? 'Ahorro' : 'Aumento'} de ${formatNum(Math.abs(comparacion.gastoEnergiaMes.ahorro))} S/ (${comparacion.gastoEnergiaMes.pctAhorro ?? 0}%)`,
      MARGIN,
      doc.y,
      { width: 595.28 - MARGIN * 2 },
    );
    doc.moveDown(0.3);
    doc.text(
      `Energía S/año: ${comparacion.gastoEnergiaAnio.ahorro >= 0 ? 'Ahorro' : 'Aumento'} de ${formatNum(Math.abs(comparacion.gastoEnergiaAnio.ahorro))} S/`,
      MARGIN,
      doc.y,
      { width: 595.28 - MARGIN * 2 },
    );
    doc.moveDown(1);

    drawComparacionSection(doc, {
      comparacion,
      actualFecha: formatDatePE(actualEnriquecido.created_at),
      referenciaFecha: formatDatePE(referenciaEnriquecido.created_at),
      formatNum,
    });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const stats = fs.statSync(filepath);

  const reporte = await Reporte.create({
    calculo_id: actualId,
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

module.exports = { generarReportePDF, generarComparacionPDF, obtenerReporte, UPLOADS_DIR };
