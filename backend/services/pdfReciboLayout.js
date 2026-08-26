/**
 * Diseño PDF — Recibo de consumo eléctrico (formal y estructurado)
 */

const fs = require('fs');
const path = require('path');
const { buildSocialLinks } = require('../helpers/contactLinks');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo-electrixstudio.png');

const COLORS = {
  primary: '#1A4AB0',
  primaryDark: '#12357a',
  dark: '#080810',
  text: '#1f2937',
  muted: '#64748b',
  border: '#cbd5e1',
  bgHeader: '#1A4AB0',
  bgPanel: '#f8fafc',
  bgTotal: '#eef3fc',
  white: '#ffffff',
};

const MARGIN = 42;
const PAGE_WIDTH = 595.28;
const CONTENT_W = PAGE_WIDTH - MARGIN * 2;

/** Margen inferior sin pie de página fijo */
const PDF_BOTTOM_MARGIN = MARGIN + 14;

function applyPdfPageMargins(doc) {
  if (!doc.page) return;
  doc.page.margins = {
    top: MARGIN,
    bottom: PDF_BOTTOM_MARGIN,
    left: MARGIN,
    right: MARGIN,
  };
}

function getMaxContentY(doc) {
  const bottom = doc.page?.margins?.bottom ?? PDF_BOTTOM_MARGIN;
  return doc.page.height - bottom;
}

const SOCIAL_PLATFORM_LABELS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
};

function formatDatePE(date) {
  return new Date(date).toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ensureSpace(doc, needed) {
  const bottom = getMaxContentY(doc);
  if (doc.y + needed > bottom) {
    doc.addPage();
    applyPdfPageMargins(doc);
    doc.y = MARGIN;
  }
}

function drawFixedText(doc, text, x, y, opts = {}) {
  const {
    font = 'Helvetica',
    size = 8,
    color = '#ffffff',
    width,
    align,
    ellipsis = false,
  } = opts;

  doc.font(font).fontSize(size).fillColor(color);
  const options = { lineBreak: false, ellipsis };
  if (width != null) options.width = width;
  if (align) options.align = align;
  doc.text(String(text || ''), x, y, options);
}

function wrapTextLines(doc, text, maxWidth) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (doc.widthOfString(candidate) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

/** Escribe texto multilínea sin provocar saltos automáticos de PDFKit */
function drawTextBlock(doc, text, x, w, opts = {}) {
  const {
    font = 'Helvetica',
    size = 8,
    color = COLORS.text,
    lineGap = 1.5,
  } = opts;

  doc.font(font).fontSize(size).fillColor(color);
  const lineStep = size + lineGap;
  const lines = wrapTextLines(doc, text, w);

  lines.forEach((line) => {
    if (doc.y + lineStep > getMaxContentY(doc)) {
      doc.addPage();
      applyPdfPageMargins(doc);
      doc.y = MARGIN;
    }
    doc.text(line, x, doc.y, { lineBreak: false, width: w });
    doc.y += lineStep;
  });

  return doc.y;
}

const SOCIAL_PLATFORM_ORDER = ['instagram', 'facebook', 'tiktok', 'whatsapp'];

function drawSocialCardsRow(doc, x, y, w, contacto = {}) {
  const socialLinks = buildSocialLinks(contacto);
  const socialById = Object.fromEntries(socialLinks.map((link) => [link.id, link]));
  const socialH = 22;
  const colCount = SOCIAL_PLATFORM_ORDER.length;
  const colGap = 4;
  const colW = (w - colGap * (colCount - 1)) / colCount;
  const iconSize = 10;

  SOCIAL_PLATFORM_ORDER.forEach((id, index) => {
    const link = socialById[id] || {
      id,
      nombre: SOCIAL_PLATFORM_LABELS[id],
      hasLogo: false,
    };
    const colX = x + index * (colW + colGap);
    const textX = colX + iconSize + 5;
    const textW = colW - iconSize - 8;

    doc.roundedRect(colX, y, colW, socialH, 3).fill('#1e293b');
    doc.roundedRect(colX, y, colW, socialH, 3)
      .lineWidth(0.35)
      .strokeColor('#475569')
      .stroke();

    if (link.hasLogo) {
      doc.image(link.logoPath, colX + 3, y + 5, { width: iconSize, height: iconSize });
    }

    drawFixedText(doc, link.nombre, textX, y + 4, {
      font: 'Helvetica-Bold',
      size: 5.8,
      color: '#f8fafc',
      width: textW,
      ellipsis: true,
    });

    drawFixedText(doc, SOCIAL_PLATFORM_LABELS[id], textX, y + 12, {
      size: 5.4,
      color: '#94a3b8',
      width: textW,
      ellipsis: true,
    });
  });

  return socialH;
}

function drawHeaderBand(doc, { calculoId, fecha, precioKwh, contacto = {} }) {
  const y = MARGIN;
  const pad = 14;
  const metaW = 168;
  const metaX = MARGIN + CONTENT_W - metaW - pad;
  const innerW = CONTENT_W - pad * 2;
  const socialGap = 8;
  const socialH = 22;
  const logoHeight = 36;
  const logoY = y + 8 + socialH + socialGap;
  const h = logoY - y + logoHeight + 22;

  doc.save();
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 6).fill(COLORS.dark);

  drawSocialCardsRow(doc, MARGIN + pad, y + 8, innerW, contacto);

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, MARGIN + pad, logoY, { height: logoHeight });
  } else {
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(16)
      .text('ELECTRIXSTUDIO', MARGIN + pad, logoY + 8);
  }

  doc.font('Helvetica').fontSize(9).fillColor('#c8d9f5')
    .text('Recibo de Consumo Eléctrico — Estimación Mensual', MARGIN + pad, logoY + logoHeight + 4, {
      width: CONTENT_W - pad * 2 - metaW,
    });

  doc.fontSize(8.5).fillColor('#d1d5db')
    .text(`N° ${String(calculoId).padStart(6, '0')}`, metaX, logoY + 2, { width: metaW, align: 'right' })
    .text(formatDatePE(fecha), metaX, logoY + 16, { width: metaW, align: 'right' })
    .text(`Tarifa: S/ ${precioKwh} / kWh`, metaX, logoY + 30, { width: metaW, align: 'right' });

  doc.restore();
  doc.y = y + h + 18;
}

function drawPanel(doc, title, drawContent, options = {}) {
  const padding = 12;
  const titleBlockH = 28;
  const estimatedBodyH = options.estimatedBodyH ?? 80;
  ensureSpace(doc, titleBlockH + estimatedBodyH + padding + 14);

  const startY = doc.y;

  doc.save();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
    .text(title.toUpperCase(), MARGIN + padding, startY + 10);

  const contentY = startY + 28;
  doc.y = contentY;
  const endContentY = drawContent(MARGIN + padding, CONTENT_W - padding * 2);

  const panelH = (endContentY - startY) + padding;
  doc.roundedRect(MARGIN, startY, CONTENT_W, panelH, 4)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();

  doc.restore();
  doc.y = startY + panelH + 14;
}

function drawKeyValueRow(doc, x, y, w, label, value, opts = {}) {
  const labelW = w * 0.58;
  const valueW = w * 0.42;

  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size || 9)
    .fillColor(opts.muted ? COLORS.muted : COLORS.text)
    .text(label, x, y, { width: labelW, lineGap: 2 });

  doc.fillColor(opts.valueColor || COLORS.text)
    .text(value, x + labelW, y, { width: valueW, align: 'right' });

  return y + (opts.height || 16);
}

function drawClientePanel(doc, cliente) {
  const esEmpresa = cliente.tipo_cliente === 'empresa'
    || (!cliente.apellido && cliente.tipo_cliente !== 'natural');
  const titular = esEmpresa
    ? (cliente.nombre || '').trim()
    : `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim();

  drawPanel(doc, 'Datos del titular', (x, w) => {
    let y = doc.y;
    const rows = [
      [esEmpresa ? 'Razón social' : 'Titular', titular || '—'],
      [esEmpresa ? 'RUC' : 'Documento (DNI)', cliente.documento || '—'],
      ['Empresa distribuidora', cliente.empresa_distribuidora || '—'],
      ['Tipo de tarifa', cliente.tarifa || '—'],
      ['Potencia contratada', cliente.potencia_contratada || '—'],
    ];
    rows.forEach(([label, value]) => {
      y = drawKeyValueRow(doc, x, y, w, label, value);
    });
    return y + 4;
  }, { estimatedBodyH: 88 });
}

function drawResumenPanel(doc, resumen, formatNum) {
  drawPanel(doc, 'Resumen de consumo', (x, w) => {
    let y = doc.y;
    const half = w / 2 - 6;

    doc.save();
    doc.roundedRect(x, y, half, 52, 3).fill(COLORS.bgPanel);
    doc.roundedRect(x + half + 12, y, half, 52, 3).fill(COLORS.bgPanel);

    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary)
      .text('CONSUMO (kWh)', x + 8, y + 8, { width: half - 16 });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
      .text(`Diario: ${formatNum(resumen.consumoDia)}`, x + 8, y + 22, { width: half - 16 })
      .text(`Mensual: ${formatNum(resumen.consumoMes)}`, x + 8, y + 34, { width: half - 16 })
      .text(`Anual: ${formatNum(resumen.consumoAnio)}`, x + 8, y + 46, { width: half - 16 });

    const rx = x + half + 12;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary)
      .text('GASTO ENERGÍA (S/)', rx + 8, y + 8, { width: half - 16 });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
      .text(`Diario: ${formatNum(resumen.gastoDiario)}`, rx + 8, y + 22, { width: half - 16 })
      .text(`Mensual: ${formatNum(resumen.gastoMensual)}`, rx + 8, y + 34, { width: half - 16 })
      .text(`Anual: ${formatNum(resumen.gastoAnual)}`, rx + 8, y + 46, { width: half - 16 });

    doc.restore();
    y += 60;
    return y + 4;
  }, { estimatedBodyH: 64 });
}

function drawFacturaLineRow(doc, opts) {
  const {
    label,
    sublabel = '',
    value,
    y,
    colDesc,
    colMonto,
    descW,
    bold = false,
  } = opts;

  const rowH = sublabel ? 28 : 17;
  const valueY = sublabel ? y + 2 : y;
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COLORS.text)
    .text(label, colDesc, y, { width: descW, lineBreak: false });

  if (sublabel) {
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted)
      .text(sublabel, colDesc, y + 12, { width: descW, lineBreak: false });
  }

  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COLORS.text)
    .text(value, colMonto, valueY, { width: 110, align: 'right', lineBreak: false });

  return y + rowH;
}

function measureFacturaBlockHeight(doc, factura, formatNum) {
  const pad = 14;
  const rowW = CONTENT_W - pad * 2;
  const kwh = factura.consumoEnergiaKwh ?? 0;
  const precio = factura.precioKwh ?? 0.613;

  doc.font('Helvetica').fontSize(7.5);
  const footnote = `Referencia tarifaria energía: S/ ${formatNum(factura.gastoEnergiaMensual)} (${formatNum(kwh)} kWh × S/ ${formatNum(precio)}).`;
  const footnoteH = doc.heightOfString(footnote, { width: rowW, lineGap: 1 });

  const chargeRows = 4;
  const subtotalRows = 3;

  return (
    8 // barra superior
    + pad + 12 // título
    + 18 // separador bajo título
    + 14 // encabezados columna
    + 28 // consumo de energía (con sublabel)
    + chargeRows * 17
    + 4 + 10 // línea antes de subtotal
    + subtotalRows * 17
    + 6 + 28 // caja total
    + footnoteH + 8
    + pad
  );
}

function drawFacturaRecibo(doc, factura, formatNum) {
  const blockH = measureFacturaBlockHeight(doc, factura, formatNum);
  ensureSpace(doc, blockH + 12);

  const startY = doc.y;
  const pad = 14;
  const boxH = blockH - 8;

  doc.save();
  doc.roundedRect(MARGIN, startY, CONTENT_W, 8, 2).fill(COLORS.primary);

  const boxY = startY + 8;
  doc.roundedRect(MARGIN, boxY, CONTENT_W, boxH, 4)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primaryDark)
    .text('DETALLE DE FACTURACIÓN', MARGIN + pad, boxY + 12, { lineBreak: false });

  doc.moveTo(MARGIN + pad, boxY + 30)
    .lineTo(MARGIN + CONTENT_W - pad, boxY + 30)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  const colDesc = MARGIN + pad;
  const colMonto = MARGIN + CONTENT_W - pad - 110;
  const rowW = CONTENT_W - pad * 2;
  const descW = colMonto - colDesc - 12;

  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted)
    .text('CONCEPTO', colDesc, boxY + 36, { lineBreak: false })
    .text('IMPORTE', colMonto, boxY + 36, { width: 110, align: 'right', lineBreak: false });

  let y = boxY + 50;

  const kwh = factura.consumoEnergiaKwh ?? 0;
  const precio = factura.precioKwh ?? 0.613;
  const importeEnergia = factura.gastoEnergiaMensual ?? factura.consumoEnergiaLinea ?? (kwh * precio);

  y = drawFacturaLineRow(doc, {
    label: 'Consumo de energía',
    sublabel: `${formatNum(kwh)} kWh`,
    value: `S/ ${formatNum(importeEnergia)}`,
    y,
    colDesc,
    colMonto,
    descW,
  });

  const lineas = [
    { label: 'Cargo fijo', value: `S/ ${formatNum(factura.cargoFijo)}` },
    { label: 'Mantenimiento y reposición de conexión', value: `S/ ${formatNum(factura.mantReposicion)}` },
    { label: 'Alumbrado público', value: `S/ ${formatNum(factura.alumbradoPublico)}` },
    { label: 'Interés compensatorio', value: `S/ ${formatNum(factura.interesCompensatorio)}` },
  ];

  lineas.forEach((row) => {
    y = drawFacturaLineRow(doc, {
      label: row.label,
      value: row.value,
      y,
      colDesc,
      colMonto,
      descW,
    });
  });

  y += 4;
  doc.moveTo(colDesc, y).lineTo(colDesc + rowW, y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  y += 10;

  const subtotalRows = [
    { label: 'Subtotal', value: `S/ ${formatNum(factura.subtotal)}`, bold: true },
    { label: 'IGV (18%)', value: `S/ ${formatNum(factura.igv)}` },
    { label: 'Electrificación rural', value: `S/ ${formatNum(factura.electrificacionRural)}` },
  ];

  subtotalRows.forEach((row) => {
    y = drawFacturaLineRow(doc, {
      label: row.label,
      value: row.value,
      y,
      colDesc,
      colMonto,
      descW,
      bold: row.bold,
    });
  });

  y += 6;
  const totalY = y;
  doc.roundedRect(colDesc, totalY, rowW, 28, 4).fill(COLORS.bgTotal);
  drawFixedText(doc, 'TOTAL DEL MES', colDesc + 10, totalY + 8, {
    font: 'Helvetica-Bold',
    size: 11,
    color: COLORS.primaryDark,
  });
  drawFixedText(doc, `S/ ${formatNum(factura.totalMes)}`, colMonto, totalY + 7, {
    font: 'Helvetica-Bold',
    size: 12,
    color: COLORS.primary,
    width: 110,
    align: 'right',
  });

  y = totalY + 36;
  const footnoteText = `Referencia tarifaria energía: S/ ${formatNum(factura.gastoEnergiaMensual)} (${formatNum(kwh)} kWh × S/ ${formatNum(precio)}).`;
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted);
  wrapTextLines(doc, footnoteText, rowW).forEach((line, i) => {
    drawFixedText(doc, line, colDesc, y + i * 9.5, { size: 7.5, color: COLORS.muted });
  });

  doc.restore();
  doc.y = startY + blockH + 14;
}

function drawEquiposTable(doc, title, items, formatNum) {
  if (!items.length) return;

  const tablePad = 6;
  let colX = MARGIN + tablePad;
  const columns = [
    { label: 'EQUIPO', w: 92, get: (item) => String(item.nombre).substring(0, 24) },
    { label: 'POT.', w: 38, get: (item) => `${item.potencia_w}W` },
    { label: 'kWh/DÍA', w: 52, get: (item) => formatNum(item.consumo_dia), align: 'right' },
    { label: 'kWh/MES', w: 52, get: (item) => formatNum(item.consumo_mes), align: 'right' },
    { label: 'kWh/AÑO', w: 52, get: (item) => formatNum(item.consumo_anio), align: 'right' },
    { label: 'S/ DÍA', w: 48, get: (item) => formatNum(item.gasto_diario), align: 'right' },
    { label: 'S/ MES', w: 48, get: (item) => formatNum(item.gasto_mensual), align: 'right' },
    { label: 'S/ AÑO', w: 48, get: (item) => formatNum(item.gasto_anual), align: 'right' },
  ].map((col) => {
    const positioned = { ...col, x: colX };
    colX += col.w;
    return positioned;
  });

  const headerH = 20;
  const rowH = 18;

  const drawTableHeader = (tableY) => {
    doc.roundedRect(MARGIN, tableY, CONTENT_W, headerH, 3).fill(COLORS.bgPanel);
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COLORS.muted);
    columns.forEach((col) => {
      doc.text(col.label, col.x, tableY + 6, { width: col.w, align: col.align || 'left' });
    });
    return tableY + headerH;
  };

  ensureSpace(doc, 36 + headerH + rowH);
  let startY = doc.y;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
    .text(title.toUpperCase(), MARGIN, startY);

  let tableY = startY + 18;
  let tableStartY = tableY;
  let rowY = drawTableHeader(tableY);

  items.forEach((item, i) => {
    if (rowY + rowH > getMaxContentY(doc)) {
      doc.roundedRect(MARGIN, tableStartY, CONTENT_W, rowY - tableStartY, 3)
        .lineWidth(0.75)
        .strokeColor(COLORS.border)
        .stroke();

      doc.addPage();
      applyPdfPageMargins(doc);
      doc.y = MARGIN;
      startY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
        .text(title.toUpperCase(), MARGIN, startY);
      tableY = startY + 18;
      tableStartY = tableY;
      rowY = drawTableHeader(tableY);
    }

    if (i % 2 === 0) {
      doc.rect(MARGIN, rowY, CONTENT_W, rowH).fill('#fafbfc');
    }
    doc.font('Helvetica').fontSize(6.8).fillColor(COLORS.text);
    columns.forEach((col) => {
      doc.text(col.get(item), col.x, rowY + 5, { width: col.w, align: col.align || 'left' });
    });
    rowY += rowH;
  });

  doc.roundedRect(MARGIN, tableStartY, CONTENT_W, rowY - tableStartY, 3)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();

  doc.y = rowY + 16;
}

function drawModuloResumen(doc, totalesModulos, formatNum) {
  if (!totalesModulos.length) return;

  const estimatedBodyH = totalesModulos.length * 34 + 8;

  drawPanel(doc, 'Resumen por categoría', (x, w) => {
    let y = doc.y;
    totalesModulos.forEach(({ label, totales: t }) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.primary).text(label, x, y, { width: w });
      y += 14;
      y = drawKeyValueRow(
        doc, x, y, w,
        'Consumo mensual / Gasto mensual',
        `${formatNum(t.consumoMes)} kWh  ·  S/ ${formatNum(t.gastoMensual)}`,
        { size: 8 }
      );
      y += 4;
    });
    return y;
  }, { estimatedBodyH });
}

function drawRecomendacionesPanel(doc, recomendaciones) {
  if (!recomendaciones?.length) return;

  ensureSpace(doc, 44);
  const pad = 12;
  const textW = CONTENT_W - pad * 2;
  let y = doc.y;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.primary)
    .text('DATOS TÉCNICOS Y CONSEJOS PARA AHORRAR ENERGÍA', MARGIN + pad, y + 4, {
      width: textW,
      lineBreak: false,
    });
  y = doc.y + 10;

  recomendaciones.forEach((rec, index) => {
    if (index > 0) y += 4;

    doc.font('Helvetica-Bold').fontSize(8.5);
    const titleH = doc.heightOfString(rec.nombre.toUpperCase(), { width: textW });
    doc.font('Helvetica').fontSize(8);
    const lines = wrapTextLines(doc, rec.texto, textW);
    const lineStep = 8 + 1.5;
    const blockH = titleH + lines.length * lineStep + 12;

    ensureSpace(doc, blockH);
    y = doc.y;

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.primary)
      .text(rec.nombre.toUpperCase(), MARGIN + pad, y, { width: textW, lineBreak: false, ellipsis: true });
    doc.y = doc.y + 2;

    drawTextBlock(doc, rec.texto, MARGIN + pad, textW, {
      size: 8,
      lineGap: 1.5,
    });
    y = doc.y + 6;
    doc.y = y;
  });

  doc.y = y + 8;
}

module.exports = {
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
  COLORS,
};
